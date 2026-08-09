import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import { initWhatsapp } from './services/whatsapp.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database
connectDB().then(() => {
  // Initialize Baileys WhatsApp Engine
  initWhatsapp();
});

// Security Middlewares (Section 12)
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(mongoSanitize());

// Rate Limiting on Auth & Query AI
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

app.use('/api/v1/auth/login', authLimiter);

// API Routes
app.use('/api/v1', apiRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date(), service: 'DARJI ERP Backend API' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 DARJI Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 Connected to MongoDB Atlas Cluster`);
});
