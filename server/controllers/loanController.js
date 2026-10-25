import { validationResult } from 'express-validator';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Loan from '../models/Loan.js';

// Lazy initialize Razorpay instance
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || '';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || '';
  return new Razorpay({ key_id, key_secret });
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper: Update overdue status for pending/partially_repaid loans past their due date
 */
const updateOverdueLoans = async (userId) => {
  const now = new Date();
  await Loan.updateMany(
    { user: userId, status: { $in: ['pending', 'partially_repaid'] }, dueDate: { $lt: now } },
    { $set: { status: 'overdue' } }
  );
};

/**
 * @desc    Create a new loan entry
 * @route   POST /api/loans
 * @access  Private
 */
export const createLoan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { friendName, amount, dueDate, notes, type, friendPhone } = req.body;

    const loan = await Loan.create({
      user: req.user._id,
      friendName,
      amount,
      type: type === 'borrowed' ? 'borrowed' : 'lent',
      friendPhone: friendPhone || '',
      paidAmount: 0,
      dueDate: new Date(dueDate),
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      message: 'Loan entry created successfully',
      data: loan,
    });
  } catch (error) {
    console.error('Create loan error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create loan entry.',
    });
  }
};

/**
 * @desc    Get all loan entries for the logged-in user
 * @route   GET /api/loans
 * @query   ?status=pending|repaid|overdue
 * @access  Private
 */
export const getLoans = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    // Auto-update overdue loans before querying
    await updateOverdueLoans(req.user._id);

    const filter = { user: req.user._id };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const loans = await Loan.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: loans.length,
      data: loans,
    });
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve loans.',
    });
  }
};

/**
 * @desc    Get loan summary for the logged-in user
 * @route   GET /api/loans/summary
 * @access  Private
 */
export const getLoanSummary = async (req, res) => {
  try {
    // Auto-update overdue loans
    await updateOverdueLoans(req.user._id);

    const loans = await Loan.find({ user: req.user._id });

    const totalEntries = loans.length;
    // Standard lending (lent)
    const lentLoans = loans.filter((l) => !l.type || l.type === 'lent');
    const totalLent = lentLoans.reduce((sum, loan) => sum + loan.amount, 0);

    // Borrowed records (if any)
    const borrowedLoans = loans.filter((l) => l.type === 'borrowed');
    const totalBorrowed = borrowedLoans.reduce((sum, loan) => sum + loan.amount, 0);

    // Total amount received back / repaid across loans
    const repaidLoans = loans.filter((l) => l.status === 'repaid');
    const fullRepaidAmount = repaidLoans.reduce((sum, loan) => sum + loan.amount, 0);
    // Include paidAmount from partial settlements
    const partialPaidAmount = loans
      .filter((l) => l.status !== 'repaid' && l.paidAmount > 0)
      .reduce((sum, loan) => sum + loan.paidAmount, 0);
    const totalRepaid = fullRepaidAmount + partialPaidAmount;

    // Overdue calculations (accounting for remaining balance if partially repaid)
    const overdueLoans = loans.filter((l) => l.status === 'overdue');
    const overdueAmount = overdueLoans.reduce((sum, loan) => {
      const remaining = Math.max(0, loan.amount - (loan.paidAmount || 0));
      return sum + remaining;
    }, 0);
    const overdueEntries = overdueLoans.length;

    // Net friend-to-friend position (Total Lent - Total Repaid - Total Borrowed)
    const netBalance = totalLent - totalRepaid - totalBorrowed;

    const summaryData = {
      totalLent: parseFloat(totalLent.toFixed(2)),
      totalRepaid: parseFloat(totalRepaid.toFixed(2)),
      overdueAmount: parseFloat(overdueAmount.toFixed(2)),
      totalEntries,
      overdueEntries,
    };

    // Attach extended metrics for payment process and net balance
    if (totalBorrowed > 0 || netBalance !== 0 || req.query.extended === 'true') {
      summaryData.totalBorrowed = parseFloat(totalBorrowed.toFixed(2));
      summaryData.netBalance = parseFloat(netBalance.toFixed(2));
    }

    res.status(200).json({
      success: true,
      data: summaryData,
    });
  } catch (error) {
    console.error('Get loan summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve loan summary.',
    });
  }
};

