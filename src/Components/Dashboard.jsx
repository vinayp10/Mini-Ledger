import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndianRupee, TrendingUp, AlertTriangle, CheckCircle2, Loader2, PlusCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import API from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Dashboard.css';

// Animated counter hook
function useAnimatedCounter(target, duration = 1000) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (target === 0 || !target) {
      setCount(0);
      return;
    }

    let startTime = null;
    const startVal = 0;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(startVal + (target - startVal) * eased));

      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };

    ref.current = requestAnimationFrame(animate);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [target, duration]);

  return count;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState({
    totalLent: 0,
    totalRepaid: 0,
    overdueAmount: 0,
    totalBorrowed: 0,
    netBalance: 0,
    totalEntries: 0,
    overdueEntries: 0,
  });
  const [loading, setLoading] = useState(true);

  const animatedLent = useAnimatedCounter(summary.totalLent);
  const animatedRepaid = useAnimatedCounter(summary.totalRepaid);
  const animatedOverdue = useAnimatedCounter(summary.overdueAmount);
  const animatedNet = useAnimatedCounter(Math.abs(summary.netBalance));

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await API.get('/loans/summary');
      const data = res.data?.data || res.data || {};
      setSummary({
        totalLent: Number(data.totalLent) || 0,
        totalRepaid: Number(data.totalRepaid) || 0,
        overdueAmount: Number(data.overdueAmount) || 0,
        totalBorrowed: Number(data.totalBorrowed) || 0,
        netBalance: Number(data.netBalance) || (Number(data.totalLent || 0) - Number(data.totalRepaid || 0)),
        totalEntries: Number(data.totalEntries ?? data.totalLoans) || 0,
        overdueEntries: Number(data.overdueEntries ?? data.overdueLoans) || 0,
      });
    } catch (err) {
      toast.error('Failed to load dashboard summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Loader2 size={36} className="spin" />
        <p>Loading summary card & ledger metrics...</p>
      </div>
    );
  }

  const outstanding = Math.max(0, summary.totalLent - summary.totalRepaid);
  const repaymentRate = summary.totalLent > 0
    ? Math.round((summary.totalRepaid / summary.totalLent) * 100)
    : 0;

  return (
    <div className="dashboard">
      <div className="dashboard-header-row">
        <div>
          <h2>Welcome, {user?.name || (user?.phone ? `+91 ${user.phone}` : 'Friend')} 👋</h2>
          <p className="dashboard-subtitle">Real-time overview of money lent, recovered, and overdue</p>
        </div>
        <button className="add-btn-quick" onClick={() => navigate('/add-loan')}>
          <PlusCircle size={18} />
          <span>New Loan Entry</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card card-blue">
          <div className="card-top">
            <div className="card-icon">
              <IndianRupee size={22} />
            </div>
            <span className="card-badge">{summary.totalEntries} Loans</span>
          </div>
          <div className="card-content">
            <span className="card-label">Total Lent</span>
            <span className="card-amount">₹{animatedLent.toLocaleString('en-IN')}</span>
          </div>
          <span className="card-foot">Principal amount issued</span>
        </div>

        <div className="summary-card card-green">
          <div className="card-top">
            <div className="card-icon">
              <CheckCircle2 size={22} />
            </div>
            <span className="card-badge">{repaymentRate}% Recovered</span>
          </div>
          <div className="card-content">
            <span className="card-label">Total Repaid</span>
            <span className="card-amount">₹{animatedRepaid.toLocaleString('en-IN')}</span>
          </div>
          <span className="card-foot">Returned & settled by friends</span>
        </div>

        <div className="summary-card card-red">
          <div className="card-top">
            <div className="card-icon">
              <AlertTriangle size={22} />
            </div>
            <span className="card-badge badge-alert">{summary.overdueEntries} Overdue</span>
          </div>
          <div className="card-content">
            <span className="card-label">Overdue Amount</span>
            <span className="card-amount">₹{animatedOverdue.toLocaleString('en-IN')}</span>
          </div>
          <span className="card-foot">Past agreed payment due dates</span>
        </div>

        <div className="summary-card" style={{ background: '#ffffff', border: '1.5px solid #e0e7ff' }}>
          <div className="card-top">
            <div className="card-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
              <TrendingUp size={22} />
            </div>
            <span className="card-badge" style={{ background: '#f1f5f9', color: '#334155' }}>
              Razorpay Active
            </span>
          </div>
          <div className="card-content">
            <span className="card-label">Net Balance Position</span>
            <span className="card-amount" style={{ color: summary.netBalance >= 0 ? '#10b981' : '#f59e0b' }}>
              {summary.netBalance >= 0 ? '+' : '-'}₹{animatedNet.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="card-foot">{summary.netBalance >= 0 ? 'You are owed overall' : 'You owe overall'}</span>
        </div>
      </div>

      {/* Progress & Outstanding Banner */}
      <div className="progress-section">
        <div className="progress-header">
          <div>
            <h3>Recovery Rate</h3>
            <span className="progress-sub">Outstanding balance: ₹{outstanding.toLocaleString('en-IN')}</span>
          </div>
          <span className="percentage-text">{repaymentRate}%</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${repaymentRate}%` }}></div>
        </div>
        <div className="progress-labels">
          <span>₹{summary.totalRepaid.toLocaleString('en-IN')} Repaid</span>
          <span>₹{summary.totalLent.toLocaleString('en-IN')} Total</span>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="dashboard-grid">
        <div className="dashboard-action-card" onClick={() => navigate('/loans')}>
          <div className="action-card-text">
            <h4>View Full Ledger</h4>
            <p>Inspect all loan entries, filter by overdue status, or mark as repaid.</p>
          </div>
          <ArrowRight size={20} className="action-card-arrow" />
        </div>

        <div className="dashboard-action-card" onClick={() => navigate('/add-loan')}>
          <div className="action-card-text">
            <h4>Record Loan with Receipt</h4>
            <p>Add a new borrower with friend name, amount, due date, and receipt proof.</p>
          </div>
          <ArrowRight size={20} className="action-card-arrow" />
        </div>
      </div>
    </div>
  );
}
