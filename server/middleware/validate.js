import { body, param, query } from 'express-validator';

/**
 * Validation rules for phone OTP send
 */
export const sendOtpRules = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),
];

/**
 * Validation rules for OTP verification
 */
export const verifyOtpRules = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .matches(/^\d{6}$/)
    .withMessage('OTP must be exactly 6 digits'),
];

/**
 * Validation rules for creating a loan entry
 */
export const createLoanRules = [
  body('friendName')
    .trim()
    .notEmpty()
    .withMessage('Friend name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Friend name must be between 2 and 50 characters'),
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a positive number'),
  body('dueDate')
    .notEmpty()
    .withMessage('Due date is required')
    .isISO8601()
    .withMessage('Due date must be a valid date (ISO 8601)')
    .custom((value) => {
      const due = new Date(value);
      const now = new Date();
      // Zero out time for date-only comparison
      now.setHours(0, 0, 0, 0);
      if (due < now) {
        throw new Error('Due date must be today or a future date');
      }
      return true;
    }),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be at most 500 characters'),
];

/**
 * Validation rules for loan status query
 */
export const loanStatusQueryRules = [
  query('status')
    .optional()
    .isIn(['pending', 'repaid', 'overdue'])
    .withMessage('Status must be one of: pending, repaid, overdue'),
];

/**
 * Validation for MongoDB ObjectId params
 */
export const loanIdParamRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid loan ID format'),
];