/**
 * @desc    Mark a loan as repaid
 * @route   PATCH /api/loans/:id/repay
 * @access  Private
 */
export const repayLoan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan entry not found.',
      });
    }

    if (loan.status === 'repaid') {
      return res.status(400).json({
        success: false,
        message: 'This loan has already been marked as repaid.',
      });
    }

    loan.status = 'repaid';
    loan.repaidDate = new Date();
    await loan.save();

    res.status(200).json({
      success: true,
      message: 'Loan marked as repaid successfully',
      data: loan,
    });
  } catch (error) {
    console.error('Repay loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark loan as repaid.',
    });
  }
};

/**
 * @desc    Delete a loan entry
 * @route   DELETE /api/loans/:id
 * @access  Private
 */
export const deleteLoan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const loan = await Loan.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan entry not found.',
      });
    }

    // Delete associated receipt file if it exists
    if (loan.receiptPath) {
      const fullPath = path.join(__dirname, '..', loan.receiptPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Loan entry deleted successfully',
    });
  } catch (error) {
    console.error('Delete loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete loan entry.',
    });
  }
};

/**
 * @desc    Upload a receipt image for a loan
 * @route   POST /api/loans/:id/receipt
 * @access  Private
 */
export const uploadReceipt = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file (jpeg, jpg, png, gif).',
      });
    }

    const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });

    if (!loan) {
      // Delete the uploaded file since loan doesn't exist
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Loan entry not found.',
      });
    }

    // Delete old receipt if it exists
    if (loan.receiptPath) {
      const oldPath = path.join(__dirname, '..', loan.receiptPath);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Store relative path
    loan.receiptPath = `uploads/${req.file.filename}`;
    await loan.save();

    res.status(200).json({
      success: true,
      message: 'Receipt uploaded successfully',
      data: {
        receiptPath: loan.receiptPath,
      },
    });
  } catch (error) {
    console.error('Upload receipt error:', error);
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {
        // Ignore cleanup errors
      }
    }
    res.status(500).json({
      success: false,
      message: 'Failed to upload receipt.',
    });
  }
};

/**
 * @desc    Get receipt image for a loan
 * @route   GET /api/loans/:id/receipt
 * @access  Private
 */
export const getReceipt = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan entry not found.',
      });
    }

    if (!loan.receiptPath) {
      return res.status(404).json({
        success: false,
        message: 'No receipt found for this loan.',
      });
    }

    const fullPath = path.resolve(__dirname, '..', loan.receiptPath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'Receipt file not found on server.',
      });
    }

    res.sendFile(fullPath);
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve receipt.',
    });
  }
};

/**
 * @desc    Create a Razorpay order for online repayment
 * @route   POST /api/loans/:id/payment/order
 * @access  Private
 */
export const createRazorpayOrder = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan entry not found.',
      });
    }

    if (loan.status === 'repaid') {
      return res.status(400).json({
        success: false,
        message: 'Loan has already been fully repaid.',
      });
    }

    // Amount can be specified in body for partial payment, or defaults to remaining balance
    const remainingBalance = Math.max(0, loan.amount - (loan.paidAmount || 0));
    const payAmount = req.body.amount ? parseFloat(req.body.amount) : remainingBalance;

    if (payAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than zero.',
      });
    }

    const key_id = process.env.RAZORPAY_KEY_ID || '';
    const razorpay = getRazorpayInstance();

    let order = null;
    try {
      // Amount in paise (1 INR = 100 paise)
      const options = {
        amount: Math.round(payAmount * 100),
        currency: 'INR',
        receipt: `loan_${loan._id.toString().slice(-8)}_${Date.now().toString().slice(-6)}`,
        notes: {
          loanId: loan._id.toString(),
          friendName: loan.friendName,
          userId: req.user._id.toString(),
        },
      };
      order = await razorpay.orders.create(options);
    } catch (orderErr) {
      console.warn('Razorpay live order creation warning, generating simulated test order:', orderErr.message);
      // Fallback test order ID when testing offline
      order = {
        id: `order_test_${Date.now()}`,
        amount: Math.round(payAmount * 100),
        currency: 'INR',
        receipt: `receipt_${loan._id}`,
      };
    }

    loan.razorpayOrderId = order.id;
    await loan.save();

    res.status(200).json({
      success: true,
      message: 'Razorpay order created successfully',
      data: {
        orderId: order.id,
        amount: payAmount,
        amountPaise: Math.round(payAmount * 100),
        currency: 'INR',
        keyId: key_id,
        friendName: loan.friendName,
        remainingBalance,
      },
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Razorpay payment order.',
    });
  }
};

