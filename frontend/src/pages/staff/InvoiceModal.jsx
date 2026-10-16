import { useState } from 'react';
import PropTypes from 'prop-types';
import { jsPDF } from 'jspdf';
import { Printer, Download, CheckCircle2, FileCheck, X } from 'lucide-react';

// ── @media print CSS nhúng thẳng vào component ──────────────────────────────
// Đảm bảo in đúng 1 trang A5 dù gọi từ GuestEntryDialog hay từ nhật ký
const INVOICE_PRINT_STYLE = `
@media print {
  @page {
    size: A5 portrait;
    margin: 8mm;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
  }
  body * { visibility: hidden !important; }

  .pf-vat-invoice-printzone,
  .pf-vat-invoice-printzone * {
    visibility: visible !important;
  }
  .pf-vat-invoice-printzone {
    position: fixed !important;
    inset: 0 !important;
    width: 100% !important;
    height: auto !important;
    padding: 0 !important;
    margin: 0 auto !important;
    background: #ffffff !important;
    display: flex !important;
    align-items: flex-start !important;
    justify-content: center !important;
  }
  /* Ẩn nút bấm khi in */
  .pf-invoice-dialog-head button,
  .pf-invoice-dialog-footer,
  .pf-invoice-export-success {
    display: none !important;
  }
}
`;

// ── Đọc số tiền thành chữ tiếng Việt ────────────────────────────────────────
function numberToVietnameseWords(num) {
  if (!num || isNaN(num) || num === 0) return 'Không đồng';
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readThreeDigits(n, readZeroHundreds) {
    let hundred = Math.floor(n / 100);
    let remainder = n % 100;
    let ten = Math.floor(remainder / 10);
    let unit = remainder % 10;
    let res = '';
    if (hundred > 0 || readZeroHundreds) res += digits[hundred] + ' trăm ';
    if (ten > 1) {
      res += digits[ten] + ' mươi ';
      if (unit === 1) res += 'mốt ';
      else if (unit === 5) res += 'lăm ';
      else if (unit > 0) res += digits[unit] + ' ';
    } else if (ten === 1) {
      res += 'mười ';
      if (unit === 5) res += 'lăm ';
      else if (unit > 0) res += digits[unit] + ' ';
    } else if (readZeroHundreds && remainder > 0) {
      res += 'lẻ ' + digits[unit] + ' ';
    } else if (unit > 0) {
      res += digits[unit] + ' ';
    }
    return res;
  }

  let str = '';
  let i = 0;
  let temp = num;
  while (temp > 0) {
    let block = temp % 1000;
    if (block > 0) str = readThreeDigits(block, temp > 999 && block < 100) + units[i] + ' ' + str;
    temp = Math.floor(temp / 1000);
    i++;
  }
  str = str.trim();
  return str.charAt(0).toUpperCase() + str.slice(1) + ' đồng chẵn.';
}

