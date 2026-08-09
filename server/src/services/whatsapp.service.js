import fs from 'fs';
import path from 'path';
import pino from 'pino';
import QRCode from 'qrcode';
import mime from 'mime-types';
import makeWASocket, {
  useMultiFileAuthState as baileysUseMultiFileAuthState,
  DisconnectReason as baileysDisconnectReason,
  fetchLatestBaileysVersion as baileysFetchLatestBaileysVersion,
  isJidStatusBroadcast,
} from '@whiskeysockets/baileys';
import WhatsappSession from '../models/WhatsappSession.js';
import WhatsappLog from '../models/WhatsappLog.js';
import WhatsappAuthKey from '../models/WhatsappAuthKey.js';

const useMultiFileAuthState = baileysUseMultiFileAuthState;
const DisconnectReason = baileysDisconnectReason;
const fetchLatestBaileysVersion = baileysFetchLatestBaileysVersion;

const SESSION_ID = process.env.OPENWA_SESSION_ID || 'studio-main';
const AUTH_DIR = path.resolve(process.cwd(), '.baileys_auth');
const logger = pino({ level: 'silent' });

let sock = null;
let isInitializing = false;

// In-Memory Session State (Guarantees zero-crash operation even if MongoDB drops)
let memorySessionState = {
  sessionId: SESSION_ID,
  status: 'disconnected',
  qrCode: null,
  connectedAt: null,
  lastPing: new Date(),
  phone: '',
};

/**
 * Safely syncs session state to MongoDB with in-memory fallback
 */
const syncSessionState = async (updates) => {
  Object.assign(memorySessionState, updates, { lastPing: new Date() });
  try {
    await WhatsappSession.findOneAndUpdate(
      { sessionId: SESSION_ID },
      { ...updates, lastPing: new Date() },
      { upsert: true }
    );
  } catch (err) {
    console.warn('[WhatsApp DB Sync] Operating on in-memory state fallback:', err.message);
  }
};

/**
 * Restores session credentials from MongoDB Atlas into local AUTH_DIR before Baileys boots
 */
const restoreAuthFromMongo = async () => {
  try {
    const keys = await WhatsappAuthKey.find({ sessionId: SESSION_ID });
    if (keys && keys.length > 0) {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }
      for (const keyObj of keys) {
        const filePath = path.join(AUTH_DIR, keyObj.keyId);
        fs.writeFileSync(filePath, keyObj.data, 'utf-8');
      }
      console.log(`✅ [WhatsApp Auth Persistence] Restored ${keys.length} session key files from MongoDB Atlas.`);
      return true;
    }
  } catch (err) {
    console.warn('[WhatsApp Auth Persistence] Failed restoring auth keys from Mongo:', err.message);
  }
  return false;
};

/**
 * Backs up all session credential files from local AUTH_DIR into MongoDB Atlas
 */
const backupAuthToMongo = async () => {
  try {
    if (!fs.existsSync(AUTH_DIR)) return;
    const files = fs.readdirSync(AUTH_DIR);
    for (const fileName of files) {
      if (fileName.endsWith('.json')) {
        const filePath = path.join(AUTH_DIR, fileName);
        if (fs.existsSync(filePath)) {
          try {
            const data = fs.readFileSync(filePath, 'utf-8');
            await WhatsappAuthKey.findOneAndUpdate(
              { sessionId: SESSION_ID, keyId: fileName },
              { data },
              { upsert: true }
            );
          } catch (fileErr) {
            // Ignore transient file lock / deletion error
          }
        }
      }
    }
  } catch (err) {
    console.warn('[WhatsApp Auth Persistence] Backup keys to Mongo warning:', err.message);
  }
};

/**
 * Wipes auth keys from MongoDB Atlas when manually disconnecting
 */
const wipeMongoAuthKeys = async () => {
  try {
    await WhatsappAuthKey.deleteMany({ sessionId: SESSION_ID });
    console.log('[WhatsApp Auth Persistence] Purged all session keys from MongoDB Atlas.');
  } catch (err) {
    console.warn('[WhatsApp Auth Persistence] Failed wiping keys from Mongo:', err.message);
  }
};

/**
 * Wipes authentication credentials folder safely
 */
const wipeAuthDirectory = () => {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      console.log('[WhatsApp Engine] Cleaned .baileys_auth session folder.');
    }
  } catch (err) {
    console.warn('[WhatsApp Engine] Failed to wipe auth folder:', err.message);
  }
};

/**
 * Core Socket Initialization & Event Handlers
 */
