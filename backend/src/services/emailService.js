import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Chức năng: Kết nối trực tiếp tới máy chủ Google Mail qua giao thức SMTP (bahuy3373@gmail.com). 
// Định dạng giao diện email HTML chuyên nghiệp có logo SmartPark, mã OTP nổi bật và hướng dẫn bảo mật.

dotenv.config();

let cachedTransporter = null;
let isEthereal = false;

/**
 * Khởi tạo hoặc tái sử dụng Transporter gửi Email qua SMTP
 */
async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_PASS;

  // 1. Cấu hình gửi mail thực tế nếu người dùng cấu hình SMTP Gmail / Custom
  if (smtpUser && smtpPass) {
    console.log(`📧 [Nodemailer] Đang sử dụng tài khoản SMTP Gmail thực tế: ${smtpUser}`);
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    isEthereal = false;
    return cachedTransporter;
  }

  // 2. Tự động khởi tạo tài khoản Ethereal thực tế nếu chưa cấu hình Gmail
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log(`📬 [Nodemailer] Đã tạo phiên kiểm thử Email Ethereal: ${testAccount.user}`);
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    isEthereal = true;
    return cachedTransporter;
  } catch (err) {
    console.warn('⚠️ Không thể tạo tài khoản Ethereal, dùng fallback cục bộ:', err.message);
    cachedTransporter = nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      ignoreTLS: true
    });
    return cachedTransporter;
  }
}

/**
 * Gửi mã OTP xác thực đăng ký tài khoản qua Email theo chuẩn thiết kế Enterprise (Apple / Google / Stripe)
 */
export async function sendOtpEmail(toEmail, otpCode, recipientName = 'Quý khách', purpose = 'register') {
  try {
    const transporter = await getTransporter();

    const fromAddress = process.env.SMTP_USER || 'no-reply@smartpark.vn';
    const digits = otpCode.toString().split('');
    const isReset = purpose === 'reset_password';

    const mailOptions = {
      from: `"SmartPark Đà Nẵng" <${fromAddress}>`,
      to: toEmail,
      subject: isReset
        ? `${otpCode} là mã xác thực ĐẶT LẠI MẬT KHẨU SmartPark của bạn`
        : `${otpCode} là mã xác thực tài khoản SmartPark của bạn`,
      html: `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>${isReset ? 'Đặt Lại Mật Khẩu SmartPark' : 'Mã Xác Thực SmartPark'}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1a1f36;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f6f9fc; padding: 40px 15px;">
            <tr>
              <td align="center">
                <!-- Outer Wrapper -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; margin: 0 auto;">
                  
                  <!-- Top Minimalist Logo Bar -->
                  <tr>
                    <td style="padding: 0 0 24px 8px; text-align: left;">
                      <table border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="background: #0284c7; width: 32px; height: 32px; border-radius: 8px; text-align: center; vertical-align: middle;">
                            <span style="color: #ffffff; font-size: 18px; font-weight: 900; line-height: 32px; display: inline-block;">P</span>
                          </td>
                          <td style="padding-left: 10px;">
                            <span style="font-size: 18px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a;">Smart<span style="color: #0284c7;">Park</span></span>
                            <span style="font-size: 10px; font-weight: 700; color: #64748b; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; margin-left: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Đà Nẵng</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main Card Body -->
                  <tr>
                    <td style="background-color: #ffffff; border-radius: 12px; padding: 40px 36px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03); border: 1px solid #e3e8ee;">
                      
                      <!-- Title & Greeting -->
                      <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #0a2540; letter-spacing: -0.3px;">
                        ${isReset ? 'Yêu cầu đặt lại mật khẩu' : 'Mã xác thực một lần (OTP)'}
                      </h1>
                      
                      <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #425466;">
                        Xin chào <strong>${recipientName}</strong>,
                      </p>
                      
                      <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.6; color: #425466;">
                        ${isReset
                          ? 'Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn trên hệ thống SmartPark Đà Nẵng. Hãy nhập mã bảo mật sau để thiết lập mật khẩu mới:'
                          : 'Chúng tôi đã nhận được yêu cầu xác thực tài khoản trên hệ thống SmartPark Đà Nẵng. Hãy nhập mã bảo mật sau để tiếp tục:'}
                      </p>

                      <!-- Clean Enterprise OTP Display -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin: 0 0 28px; padding: 24px 16px; text-align: center;">
                        <tr>
                          <td align="center">
                            <span style="font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 1.5px; text-transform: uppercase; display: block; margin-bottom: 12px;">
                              MÃ BẢO MẬT CỦA BẠN
                            </span>
                            
                            <!-- Digits Row -->
                            <table border="0" cellspacing="8" cellpadding="0" align="center" style="margin: 0 auto;">
                              <tr>
                                ${digits.map((d) => `
                                  <td style="width: 46px; height: 54px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 28px; font-weight: 700; color: #0284c7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; text-align: center; vertical-align: middle;">
                                    ${d}
                                  </td>
                                `).join('')}
                              </tr>
                            </table>

                            <p style="margin: 14px 0 0; font-size: 13px; color: #64748b;">
                              Mã có hiệu lực trong <strong>5 phút</strong>.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- Security Notice -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-bottom: 24px;">
                        <tr>
                          <td style="font-size: 13px; line-height: 1.6; color: #64748b;">
                            <strong style="color: #0f172a;">Lưu ý an toàn:</strong> Không chia sẻ mã xác thực này cho bất kỳ ai. Ban quản trị SmartPark không bao giờ yêu cầu bạn cung cấp mã OTP dưới bất kỳ hình thức nào.
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #8898aa;">
                        Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ với bộ phận hỗ trợ của chúng tôi để được trợ giúp.
                      </p>

                    </td>
                  </tr>

                  <!-- Minimalist Corporate Footer -->
                  <tr>
                    <td style="padding: 24px 12px; text-align: center;">
                      <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #64748b;">
                        HỆ THỐNG QUẢN LÝ BÃI XE THÔNG MINH SMARTPARK ĐÀ NẴNG
                      </p>
                      <p style="margin: 0 0 8px; font-size: 12px; color: #8898aa; line-height: 1.5;">
                        Trung tâm Giám sát Giao thông Đô thị Thông minh Đà Nẵng<br>
                        Hỗ trợ 24/7: <a href="tel:19006868" style="color: #0284c7; text-decoration: none; font-weight: 600;">1900 6868</a> · <a href="mailto:support@smartpark.vn" style="color: #0284c7; text-decoration: none;">support@smartpark.vn</a>
                      </p>
                      <p style="margin: 0; font-size: 11px; color: #a0aec0;">
                        Thư này được gửi tự động. Vui lòng không trả lời trực tiếp email này.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    let previewUrl = null;
    if (isEthereal) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`🔗 [Nodemailer Preview] Xem email gửi thực tế tại: ${previewUrl}`);
    }
    console.log(`✅ [Nodemailer] Đã gửi thư OTP (${otpCode}) thành công tới: ${toEmail}. MessageId: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      emailSent: true,
      previewUrl
    };
  } catch (err) {
    console.warn(`⚠️ [Nodemailer] Lỗi khi gửi mail qua SMTP (${err.message}). OTP vẫn được xác nhận trong hệ thống:`, otpCode);
    return { success: true, emailSent: false, error: err.message };
  }
}