// ── Template hóa đơn VAT chuẩn (dùng chung cho cả GuestEntry và Nhật ký) ────
export function VatInvoiceTemplate({ invoice, invoiceNo, day, month, year, feeNum, preTaxNum, vatNum, wordsAmount }) {
  return (
    <div
      className="pf-vat-invoice-printzone"
      style={{
        background: '#ffffff',
        border: '2px solid #0f172a',
        borderRadius: '6px',
        padding: '14px 18px',
        maxWidth: '148mm',   /* Khổ A5 chuẩn */
        width: '100%',
        boxSizing: 'border-box',
        color: '#0f172a',
        fontFamily: '"Times New Roman", serif',
        fontSize: '13px',
        lineHeight: '1.5',
      }}
    >
      {/* ── Header hóa đơn ── */}
      <div style={{ textAlign: 'center', borderBottom: '1.5px solid #0f172a', paddingBottom: '10px', marginBottom: '10px' }}>
        <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', marginBottom: '2px', textTransform: 'uppercase' }}>
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        </div>
        <div style={{ fontSize: '9.5px', fontStyle: 'italic', color: '#64748b' }}>
          Độc lập - Tự do - Hạnh phúc
        </div>
        <div style={{ fontSize: '16px', fontWeight: 900, color: '#0284c7', letterSpacing: '0.04em', marginTop: '6px' }}>
          HÓA ĐƠN GIÁ TRỊ GIA TĂNG (VAT)
        </div>
        <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
          (Khởi tạo từ máy tính tiền - Nghị định 123/2020/NĐ-CP &amp; Thông tư 78/2021/TT-BTC)
        </div>
        <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '4px' }}>
          Ngày {day} tháng {month} năm {year}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '8px', fontSize: '10.5px', background: '#f8fafc', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'left' }}>Mẫu số: <strong>1/001</strong> &nbsp;·&nbsp; Ký hiệu: <strong>1C26TDA</strong></div>
          <div style={{ textAlign: 'right' }}>Số HĐ: <strong style={{ color: '#dc2626', fontSize: '12px' }}>{invoiceNo}</strong></div>
          <div style={{ textAlign: 'left', gridColumn: 'span 2', borderTop: '1px dashed #cbd5e1', paddingTop: '3px', marginTop: '2px' }}>
            Mã CQT: <strong style={{ fontFamily: 'monospace', color: '#0284c7' }}>00E9F241-8A7B-4F12-BC35-64903332A1F8</strong>
          </div>
        </div>
      </div>

      {/* ── Bên bán ── */}
      <div style={{ borderBottom: '1px dashed #94a3b8', paddingBottom: '8px', marginBottom: '8px', fontSize: '11.5px', lineHeight: '1.6' }}>
        <div><strong>ĐƠN VỊ BÁN HÀNG:</strong> <strong style={{ color: '#0369a1' }}>TỔNG CÔNG TY DỊCH VỤ ĐỖ XE THÔNG MINH SMARTPARK ĐÀ NẴNG</strong></div>
        <div>Mã số thuế: <strong>0401889248</strong> &nbsp;·&nbsp; Hotline: <strong>1900 6868</strong> &nbsp;·&nbsp; Email: cskh@smartpark.vn</div>
        <div>Địa chỉ: Tòa nhà Trung tâm Điều hành Giao thông Thông minh, 01 Lê Duẩn, Hải Châu 1, Hải Châu, Đà Nẵng</div>
        <div>Tài khoản ngân hàng: <strong>1028 6688 9999</strong> tại Vietcombank - CN Đà Nẵng &nbsp;·&nbsp; Cổng TT: <strong>https://smartpark.vn</strong></div>
      </div>

      {/* ── Bên mua ── */}
      <div style={{ borderBottom: '1px dashed #94a3b8', paddingBottom: '8px', marginBottom: '8px', fontSize: '11.5px', lineHeight: '1.5' }}>
        <div><strong>THÔNG TIN KHÁCH HÀNG &amp; PHƯƠNG TIỆN:</strong></div>
        <div>Họ tên người mua: <strong>{invoice.customer || invoice.customerName || 'Khách hàng vãng lai'}</strong></div>
        {invoice.company && <div>Tên đơn vị / Doanh nghiệp: <strong style={{ color: '#0369a1' }}>{invoice.company}</strong></div>}
        {invoice.taxCode && <div>Mã số thuế bên mua (MST): <strong style={{ fontFamily: 'monospace', color: '#0284c7' }}>{invoice.taxCode}</strong></div>}
        {invoice.taxEmail && <div>Email nhận hóa đơn CQT: <strong>{invoice.taxEmail}</strong></div>}
        <div>Biển số xe: <strong style={{ fontFamily: 'monospace', fontSize: '13px', color: '#0284c7' }}>{invoice.plate}</strong></div>
        <div>Vị trí ô đỗ: <strong>{invoice.slot || 'Tầng B1 · A-18'}</strong> ({invoice.vehicleType || 'Ô tô'})</div>
        <div>Thời gian vào / ra: <strong>{invoice.time || invoice.checkIn || new Date().toLocaleString('vi-VN')}</strong></div>
        <div>Hình thức thanh toán: <strong>{invoice.method || invoice.paymentMethod || 'Tiền mặt / E-Wallet / VietQR'}</strong></div>
      </div>

      {/* ── Bảng kê dịch vụ ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '8px', border: '1px solid #94a3b8' }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th style={{ border: '1px solid #94a3b8', padding: '5px 4px', textAlign: 'center', width: '28px' }}>STT</th>
            <th style={{ border: '1px solid #94a3b8', padding: '5px 4px', textAlign: 'left' }}>Tên dịch vụ / Hàng hóa</th>
            <th style={{ border: '1px solid #94a3b8', padding: '5px 4px', textAlign: 'center', width: '36px' }}>ĐVT</th>
            <th style={{ border: '1px solid #94a3b8', padding: '5px 4px', textAlign: 'center', width: '24px' }}>SL</th>
            <th style={{ border: '1px solid #94a3b8', padding: '5px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>Đơn giá (VND)</th>
            <th style={{ border: '1px solid #94a3b8', padding: '5px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>Thành tiền (VND)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 4px', textAlign: 'center' }}>1</td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>Dịch vụ trông giữ xe thông minh SmartPark</td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 4px', textAlign: 'center' }}>Lượt</td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 4px', textAlign: 'center' }}>01</td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 4px', textAlign: 'right' }}>{preTaxNum.toLocaleString('vi-VN')}</td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 4px', textAlign: 'right', fontWeight: 700 }}>{preTaxNum.toLocaleString('vi-VN')}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Tổng cộng & Thuế ── */}
      <div style={{ fontSize: '11.5px', lineHeight: '1.7' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Cộng tiền dịch vụ (chưa có thuế):</span>
          <strong>{preTaxNum.toLocaleString('vi-VN')} VND</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Thuế suất GTGT: <strong>8%</strong> &nbsp;·&nbsp; Tiền thuế GTGT:</span>
          <strong style={{ color: '#d97706' }}>{vatNum.toLocaleString('vi-VN')} VND</strong>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          borderTop: '1.5px solid #0f172a', paddingTop: '5px', marginTop: '4px',
          fontWeight: 900, fontSize: '13px', color: '#0284c7'
        }}>
          <span>TỔNG CỘNG TIỀN THANH TOÁN:</span>
          <span>{feeNum.toLocaleString('vi-VN')} VND</span>
        </div>
        <div style={{ fontStyle: 'italic', fontSize: '10.5px', color: '#475569', marginTop: '3px' }}>
          Số tiền viết bằng chữ: <strong>{wordsAmount}</strong>
        </div>
      </div>

      {/* ── Chữ ký ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px', fontSize: '11px', textAlign: 'center' }}>
        <div style={{ flex: 1 }}>
          <strong>NGƯỜI MUA HÀNG</strong>
          <div style={{ color: '#64748b', marginTop: '2px', marginBottom: '28px', fontSize: '10px' }}>(Ký, ghi rõ họ tên)</div>
          <div style={{ borderTop: '1px solid #334155', paddingTop: '3px' }}>{invoice.customer || 'Khách hàng vãng lai'}</div>
        </div>
        <div style={{ flex: 1 }}>
          <strong>NGƯỜI BÁN HÀNG</strong>
          <div style={{ color: '#64748b', marginTop: '2px', fontSize: '10px' }}>(Ký điện tử bởi Nhà cung cấp giải pháp)</div>
          <div style={{
            display: 'inline-block', border: '1.5px solid #10b981', background: '#f0fdf4', color: '#059669',
            borderRadius: '6px', padding: '6px 12px', margin: '6px 0', fontSize: '10px', textAlign: 'left'
          }}>
            <div style={{ fontWeight: 900, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ✓ ĐÃ KÝ ĐIỆN TỬ HỢP LỆ
            </div>
            <div style={{ color: '#065f46', fontWeight: 700, fontSize: '9.5px', marginTop: '2px' }}>
              TỔNG CÔNG TY SMARTPARK ĐÀ NẴNG
            </div>
            <div style={{ color: '#64748b', fontSize: '9px' }}>
              MST: 0401889248 · VNPT SmartCA
            </div>
            <div style={{ color: '#64748b', fontSize: '8.5px' }}>
              Ngày ký: {day}/{month}/{year}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer tra cứu ── */}
      <div style={{
        borderTop: '1px dashed #94a3b8', marginTop: '12px', paddingTop: '8px',
        textAlign: 'center', fontSize: '10px', color: '#64748b'
      }}>
        <div>Tra cứu hóa đơn điện tử tại: <strong>https://smartpark.vn/invoice</strong></div>
        <div>Mã tra cứu hóa đơn (Lookup Code): <strong style={{ fontFamily: 'monospace' }}>{invoiceNo}</strong></div>
      </div>
    </div>
  );
}

