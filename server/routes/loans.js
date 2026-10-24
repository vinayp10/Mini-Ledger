import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import auth from '../middleware/auth.js';
import {
  createLoanRules,
  loanStatusQueryRules,
  loanIdParamRules,
} from '../middleware/validate.js';
import {
  createLoan,
  getLoans,
  getLoanSummary,
  repayLoan,
  deleteLoan,
  uploadReceipt,
  getReceipt,
  createRazorpayOrder,
  verifyRazorpayPayment,
  recordPaymentAdjustment,
} from '../controllers/loanController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ─── Multer Configuration ────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// ─── All loan routes require authentication ──────────────────────────────
router.use(auth);

// GET /api/loans/summary - Must come before /:id routes
router.get('/summary', getLoanSummary);

// POST /api/loans
router.post('/', createLoanRules, createLoan);

// GET /api/loans
router.get('/', loanStatusQueryRules, getLoans);

// PATCH /api/loans/:id/repay
router.patch('/:id/repay', loanIdParamRules, repayLoan);

// DELETE /api/loans/:id
router.delete('/:id', loanIdParamRules, deleteLoan);

// POST /api/loans/:id/receipt - Upload receipt
router.post(
  '/:id/receipt',
  loanIdParamRules,
  (req, res, next) => {
    upload.single('receipt')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size must be less than 5MB.',
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  },
  uploadReceipt
);

// GET /api/loans/:id/receipt - Get receipt
router.get('/:id/receipt', loanIdParamRules, getReceipt);

// POST /api/loans/:id/payment/order - Create Razorpay order
router.post('/:id/payment/order', loanIdParamRules, createRazorpayOrder);

// POST /api/loans/:id/payment/verify - Verify Razorpay payment
router.post('/:id/payment/verify', loanIdParamRules, verifyRazorpayPayment);

// POST /api/loans/:id/adjustment - Record friend-to-friend payment (+ Add / - Minus) with optional receipt image
router.post(
  '/:id/adjustment',
  loanIdParamRules,
  (req, res, next) => {
    upload.single('receipt')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  recordPaymentAdjustment
);

export default router;