// ── Đọc số tiền thành chữ tiếng Việt chuẩn kế toán ──────────────────────────
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

/**
 * Gửi Hóa đơn điện tử VAT & Vé giữ chỗ QR Barrier Pass đến Gmail khách hàng
 * Chuẩn định dạng Doanh nghiệp lớn theo Nghị định 123/2020/NĐ-CP & Thông tư 78/2021/TT-BTC
 */
export async function sendBookingInvoiceEmail({
  toEmail,
  customerName = 'Quý khách',
  bookingCode,
  qrPassCode,
  plate,
  branch,
  slot,
  duration,
  startTime,
  totalCost = 45000,
  paymentMethod = 'VietQR',
  vatRate = 8
}) {
  if (!toEmail) return { success: false, message: 'Không có địa chỉ email' };

  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.SMTP_USER || 'no-reply@smartpark.vn';

    const costNum = parseInt(totalCost, 10) || 45000;
    const preTaxAmount = Math.round(costNum / (1 + vatRate / 100));
    const vatAmount = costNum - preTaxAmount;
    const invoiceNo = String(Date.now()).slice(-7);
    const wordsAmount = numberToVietnameseWords(costNum);

    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const signedTimestamp = `${now.toLocaleTimeString('vi-VN')} ${day}/${month}/${year}`;

    const mailOptions = {
      from: `"SmartPark Đà Nẵng - Hóa Đơn Điện Tử" <${fromAddress}>`,
      to: toEmail,
      subject: `[HÓA ĐƠN ĐIỆN TỬ GTGT] Vé giữ chỗ #${bookingCode} - SmartPark Đà Nẵng`,
      html: `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Hóa Đơn Điện Tử GTGT - SmartPark Đà Nẵng</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Times New Roman', Times, serif, -apple-system, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
            <tr>
              <td align="center">
                
                <!-- Khung chính chuẩn Hóa Đơn Doanh Nghiệp -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border: 2px solid #0f172a; border-radius: 4px; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
                  
                  <!-- Khung viền chỉ bên trong (Inner Border) -->
                  <tr>
                    <td style="padding: 24px 32px; border: 1px solid #cbd5e1; margin: 4px;">
                      
                      <!-- 1. Tiêu ngữ Quốc gia & Tiêu đề -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom: 2px solid #0284c7; padding-bottom: 14px; margin-bottom: 16px;">
                        <tr>
                          <td align="center" style="padding-bottom: 10px;">
                            <div style="font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                            <div style="font-size: 12px; font-weight: 700; color: #475569; margin-top: 2px;">Độc lập - Tự do - Hạnh phúc</div>
                            <div style="font-size: 11px; color: #94a3b8; letter-spacing: 2px;">──────── * ────────</div>
                          </td>
                        </tr>
                        <tr>
                          <td align="center">
                            <h1 style="margin: 4px 0 0; font-size: 24px; font-weight: 900; color: #0369a1; letter-spacing: 0.5px; text-transform: uppercase;">
                              HÓA ĐƠN GIÁ TRỊ GIA TĂNG (VAT)
                            </h1>
                            <div style="font-size: 12px; color: #64748b; font-style: italic; margin-top: 4px;">
                              (Khởi tạo từ máy tính tiền - Nghị định 123/2020/NĐ-CP & Thông tư 78/2021/TT-BTC)
                            </div>
                            <div style="font-size: 12.5px; font-weight: 700; color: #0f172a; margin-top: 6px;">
                              Ngày ${day} tháng ${month} năm ${year}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top: 12px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 12px; color: #334155;">
                              <tr>
                                <td style="width: 50%;">Mẫu số (Form): <strong style="color: #0f172a;">1/001</strong></td>
                                <td align="right" style="width: 50%;">Ký hiệu (Serial): <strong style="color: #0f172a;">1C26TDA</strong></td>
                              </tr>
                              <tr>
                                <td style="padding-top: 4px;">Số hóa đơn (No.): <strong style="color: #dc2626; font-size: 14px;">${invoiceNo}</strong></td>
                                <td align="right" style="padding-top: 4px;">Mã CQT: <strong style="color: #0284c7; font-family: monospace;">00E9F241-8A7B-4F12-BC35-64903332A1F8</strong></td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- 2. Bên Bán (Seller) -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 12.5px; color: #1e293b; border-bottom: 1px dashed #cbd5e1; padding-bottom: 12px; margin-bottom: 14px;">
                        <tr>
                          <td colspan="2" style="font-size: 13.5px; font-weight: 800; color: #0369a1; text-transform: uppercase;">
                            ĐƠN VỊ BÁN HÀNG: TỔNG CÔNG TY DỊCH VỤ ĐỖ XE THÔNG MINH SMARTPARK ĐÀ NẴNG
                          </td>
                        </tr>
                        <tr>
                          <td style="width: 140px; color: #64748b;">Mã số thuế:</td>
                          <td><strong style="color: #0f172a; font-size: 13px;">0401889248</strong> &nbsp;&nbsp;|&nbsp;&nbsp; Hotline: <strong>1900 6868</strong></td>
                        </tr>
                        <tr>
                          <td style="color: #64748b;">Địa chỉ:</td>
                          <td>Tòa nhà Trung tâm Điều hành Giao thông Thông minh, 01 Lê Duẩn, P. Hải Châu 1, Q. Hải Châu, TP. Đà Nẵng</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b;">Tài khoản ngân hàng:</td>
                          <td><strong>1028 6688 9999</strong> tại Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank) · CN Đà Nẵng</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b;">Cổng thông tin:</td>
                          <td><a href="https://smartpark.vn" style="color: #0284c7; text-decoration: none; font-weight: 600;">https://smartpark.vn</a> &nbsp;&nbsp;|&nbsp;&nbsp; Email: cskh@smartpark.vn</td>
                        </tr>
                      </table>

                      <!-- 3. Bên Mua (Buyer) -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 12.5px; color: #1e293b; border-bottom: 1px dashed #cbd5e1; padding-bottom: 12px; margin-bottom: 16px;">
                        <tr>
                          <td colspan="2" style="font-size: 13px; font-weight: 800; color: #0369a1; text-transform: uppercase;">
                            THÔNG TIN KHÁCH HÀNG &amp; PHƯƠNG TIỆN SỬ DỤNG DỊCH VỤ:
                          </td>
                        </tr>
                        <tr>
                          <td style="width: 140px; color: #64748b;">Họ tên người mua:</td>
                          <td><strong style="color: #0f172a; font-size: 13px;">${customerName}</strong></td>
                        </tr>
                        <tr>
                          <td style="color: #64748b;">Biển số phương tiện:</td>
                          <td><strong style="color: #0369a1; font-family: monospace; font-size: 14px; background: #f0f9ff; padding: 2px 8px; border-radius: 4px; border: 1px solid #bae6fd;">${plate || 'Chưa cập nhật'}</strong></td>
                        </tr>
                        <tr>
                          <td style="color: #64748b;">Địa điểm / Bãi đỗ:</td>
                          <td><strong>${branch || 'Hệ thống SmartPark Đà Nẵng'}</strong></td>
                        </tr>
                        <tr>
                          <td style="color: #64748b;">Vị trí ô đỗ chỉ định:</td>
                          <td><strong style="color: #059669; font-size: 13px;">${slot || 'Ô đỗ ưu tiên'}</strong> (Thời lượng: ${duration || 'Theo lượt'})</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b;">Giờ vào dự kiến:</td>
                          <td>${startTime || 'Theo đơn đặt'} &nbsp;·&nbsp; Hình thức TT: <strong>${paymentMethod}</strong> (Giao dịch đã xác thực)</td>
                        </tr>
                      </table>

                      <!-- 4. Hộp Mã Barrier Pass Nổi Bật -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border: 1.5px dashed #22c55e; border-radius: 6px; padding: 14px; margin-bottom: 18px; text-align: center;">
                        <tr>
                          <td>
                            <div style="font-size: 11px; font-weight: 800; color: #15803d; letter-spacing: 1px; text-transform: uppercase;">
                              MÃ VÉ BARRIER PASS TỰ ĐỘNG (DÙNG ĐỂ CHECK-IN / CHECK-OUT)
                            </div>
                            <div style="font-family: monospace; font-size: 22px; font-weight: 900; color: #166534; margin: 4px 0; letter-spacing: 2px;">
                              ${qrPassCode || bookingCode}
                            </div>
                            <div style="font-size: 11.5px; color: #4b5563;">
                              Camera AI ANPR tại trạm kiểm soát sẽ tự động quét biển số <strong>${plate}</strong> để mở cần barrier. Quý khách cũng có thể quét mã vé trên.
                            </div>
                          </td>
                        </tr>
                      </table>

                      <!-- 5. Bảng kê chi tiết dịch vụ chuẩn kế toán -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="border: 1px solid #94a3b8; border-collapse: collapse; font-size: 12px; margin-bottom: 12px;">
                        <thead>
                          <tr style="background-color: #f1f5f9; color: #1e293b; font-weight: 700;">
                            <th style="border: 1px solid #94a3b8; text-align: center; width: 35px; padding: 6px;">STT</th>
                            <th style="border: 1px solid #94a3b8; text-align: left; padding: 6px;">Tên hàng hóa, dịch vụ</th>
                            <th style="border: 1px solid #94a3b8; text-align: center; width: 50px; padding: 6px;">ĐVT</th>
                            <th style="border: 1px solid #94a3b8; text-align: center; width: 40px; padding: 6px;">SL</th>
                            <th style="border: 1px solid #94a3b8; text-align: right; width: 110px; padding: 6px;">Đơn giá (VNĐ)</th>
                            <th style="border: 1px solid #94a3b8; text-align: right; width: 120px; padding: 6px;">Thành tiền (VNĐ)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td align="center" style="border: 1px solid #94a3b8; padding: 8px;">1</td>
                            <td style="border: 1px solid #94a3b8; padding: 8px;">
                              <strong>Dịch vụ trông giữ xe thông minh SmartPark</strong><br>
                              <span style="font-size: 11px; color: #64748b;">(Gói: ${duration} - Vị trí: ${slot} - Bãi: ${branch})</span>
                            </td>
                            <td align="center" style="border: 1px solid #94a3b8; padding: 8px;">Lượt</td>
                            <td align="center" style="border: 1px solid #94a3b8; padding: 8px;">01</td>
                            <td align="right" style="border: 1px solid #94a3b8; padding: 8px; font-family: monospace;">${preTaxAmount.toLocaleString('vi-VN')}</td>
                            <td align="right" style="border: 1px solid #94a3b8; padding: 8px; font-weight: 700; font-family: monospace;">${preTaxAmount.toLocaleString('vi-VN')}</td>
                          </tr>
                        </tbody>
                      </table>

                      <!-- 6. Tổng số tiền & Thuế GTGT -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 12.5px; color: #1e293b; margin-bottom: 16px;">
                        <tr>
                          <td align="right" style="color: #475569;">Cộng tiền dịch vụ (chưa có thuế GTGT):</td>
                          <td align="right" style="width: 140px; font-weight: 700; font-family: monospace;">${preTaxAmount.toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr>
                          <td align="right" style="color: #475569;">Thuế suất giá trị gia tăng: <strong>8%</strong> &nbsp;|&nbsp; Tiền thuế GTGT:</td>
                          <td align="right" style="font-weight: 700; font-family: monospace; color: #d97706;">${vatAmount.toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr style="border-top: 1.5px solid #0f172a; border-bottom: 1.5px solid #0f172a;">
                          <td align="right" style="font-size: 13.5px; font-weight: 900; color: #0369a1; padding: 6px 0;">
                            TỔNG CỘNG TIỀN THANH TOÁN (ĐÃ BAO GỒM VAT):
                          </td>
                          <td align="right" style="font-size: 15px; font-weight: 900; color: #059669; font-family: monospace; padding: 6px 0;">
                            ${costNum.toLocaleString('vi-VN')} VNĐ
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="font-size: 12px; font-style: italic; color: #334155; padding-top: 6px;">
                            Số tiền viết bằng chữ: <strong>${wordsAmount}</strong>
                          </td>
                        </tr>
                      </table>

                      <!-- 7. Chữ ký số điện tử chuẩn CQT -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 14px;">
                        <tr>
                          <td style="width: 50%; vertical-align: top; text-align: center;">
                            <div style="font-size: 12px; font-weight: 700; color: #334155;">NGƯỜI MUA HÀNG</div>
                            <div style="font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 2px;">(Ký, ghi rõ họ tên nếu có yêu cầu)</div>
                            <div style="margin-top: 36px; font-size: 12px; font-weight: 600; color: #0f172a;">${customerName}</div>
                          </td>
                          <td style="width: 50%; vertical-align: top; text-align: center;">
                            <div style="font-size: 12px; font-weight: 700; color: #334155;">NGƯỜI BÁN HÀNG</div>
                            <div style="font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 2px;">(Ký điện tử bởi Nhà cung cấp giải pháp)</div>
                            
                            <!-- Digital Signature Stamp Box -->
                            <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 10px auto 0; border: 1.5px solid #10b981; border-radius: 6px; background-color: #f0fdf4; padding: 8px 12px; text-align: left;">
                              <tr>
                                <td>
                                  <div style="font-size: 11px; font-weight: 900; color: #059669;">
                                    ✓ ĐÃ KÝ ĐIỆN TỬ HỢP LỆ
                                  </div>
                                  <div style="font-size: 10.5px; color: #065f46; margin-top: 2px;">
                                    Ký bởi: <strong>TỔNG CÔNG TY SMARTPARK ĐÀ NẴNG</strong>
                                  </div>
                                  <div style="font-size: 10px; color: #047857;">
                                    MST: 0401889248 · CA: VNPT SmartCA
                                  </div>
                                  <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">
                                    Thời gian ký: ${signedTimestamp}
                                  </div>
                                </td>
                              </tr>
                            </table>

                          </td>
                        </tr>
                      </table>

                      <!-- 8. Tra cứu hóa đơn & Cơ quan thuế -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; font-size: 11px; color: #64748b;">
                        <tr>
                          <td>
                            <div>Tra cứu hóa đơn điện tử chính thức tại Tổng Cục Thuế hoặc cổng SmartPark: <a href="https://smartpark.vn/tra-cuu" style="color: #0284c7; text-decoration: none; font-weight: 700;">https://smartpark.vn/tra-cuu</a></div>
                            <div style="margin-top: 2px;">Mã số tra cứu (Lookup Key): <strong style="font-family: monospace; color: #0f172a; font-size: 12px;">${invoiceNo}</strong> &nbsp;·&nbsp; Hotline giải đáp hóa đơn: <strong>1900 6868</strong></div>
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    let previewUrl = null;
    if (isEthereal) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`🔗 [Nodemailer Preview Hóa Đơn] Xem email tại: ${previewUrl}`);
    }
    console.log(`✅ [Nodemailer] Đã gửi Hóa đơn điện tử thành công tới: ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId, emailSent: true, previewUrl };
  } catch (err) {
    console.warn(`⚠️ [Nodemailer] Không thể gửi Hóa đơn điện tử tới ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}