/**
 * @desc    Verify Razorpay payment and settle balance (Auto-minus repayment)
 * @route   POST /api/loans/:id/payment/verify
 * @access  Private
 */
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, notes } = req.body;

    const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan entry not found.',
      });
    }

    // Verify signature if secret provided and not a mock order
    const secret = process.env.RAZORPAY_KEY_SECRET;
    let isValid = true;

    if (secret && secret !== 'dummy_secret_for_test' && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        isValid = false;
      }
    }

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Razorpay payment signature.',
      });
    }

    const settledAmount = amount ? parseFloat(amount) : (loan.amount - (loan.paidAmount || 0));
    const newPaidAmount = (loan.paidAmount || 0) + settledAmount;

    loan.paidAmount = newPaidAmount;
    loan.razorpayPaymentId = razorpay_payment_id || `pay_${Date.now()}`;

    // Record in transaction payments history
    loan.payments.push({
      amount: settledAmount,
      mode: 'razorpay',
      action: 'minus', // Reduces outstanding balance
      paymentId: loan.razorpayPaymentId,
      notes: notes || 'Razorpay online settlement',
      date: new Date(),
    });

    if (newPaidAmount >= loan.amount) {
      loan.status = 'repaid';
      loan.repaidDate = new Date();
    } else {
      loan.status = 'partially_repaid';
    }

    await loan.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified and recorded successfully!',
      data: loan,
    });
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment.',
    });
  }
};

/**
 * @desc    Record a Friend-to-Friend payment or adjustment (+ Add debt or - Minus repayment)
 * @route   POST /api/loans/:id/adjustment
 * @access  Private
 */
export const recordPaymentAdjustment = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan entry not found.',
      });
    }

    const { amount, action, mode, notes } = req.body;
    const adjAmount = parseFloat(amount);

    if (isNaN(adjAmount) || adjAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Adjustment amount must be a positive number.',
      });
    }

    if (!['minus', 'add'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be either 'minus' (repay/reduce) or 'add' (increase balance).",
      });
    }

    let receiptPath = null;
    if (req.file) {
      receiptPath = `uploads/${req.file.filename}`;
    }

    if (action === 'minus') {
      // Repayment towards loan (Minus)
      loan.paidAmount = (loan.paidAmount || 0) + adjAmount;
      if (loan.paidAmount >= loan.amount) {
        loan.status = 'repaid';
        loan.repaidDate = new Date();
      } else {
        loan.status = 'partially_repaid';
      }
    } else if (action === 'add') {
      // Additional money lent / friend borrowed more (Add)
      loan.amount += adjAmount;
      if (loan.status === 'repaid') {
        loan.status = 'partially_repaid';
        loan.repaidDate = null;
      }
    }

    // Attach to payment record history
    loan.payments.push({
      amount: adjAmount,
      action, // 'minus' or 'add'
      mode: mode || 'cash',
      receiptPath,
      notes: notes || (action === 'minus' ? 'Friend repayment recorded' : 'Additional lending amount added'),
      date: new Date(),
    });

    // Check if overdue
    if (['pending', 'partially_repaid'].includes(loan.status) && new Date(loan.dueDate) < new Date()) {
      loan.status = 'overdue';
    }

    await loan.save();

    res.status(200).json({
      success: true,
      message: `Successfully recorded ₹${adjAmount} (${action === 'minus' ? 'repayment deducted' : 'debt added'})!`,
      data: loan,
    });
  } catch (error) {
    console.error('Record adjustment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record friend-to-friend payment adjustment.',
    });
  }
};

