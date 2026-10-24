// ========================================================
// MiniLedger - TypeScript Type Definitions
// Node.js + TypeScript + PostgreSQL / MongoDB
// ========================================================

export interface IUser {
  id?: string | number;
  _id?: string;
  phone?: string;
  email?: string;
  name?: string;
  avatar?: string;
  googleId?: string;
  authProvider?: 'phone' | 'google';
  otp?: string | null;
  otpExpiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type LoanStatus = 'pending' | 'partially_repaid' | 'repaid' | 'overdue';

export interface IPaymentRecord {
  amount: number;
  mode: 'razorpay' | 'cash' | 'upi' | 'bank_transfer' | 'adjustment';
  action: 'minus' | 'add';
  receiptPath?: string | null;
  notes?: string;
  paymentId?: string | null;
  date?: Date;
}

export interface ILoan {
  id?: string | number;
  _id?: string;
  userId?: string | number;
  user?: string;
  friendName: string;
  friendPhone?: string;
  type?: 'lent' | 'borrowed';
  amount: number;
  paidAmount?: number;
  dueDate: Date | string;
  notes?: string;
  status: LoanStatus;
  repaidDate?: Date | null;
  receiptPath?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  payments?: IPaymentRecord[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILoanSummary {
  totalLent: number;
  totalRepaid: number;
  overdueAmount: number;
  totalBorrowed?: number;
  netBalance?: number;
  totalEntries: number;
  overdueEntries: number;
}

export interface IAuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: IUser;
  otp?: string;
}

export interface IApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  errors?: Array<{ field?: string; message: string }>;
}

