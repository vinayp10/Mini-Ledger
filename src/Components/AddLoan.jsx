import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, IndianRupee, Calendar, FileText, Upload, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import API from '../api/axiosConfig';
import toast from 'react-hot-toast';
import './AddLoan.css';

export default function AddLoan() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    friendName: '',
    friendPhone: '',
    type: 'lent',
    amount: '',
    dueDate: '',
    notes: '',
  });

  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Get tomorrow's date formatted as YYYY-MM-DD for min date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const validate = () => {
    const errs = {};
    if (!formData.friendName.trim()) {
      errs.friendName = 'Friend name is required';
    } else if (formData.friendName.trim().length < 2) {
      errs.friendName = 'Friend name must be at least 2 characters';
    } else if (formData.friendName.trim().length > 50) {
      errs.friendName = 'Friend name cannot exceed 50 characters';
    }

    if (!formData.amount) {
      errs.amount = 'Amount is required';
    } else if (isNaN(formData.amount) || Number(formData.amount) <= 0) {
      errs.amount = 'Amount must be a positive number';
    }

    if (!formData.dueDate) {
      errs.dueDate = 'Due date is required';
    } else {
      const selected = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected <= today) {
        errs.dueDate = 'Due date must be in the future';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file (PNG, JPG, JPEG)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be under 5MB');
        return;
      }
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // 1. Create the loan entry
      const payload = {
        friendName: formData.friendName.trim(),
        friendPhone: formData.friendPhone.trim(),
        type: formData.type,
        amount: parseFloat(formData.amount),
        dueDate: formData.dueDate,
        notes: formData.notes.trim(),
      };

      const res = await API.post('/loans', payload);
      const createdLoan = res.data?.data || res.data;

      // 2. Upload receipt if attached (Bonus requirement)
      if (receiptFile && createdLoan?._id) {
        const fileData = new FormData();
        fileData.append('receipt', receiptFile);
        try {
          await API.post(`/loans/${createdLoan._id}/receipt`, fileData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (uploadErr) {
          console.warn('Receipt upload failed:', uploadErr);
          toast('Loan saved, but receipt upload failed.', { icon: '⚠️' });
        }
      }

      toast.success('Loan entry added successfully!');
      navigate('/loans');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Failed to add loan entry';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-loan-page">
      <div className="add-loan-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <h2>New Loan Entry</h2>
        <p className="subtitle">Record money lent to a friend or colleague</p>
      </div>

      <div className="add-loan-card">
        <form onSubmit={handleSubmit} noValidate>
          {/* Transaction Type: Lent vs Borrowed */}
          <div className="form-group">
            <label>Transaction Nature</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, type: 'lent' }))}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: formData.type === 'lent' ? '2px solid #6366f1' : '1px solid #e2e8f0',
                  background: formData.type === 'lent' ? '#eef2ff' : '#ffffff',
                  color: formData.type === 'lent' ? '#4338ca' : '#475569',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>💸 I Lent Money (Given)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, type: 'borrowed' }))}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: formData.type === 'borrowed' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                  background: formData.type === 'borrowed' ? '#fef3c7' : '#ffffff',
                  color: formData.type === 'borrowed' ? '#b45309' : '#475569',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>📥 I Borrowed (Taken)</span>
              </button>
            </div>
          </div>

          {/* Friend Name */}
          <div className="form-group">
            <label htmlFor="friendName">Friend's Name <span className="req">*</span></label>
            <div className={`input-field ${errors.friendName ? 'has-error' : ''}`}>
              <User size={18} className="field-icon" />
              <input
                type="text"
                id="friendName"
                name="friendName"
                placeholder="e.g. Rahul Sharma"
                value={formData.friendName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            {errors.friendName && <span className="error-hint">{errors.friendName}</span>}
          </div>

          {/* Friend Phone (Optional for UPI/Razorpay reconciliation) */}
          <div className="form-group">
            <label htmlFor="friendPhone">Friend's Mobile / UPI No. <span className="optional">(Optional)</span></label>
            <div className="input-field">
              <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>+91</span>
              <input
                type="tel"
                id="friendPhone"
                name="friendPhone"
                placeholder="e.g. 9824774956"
                maxLength="10"
                value={formData.friendPhone}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label htmlFor="amount">Amount (₹) <span className="req">*</span></label>
            <div className={`input-field ${errors.amount ? 'has-error' : ''}`}>
              <IndianRupee size={18} className="field-icon" />
              <input
                type="number"
                id="amount"
                name="amount"
                placeholder="e.g. 5000"
                step="any"
                min="1"
                value={formData.amount}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            {errors.amount && <span className="error-hint">{errors.amount}</span>}
          </div>

          {/* Due Date */}
          <div className="form-group">
            <label htmlFor="dueDate">Due Date <span className="req">*</span></label>
            <div className={`input-field ${errors.dueDate ? 'has-error' : ''}`}>
              <Calendar size={18} className="field-icon" />
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                min={minDate}
                value={formData.dueDate}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            {errors.dueDate && <span className="error-hint">{errors.dueDate}</span>}
          </div>

          {/* Notes (Optional) */}
          <div className="form-group">
            <label htmlFor="notes">Notes <span className="optional">(Optional)</span></label>
            <div className="input-field textarea-field">
              <FileText size={18} className="field-icon textarea-icon" />
              <textarea
                id="notes"
                name="notes"
                placeholder="Purpose of loan, repayment terms, or notes..."
                rows="3"
                value={formData.notes}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          {/* Receipt Upload (Bonus requirement) */}
          <div className="form-group">
            <label>Receipt or Proof of Transfer <span className="optional">(Bonus Feature)</span></label>
            {!receiptPreview ? (
              <label className="receipt-dropzone">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  disabled={loading}
                />
                <Upload size={24} className="upload-icon" />
                <span className="dropzone-text">Click to upload payment receipt or screenshot</span>
                <span className="dropzone-sub">Supports PNG, JPG, JPEG (Max 5MB)</span>
              </label>
            ) : (
              <div className="receipt-preview-container">
                <img src={receiptPreview} alt="Receipt preview" className="receipt-thumb" />
                <div className="receipt-info">
                  <span className="file-name">{receiptFile?.name}</span>
                  <span className="file-size">{(receiptFile?.size / 1024).toFixed(1)} KB</span>
                  <button type="button" className="remove-receipt-btn" onClick={removeReceipt}>
                    Remove Photo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate('/loans')}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Saving Loan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Record Loan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

