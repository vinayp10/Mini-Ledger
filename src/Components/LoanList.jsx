import React, { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  CheckCircle,
  Loader2,
  AlertCircle,
  Clock,
  Filter,
  Image,
  X,
  CreditCard,
  PlusCircle,
  MinusCircle,
  History,
  Phone,
  Upload,
  ExternalLink
} from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import API from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './LoanList.css';

export default function LoanList() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Razorpay payment modal state
  const [payModalLoan, setPayModalLoan] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [isProcessingRazorpay, setIsProcessingRazorpay] = useState(false);

  // Friend-to-Friend +/- Adjustment Modal State
  const [adjustModalLoan, setAdjustModalLoan] = useState(null);
  const [adjustAction, setAdjustAction] = useState('minus'); // 'minus' or 'add'
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustMode, setAdjustMode] = useState('cash'); // 'cash', 'upi', 'bank_transfer'
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustReceipt, setAdjustReceipt] = useState(null);
  const [adjustReceiptPreview, setAdjustReceiptPreview] = useState(null);
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // History Drawer State
  const [historyModalLoan, setHistoryModalLoan] = useState(null);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const res = await API.get('/loans');
      const data = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setLoans(data);
    } catch (err) {
      toast.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (loan) => {
    if (loan.status === 'repaid') return 'repaid';
    if (loan.status === 'overdue') return 'overdue';
    if (loan.dueDate && isPast(parseISO(loan.dueDate))) return 'overdue';
    if (loan.status === 'partially_repaid') return 'partially_repaid';
    return 'pending';
  };

  const getRemainingBalance = (loan) => {
    return Math.max(0, loan.amount - (loan.paidAmount || 0));
  };

  const handleMarkRepaid = async (loanId) => {
    setActionLoading(loanId);
    try {
      await API.patch(`/loans/${loanId}/repay`);
      setLoans((prev) =>
        prev.map((loan) =>
          loan._id === loanId ? { ...loan, status: 'repaid', repaidDate: new Date(), paidAmount: loan.amount } : loan
        )
      );
      toast.success('Marked as repaid!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update loan');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (loanId) => {
    if (!window.confirm('Are you sure you want to delete this loan record?')) return;

    setActionLoading(loanId);
    try {
      await API.delete(`/loans/${loanId}`);
      setLoans((prev) => prev.filter((loan) => loan._id !== loanId));
      toast.success('Loan deleted');
    } catch (err) {
      toast.error('Failed to delete loan');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Razorpay Checkout Integration ──────────────────────────────────────────
  const openRazorpayModal = (loan) => {
    const remaining = getRemainingBalance(loan);
    setPayModalLoan(loan);
    setPayAmount(remaining > 0 ? remaining : loan.amount);
  };

  const handleRazorpayPayment = async (e) => {
    e.preventDefault();
    if (!payModalLoan) return;

    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount to pay');
      return;
    }

    setIsProcessingRazorpay(true);
    try {
      // 1. Create Razorpay order on backend
      const res = await API.post(`/loans/${payModalLoan._id}/payment/order`, {
        amount: amountNum,
      });

      const orderData = res.data?.data;
      const razorpayKey = orderData?.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TrgMH2nA0PnWUe';

      // 2. Configure Razorpay Checkout options
      const options = {
        key: razorpayKey,
        amount: orderData.amountPaise || Math.round(amountNum * 100),
        currency: 'INR',
        name: 'MiniLedger Lending',
        description: `Loan Repayment for ${payModalLoan.friendName}`,
        order_id: orderData.orderId.startsWith('order_test_') ? undefined : orderData.orderId,
        prefill: {
          name: user?.name || 'MiniLedger User',
          email: user?.email || '',
          contact: user?.phone ? `+91${user.phone}` : '9876543210',
        },
        theme: {
          color: '#4f46e5',
        },
        handler: async function (response) {
          try {
            // 3. Verify payment on backend & update balance (minus from remaining debt)
            const verifyRes = await API.post(`/loans/${payModalLoan._id}/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id || orderData.orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: amountNum,
              notes: `Razorpay Payment ID: ${response.razorpay_payment_id}`,
            });

            toast.success(`₹${amountNum} payment settled via Razorpay!`);
            setPayModalLoan(null);
            fetchLoans();
          } catch (verifyErr) {
            toast.error('Payment verification failed');
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessingRazorpay(false);
          },
        },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (failRes) {
          toast.error(`Payment failed: ${failRes.error.description}`);
          setIsProcessingRazorpay(false);
        });
        rzp.open();
      } else {
        // Fallback simulation if razorpay script couldn't be loaded (e.g. offline testing)
        toast('Razorpay checkout simulated (test mode)', { icon: '💳' });
        await API.post(`/loans/${payModalLoan._id}/payment/verify`, {
          razorpay_order_id: orderData.orderId,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          amount: amountNum,
          notes: 'Test Mode Settlement',
        });
        toast.success(`₹${amountNum} payment recorded!`);
        setPayModalLoan(null);
        fetchLoans();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate Razorpay payment');
    } finally {
      setIsProcessingRazorpay(false);
    }
  };

  // ─── Friend-to-Friend +/- Adjustment ──────────────────────────────────────────
  const openAdjustModal = (loan, defaultAction = 'minus') => {
    setAdjustModalLoan(loan);
    setAdjustAction(defaultAction);
    setAdjustAmount('');
    setAdjustMode('cash');
    setAdjustNotes('');
    setAdjustReceipt(null);
    setAdjustReceiptPreview(null);
  };

  const handleAdjustReceiptChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAdjustReceipt(file);
      const reader = new FileReader();
      reader.onloadend = () => setAdjustReceiptPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(adjustAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      const formData = new FormData();
      formData.append('amount', amountNum);
      formData.append('action', adjustAction);
      formData.append('mode', adjustMode);
      formData.append('notes', adjustNotes);
      if (adjustReceipt) {
        formData.append('receipt', adjustReceipt);
      }

      await API.post(`/loans/${adjustModalLoan._id}/adjustment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(
        adjustAction === 'minus'
          ? `Recorded ₹${amountNum} repayment received!`
          : `Recorded ₹${amountNum} additional amount added!`
      );
      setAdjustModalLoan(null);
      fetchLoans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record adjustment');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  const getReceiptUrl = (loan) => {
    if (!loan.receiptPath) return null;
    const base = 'http://localhost:5000/';
    return `${base}${loan.receiptPath}`;
  };

  // Filter and search
  const filteredLoans = loans
    .filter((loan) => {
      const status = getStatus(loan);
      if (activeFilter === 'all') return true;
      if (activeFilter === 'overdue') return status === 'overdue';
      if (activeFilter === 'repaid') return status === 'repaid';
      if (activeFilter === 'pending') return status === 'pending' || status === 'partially_repaid';
      return true;
    })
    .filter((loan) =>
      loan.friendName?.toLowerCase().includes(search.toLowerCase()) ||
      loan.friendPhone?.includes(search)
    );

  const filters = [
    { key: 'all', label: 'All', count: loans.length },
    { key: 'pending', label: 'Pending / Active', count: loans.filter((l) => ['pending', 'partially_repaid'].includes(getStatus(l))).length },
    { key: 'overdue', label: 'Overdue (Highlight Red)', count: loans.filter((l) => getStatus(l) === 'overdue').length },
    { key: 'repaid', label: 'Fully Repaid', count: loans.filter((l) => getStatus(l) === 'repaid').length },
  ];

  if (loading) {
    return (
      <div className="loan-list-loading">
        <Loader2 size={36} className="spin" />
        <p>Loading loan ledger & payment records...</p>
      </div>
    );
  }

  return (
    <div className="loan-list-page">
      <div className="loan-list-header">
        <div>
          <h2>Loan Records & Payment Reconciliation</h2>
          <p className="loan-list-subtitle">Track money lent to friends, process Razorpay payments, and record +/- friend settlements</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="loan-search-bar">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search by friend name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <Filter size={16} className="filter-icon" />
        {filters.map((f) => (
          <button
            key={f.key}
            className={`filter-tab ${activeFilter === f.key ? 'active' : ''} tab-${f.key}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
            <span className="filter-count">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Loan Entries */}
      {filteredLoans.length === 0 ? (
        <div className="empty-state">
          <AlertCircle size={48} />
          <p>No loans found</p>
          <span>
            {search ? 'No match found for your search term' : 'Add your first loan entry to start tracking'}
          </span>
        </div>
      ) : (
        <div className="loan-entries">
          {filteredLoans.map((loan) => {
            const status = getStatus(loan);
            const receiptUrl = getReceiptUrl(loan);
            const remaining = getRemainingBalance(loan);
            const paid = loan.paidAmount || 0;
            const isLent = !loan.type || loan.type === 'lent';

            return (
              <div
                key={loan._id}
                className={`loan-entry entry-${status}`}
              >
                <div className="entry-main">
                  <div className="entry-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h4 className="friend-name">{loan.friendName}</h4>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: isLent ? '#eef2ff' : '#fef3c7',
                          color: isLent ? '#4338ca' : '#b45309',
                        }}
                      >
                        {isLent ? '💸 Lent (Given)' : '📥 Borrowed (Taken)'}
                      </span>
                    </div>

                    <div className="entry-meta">
                      {loan.friendPhone && (
                        <span className="entry-date" style={{ color: '#4b5563' }}>
                          <Phone size={13} />
                          +91 {loan.friendPhone}
                        </span>
                      )}
                      <span className="entry-date">
                        <Clock size={13} />
                        Due: {formatDate(loan.dueDate)}
                      </span>
                      {loan.notes && (
                        <span className="entry-notes">{loan.notes}</span>
                      )}
                      {receiptUrl && (
                        <button
                          type="button"
                          className="receipt-badge-btn"
                          onClick={() => setSelectedReceipt(receiptUrl)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#e0e7ff',
                            color: '#4338ca',
                            border: 'none',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          <Image size={12} /> View Receipt
                        </button>
                      )}
                      {loan.payments && loan.payments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setHistoryModalLoan(loan)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          <History size={12} /> {loan.payments.length} Payments
                        </button>
                      )}
                    </div>

                    {/* Progress Bar for Partial Payments */}
                    {loan.status !== 'repaid' && paid > 0 && (
                      <div style={{ marginTop: '10px', maxWidth: '320px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b', marginBottom: '3px' }}>
                          <span>Paid: ₹{paid.toLocaleString('en-IN')}</span>
                          <span>Remaining: ₹{remaining.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, (paid / loan.amount) * 100)}%`,
                              height: '100%',
                              background: '#10b981',
                              borderRadius: '3px',
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="entry-right">
                    <span className="entry-amount">₹{Number(loan.amount).toLocaleString('en-IN')}</span>
                    {loan.status !== 'repaid' && paid > 0 && (
                      <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '600' }}>
                        Due: ₹{remaining.toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className={`status-badge badge-${status}`}>
                      {status === 'repaid' && <CheckCircle size={12} />}
                      {status === 'overdue' && <AlertCircle size={12} />}
                      {status === 'pending' && <Clock size={12} />}
                      {status === 'partially_repaid' && <Clock size={12} />}
                      {status === 'partially_repaid'
                        ? 'Partial'
                        : status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="entry-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
                  {status !== 'repaid' && (
                    <>
                      {/* Razorpay Online Payment Button */}
                      <button
                        className="action-btn"
                        onClick={() => openRazorpayModal(loan)}
                        style={{
                          background: 'linear-gradient(135deg, #0c2340 0%, #1e40af 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '7px 12px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                        }}
                        title="Collect or pay online via Razorpay Gateway (UPI, Cards, NetBanking)"
                      >
                        <CreditCard size={14} />
                        <span>Pay with Razorpay</span>
                      </button>

                      {/* Minus (Repayment) Button */}
                      <button
                        className="action-btn"
                        onClick={() => openAdjustModal(loan, 'minus')}
                        style={{
                          background: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                          padding: '7px 12px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                        }}
                        title="Friend gave money: Minus/Reduce from debt"
                      >
                        <MinusCircle size={14} />
                        <span>- Minus Payment</span>
                      </button>

                      {/* Add (Increase Debt) Button */}
                      <button
                        className="action-btn"
                        onClick={() => openAdjustModal(loan, 'add')}
                        style={{
                          background: '#fffbeb',
                          color: '#92400e',
                          border: '1px solid #fde68a',
                          padding: '7px 12px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                        }}
                        title="Friend took more money: Add to debt"
                      >
                        <PlusCircle size={14} />
                        <span>+ Add More</span>
                      </button>

                      {/* Quick Full Settle */}
                      <button
                        className="action-btn repaid-btn"
                        onClick={() => handleMarkRepaid(loan._id)}
                        disabled={actionLoading === loan._id}
                        title="Mark full balance settled"
                      >
                        {actionLoading === loan._id ? (
                          <Loader2 size={14} className="spin" />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        Full Settle
                      </button>
                    </>
                  )}

                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDelete(loan._id)}
                    disabled={actionLoading === loan._id}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Razorpay Online Payment Modal */}
      {payModalLoan && (
        <div
          className="receipt-modal-overlay"
          onClick={() => !isProcessingRazorpay && setPayModalLoan(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={22} color="#4f46e5" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                  Razorpay Payment
                </h3>
              </div>
              <button
                onClick={() => setPayModalLoan(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '20px' }}>
              Process payment for <strong>{payModalLoan.friendName}</strong> using Razorpay (UPI, Credit/Debit Cards, NetBanking, Wallets).
            </p>

            <form onSubmit={handleRazorpayPayment}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Amount to Settle (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={payModalLoan.amount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                  required
                />
                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Outstanding Balance: ₹{getRemainingBalance(payModalLoan).toLocaleString('en-IN')}
                </span>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '20px',
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                <div><strong>Merchant Key:</strong> <code>rzp_test_TrgMH2nA0PnWUe</code></div>
                <div style={{ marginTop: '4px' }}><strong>Auto-reconciliation:</strong> Amount paid will automatically be subtracted from friend's remaining balance.</div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setPayModalLoan(null)}
                  disabled={isProcessingRazorpay}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingRazorpay}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                    color: '#ffffff',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  {isProcessingRazorpay ? <Loader2 size={16} className="spin" /> : <CreditCard size={16} />}
                  <span>Pay ₹{payAmount || 0} via Razorpay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Friend-to-Friend +/- Adjustment Modal */}
      {adjustModalLoan && (
        <div
          className="receipt-modal-overlay"
          onClick={() => !isSubmittingAdjust && setAdjustModalLoan(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                Record Friend-to-Friend Transaction
              </h3>
              <button
                onClick={() => setAdjustModalLoan(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Adjust balance with <strong>{adjustModalLoan.friendName}</strong> (Subtract repayment or add new borrowing) with optional receipt screenshot.
            </p>

            <form onSubmit={handleSaveAdjustment}>
              {/* Action Toggle (+ Add vs - Minus) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustAction('minus')}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: adjustAction === 'minus' ? '2px solid #10b981' : '1px solid #cbd5e1',
                    background: adjustAction === 'minus' ? '#ecfdf5' : '#ffffff',
                    color: adjustAction === 'minus' ? '#065f46' : '#475569',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <MinusCircle size={18} />
                  <span>- Minus Repayment</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustAction('add')}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: adjustAction === 'add' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                    background: adjustAction === 'add' ? '#fffbeb' : '#ffffff',
                    color: adjustAction === 'add' ? '#b45309' : '#475569',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <PlusCircle size={18} />
                  <span>+ Add More Debt</span>
                </button>
              </div>

              {/* Amount */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Adjustment Amount (₹) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="e.g. 500"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '15px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Payment Mode */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Payment Channel / Mode
                </label>
                <select
                  value={adjustMode}
                  onChange={(e) => setAdjustMode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="cash">💵 Cash in hand</option>
                  <option value="upi">📱 Google Pay / PhonePe / Paytm (UPI)</option>
                  <option value="bank_transfer">🏦 Bank NEFT / IMPS</option>
                  <option value="razorpay">💳 Razorpay Online</option>
                  <option value="adjustment">⚖️ Expense Split Adjustment</option>
                </select>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Remark / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sent via GPay, cash returned at office"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Attach Receipt Image */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Attach Payment Screenshot / Receipt (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAdjustReceiptChange}
                  style={{ display: 'block', fontSize: '12px', color: '#64748b' }}
                />
                {adjustReceiptPreview && (
                  <div style={{ marginTop: '8px' }}>
                    <img
                      src={adjustReceiptPreview}
                      alt="Receipt preview"
                      style={{ maxHeight: '100px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setAdjustModalLoan(null)}
                  disabled={isSubmittingAdjust}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: adjustAction === 'minus' ? '#10b981' : '#f59e0b',
                    color: '#ffffff',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingAdjust ? <Loader2 size={16} className="spin" /> : null}
                  <span>Confirm {adjustAction === 'minus' ? '- Deduct Repayment' : '+ Add to Debt'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History Audit Drawer / Modal */}
      {historyModalLoan && (
        <div
          className="receipt-modal-overlay"
          onClick={() => setHistoryModalLoan(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                  Payment Records: {historyModalLoan.friendName}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Total Principal: ₹{historyModalLoan.amount} | Repaid: ₹{historyModalLoan.paidAmount || 0}
                </span>
              </div>
              <button
                onClick={() => setHistoryModalLoan(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {historyModalLoan.payments && historyModalLoan.payments.length > 0 ? (
                historyModalLoan.payments.map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: p.action === 'add' ? '#fffbeb' : '#f0fdf4',
                      border: p.action === 'add' ? '1px solid #fde68a' : '1px solid #bbf7d0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: p.action === 'add' ? '#b45309' : '#15803d' }}>
                        {p.action === 'add' ? '+ Added ₹' : '- Repaid ₹'}{p.amount}
                        <span style={{ fontSize: '11px', fontWeight: '500', marginLeft: '6px', color: '#64748b' }}>
                          via {p.mode?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {p.notes || 'Friend payment recorded'}
                      </div>
                      {p.paymentId && (
                        <div style={{ fontSize: '11px', color: '#4f46e5', marginTop: '2px' }}>
                          ID: {p.paymentId}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {p.date ? format(new Date(p.date), 'dd MMM yyyy, hh:mm a') : 'Recent'}
                      </span>
                      {p.receiptPath && (
                        <div style={{ marginTop: '4px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(`http://localhost:5000/${p.receiptPath}`)}
                            style={{
                              border: 'none',
                              background: '#e0e7ff',
                              color: '#4338ca',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            Receipt Proof
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '13px', color: '#64748b' }}>No individual payment adjustments recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div
          className="receipt-modal-overlay"
          onClick={() => setSelectedReceipt(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="receipt-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                Payment Receipt Proof
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={selectedReceipt}
              alt="Payment receipt proof"
              style={{
                maxWidth: '100%',
                maxHeight: '65vh',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="14">Receipt image unavailable</text></svg>';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
