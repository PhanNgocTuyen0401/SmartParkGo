import { useState } from 'react';
import {
  CreditCard,
  Plus,
  ReceiptText,
  Trash2,
  Check,
  X,
  ShieldCheck,
  Building2,
  Wallet,
  BadgeCheck,
  Download,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import PropTypes from 'prop-types';

/* ─────────────────────────────────────────────
   Dữ liệu giao dịch mẫu cho xuất hóa đơn VAT
───────────────────────────────────────────── */
const SAMPLE_TRANSACTIONS = [
  { date: '18/09/2026', desc: 'Đỗ xe Aeon Mall Thanh Khê 1 - 2h',           pre: 50000,   vat: 4000,   total: 54000   },
  { date: '16/09/2026', desc: 'Đặt chỗ Vincom Plaza Ngô Quyền - Vé Ngày',   pre: 100000,  vat: 8000,   total: 108000  },
  { date: '10/09/2026', desc: 'Gói Tháng SmartPark Sân Bay Quốc Tế',         pre: 1800000, vat: 144000, total: 1944000 },
];

/* ─────────────────────────────────────────────
   Loại phương thức thanh toán
───────────────────────────────────────────── */
const METHOD_TYPES = [
  { value: 'momo',    labelVi: 'MoMo',                   labelEn: 'MoMo',                   icon: <Wallet    size={16} /> },
  { value: 'zalopay', labelVi: 'ZaloPay',                labelEn: 'ZaloPay',                icon: <Wallet    size={16} /> },
  { value: 'bank',    labelVi: 'Tài khoản Ngân hàng',    labelEn: 'Bank Account',           icon: <Building2 size={16} /> },
  { value: 'card',    labelVi: 'Thẻ Visa / Mastercard',  labelEn: 'Visa / Mastercard',      icon: <CreditCard size={16} /> },
];

/* ─────────────────────────────────────────────
   Helper: icon box theo loại
───────────────────────────────────────────── */
function MethodIconBox({ type, name }) {
  const map = {
    momo:    { label: 'M', bg: '#ae2d68', color: '#fff' },
    zalopay: { label: 'Z', bg: '#0068ff', color: '#fff' },
    bank:    { label: <Building2 size={18} />, bg: '#1e3a5f', color: '#fff' },
    card:    { label: <CreditCard size={18} />, bg: '#374151', color: '#fff' },
  };
  const style = map[type] || { label: name?.[0] || '?', bg: '#6b7280', color: '#fff' };
  return (
    <div
      className={`pf-linked-icon-box ${type}`}
      style={{
        background: style.bg,
        color: style.color,
        width: 42,
        height: 42,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: '0.9rem',
        flexShrink: 0,
      }}
    >
      {style.label}
    </div>
  );
}
MethodIconBox.propTypes = { type: PropTypes.string, name: PropTypes.string };

/* ─────────────────────────────────────────────
   Helper: format tiền VND
───────────────────────────────────────────── */
const fmtVND = (n) => n.toLocaleString('vi-VN') + ' VND';

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function PaymentsView({
  paymentMethods,
  setPaymentMethods,
  userEmail,
  language = 'vi',
}) {
  /* ── Modal state ── */
  const [showModal, setShowModal]     = useState(false);
  const [methodType, setMethodType]   = useState('momo');
  const [formData, setFormData]       = useState({});
  const [formError, setFormError]     = useState('');
  const [submitting, setSubmitting]   = useState(false);

  /* ── Delete confirm ── */
  const [deleteId, setDeleteId]       = useState(null);

  /* ─────────────────────── handlers ─────────────────────── */

  const handleSetDefault = (id) => {
    setPaymentMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
  };

  const handleDelete = (id) => {
    setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
    setDeleteId(null);
  };

  const resetModal = () => {
    setShowModal(false);
    setMethodType('momo');
    setFormData({});
    setFormError('');
    setSubmitting(false);
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const d = formData;
    if (methodType === 'momo' || methodType === 'zalopay') {
      if (!d.phone || !/^(0[3|5|7|8|9])+([0-9]{8})$/.test(d.phone.trim()))
        return language === 'vi' ? 'Số điện thoại không hợp lệ (định dạng 10 chữ số).' : 'Invalid phone number (10-digit format).';
    }
    if (methodType === 'bank') {
      if (!d.accountNumber || d.accountNumber.trim().length < 6)
        return language === 'vi' ? 'Số tài khoản phải có ít nhất 6 ký tự.' : 'Account number must be at least 6 digits.';
      if (!d.bankName || d.bankName.trim().length < 2)
        return language === 'vi' ? 'Vui lòng nhập tên ngân hàng.' : 'Please enter bank name.';
    }
    if (methodType === 'card') {
      if (!d.cardNumber || !/^\d{16}$/.test(d.cardNumber.replace(/\s/g, '')))
        return language === 'vi' ? 'Số thẻ phải gồm 16 chữ số.' : 'Card number must be 16 digits.';
      if (!d.cvv || !/^\d{3,4}$/.test(d.cvv.trim()))
        return language === 'vi' ? 'CVV phải gồm 3–4 chữ số.' : 'CVV must be 3-4 digits.';
      if (!d.expiry || !/^(0[1-9]|1[0-2])\/\d{2,4}$/.test(d.expiry.trim()))
        return language === 'vi' ? 'Ngày hết hạn không hợp lệ (MM/YY).' : 'Invalid expiry date (MM/YY).';
      if (!d.cardHolder || d.cardHolder.trim().length < 2)
        return language === 'vi' ? 'Vui lòng nhập tên chủ thẻ.' : 'Please enter cardholder name.';
    }
    return '';
  };

  const handleSubmit = () => {
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setSubmitting(true);

    /* Tạo object phương thức mới */
    let name = '';
    let account = '';

    if (methodType === 'momo') {
      name    = language === 'vi' ? 'Ví MoMo' : 'MoMo Wallet';
      account = formData.phone;
    } else if (methodType === 'zalopay') {
      name    = 'ZaloPay';
      account = formData.phone;
    } else if (methodType === 'bank') {
      name    = `${formData.bankName.trim()} – ${language === 'vi' ? 'TK' : 'Acc'}`;
      account = `****${formData.accountNumber.trim().slice(-4)}`;
    } else if (methodType === 'card') {
      const raw = formData.cardNumber.replace(/\s/g, '');
      name    = `${language === 'vi' ? 'Thẻ' : 'Card'} ${raw.startsWith('4') ? 'Visa' : 'Mastercard'}`;
      account = `**** **** **** ${raw.slice(-4)}`;
    }

    const newMethod = {
      id:        Date.now(),
      type:      methodType,
      name,
      account,
      isDefault: paymentMethods.length === 0,
      status:    language === 'vi' ? 'Hoạt động' : 'Active',
      cashback:  null,
    };

    /* Simulate slight network delay */
    setTimeout(() => {
      setPaymentMethods((prev) => [...prev, newMethod]);
      resetModal();
    }, 600);
  };

  /* ─────────────────────── jsPDF export ─────────────────────── */
  const handleExportVAT = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW  = 210;
    const ML  = 18;
    const MR  = 192;

    /* ── Header background ── */
    doc.setFillColor(15, 17, 21);
    doc.rect(0, 0, PW, 38, 'F');

    /* ── Logo text ── */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('SmartPark', ML, 18);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.text('HOA DON GIA TRI GIA TANG (VAT)', ML, 24);

    /* ── Invoice number & date (right side) ── */
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8);
    const today = new Date().toLocaleDateString('vi-VN');
    doc.text(`Ngay xuat: ${today}`, MR, 16, { align: 'right' });
    doc.text(`So HD: SP-${Date.now().toString().slice(-8)}`, MR, 22, { align: 'right' });

    /* ── Company info ── */
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SmartPark Da Nang', ML, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('Dia chi : 123 Duong Ngo Quyen, Quan Son Tra, Da Nang', ML, 54);
    doc.text('Dien thoai: (0236) 3800 999   |   Email: invoice@smartpark.vn', ML, 59);
    doc.text('Ma so thue (MST): 0401234567', ML, 64);

    /* ── Divider ── */
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(ML, 69, MR, 69);

    /* ── Customer block ── */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text('KHACH HANG', ML, 75);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Email: ${userEmail || 'khachhang@email.com'}`, ML, 81);
    doc.text('Thang: Thang 09/2026', ML, 86);

    /* ── Table header ── */
    const tableTop = 94;
    const colW = [28, 88, 24, 22, 26]; // date | desc | pre | vat | total
    const colX = [ML, ML + 28, ML + 116, ML + 140, ML + 162];

    doc.setFillColor(15, 17, 21);
    doc.rect(ML, tableTop, MR - ML, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    const headers = ['NGAY', 'MO TA DICH VU', 'CHUA THUE', 'VAT 8%', 'TONG CONG'];
    headers.forEach((h, i) => {
      doc.text(h, colX[i] + 1.5, tableTop + 5.5);
    });

    /* ── Table rows ── */
    let rowY = tableTop + 8;
    SAMPLE_TRANSACTIONS.forEach((tx, idx) => {
      const bg = idx % 2 === 0 ? [248, 249, 250] : [255, 255, 255];
      doc.setFillColor(...bg);
      doc.rect(ML, rowY, MR - ML, 10, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(50, 50, 50);

      doc.text(tx.date,                         colX[0] + 1.5, rowY + 6.5);
      doc.text(tx.desc,                         colX[1] + 1.5, rowY + 6.5);
      doc.text(tx.pre.toLocaleString('vi-VN'),  colX[2] + colW[2], rowY + 6.5, { align: 'right' });
      doc.text(tx.vat.toLocaleString('vi-VN'),  colX[3] + colW[3], rowY + 6.5, { align: 'right' });
      doc.text(tx.total.toLocaleString('vi-VN'), colX[4] + colW[4], rowY + 6.5, { align: 'right' });

      rowY += 10;
    });

    /* ── Table border ── */
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.rect(ML, tableTop, MR - ML, rowY - tableTop, 'S');

    /* ── Totals ── */
    const sumPre   = SAMPLE_TRANSACTIONS.reduce((a, t) => a + t.pre, 0);
    const sumVat   = SAMPLE_TRANSACTIONS.reduce((a, t) => a + t.vat, 0);
    const sumTotal = SAMPLE_TRANSACTIONS.reduce((a, t) => a + t.total, 0);

    rowY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('Tong chua thue:',               MR - 60, rowY);
    doc.text(fmtVND(sumPre),                  MR,       rowY, { align: 'right' });

    rowY += 6;
    doc.text('Tong VAT (8%):',                MR - 60, rowY);
    doc.text(fmtVND(sumVat),                  MR,       rowY, { align: 'right' });

    rowY += 2;
    doc.setLineWidth(0.4);
    doc.line(MR - 70, rowY + 1, MR, rowY + 1);
    rowY += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 17, 21);
    doc.text('TONG THANH TOAN:',              MR - 70, rowY);
    doc.text(fmtVND(sumTotal),                MR,       rowY, { align: 'right' });

    /* ── Footer note ── */
    rowY += 14;
    doc.setLineWidth(0.3);
    doc.setDrawColor(200, 200, 200);
    doc.line(ML, rowY, MR, rowY);
    rowY += 5;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Hoa don nay duoc phat hanh tu dong boi he thong SmartPark. Moi thac mac xin lien he: support@smartpark.vn',
      ML, rowY
    );
    doc.text('Cam on Quy Khach da su dung dich vu SmartPark Da Nang!', ML, rowY + 5);

    doc.save('HoaDonVAT_SmartPark.pdf');
  };

  /* ─────────────────────── render ─────────────────────── */
  return (
    <div className="pf-menu-view-container">

      {/* ═══════════════ HEADER BANNER ═══════════════ */}
      <div className="pf-view-header-banner" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="pf-slot-dialog-tag">
            <span className="pf-live-dot" /> {language === 'vi' ? 'LIÊN KẾT THANH TOÁN TỰ ĐỘNG' : 'TOUCHLESS AUTO-PAYMENT'}
          </div>
          <h2>{language === 'vi' ? 'PHƯƠNG THỨC THANH TOÁN & LIÊN KẾT' : 'PAYMENT METHODS & LINKED ACCOUNTS'}</h2>
          <p style={{ marginTop: '0.3rem', fontSize: '0.82rem', color: '#6b7280', maxWidth: 540 }}>
            {language === 'vi'
              ? 'Liên kết MoMo, ZaloPay, Tài khoản Ngân hàng và Thẻ quốc tế để tự động thanh toán không dừng qua barrier.'
              : 'Link MoMo, ZaloPay, Bank Accounts and Credit Cards for seamless, touchless barrier pass auto-billing.'}
          </p>
        </div>
        <button className="pf-btn-reserve-slot" onClick={() => setShowModal(true)}>
          <Plus size={15} /> {language === 'vi' ? 'Thêm phương thức mới' : 'Add New Method'}
        </button>
      </div>

      {/* ═══════════════ BODY GRID ═══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>

        {/* ── LEFT: danh sách phương thức ── */}
        <div>
          <h3 style={{ fontSize: '1rem', fontFamily: 'Space Grotesk', marginBottom: '1rem', color: '#111827' }}>
            {language === 'vi' ? 'Tài khoản đã liên kết thanh toán' : 'Linked Payment Accounts'}
          </h3>

          {paymentMethods.length === 0 && (
            <div
              style={{
                border: '1.5px dashed #d1d5db',
                borderRadius: 12,
                padding: '2rem 1.5rem',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: '0.82rem',
              }}
            >
              <Wallet size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.35 }} />
              <p>{language === 'vi' ? 'Chưa có phương thức nào được liên kết.' : 'No payment methods linked yet.'}</p>
              <button
                className="pf-btn-reserve-slot"
                style={{ marginTop: '1rem' }}
                onClick={() => setShowModal(true)}
              >
                <Plus size={14} /> {language === 'vi' ? 'Thêm ngay' : 'Add Now'}
              </button>
            </div>
          )}

          {paymentMethods.map((method) => (
            <div key={method.id} className="pf-linked-method-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: 12, border: '1px solid var(--pf-border, #e5e7eb)', background: '#fff', marginBottom: '0.75rem' }}>
              <div className="pf-linked-method-left" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                <MethodIconBox type={method.type} name={method.name} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#111827' }}>{method.name}</strong>
                    {method.isDefault && (
                      <span style={{ fontSize: '0.6rem', background: '#0f1115', color: '#fff', padding: '0.12rem 0.42rem', borderRadius: 4, fontWeight: 800, letterSpacing: '0.03em' }}>
                        {language === 'vi' ? 'MẶC ĐỊNH' : 'DEFAULT'}
                      </span>
                    )}
                    {method.cashback && (
                      <span style={{ fontSize: '0.62rem', background: '#ecfdf5', color: '#047857', padding: '0.1rem 0.38rem', borderRadius: 4, fontWeight: 700 }}>
                        {method.cashback}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: '#6b7280', marginTop: '0.1rem' }}>
                    {method.account}&nbsp;·&nbsp;
                    <span style={{ color: '#10b981', fontWeight: 700 }}>{method.status}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                {!method.isDefault && (
                  <button className="pf-quick-chip" onClick={() => handleSetDefault(method.id)} title={language === 'vi' ? 'Đặt làm mặc định' : 'Set as default'}>
                    <Check size={12} /> {language === 'vi' ? 'Mặc định' : 'Default'}
                  </button>
                )}
                {method.isDefault && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
                    <BadgeCheck size={14} /> {language === 'vi' ? 'Đang dùng' : 'Active'}
                  </span>
                )}
                <button
                  style={{ border: 0, background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                  onClick={() => setDeleteId(method.id)}
                  title={language === 'vi' ? 'Xóa phương thức' : 'Remove method'}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          {/* Security note */}
          <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ShieldCheck size={18} color="#10b981" style={{ flexShrink: 0 }} />
            <small style={{ color: '#065f46', fontSize: '0.72rem', lineHeight: 1.5 }}>
              {language === 'vi'
                ? 'Mọi giao dịch qua MoMo, ZaloPay và Ngân hàng được mã hóa chuẩn bảo mật PCI-DSS Level 1.'
                : 'All transactions via MoMo, ZaloPay, and Banks are encrypted under PCI-DSS Level 1 security standard.'}
            </small>
          </div>
        </div>

        {/* ── RIGHT: Hóa đơn VAT ── */}
        <div className="pf-card" style={{ padding: '1.5rem', height: 'fit-content', borderRadius: 14 }}>
          <h3 style={{ fontSize: '1rem', fontFamily: 'Space Grotesk', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#111827' }}>
            <ReceiptText size={17} /> {language === 'vi' ? 'Hóa đơn điện tử VAT' : 'Electronic VAT Invoice'}
          </h3>
          <p style={{ fontSize: '0.73rem', color: '#6b7280', lineHeight: 1.6, marginBottom: '1rem' }}>
            {language === 'vi'
              ? 'Mỗi lần thanh toán đỗ xe, hóa đơn VAT hợp lệ của SmartPark sẽ được gửi tự động về email của bạn và có thể xuất PDF ngay tại đây.'
              : 'Every time you pay for parking, a compliant VAT invoice from SmartPark is automatically sent to your email and ready for PDF export.'}
          </p>

          {/* Email block */}
          <div style={{ padding: '0.8rem 1rem', background: 'var(--pf-surface-subtle, #f9fafb)', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: '1.1rem' }}>
            <span style={{ fontSize: '0.62rem', color: '#9ca3af', fontWeight: 800, letterSpacing: '0.05em', display: 'block', marginBottom: '0.2rem' }}>
              {language === 'vi' ? 'EMAIL NHẬN HÓA ĐƠN' : 'INVOICE RECEIVING EMAIL'}
            </span>
            <strong style={{ fontSize: '0.82rem', color: '#111827' }}>
              {userEmail || 'khachhang@smartpark.vn'}
            </strong>
          </div>

          {/* Transaction preview */}
          <div style={{ marginBottom: '1.1rem' }}>
            {SAMPLE_TRANSACTIONS.map((tx, i) => (
              <div
                key={i}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.55rem 0', borderBottom: i < SAMPLE_TRANSACTIONS.length - 1 ? '1px solid #f3f4f6' : 'none', gap: '0.5rem' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: '#374151', fontWeight: 600, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.desc}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '0.1rem' }}>{tx.date}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#111827' }}>
                    {tx.total.toLocaleString('vi-VN')}₫
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#9ca3af' }}>VAT: {tx.vat.toLocaleString('vi-VN')}₫</div>
                </div>
              </div>
            ))}
          </div>

          {/* Export button */}
          <button
            className="pf-btn-reserve-slot"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleExportVAT}
          >
            <Download size={14} /> {language === 'vi' ? 'Xuất hóa đơn VAT (PDF)' : 'Export VAT Invoice (PDF)'}
          </button>
        </div>
      </div>

      {/* ═══════════════ MODAL: THÊM PHƯƠNG THỨC ═══════════════ */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) resetModal(); }}
        >
          <div
            style={{
              background: '#fff', borderRadius: 16, padding: '1.75rem',
              width: '100%', maxWidth: 460,
              boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
              animation: 'pf-modal-in 0.18s ease',
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontFamily: 'Space Grotesk', color: '#111827', margin: 0 }}>
                  {language === 'vi' ? 'Thêm phương thức thanh toán' : 'Add Payment Method'}
                </h3>
                <p style={{ fontSize: '0.73rem', color: '#6b7280', margin: '0.2rem 0 0' }}>
                  {language === 'vi' ? 'Chọn loại và điền thông tin liên kết' : 'Select type and enter account details'}
                </p>
              </div>
              <button
                onClick={resetModal}
                style={{ border: 0, background: '#f3f4f6', color: '#374151', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Type selector */}
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', letterSpacing: '0.04em', display: 'block', marginBottom: '0.45rem' }}>
              {language === 'vi' ? 'LOẠI PHƯƠNG THỨC' : 'PAYMENT TYPE'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {METHOD_TYPES.map((mt) => (
                <button
                  key={mt.value}
                  onClick={() => { setMethodType(mt.value); setFormData({}); setFormError(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.65rem 0.85rem', border: '1.5px solid',
                    borderColor: methodType === mt.value ? '#0f1115' : '#e5e7eb',
                    borderRadius: 10, background: methodType === mt.value ? '#0f1115' : '#f9fafb',
                    color: methodType === mt.value ? '#fff' : '#374151',
                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {mt.icon} {language === 'vi' ? mt.labelVi : mt.labelEn}
                </button>
              ))}
            </div>

            {/* Dynamic form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

              {(methodType === 'momo' || methodType === 'zalopay') && (
                <FormField
                  label={language === 'vi' ? 'Số điện thoại đăng ký' : 'Registered Phone Number'}
                  placeholder={language === 'vi' ? 'VD: 0901234567' : 'e.g. 0901234567'}
                  value={formData.phone || ''}
                  onChange={(v) => handleFieldChange('phone', v)}
                  type="tel"
                  maxLength={10}
                />
              )}

              {methodType === 'bank' && (
                <>
                  <FormField
                    label={language === 'vi' ? 'Tên Ngân hàng' : 'Bank Name'}
                    placeholder={language === 'vi' ? 'VD: Vietcombank, BIDV, Techcombank...' : 'e.g. Vietcombank, Chase, HSBC...'}
                    value={formData.bankName || ''}
                    onChange={(v) => handleFieldChange('bankName', v)}
                  />
                  <FormField
                    label={language === 'vi' ? 'Số tài khoản' : 'Account Number'}
                    placeholder={language === 'vi' ? 'VD: 0071000123456' : 'e.g. 0071000123456'}
                    value={formData.accountNumber || ''}
                    onChange={(v) => handleFieldChange('accountNumber', v)}
                    type="text"
                    maxLength={20}
                  />
                </>
              )}

              {methodType === 'card' && (
                <>
                  <FormField
                    label={language === 'vi' ? 'Số thẻ' : 'Card Number'}
                    placeholder="0000 0000 0000 0000"
                    value={formData.cardNumber || ''}
                    onChange={(v) => {
                      const raw = v.replace(/\D/g, '').slice(0, 16);
                      const fmt = raw.match(/.{1,4}/g)?.join(' ') || raw;
                      handleFieldChange('cardNumber', fmt);
                    }}
                    type="text"
                    maxLength={19}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <FormField
                      label={language === 'vi' ? 'Ngày hết hạn' : 'Expiry Date'}
                      placeholder="MM/YY"
                      value={formData.expiry || ''}
                      onChange={(v) => handleFieldChange('expiry', v)}
                      maxLength={5}
                    />
                    <FormField
                      label="CVV"
                      placeholder={language === 'vi' ? '3–4 chữ số' : '3–4 digits'}
                      value={formData.cvv || ''}
                      onChange={(v) => handleFieldChange('cvv', v.replace(/\D/g, '').slice(0, 4))}
                      type="password"
                      maxLength={4}
                    />
                  </div>
                  <FormField
                    label={language === 'vi' ? 'Tên chủ thẻ (in hoa)' : 'Cardholder Name (Uppercase)'}
                    placeholder="NGUYEN VAN A"
                    value={formData.cardHolder || ''}
                    onChange={(v) => handleFieldChange('cardHolder', v.toUpperCase())}
                  />
                </>
              )}
            </div>

            {/* Error */}
            {formError && (
              <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.85rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <X size={13} color="#ef4444" style={{ flexShrink: 0 }} />
                <small style={{ color: '#dc2626', fontSize: '0.75rem' }}>{formError}</small>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={resetModal}
                style={{ flex: 1, padding: '0.7rem', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              >
                {language === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="pf-btn-reserve-slot"
                style={{ flex: 2, justifyContent: 'center', opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? (
                  <>{language === 'vi' ? 'Đang xử lý...' : 'Processing...'}</>
                ) : (
                  <><Check size={14} /> {language === 'vi' ? 'Xác nhận liên kết' : 'Confirm & Link'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: XÁC NHẬN XÓA ═══════════════ */}
      {deleteId !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1001,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteId(null); }}
        >
          <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', maxWidth: 360, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <div style={{ width: 38, height: 38, background: '#fef2f2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={18} color="#ef4444" />
              </div>
              <h4 style={{ fontSize: '0.95rem', color: '#111827', margin: 0 }}>
                {language === 'vi' ? 'Xóa phương thức?' : 'Remove Payment Method?'}
              </h4>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.55, marginBottom: '1.25rem' }}>
              {language === 'vi'
                ? 'Phương thức này sẽ bị xóa khỏi tài khoản. Bạn có thể thêm lại bất kỳ lúc nào.'
                : 'This payment method will be removed from your account. You can re-add it at any time.'}
            </p>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '0.65rem', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', borderRadius: 9, fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer' }}>
                {language === 'vi' ? 'Giữ lại' : 'Keep'}
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                style={{ flex: 1, padding: '0.65rem', border: 0, background: '#ef4444', color: '#fff', borderRadius: 9, fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {language === 'vi' ? 'Xóa' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Reusable form field
───────────────────────────────────────────── */
function FormField({ label, placeholder, value, onChange, type = 'text', maxLength }) {
  return (
    <div>
      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', letterSpacing: '0.04em', display: 'block', marginBottom: '0.35rem' }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', padding: '0.62rem 0.85rem',
          border: '1.5px solid #e5e7eb', borderRadius: 9,
          fontSize: '0.83rem', color: '#111827', background: '#fafafa',
          outline: 'none', boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#0f1115')}
        onBlur={(e)  => (e.target.style.borderColor = '#e5e7eb')}
      />
    </div>
  );
}
FormField.propTypes = {
  label:       PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  value:       PropTypes.string.isRequired,
  onChange:    PropTypes.func.isRequired,
  type:        PropTypes.string,
  maxLength:   PropTypes.number,
};

/* ─────────────────────────────────────────────
   PropTypes
───────────────────────────────────────────── */
PaymentsView.propTypes = {
  paymentMethods:    PropTypes.array.isRequired,
  setPaymentMethods: PropTypes.func.isRequired,
  userEmail:         PropTypes.string,
  language:          PropTypes.string,
};