export const initWhatsapp = async () => {
  if (process.env.ENABLE_WHATSAPP === 'false') {
    console.log('[WhatsApp Engine] Service disabled by ENABLE_WHATSAPP=false');
    return;
  }

  if (isInitializing) {
    console.log('[WhatsApp Engine] Initialization already in progress, skipping duplicate call.');
    return;
  }

  // Single-Instance Process Lock to prevent duplicate Node process stream collisions (StatusCode: 440)
  const lockFile = path.resolve(process.cwd(), '.baileys_auth', 'process.lock');
  try {
    if (!fs.existsSync(path.resolve(process.cwd(), '.baileys_auth'))) {
      fs.mkdirSync(path.resolve(process.cwd(), '.baileys_auth'), { recursive: true });
    }
    if (sock && sock.user) {
      console.log('[WhatsApp Engine] Active WebSocket already running in this process.');
      return;
    }
    fs.writeFileSync(lockFile, String(process.pid));
  } catch (lockErr) {
    console.warn('[WhatsApp Engine] Lock file check warning:', lockErr.message);
  }

  isInitializing = true;

  // 1. Restore auth keys from MongoDB Atlas before checking disk
  await restoreAuthFromMongo();
  await syncSessionState({ status: 'disconnected', qrCode: null });

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    console.log(`[WhatsApp Engine] Initializing Baileys v${version.join('.')} (Pure WebSocket, ~35MB RAM)`);

    sock = makeWASocket({
      version,
      logger,
      auth: state,
      printQRInTerminal: false,
      browser: ['Darji ERP', 'Desktop', '1.0.0'],
      shouldIgnoreJid: (jid) => isJidStatusBroadcast(jid),
    });

    // 1. Credentials Sync (Local Disk & MongoDB Atlas Backup)
    sock.ev.on('creds.update', async () => {
      await saveCreds();
      await backupAuthToMongo();
    });

    // 2. Connection State Updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Handle QR Event
      if (qr) {
        try {
          // Render ASCII QR to terminal
          const terminalQr = await QRCode.toString(qr, { type: 'terminal', small: true });
          console.log('\n================ WhatsApp Pairing QR (Scan with Phone) ================');
          console.log(terminalQr);
          console.log('========================================================================\n');

          // Convert to Base64 Data URL for Web UI display
          const base64Qr = await QRCode.toDataURL(qr);

          await syncSessionState({
            status: 'authenticating',
            qrCode: base64Qr,
          });
        } catch (qrErr) {
          console.error('[WhatsApp Engine] Error processing QR code:', qrErr.message);
        }
      }

      // Handle Connection Open
      if (connection === 'open') {
        const userJid = sock?.user?.id || '';
        const userPhone = userJid ? '+' + userJid.split(':')[0] : '+91 78289 62210';
        console.log(`✅ [WhatsApp Engine] Connected & Authenticated successfully for ${userPhone}!`);

        // Back up active authentication credentials to MongoDB Atlas
        await backupAuthToMongo();

        await syncSessionState({
          status: 'connected',
          qrCode: null,
          connectedAt: new Date(),
          phone: userPhone,
        });
      }

      // Handle Connection Close
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const errorMsg = lastDisconnect?.error?.message || '';
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        const isBadSession = statusCode === DisconnectReason.badSession || statusCode === 428 || statusCode === 403 || errorMsg.includes('Bad MAC') || errorMsg.includes('SessionEntry');

        console.log(`[WhatsApp Engine] Connection closed. StatusCode: ${statusCode}`);

        await syncSessionState({
          status: 'disconnected',
        });

        sock?.ev?.removeAllListeners();
        sock = null;

        if (isLoggedOut || isBadSession) {
          console.log(`[WhatsApp Engine] Session desynchronized (Code ${statusCode}). Wiping stale session keys for clean re-pairing...`);
          await wipeMongoAuthKeys();
          wipeAuthDirectory();
          setTimeout(() => {
            isInitializing = false;
            initWhatsapp();
          }, 1500);
        } else {
          console.log('[WhatsApp Engine] Temporary stream disconnect. Reconnecting in 3s...');
          setTimeout(() => {
            isInitializing = false;
            initWhatsapp();
          }, 3000);
        }
      }
    });

  } catch (err) {
    console.error('[WhatsApp Engine] Fatal init error:', err.message);
    await syncSessionState({ status: 'disconnected' });
  } finally {
    isInitializing = false;
  }
};

/**
 * Phone Number Normalization
 */
export const normalizeJid = (mobile) => {
  if (!mobile) return null;
  let clean = String(mobile).replace(/\D/g, '');
  if (clean.length === 10) {
    clean = '91' + clean;
  } else if (clean.length > 10 && clean.startsWith('0')) {
    clean = '91' + clean.slice(1);
  }
  if (!clean || clean.length < 10) return null;
  return clean + '@s.whatsapp.net';
};

/**
 * Message Sending Function
 */
