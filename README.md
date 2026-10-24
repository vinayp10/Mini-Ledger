# 📘 MiniLedger — Full Stack Loan & Lending Tracker
> **Credsetu Technologies — Full Stack Development Internship Assignment**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.3-61dafb.svg)
![Node](https://img.shields.io/badge/Node.js-Express%204.21-green.svg)
![MongoDB](https://img.shields.io/badge/Database-MongoDB%20%2F%20In--Memory-brightgreen.svg)
![Tests](https://img.shields.io/badge/Tests-32%2F32%20Passing%20(100%25)-success.svg)

---

## 📋 Table of Contents
1. [Project Overview & Internship Requirements](#-project-overview--internship-requirements)
2. [Tech Stack & Architecture](#-tech-stack--architecture)
3. [Key Features & Verification Matrix](#-key-features--verification-matrix)
4. [Project Structure](#-project-structure)
5. [Quick Start Guide (Zero-Config)](#-quick-start-guide-zero-config)
6. [API Endpoints Reference](#-api-endpoints-reference)
7. [Automated Test Suite (100% Passing)](#-automated-test-suite-100-passing)
8. [React Native Mobile App](#-react-native-mobile-app)
9. [Interview Q&A Cheatsheet](#-interview-qa-cheatsheet)

---

## 🎯 Project Overview & Internship Requirements

MiniLedger is a production-grade full-stack financial ledger system designed to track personal loans between friends and colleagues. It guarantees clean reconciliation of balances, automated overdue status calculation, receipt photo attachments, and passwordless Phone + OTP authentication.

### Assignment Deliverables Checklist

| Requirement | Implementation Details | Status |
| :--- | :--- | :---: |
| **Loan Entry APIs** | Add loan (friendName, amount, dueDate, notes), mark as repaid, delete | ✅ **100% Done** |
| **Summary Endpoint** | `GET /api/loans/summary` returning totalLent, totalRepaid, overdueAmount, etc. | ✅ **100% Done** |
| **Phone + OTP Login** | Phone input, OTP simulation/delivery, JWT authorization middleware | ✅ **100% Done** |
| **Highlight Overdue Loans** | Dynamic status check + distinct red indicator/accent for overdue entries | ✅ **100% Done** |
| **Summary Card at Top** | Animated summary cards with repayment progress and financial metrics | ✅ **100% Done** |
| **Form to Add Entry** | Validated form with friend name, amount (₹), future due date, notes | ✅ **100% Done** |
| **Bonus: Receipt Photo Upload** | Multer multipart file upload for transaction proofs with preview modal | ✅ **100% Done** |
| **Bonus: Input Validation** | Express-validator on backend + regex & real-time validation on frontend | ✅ **100% Done** |
| **Bonus: Automated Tests** | 32 Jest & Supertest test cases covering all routes & validations (32/32 pass) | ✅ **100% Done** |
| **Razorpay Payment Gateway** | Real checkout with `rzp_test_TrgMH2nA0PnWUe`, partial & full online loan repayment | ✅ **100% Done** |
| **Friend-to-Friend Settlement** | Record payments with (+ Add) debt or (- Minus) repayment adjustments + receipts | ✅ **100% Done** |
| **Google Authentication** | 1-Click Google Sign-In & custom Google Email Verification (`POST /api/auth/google`) | ✅ **100% Done** |
| **Dual Platform (Web & Mobile)** | React 19 web app + complete React Native / Expo mobile application | ✅ **100% Done** |

---

## 🛠 Tech Stack & Architecture

- **Frontend (Web)**: React 19, Vite 8, React Router DOM 7, Axios, Lucide React Icons, React Hot Toast, Date-fns.
- **Mobile (App)**: React Native, Expo, AsyncStorage, Expo Image Picker, Flexbox UI.
- **Backend (API)**: Node.js (ES Modules), Express 4.21, Mongoose 8.7, JWT (JSON Web Tokens), Multer, Helmet, Morgan, Express-Validator.
- **Database**: MongoDB with **intelligent zero-config fallback** to `mongodb-memory-server` if local MongoDB is not running.
- **Testing**: Jest 29, Supertest 7, MongoMemoryServer for isolated integration testing.

```
       ┌────────────────────────┐         ┌────────────────────────┐
       │   React 19 Web App     │         │ React Native Mobile App│
       │  (Vite + React Router) │         │    (Expo / Android)    │
       └───────────┬────────────┘         └───────────┬────────────┘
                   │                                  │
                   └────────────────┬─────────────────┘
                                    │ HTTP / REST / JSON
                                    ▼
       ┌───────────────────────────────────────────────────────────┐
       │             Node.js / Express 4.21 API Server             │
       │   [Helmet] [Cors] [JWT Auth Guard] [Express-Validator]    │
       └────────────────────────────┬──────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
       ┌───────────────────────────┐  ┌────────────────────────────┐
       │     MongoDB Database      │  │    Multer File Storage     │
       │  (Local, Atlas, or Auto   │  │ (Payment receipts & proofs │
       │     In-Memory Fallback)   │  │   in server/uploads/)      │
       └───────────────────────────┘  └────────────────────────────┘
```

---

## 📁 Project Structure

```
MiniLedger/
├── index.html                   # HTML template
├── package.json                 # Web frontend dependencies & scripts
├── vite.config.js               # Vite build configuration
├── dist/                        # Production build output
├── public/                      # Static assets
├── src/
│   ├── api/
│   │   └── axiosConfig.js       # Axios instance with JWT interceptor
│   ├── context/
│   │   └── AuthContext.jsx      # Authentication state & localStorage sync
│   ├── Components/
│   │   ├── Login.jsx & .css     # Phone + OTP two-step login
│   │   ├── Dashboard.jsx & .css # Top summary cards with animated counters
│   │   ├── AddLoan.jsx & .css   # Validated entry form + receipt upload
│   │   ├── LoanList.jsx & .css  # Filterable ledger (Overdue highlighted in RED)
│   │   ├── Navbar.jsx & .css    # Responsive navigation bar
│   │   └── ProtectedRoute.jsx   # Route security guard
│   ├── App.jsx & .css           # Main routing & application layout
│   ├── index.css                # Global theme & typography
│   └── main.jsx                 # Client entry point
│
├── server/
│   ├── package.json             # Backend dependencies & test scripts
│   ├── server.js                # Express application entrypoint
│   ├── .env & .env.example      # Environment variables
│   ├── config/
│   │   └── db.js                # Smart MongoDB / In-memory connector
│   ├── controllers/
│   │   ├── authController.js    # Send OTP, Verify OTP, JWT generator
│   │   └── loanController.js    # CRUD, Summary, Repay, Upload Receipt
│   ├── middleware/
│   │   ├── auth.js              # Bearer token verification
│   │   └── validate.js          # Express-validator schemas
│   ├── models/
│   │   ├── User.js              # User schema (phone, OTP, expiry)
│   │   └── Loan.js              # Loan schema (friendName, amount, dueDate, status)
│   ├── routes/
│   │   ├── auth.js              # /api/auth routes
│   │   └── loans.js             # /api/loans routes
│   ├── uploads/                 # Storage for receipt images
│   └── __tests__/
│       ├── auth.test.js         # Jest unit & integration tests for Auth
│       └── loans.test.js        # Jest tests for Loans CRUD & Summary
│
├── mobile/
│   ├── package.json             # React Native Expo dependencies
│   ├── App.js                   # Mobile navigation & Auth provider
│   ├── README.md                # Mobile run guide
│   └── src/
│       ├── api/client.js        # Axios client with AsyncStorage token
│       ├── context/AuthContext.js
│       └── screens/
│           ├── LoginScreen.js       # Mobile Phone + OTP login screen
│           ├── DashboardScreen.js   # Summary card at top + quick actions
│           ├── LoanListScreen.js    # Highlighted overdue entries list
│           └── AddLoanScreen.js     # Add loan form with receipt photo picker
│
├── PROJECT_ROOT_DOCUMENTATION.html  # Printable PDF Interview Report
└── README.md                        # Master project guide
```

---

## ⚡ Quick Start Guide (Zero-Config)

### Step 1: Start the Backend Server
```bash
cd server
npm install
npm start
```
> **Self-Healing DB**: If MongoDB is not running on your machine, the server **automatically launches an in-memory database instance**. You will see:
> `🚀 Embedded MongoMemoryServer connected successfully! The API is 100% functional.`

### Step 2: Start the Web App
In a separate terminal:
```bash
# In the MiniLedger root directory
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### Step 3: Login Credentials
- **Phone Number**: Any valid 10-digit Indian number (e.g. `9876543210`)
- **OTP**: In development mode, the OTP is printed directly in the server console and automatically pre-filled/prompted for convenience!

---

## 📡 API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/send-otp` | Generates 6-digit OTP with 5-minute expiry | No |
| `POST` | `/api/auth/verify-otp` | Validates OTP & issues signed JWT token | No |

### Loans Ledger (`/api/loans`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/loans` | Retrieves all loans (supports `?status=overdue\|pending\|repaid`) | **Yes (Bearer)** |
| `GET` | `/api/loans/summary` | Computes `totalLent`, `totalRepaid`, `overdueAmount`, `totalEntries` | **Yes (Bearer)** |
| `POST` | `/api/loans` | Creates a new loan entry with validation | **Yes (Bearer)** |
| `PATCH`| `/api/loans/:id/repay` | Marks a loan as repaid and timestamps `repaidDate` | **Yes (Bearer)** |
| `DELETE`| `/api/loans/:id` | Deletes a loan record and removes receipt file | **Yes (Bearer)** |
| `POST` | `/api/loans/:id/receipt` | Uploads a payment receipt image (multipart/form-data) | **Yes (Bearer)** |
| `GET` | `/api/loans/:id/receipt` | Retrieves the uploaded receipt file | **Yes (Bearer)** |

---

## 🧪 Automated Test Suite (100% Passing)

Run the full automated test suite:
```bash
cd server
npm test
```

### Test Results Summary:
```
 PASS  __tests__/loans.test.js
 PASS  __tests__/auth.test.js

Test Suites: 2 passed, 2 total
Tests:       32 passed, 32 total
Snapshots:   0 total
Time:        9.502 s
Ran all test suites.
```
- **Auth Suite (12 tests)**: Validates phone formatting, OTP expiry, single-use OTP enforcement, invalid tokens, protected route rejection.
- **Loans Suite (20 tests)**: Validates required friend name, min/max length, positive amount check, future due date enforcement, summary aggregation math, mark as repaid lifecycle, duplicate repay rejection, receipt attachment handling.

---

## 📱 React Native Mobile App

The mobile application is located in `MiniLedger/mobile`.
```bash
cd mobile
npm install
npx expo start
```
- Supports Android Emulator, iOS Simulator, and physical phones via **Expo Go**.
- Features mobile-optimized summary cards, overdue entries in red, and quick due date selectors (+7, +15, +30 days).

---

## 🎓 Interview Q&A Cheatsheet

### 1. How does the system compute "Overdue" status?
> **Answer**: Rather than relying on a brittle cron job alone, the system utilizes **just-in-time evaluation**: whenever a user requests their loan list or summary (`GET /api/loans` or `GET /api/loans/summary`), the backend checks if `dueDate < now` for any loan where `status === 'pending'` and updates it to `'overdue'`. In the frontend, real-time date evaluation with `date-fns` guarantees that loans past their deadline are immediately rendered with high-priority red styling even if offline.

### 2. How is authentication handled securely with Phone + OTP?
> **Answer**: Upon receiving a 10-digit number, the backend generates a cryptographically random 6-digit OTP with a strict 5-minute expiry stored on the user model. Upon verification:
> 1. The OTP must match exactly.
> 2. The expiry timestamp is checked.
> 3. Once validated, the OTP fields are immediately cleared (`null`) to **prevent replay attacks**.
> 4. A signed JWT containing user ID and phone is returned and included as a Bearer token in subsequent requests.

### 3. How are receipts uploaded and handled safely?
> **Answer**: Multer is configured to validate MIME types (`image/jpeg`, `image/png`, `image/gif`) and restrict file sizes to 5MB. Files are saved with unique UUID-based filenames to prevent collisions. If a loan is deleted, its associated receipt file is automatically pruned from disk to avoid orphan storage.

---
*Created for Credsetu Technologies Full Stack Internship Assessment — All rights reserved.*
#   M I n i L e d g e r  
 