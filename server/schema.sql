-- =====================================================
-- MiniLedger PostgreSQL Database Schema
-- Assignment: Credsetu Technologies Full Stack Development
-- =====================================================

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) UNIQUE,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(100),
    avatar TEXT,
    google_id VARCHAR(100) UNIQUE,
    auth_provider VARCHAR(20) DEFAULT 'phone',
    otp VARCHAR(10),
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on phone and email for fast authentication lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- 2. Create Loans Table
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_name VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'repaid', 'overdue')),
    repaid_date TIMESTAMP WITH TIME ZONE,
    receipt_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast queries & status filtering
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);

-- 3. Automatic Overdue Calculation Function & View
CREATE OR REPLACE VIEW loan_summary_view AS
SELECT
    user_id,
    COALESCE(SUM(amount), 0) AS total_lent,
    COALESCE(SUM(CASE WHEN status = 'repaid' THEN amount ELSE 0 END), 0) AS total_repaid,
    COALESCE(SUM(CASE WHEN (status = 'overdue' OR (status = 'pending' AND due_date < CURRENT_DATE)) THEN amount ELSE 0 END), 0) AS overdue_amount,
    COUNT(*) AS total_entries,
    COUNT(CASE WHEN (status = 'overdue' OR (status = 'pending' AND due_date < CURRENT_DATE)) THEN 1 END) AS overdue_entries
FROM loans
GROUP BY user_id;