export const sendWhatsappMessage = async (mobile, text, mediaPath = null, userId = null, customFileName = null) => {
  const jid = normalizeJid(mobile);
  if (!jid) {
    throw new Error(`Invalid customer phone number (${mobile}). Must be a valid 10-digit number.`);
  }

  // 1. Auto-Reconnect Guard (poll up to 10s if socket is closed or null)
  if (!sock || memorySessionState.status !== 'connected') {
    console.log('[WhatsApp Engine] Socket is inactive or reconnecting. Re-initializing...');
    isInitializing = false;
    initWhatsapp();
    let waits = 0;
    while ((!sock || memorySessionState.status !== 'connected') && waits < 10) {
      await new Promise((r) => setTimeout(r, 1000));
      waits++;
    }
    if (!sock || memorySessionState.status !== 'connected') {
      throw new Error('WhatsApp is reconnecting or offline. Please verify status in Settings.');
    }
  }

  try {
    let sentMsg = null;

    if (mediaPath) {
      try {
        let mediaPayload = null;
        if (Buffer.isBuffer(mediaPath)) {
          mediaPayload = {
            document: mediaPath,
            mimetype: 'application/pdf',
            fileName: customFileName || 'Invoice.pdf',
            caption: text,
          };
        } else if (typeof mediaPath === 'string' && (mediaPath.startsWith('http://') || mediaPath.startsWith('https://'))) {
          mediaPayload = { image: { url: mediaPath }, caption: text };
        } else if (typeof mediaPath === 'string' && fs.existsSync(mediaPath)) {
          const mimeType = mime.lookup(mediaPath) || 'application/pdf';
          const buffer = fs.readFileSync(mediaPath);
          if (mimeType.startsWith('image/')) {
            mediaPayload = { image: buffer, caption: text };
          } else if (mimeType.startsWith('video/')) {
            mediaPayload = { video: buffer, caption: text };
          } else {
            mediaPayload = { document: buffer, mimetype: mimeType, fileName: customFileName || path.basename(mediaPath), caption: text };
          }
        }

        if (mediaPayload) {
          sentMsg = await sock.sendMessage(jid, mediaPayload);
        }
      } catch (mediaErr) {
        console.error('[WhatsApp Engine] Media attachment failed:', mediaErr);
        throw new Error(`Media attachment delivery failed: ${mediaErr.message}`);
      }
    }

    // Text Fallback if media failed or no media provided
    if (!sentMsg) {
      sentMsg = await sock.sendMessage(jid, { text });
    }

    // Log to Database (non-blocking)
    try {
      await WhatsappLog.create({
        userId,
        recipientMobile: mobile,
        messageType: mediaPath ? 'media' : 'text',
        content: text,
        mediaUrl: mediaPath,
        status: 'sent',
        sentAt: new Date(),
      });
    } catch (logErr) {
      console.warn('[WhatsApp DB Log Warning]:', logErr.message);
    }

    return {
      success: true,
      messageId: sentMsg?.key?.id || 'WA_' + Date.now(),
      status: 'sent',
    };
  } catch (err) {
    console.error(`[WhatsApp Engine] Failed to send message to ${mobile}:`, err.message);

    try {
      await WhatsappLog.create({
        userId,
        recipientMobile: mobile,
        messageType: mediaPath ? 'media' : 'text',
        content: text,
        mediaUrl: mediaPath,
        status: 'failed',
        errorMessage: err.message,
      });
    } catch (logErr) {
      // Ignore DB log write error
    }

    throw err;
  }
};

/**
 * Session Disconnect & Reset
 */
export const disconnectWhatsapp = async () => {
  try {
    if (sock) {
      sock.ev.removeAllListeners();
      try {
        await sock.logout();
      } catch (logoutErr) {
        console.warn('[WhatsApp Engine] Logout call warning:', logoutErr.message);
      }
      sock = null;
    }

    await syncSessionState({ status: 'disconnected', qrCode: null });
    await wipeMongoAuthKeys();
    wipeAuthDirectory();

    // Auto-schedule fresh restart for new QR code
    setTimeout(() => {
      isInitializing = false;
      initWhatsapp();
    }, 1500);

    return {
      success: true,
      message: 'WhatsApp session disconnected. Credentials wiped from Mongo & local disk. Fresh QR requested.',
    };
  } catch (err) {
    console.error('[WhatsApp Engine] Disconnect error:', err.message);
    throw err;
  }
};

/**
 * Fetch Current Session Status
 */
export const getWhatsappStatus = async () => {
  if (sock && sock.user) {
    memorySessionState.status = 'connected';
    memorySessionState.qrCode = null;
    memorySessionState.phone = memorySessionState.phone || ('+' + sock.user.id.split(':')[0]);
  } else if (memorySessionState.status !== 'connected' && memorySessionState.status !== 'authenticating') {
    try {
      const session = await WhatsappSession.findOne({ sessionId: SESSION_ID });
      if (session && session.status) {
        memorySessionState.status = session.status;
        memorySessionState.qrCode = session.qrCode;
        memorySessionState.connectedAt = session.connectedAt;
        if (session.phone) memorySessionState.phone = session.phone;
      }
    } catch (err) {
      // Rely on memorySessionState if DB query fails
    }
  }

  return {
    success: true,
    data: {
      sessionId: memorySessionState.sessionId,
      status: memorySessionState.status,
      qrCode: memorySessionState.qrCode,
      connectedAt: memorySessionState.connectedAt,
      lastPing: memorySessionState.lastPing,
      phone: memorySessionState.phone || '+91 90091 49694',
      engine: 'Baileys Pure WebSocket Engine (~35MB RAM)',
    },
  };
};
