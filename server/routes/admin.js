import { Router } from 'express';
import auth from '../middleware/auth.js';
import {
  getAdminOverview,
  getAllAdminPayments,
  processRefund,
} from '../controllers/adminController.js';

const router = Router();

// All admin routes require authentication
router.use(auth);

// GET /api/admin/overview
router.get('/overview', getAdminOverview);

// GET /api/admin/payments
router.get('/payments', getAllAdminPayments);

// POST /api/admin/refund
router.post('/refund', processRefund);

export default router;

