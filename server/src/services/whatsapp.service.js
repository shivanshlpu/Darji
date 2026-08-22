import fs from 'fs';
import path from 'path';
import pino from 'pino';
import QRCode from 'qrcode';
import mime from 'mime-types';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidStatusBroadcast,
  Browsers,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import WhatsappSession from '../models/WhatsappSession.js';
import WhatsappLog from '../models/WhatsappLog.js';
import WhatsappAuthKey from '../models/WhatsappAuthKey.js';

const SESSION_ID = process.env.OPENWA_SESSION_ID || 'studio-main';
const AUTH_DIR = path.resolve(process.cwd(), '.baileys_auth');
const logger = pino({ level: 'silent' });

let sock = null;
let isInitializing = false;
let conflictCount = 0;

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
 * Prunes outdated pre-key and broken whisper session files from AUTH_DIR and MongoDB
 */
const pruneStaleWhisperKeys = async () => {
  try {
    if (!fs.existsSync(AUTH_DIR)) return;
    const files = fs.readdirSync(AUTH_DIR);
    let deletedCount = 0;
    for (const fileName of files) {
      // Keep creds.json, app-state-sync-key, and delete transient pre-keys/broken session whisper keys
      if (fileName.startsWith('session-') || fileName.startsWith('pre-key-')) {
        const filePath = path.join(AUTH_DIR, fileName);
        try {
          fs.unlinkSync(filePath);
          deletedCount++;
        } catch (e) {}
      }
    }
    if (deletedCount > 0) {
      console.log(`[WhatsApp Engine] Pruned ${deletedCount} stale whisper session keys to resolve Bad MAC conflicts.`);
      await WhatsappAuthKey.deleteMany({
        sessionId: SESSION_ID,
        keyId: { $regex: '^(session-|pre-key-)' },
      });
    }
  } catch (err) {
    console.warn('[WhatsApp Engine] Prune warning:', err.message);
  }
};

/**
 * Restores core session credentials from MongoDB Atlas into local AUTH_DIR before Baileys boots
 */
const restoreAuthFromMongo = async () => {
  try {
    // Only restore core creds and app state keys; ignore stale ephemeral session/pre-key files
    const keys = await WhatsappAuthKey.find({
      sessionId: SESSION_ID,
      keyId: { $not: { $regex: '^(session-|pre-key-)' } }
    });
    if (keys && keys.length > 0) {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }
      for (const keyObj of keys) {
        const filePath = path.join(AUTH_DIR, keyObj.keyId);
        fs.writeFileSync(filePath, keyObj.data, 'utf-8');
      }
      console.log(`✅ [WhatsApp Auth Persistence] Restored ${keys.length} core auth key files from MongoDB Atlas.`);
      return true;
    }
  } catch (err) {
    console.warn('[WhatsApp Auth Persistence] Failed restoring auth keys from Mongo:', err.message);
  }
  return false;
};

/**
 * Backs up core session credential files from local AUTH_DIR into MongoDB Atlas
 */
const backupAuthToMongo = async () => {
  try {
    if (!fs.existsSync(AUTH_DIR)) return;
    const files = fs.readdirSync(AUTH_DIR);
    for (const fileName of files) {
      // Only backup core creds and sync keys, avoid backing up transient ephemeral whisper blobs
      if (fileName.endsWith('.json') && !fileName.startsWith('session-') && !fileName.startsWith('pre-key-')) {
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

  if (sock && sock.user) {
    console.log('[WhatsApp Engine] Active WebSocket already running and connected.');
    return;
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

    // Use makeCacheableSignalKeyStore to prevent Signal in-memory state desync and Bad MAC errors
    sock = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
      browser: Browsers.windows('Desktop'),
      syncFullHistory: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      defaultQueryTimeoutMs: 60000,
      retryRequestDelayMs: 500,
      maxRetries: 5,
      shouldIgnoreJid: (jid) => isJidStatusBroadcast(jid),
      getMessage: async () => ({ conversation: 'Darji Invoice' }),
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
          const terminalQr = await QRCode.toString(qr, { type: 'terminal', small: true });
          console.log('\n================ WhatsApp Pairing QR (Scan with Phone) ================');
          console.log(terminalQr);
          console.log('========================================================================\n');

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
        conflictCount = 0;
        const userJid = sock?.user?.id || '';
        const userPhone = userJid ? '+' + userJid.split(':')[0] : '+91 9479487828';
        console.log(`✅ [WhatsApp Engine] Connected & Authenticated successfully for ${userPhone}!`);

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
        const isDefinitiveLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isConflict = statusCode === DisconnectReason.connectionReplaced || statusCode === 440;

        console.log(`[WhatsApp Engine] Connection closed. StatusCode: ${statusCode}, Reason: ${errorMsg || 'stream close'}`);

        await syncSessionState({
          status: 'disconnected',
        });

        sock?.ev?.removeAllListeners();
        sock = null;

        if (isDefinitiveLoggedOut) {
          console.log(`[WhatsApp Engine] Device unlinked / logged out from phone (Code ${statusCode}). Resetting session keys...`);
          await wipeMongoAuthKeys();
          wipeAuthDirectory();
          setTimeout(() => {
            isInitializing = false;
            initWhatsapp();
          }, 1500);
        } else if (isConflict) {
          conflictCount++;
          console.log(`[WhatsApp Engine] Stream conflict / connection replaced (Code 440, count: ${conflictCount}).`);
          
          if (conflictCount <= 2) {
            // Prune broken whisper pre-keys and retry with backoff
            await pruneStaleWhisperKeys();
            setTimeout(() => {
              isInitializing = false;
              initWhatsapp();
            }, 6000);
          } else {
            console.log('[WhatsApp Engine] Repeated conflict detected. Pausing automatic retry loop. Session is ready for reconnect or clean re-pairing in Settings.');
            isInitializing = false;
          }
        } else {
          conflictCount = 0;
          console.log(`[WhatsApp Engine] Connection interrupted (Code ${statusCode}). Retaining auth credentials and reconnecting in 3s...`);
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
 * Phone Number Normalization with Full International Prefix Flexibility
 */
export const normalizeJid = (mobile) => {
  if (!mobile) return null;
  let str = String(mobile).trim();
  let clean = str.replace(/\D/g, '');
  if (!clean || clean.length < 7) return null;

  // If 10 digits without country code, default to 91 (India)
  if (clean.length === 10) {
    clean = '91' + clean;
  } else if (clean.length === 11 && clean.startsWith('0')) {
    clean = '91' + clean.slice(1);
  }
  // If already contains country code (11-15 digits), keep as-is
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

  // 1. Auto-Reconnect Guard (checks active socket or waits gracefully for reconnect up to 12s)
  const isSocketActive = sock && sock.user;
  if (!isSocketActive || memorySessionState.status !== 'connected') {
    console.log('[WhatsApp Engine] Socket is inactive or reconnecting. Attempting to ensure active connection...');
    if (!isInitializing && (!sock || !sock.user)) {
      initWhatsapp();
    }
    let waits = 0;
    while ((!sock || !sock.user) && waits < 12) {
      await new Promise((r) => setTimeout(r, 1000));
      waits++;
    }
    if (!sock || !sock.user) {
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
        mediaUrl: typeof mediaPath === 'string' ? mediaPath : null,
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
        mediaUrl: typeof mediaPath === 'string' ? mediaPath : null,
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

    conflictCount = 0;
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
      phone: memorySessionState.phone || '+91 9479487828',
      engine: 'Baileys Pure WebSocket Engine (~35MB RAM)',
    },
  };
};
