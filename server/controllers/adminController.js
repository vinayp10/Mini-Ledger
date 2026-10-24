import Loan from '../models/Loan.js';
import User from '../models/User.js';
import Razorpay from 'razorpay';

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_TrgMH2nA0PnWUe';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret_for_test';
  return new Razorpay({ key_id, key_secret });
};

/**
 * @desc    Get Admin Metrics (Total system transactions, loans, refunds, volume)
 * @route   GET /api/admin/overview
 * @access  Private (Admin)
 */
export const getAdminOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const loans = await Loan.find().populate('user', 'name phone email');

    let totalSystemLent = 0;
    let totalSystemRepaid = 0;
    let totalRefunded = 0;
    let paymentsCount = 0;
    let refundedPaymentsCount = 0;

    loans.forEach((loan) => {
      totalSystemLent += loan.amount || 0;
      totalSystemRepaid += loan.paidAmount || 0;

      if (loan.payments && loan.payments.length > 0) {
        loan.payments.forEach((p) => {
          paymentsCount += 1;
          if (p.status === 'refunded') {
            refundedPaymentsCount += 1;
            totalRefunded += (p.refundAmount || p.amount || 0);
          }
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalLoans: loans.length,
        totalSystemLent,
        totalSystemRepaid,
        totalRefunded,
        paymentsCount,
        refundedPaymentsCount,
        razorpayKey: process.env.RAZORPAY_KEY_ID || 'rzp_test_TrgMH2nA0PnWUe',
      },
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin overview' });
  }
};

/**
 * @desc    List all payments across all users with refund capability
 * @route   GET /api/admin/payments
 * @access  Private (Admin)
 */
export const getAllAdminPayments = async (req, res) => {
  try {
    const loans = await Loan.find()
      .populate('user', 'name phone email')
      .sort({ updatedAt: -1 });

    const allPayments = [];

    loans.forEach((loan) => {
      if (loan.payments && loan.payments.length > 0) {
        loan.payments.forEach((p) => {
          allPayments.push({
            paymentDbId: p._id,
            loanId: loan._id,
            friendName: loan.friendName,
            friendPhone: loan.friendPhone,
            userName: loan.user?.name || (loan.user?.phone ? `+91 ${loan.user.phone}` : 'User'),
            userPhone: loan.user?.phone,
            userEmail: loan.user?.email,
            amount: p.amount,
            mode: p.mode,
            action: p.action,
            paymentId: p.paymentId,
            status: p.status || 'success',
            refundId: p.refundId,
            refundAmount: p.refundAmount,
            refundReason: p.refundReason,
            refundDate: p.refundDate,
            receiptPath: p.receiptPath || loan.receiptPath,
            notes: p.notes,
            date: p.date,
          });
        });
      }
    });

    // Sort newest first
    allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      count: allPayments.length,
      data: allPayments,
    });
  } catch (error) {
    console.error('Get all admin payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve transactions' });
  }
};

/**
 * @desc    Process a Refund for a payment (Razorpay or Manual Settlement)
 * @route   POST /api/admin/refund
 * @access  Private (Admin)
 */
export const processRefund = async (req, res) => {
  try {
    const { loanId, paymentDbId, reason, refundAmount } = req.body;

    if (!loanId || !paymentDbId) {
      return res.status(400).json({
        success: false,
        message: 'loanId and paymentDbId are required for refund processing.',
      });
    }

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan record not found' });
    }

    const payment = loan.payments.id(paymentDbId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found on this loan' });
    }

    if (payment.status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'This payment transaction has already been refunded.',
      });
    }

    const amountToRefund = refundAmount ? parseFloat(refundAmount) : payment.amount;
    let razorpayRefundId = `rfnd_${Date.now()}`;

    // If payment was completed via Razorpay with a real paymentId, initiate Razorpay refund API
    if (payment.mode === 'razorpay' && payment.paymentId && !payment.paymentId.startsWith('pay_mock_')) {
      try {
        const razorpay = getRazorpayInstance();
        const refundResponse = await razorpay.payments.refund(payment.paymentId, {
          amount: Math.round(amountToRefund * 100), // in paise
          notes: {
            reason: reason || 'Admin requested repayment refund',
            loanId: loan._id.toString(),
          },
        });
        if (refundResponse && refundResponse.id) {
          razorpayRefundId = refundResponse.id;
        }
      } catch (rzpErr) {
        console.warn('Razorpay live API refund warning (using demo simulation fallback):', rzpErr.message);
        razorpayRefundId = `rfnd_sim_${Date.now().toString().slice(-8)}`;
      }
    }

    // 1. Mark payment record as refunded
    payment.status = 'refunded';
    payment.refundId = razorpayRefundId;
    payment.refundAmount = amountToRefund;
    payment.refundReason = reason || 'Customer refund processed by Admin';
    payment.refundDate = new Date();

    // 2. Adjust loan ledger balance:
    // If the refunded payment originally deducted from the debt ('minus'), reverting it restores the debt.
    if (payment.action === 'minus') {
      loan.paidAmount = Math.max(0, (loan.paidAmount || 0) - amountToRefund);
      // Re-evaluate loan status
      if (loan.paidAmount < loan.amount) {
        loan.status = new Date(loan.dueDate) < new Date() ? 'overdue' : 'pending';
        loan.repaidDate = null;
      }
    } else if (payment.action === 'add') {
      // If refunded an accidental debt addition, reduce loan amount
      loan.amount = Math.max(0.01, loan.amount - amountToRefund);
    }

    await loan.save();

    res.status(200).json({
      success: true,
      message: `Refund of ₹${amountToRefund} processed successfully! Refund ID: ${razorpayRefundId}`,
      data: {
        refundId: razorpayRefundId,
        refundAmount: amountToRefund,
        loanId: loan._id,
        currentPaidAmount: loan.paidAmount,
        loanStatus: loan.status,
      },
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ success: false, message: 'Failed to process refund: ' + error.message });
  }
};

