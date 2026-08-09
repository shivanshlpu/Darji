import express from 'express';
import {
  getStatus,
  disconnect,
  reconnect,
  sendTestMessage,
  sendInvoicePDF,
  getTemplates,
  saveTemplate,
  getLogs,
} from '../controllers/whatsapp.controller.js';

const router = express.Router();

router.get('/status', getStatus);
router.post('/disconnect', disconnect);
router.post('/reconnect', reconnect);
router.post('/test', sendTestMessage);
router.post('/send-invoice-pdf', sendInvoicePDF);
router.get('/templates', getTemplates);
router.post('/templates', saveTemplate);
router.get('/logs', getLogs);

export default router;
