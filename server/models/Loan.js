import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    friendName: {
      type: String,
      required: [true, 'Friend name is required'],
      trim: true,
      minlength: [2, 'Friend name must be at least 2 characters'],
      maxlength: [50, 'Friend name must be at most 50 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be a positive number'],
    },
    // Transaction type: 'lent' (I gave money - standard lending) or 'borrowed' (I took money)
    type: {
      type: String,
      enum: ['lent', 'borrowed'],
      default: 'lent',
    },
    friendPhone: {
      type: String,
      trim: true,
      default: '',
    },
    // Amount settled/repaid so far
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes must be at most 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'partially_repaid', 'repaid', 'overdue'],
      default: 'pending',
    },
    repaidDate: {
      type: Date,
      default: null,
    },
    receiptPath: {
      type: String,
      default: null,
    },
    // Razorpay Integration fields
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    // Detailed Friend-to-Friend payment history (record payment +/- adjustments)
    payments: [
      {
        amount: {
          type: Number,
          required: true,
        },
        mode: {
          type: String,
          enum: ['razorpay', 'cash', 'upi', 'bank_transfer', 'adjustment'],
          default: 'razorpay',
        },
        action: {
          type: String,
          enum: ['minus', 'add'], // 'minus' reduces outstanding balance, 'add' increases debt
          default: 'minus',
        },
        receiptPath: {
          type: String,
          default: null,
        },
        notes: {
          type: String,
          default: '',
        },
        paymentId: {
          type: String,
          default: null,
        },
        status: {
          type: String,
          enum: ['success', 'failed', 'refunded'],
          default: 'success',
        },
        refundId: {
          type: String,
          default: null,
        },
        refundAmount: {
          type: Number,
          default: 0,
        },
        refundReason: {
          type: String,
          default: null,
        },
        refundDate: {
          type: Date,
          default: null,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for user + status queries
loanSchema.index({ user: 1, status: 1 });

// Virtual to check if a loan is overdue
loanSchema.methods.checkOverdue = function () {
  if (['pending', 'partially_repaid'].includes(this.status) && new Date(this.dueDate) < new Date()) {
    this.status = 'overdue';
  }
  return this;
};

/**
 * Pre-find hook to auto-update overdue status.
 * Loans that are still "pending" but past dueDate get marked as "overdue".
 */
loanSchema.pre(['find', 'findOne'], async function () {
  // After the query executes, we update overdue loans in the controller
  // This hook just ensures the query can proceed
});

const Loan = mongoose.model('Loan', loanSchema);

export default Loan;
