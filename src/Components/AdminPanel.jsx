import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  DollarSign,
  Users,
  CreditCard,
  FileText,
  X,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import API from '../api/axiosConfig';
import toast from 'react-hot-toast';
import './AdminPanel.css';

export default function AdminPanel() {
  const [metrics, setMetrics] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // all, razorpay, cash, upi, refunded

  // Refund Modal State
  const [refundModalPayment, setRefundModalPayment] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setRefreshing(true);
      const [overviewRes, paymentsRes] = await Promise.all([
        API.get('/admin/overview'),
        API.get('/admin/payments'),
      ]);

      setMetrics(overviewRes.data?.data || null);
      setPayments(Array.isArray(paymentsRes.data?.data) ? paymentsRes.data.data : []);
    } catch (err) {
      toast.error('Failed to load admin transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openRefundModal = (p) => {
    setRefundModalPayment(p);
    setRefundAmount(p.amount);
    setRefundReason('Customer requested cancellation / dispute resolution');
  };

  const handleProcessRefund = async (e) => {
    e.preventDefault();
    if (!refundModalPayment) return;

    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }

    setIsProcessingRefund(true);
    try {
      const res = await API.post('/admin/refund', {
        loanId: refundModalPayment.loanId,
        paymentDbId: refundModalPayment.paymentDbId,
        amount: amt,
        reason: refundReason.trim(),
      });

      toast.success(res.data?.message || 'Refund successfully executed!');
      setRefundModalPayment(null);
      fetchAdminData(); // Refresh records
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to execute refund');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const filteredPayments = payments
    .filter((p) => {
      if (filterMode === 'all') return true;
      if (filterMode === 'refunded') return p.status === 'refunded';
      if (filterMode === 'razorpay') return p.mode === 'razorpay';
      if (filterMode === 'upi') return p.mode === 'upi';
      if (filterMode === 'cash') return p.mode === 'cash';
      return true;
    })
    .filter((p) => {
      const q = search.toLowerCase();
      return (
        p.friendName?.toLowerCase().includes(q) ||
        p.userName?.toLowerCase().includes(q) ||
        p.paymentId?.toLowerCase().includes(q) ||
        p.userPhone?.includes(q)
      );
    });

  if (loading) {
    return (
      <div className="admin-loading">
        <Loader2 size={40} className="spin" />
        <p>Loading Admin Payment Management Console...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="admin-badge">ADMIN CONTROL</span>
            <h2>Transaction & Refund Management Panel</h2>
          </div>
          <p className="admin-subtitle">
            Audit system-wide payments, handle transaction errors, and execute instant Razorpay & friend settlements refunds
          </p>
        </div>
        <button
          className="admin-refresh-btn"
          onClick={fetchAdminData}
          disabled={refreshing}
          title="Refresh transaction stream"
        >
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Grid */}
      {metrics && (
        <div className="admin-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">System Active Users</span>
            <div className="metric-val-row">
              <span className="metric-value">{metrics.totalUsers}</span>
              <Users size={20} className="metric-icon" />
            </div>
            <span className="metric-hint">{metrics.totalLoans} Total Loans created</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Total System Volume</span>
            <div className="metric-val-row">
              <span className="metric-value">₹{metrics.totalSystemLent.toLocaleString('en-IN')}</span>
              <DollarSign size={20} className="metric-icon" />
            </div>
            <span className="metric-hint">₹{metrics.totalSystemRepaid.toLocaleString('en-IN')} Settled by friends</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Payments Processed</span>
            <div className="metric-val-row">
              <span className="metric-value">{metrics.paymentsCount}</span>
              <CreditCard size={20} className="metric-icon" />
            </div>
            <span className="metric-hint">Razorpay & Friend records</span>
          </div>

          <div className="metric-box metric-alert">
            <span className="metric-label">Refunded Volume</span>
            <div className="metric-val-row">
              <span className="metric-value" style={{ color: '#ef4444' }}>
                ₹{metrics.totalRefunded.toLocaleString('en-IN')}
              </span>
              <RotateCcw size={20} className="metric-icon" style={{ color: '#ef4444' }} />
            </div>
            <span className="metric-hint">{metrics.refundedPaymentsCount} Reversals / Refunds executed</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="admin-controls-card">
        <div className="admin-search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by friend name, lender phone, transaction ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="admin-filter-pills">
          <button
            className={`pill-btn ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            All ({payments.length})
          </button>
          <button
            className={`pill-btn ${filterMode === 'razorpay' ? 'active' : ''}`}
            onClick={() => setFilterMode('razorpay')}
          >
            💳 Razorpay ({payments.filter((p) => p.mode === 'razorpay').length})
          </button>
          <button
            className={`pill-btn ${filterMode === 'upi' ? 'active' : ''}`}
            onClick={() => setFilterMode('upi')}
          >
            📱 UPI ({payments.filter((p) => p.mode === 'upi').length})
          </button>
          <button
            className={`pill-btn ${filterMode === 'cash' ? 'active' : ''}`}
            onClick={() => setFilterMode('cash')}
          >
            💵 Cash ({payments.filter((p) => p.mode === 'cash').length})
          </button>
          <button
            className={`pill-btn pill-refunded ${filterMode === 'refunded' ? 'active' : ''}`}
            onClick={() => setFilterMode('refunded')}
          >
            🔄 Refunded ({payments.filter((p) => p.status === 'refunded').length})
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="admin-table-container">
        {filteredPayments.length === 0 ? (
          <div className="admin-empty-state">
            <Info size={40} color="#94a3b8" />
            <p>No transaction records match the selected criteria.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Lender (User)</th>
                <th>Friend (Borrower)</th>
                <th>Type / Channel</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Reference ID</th>
                <th>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p, idx) => {
                const isRefunded = p.status === 'refunded';
                return (
                  <tr key={idx} className={isRefunded ? 'row-refunded' : ''}>
                    <td>
                      <div className="table-date">
                        {p.date ? format(new Date(p.date), 'dd/MM/yyyy') : '—'}
                      </div>
                      <div className="table-time">
                        {p.date ? format(new Date(p.date), 'hh:mm a') : ''}
                      </div>
                    </td>

                    <td>
                      <div className="user-name">{p.userName}</div>
                      <div className="user-contact">{p.userPhone ? `+91 ${p.userPhone}` : p.userEmail}</div>
                    </td>

                    <td>
                      <div className="friend-name">{p.friendName}</div>
                      {p.friendPhone && <div className="friend-phone">+91 {p.friendPhone}</div>}
                    </td>

                    <td>
                      <span className={`channel-badge badge-${p.mode || 'cash'}`}>
                        {p.mode?.toUpperCase()}
                      </span>
                      <div className="action-nature">
                        {p.action === 'minus' ? '🔻 Repayment (-)' : '🔺 Added (+)'}
                      </div>
                    </td>

                    <td>
                      <span className={`amount-text ${p.action === 'minus' ? 'amount-deduct' : 'amount-add'}`}>
                        {p.action === 'minus' ? '-' : '+'}₹{Number(p.amount).toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td>
                      <span className={`status-pill pill-${isRefunded ? 'danger' : 'success'}`}>
                        {isRefunded ? 'Refunded' : 'Success'}
                      </span>
                      {isRefunded && (
                        <div className="refund-date">
                          {p.refundDate ? format(new Date(p.refundDate), 'dd/MM hh:mm a') : ''}
                        </div>
                      )}
                    </td>

                    <td>
                      <code className="ref-code" title={p.paymentId || p.paymentDbId}>
                        {(p.paymentId || p.paymentDbId || 'MANUAL').slice(0, 16)}
                      </code>
                      {p.notes && <div className="note-text">{p.notes}</div>}
                    </td>

                    <td>
                      {isRefunded ? (
                        <div className="refund-done-badge" title={p.refundReason}>
                          <span>Ref: {p.refundId?.slice(0, 12)}</span>
                        </div>
                      ) : (
                        <button
                          className="refund-trigger-btn"
                          onClick={() => openRefundModal(p)}
                          title="Execute error resolution & refund"
                        >
                          <RotateCcw size={13} />
                          <span>Refund</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Refund Modal */}
      {refundModalPayment && (
        <div
          className="admin-modal-overlay"
          onClick={() => !isProcessingRefund && setRefundModalPayment(null)}
        >
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={22} color="#dc2626" />
                <h3>Process Transaction Refund</h3>
              </div>
              <button
                className="close-modal-btn"
                onClick={() => setRefundModalPayment(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="refund-alert-notice">
              <AlertTriangle size={18} color="#b45309" />
              <div>
                <strong>Reconciliation Impact:</strong>
                <div>
                  Refunding this transaction will automatically reverse ₹{refundModalPayment.amount} and re-open the debt on <strong>{refundModalPayment.friendName}</strong>'s ledger balance.
                </div>
              </div>
            </div>

            <form onSubmit={handleProcessRefund}>
              <div className="modal-field">
                <label>Lender & Friend Record</label>
                <div className="readonly-box">
                  <div><strong>Lender:</strong> {refundModalPayment.userName}</div>
                  <div><strong>Friend:</strong> {refundModalPayment.friendName}</div>
                  <div><strong>Payment Mode:</strong> {refundModalPayment.mode?.toUpperCase()}</div>
                  {refundModalPayment.paymentId && <div><strong>Gateway ID:</strong> {refundModalPayment.paymentId}</div>}
                </div>
              </div>

              <div className="modal-field">
                <label>Refund Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={refundModalPayment.amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  required
                />
              </div>

              <div className="modal-field">
                <label>Reason for Refund / Error Correction</label>
                <textarea
                  rows="3"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Specify customer complaint, wrong payment amount, payment gateway dispute, or technical error..."
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setRefundModalPayment(null)}
                  disabled={isProcessingRefund}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm-refund"
                  disabled={isProcessingRefund}
                >
                  {isProcessingRefund ? <Loader2 size={16} className="spin" /> : <RotateCcw size={16} />}
                  <span>Confirm ₹{refundAmount || 0} Refund</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