VatInvoiceTemplate.propTypes = {
  invoice: PropTypes.object.isRequired,
  invoiceNo: PropTypes.string.isRequired,
  day: PropTypes.string.isRequired,
  month: PropTypes.string.isRequired,
  year: PropTypes.number.isRequired,
  feeNum: PropTypes.number.isRequired,
  preTaxNum: PropTypes.number.isRequired,
  vatNum: PropTypes.number.isRequired,
  wordsAmount: PropTypes.string.isRequired,
};

// ── Modal hóa đơn VAT ────────────────────────────────────────────────────────
export default function InvoiceModal({ invoice, onClose }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!invoice) return null;

  // Tính toán số tiền
  const feeStr = String(invoice.fee || invoice.amount || '35.000đ');
  const feeNum = parseInt(feeStr.replace(/\D/g, ''), 10) || 35000;
  const preTaxNum = Math.round(feeNum / 1.08);
  const vatNum = feeNum - preTaxNum;
  const wordsAmount = numberToVietnameseWords(feeNum);

  // Số hóa đơn & ngày
  const invoiceNo = String(invoice.id || '0004928').replace(/\D/g, '').padStart(7, '0');
  const invoiceDate = new Date();
  const day = invoiceDate.getDate().toString().padStart(2, '0');
  const month = (invoiceDate.getMonth() + 1).toString().padStart(2, '0');
  const year = invoiceDate.getFullYear();

  // Xuất PDF A5 chuẩn
  const handleExportPdf = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

      // Viền khung hóa đơn kép
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.8);
      doc.rect(6, 6, 136, 197);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      doc.rect(8, 8, 132, 193);

      // Dòng quốc hiệu
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('CONG HOA XA HOI CHU NGHIA VIET NAM', 74, 14, { align: 'center' });

      // Tiêu đề hóa đơn
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(2, 132, 199);
      doc.text('HOA DON GIA TRI GIA TANG (VAT)', 74, 20, { align: 'center' });

      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.text('(Ban the hien hoa don dien tu - Nghi dinh 123/2020/ND-CP)', 74, 25.5, { align: 'center' });
      doc.text(`Ngay ${day} thang ${month} nam ${year}`, 74, 30, { align: 'center' });

      // Ký hiệu & số
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('Mau so: 1/001  |  Ky hieu: 1C26TDA', 13, 35);
      doc.text(`So hoa don (No.): ${invoiceNo}`, 135, 35, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(2, 132, 199);
      doc.text('Ma CQT: 00E9F241-8A7B-4F12-BC35-64903332A1F8', 13, 39);

      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.4);
      doc.line(13, 41, 135, 41);

      // Bên bán
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('DON VI BAN HANG:', 13, 46);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('TONG CONG TY DICH VU DO XE THONG MINH SMARTPARK DA NANG', 13, 51);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('Ma so thue: 0401889248  |  Hotline: 1900 6868  |  Web: https://smartpark.vn', 13, 55.5);
      doc.text('Dia chi: Toa nha TT Dieu hanh GT, 01 Le Duan, P. Hai Chau 1, TP. Da Nang', 13, 59.5);
      doc.text('Tai khoan: 1028 6688 9999 tai Vietcombank - CN Da Nang', 13, 63.5);

      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      doc.line(13, 66, 135, 66);

      // Bên mua
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('THONG TIN KHACH HANG & PHUONG TIEN:', 13, 66.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.text(`Ho ten nguoi mua: ${invoice.customer || 'Khach hang vang lai'}`, 13, 72);
      doc.text(`Bien so xe: ${invoice.plate}`, 13, 77);
      doc.text(`Vi tri o do: ${invoice.slot || 'Tang B1 · A-18'} (${invoice.vehicleType || 'O to'})`, 13, 82);
      doc.text(`Thoi gian vao/ra: ${invoice.time || new Date().toLocaleString('vi-VN')}`, 13, 87);
      doc.text(`Hinh thuc thanh toan: ${invoice.method || 'Tien mat / Napas VietQR / E-Wallet'}`, 13, 92);

      // Bảng kê dịch vụ (có viền)
      doc.setDrawColor(148, 163, 184);
      // Header bảng
      doc.setFillColor(241, 245, 249);
      doc.rect(13, 96, 122, 7, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text('STT', 16, 101);
      doc.text('Ten dich vu / Hang hoa', 26, 101);
      doc.text('DVT', 83, 101, { align: 'center' });
      doc.text('SL', 97, 101, { align: 'center' });
      doc.text('Don gia', 116, 101, { align: 'right' });
      doc.text('Thanh tien', 133, 101, { align: 'right' });

      // Dòng dữ liệu
      doc.rect(13, 103, 122, 10);
      doc.setFont('helvetica', 'normal');
      doc.text('01', 16, 109.5);
      doc.text('Dich vu trong giu xe thong minh SmartPark', 26, 109.5);
      doc.text('Luot', 83, 109.5, { align: 'center' });
      doc.text('01', 97, 109.5, { align: 'center' });
      doc.text(preTaxNum.toLocaleString('vi-VN'), 116, 109.5, { align: 'right' });
      doc.text(preTaxNum.toLocaleString('vi-VN'), 133, 109.5, { align: 'right' });

      // Tổng cộng & Thuế
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text('Cong tien dich vu (chua thue):', 60, 120);
      doc.text(`${preTaxNum.toLocaleString('vi-VN')} VND`, 133, 120, { align: 'right' });

      doc.text('Thue suat GTGT (VAT 8%):', 60, 126);
      doc.text(`${vatNum.toLocaleString('vi-VN')} VND`, 133, 126, { align: 'right' });

      doc.setDrawColor(2, 132, 199);
      doc.setLineWidth(0.6);
      doc.line(60, 129, 135, 129);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(2, 132, 199);
      doc.text('TONG CONG TIEN THANH TOAN:', 48, 135);
      doc.text(`${feeNum.toLocaleString('vi-VN')} VND`, 133, 135, { align: 'right' });

      // Đọc bằng chữ
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`So tien viet bang chu: ${wordsAmount}`, 13, 142);

      // Chữ ký
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('NGUOI MUA HANG', 35, 152, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('(Ky, ghi ro ho ten neu can)', 35, 156, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('NGUOI BAN HANG', 115, 152, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('(Ky dien tu, dong dau)', 115, 156, { align: 'center' });

      // Con dấu điện tử
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.6);
      doc.roundedRect(91, 159, 48, 18, 2, 2);
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('[DA KY DIEN TU]', 115, 166, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('SMARTPARK DA NANG CA', 115, 170.5, { align: 'center' });
      doc.text(`Ngay: ${day}/${month}/${year}`, 115, 175, { align: 'center' });

      // Footer
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      doc.line(13, 182, 135, 182);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Tra cuu hoa don dien tu tai: https://smartpark.vn/invoice', 74, 187, { align: 'center' });
      doc.text(`Ma tra cuu hoa don (Lookup Code): ${invoiceNo}`, 74, 191, { align: 'center' });

      doc.save(`HoaDonVAT_SmartPark_${invoice.plate.replace(/[\s\-\.]/g, '')}_${invoiceNo}.pdf`);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Lỗi khi xuất PDF:', err);
      alert('Không thể tạo file PDF: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintWindow = () => {
    window.print();
  };

  return (
    <>
      {/* Nhúng CSS print riêng cho hóa đơn */}
      <style>{INVOICE_PRINT_STYLE}</style>

      <div className="pf-staff-invoice-backdrop" onClick={onClose}>
        <div
          className="pf-staff-invoice-dialog"
          style={{ maxWidth: '600px', width: '96%' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header modal */}
          <div className="pf-invoice-dialog-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '8px',
                background: '#e0f2fe', color: '#0284c7', display: 'grid', placeItems: 'center'
              }}>
                <FileCheck size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                  HÓA ĐƠN GIÁ TRỊ GIA TĂNG (VAT)
                </h3>
                <small style={{ color: '#64748b' }}>
                  Ký hiệu: <strong>1C26TDA</strong> · Số: <strong>{invoiceNo}</strong> · Nghị định 123/2020/NĐ-CP
                </small>
              </div>
            </div>
            <button className="pf-invoice-btn-close" onClick={onClose} aria-label="Đóng">
              <X size={18} />
            </button>
          </div>

          {/* Body: khung hóa đơn thật */}
          <div className="pf-invoice-dialog-body" style={{ padding: '1rem 1.25rem' }}>
            <VatInvoiceTemplate
              invoice={invoice}
              invoiceNo={invoiceNo}
              day={day}
              month={month}
              year={year}
              feeNum={feeNum}
              preTaxNum={preTaxNum}
              vatNum={vatNum}
              wordsAmount={wordsAmount}
            />

            {exportSuccess && (
              <div className="pf-invoice-export-success" style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981',
                fontSize: '0.8rem', marginTop: '0.6rem', fontWeight: 700
              }}>
                <CheckCircle2 size={16} /> Đã xuất hóa đơn VAT chuẩn 1 trang PDF A5 thành công!
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pf-invoice-dialog-footer">
            <button className="pf-btn-dialog-cancel" onClick={onClose}>Đóng</button>
            <button
              className="pf-btn-dialog-print"
              onClick={handleExportPdf}
              disabled={isExporting}
              style={{ background: '#0284c7' }}
            >
              <Download size={15} /> {isExporting ? 'Đang tạo PDF...' : 'Tải File PDF A5 (1 Trang)'}
            </button>
            <button className="pf-btn-dialog-print" onClick={handlePrintWindow} style={{ background: '#10b981' }}>
              <Printer size={15} /> In Hóa Đơn (Chuẩn A5)
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

InvoiceModal.propTypes = {
  invoice: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};
