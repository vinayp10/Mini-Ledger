import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, ShieldCheck, Calendar, IndianRupee, TrendingUp, AlertTriangle, CheckCircle2, LogOut, ArrowLeft, Sparkles, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axiosConfig';
import toast from 'react-hot-toast';
import './Profile.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalLent: 0,
    totalRepaid: 0,
    overdueAmount: 0,
    totalEntries: 0,
    overdueEntries: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await API.get('/loans/summary');
      const data = res.data?.data || res.data || {};
      setStats({
        totalLent: Number(data.totalLent) || 0,
        totalRepaid: Number(data.totalRepaid) || 0,
        overdueAmount: Number(data.overdueAmount) || 0,
        totalEntries: Number(data.totalEntries ?? data.totalLoans) || 0,
        overdueEntries: Number(data.overdueEntries ?? data.overdueLoans) || 0,
      });
    } catch (err) {
      console.warn('Failed to fetch summary stats for profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const displayName = user?.name || (user?.phone ? `+91 ${user.phone}` : user?.email || 'User');
  const userInitial = (displayName || 'U')[0].toUpperCase();
  const isGoogleUser = user?.authProvider === 'google' || Boolean(user?.email && !user?.phone);
  const recoveryRate = stats.totalLent > 0 ? Math.round((stats.totalRepaid / stats.totalLent) * 100) : 0;

  return (
    <div className="profile-page">
      {/* Top Header */}
      <div className="profile-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} />
          <span>Back to Dashboard</span>
        </button>
        <h2>Account Profile</h2>
        <p className="profile-subtitle">Manage your personal details, credentials, and lending activity overview</p>
      </div>

      <div className="profile-grid">
        {/* Left Column: User Identity Card */}
        <div className="profile-card identity-card">
          <div className="avatar-wrapper">
            {user?.avatar ? (
              <img src={user.avatar} alt={displayName} className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-initial">{userInitial}</div>
            )}
            <div className="avatar-status-badge" title="Active Account">✓</div>
          </div>

          <h3 className="profile-name">{displayName}</h3>
          
          <div className="provider-tag">
            {isGoogleUser ? (
              <span className="badge-google">
                <Sparkles size={14} /> Firebase Google Verified
              </span>
            ) : (
              <span className="badge-phone">
                <Phone size={14} /> Phone OTP Verified
              </span>
            )}
          </div>

          <div className="profile-meta-list">
            {user?.email && (
              <div className="meta-row">
                <Mail size={16} className="meta-icon" />
                <div className="meta-info">
                  <span className="meta-label">Email Address</span>
                  <span className="meta-value">{user.email}</span>
                </div>
              </div>
            )}

            {user?.phone && (
              <div className="meta-row">
                <Phone size={16} className="meta-icon" />
                <div className="meta-info">
                  <span className="meta-label">Mobile Number</span>
                  <span className="meta-value">+91 {user.phone}</span>
                </div>
              </div>
            )}

            <div className="meta-row">
              <ShieldCheck size={16} className="meta-icon" />
              <div className="meta-info">
                <span className="meta-label">Account Security</span>
                <span className="meta-value security-safe">256-Bit Encrypted Session</span>
              </div>
            </div>

            <div className="meta-row">
              <Calendar size={16} className="meta-icon" />
              <div className="meta-info">
                <span className="meta-label">Member Since</span>
                <span className="meta-value">October 2026 (Active)</span>
              </div>
            </div>
          </div>

          <button className="profile-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sign Out from MiniLedger</span>
          </button>
        </div>

        {/* Right Column: Ledger Statistics & Quick Preferences */}
        <div className="profile-right-col">
          {/* Activity Statistics Card */}
          <div className="profile-card stats-card">
            <div className="stats-card-header">
              <h4>Lending Ledger Metrics</h4>
              <button className="new-loan-quick-btn" onClick={() => navigate('/add-loan')}>
                <PlusCircle size={15} />
                <span>New Loan</span>
              </button>
            </div>

            <div className="profile-stats-grid">
              <div className="stat-box box-blue">
                <span className="stat-box-label">Total Lent</span>
                <span className="stat-box-val">₹{stats.totalLent.toLocaleString('en-IN')}</span>
                <span className="stat-box-sub">{stats.totalEntries} loans recorded</span>
              </div>

              <div className="stat-box box-green">
                <span className="stat-box-label">Total Recovered</span>
                <span className="stat-box-val">₹{stats.totalRepaid.toLocaleString('en-IN')}</span>
                <span className="stat-box-sub">{recoveryRate}% recovery rate</span>
              </div>

              <div className="stat-box box-red">
                <span className="stat-box-label">Overdue Balance</span>
                <span className="stat-box-val">₹{stats.overdueAmount.toLocaleString('en-IN')}</span>
                <span className="stat-box-sub">{stats.overdueEntries} overdue entries</span>
              </div>
            </div>

            {/* Recovery Progress Bar */}
            <div className="profile-recovery-bar">
              <div className="recovery-header">
                <span>Principal Recovery Progress</span>
                <strong>{recoveryRate}%</strong>
              </div>
              <div className="recovery-track">
                <div className="recovery-fill" style={{ width: `${recoveryRate}%` }}></div>
              </div>
            </div>
          </div>

          {/* System & Application Details */}
          <div className="profile-card app-info-card">
            <h4>System & Project Details</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-k">Application:</span>
                <span className="info-v">MiniLedger v1.0.0</span>
              </div>
              <div className="info-item">
                <span className="info-k">Project:</span>
                <span className="info-v">Credsetu Technologies Assessment</span>
              </div>
              <div className="info-item">
                <span className="info-k">Frontend:</span>
                <span className="info-v">React 19 + Vite + Lucide Icons</span>
              </div>
              <div className="info-item">
                <span className="info-k">Authentication:</span>
                <span className="info-v">Firebase Google OAuth + Mobile OTP</span>
              </div>
              <div className="info-item">
                <span className="info-k">Backend Engine:</span>
                <span className="info-v">Node.js + TypeScript + PostgreSQL/In-Memory</span>
              </div>
              <div className="info-item">
                <span className="info-k">Mobile App:</span>
                <span className="info-v">React Native / Expo (in mobile/)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

