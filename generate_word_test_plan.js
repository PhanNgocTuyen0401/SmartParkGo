const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  PageBreak,
  ImageRun,
  Header,
  Footer,
  PageNumber
} = require('./backend/node_modules/docx');

// Helper styling constants
const FONT_FAMILY = 'Times New Roman';
const COLOR_PRIMARY = '0F4C81'; // Classic Navy Blue
const COLOR_SECONDARY = '1A365D';
const COLOR_ACCENT = 'A30008'; // Duy Tan Crimson Red
const COLOR_TEXT = '222222';
const COLOR_MUTED = '555555';
const BORDER_COLOR = 'B0C4DE';

const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: BORDER_COLOR
};

const cellBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder
};

function createHeaderPara(text, level = HeadingLevel.HEADING_1) {
  const size = level === HeadingLevel.HEADING_1 ? 30 : level === HeadingLevel.HEADING_2 ? 26 : 24;
  const color = level === HeadingLevel.HEADING_1 ? COLOR_PRIMARY : COLOR_SECONDARY;
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        bold: true,
        size,
        color
      })
    ]
  });
}

function createTextPara(text, options = {}) {
  const { bold = false, italic = false, align = AlignmentType.LEFT, spaceAfter = 100, spaceBefore = 0, color = COLOR_TEXT, size = 24 } = options;
  return new Paragraph({
    alignment: align,
    spacing: { before: spaceBefore, after: spaceAfter, line: 300 }, // 1.25 line spacing
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        bold,
        italic,
        color,
        size
      })
    ]
  });
}

function createBulletItem(title, content) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 60, after: 80, line: 300 },
    children: [
      new TextRun({
        text: title ? title + ': ' : '',
        font: FONT_FAMILY,
        bold: true,
        color: COLOR_SECONDARY,
        size: 24
      }),
      new TextRun({
        text: content,
        font: FONT_FAMILY,
        color: COLOR_TEXT,
        size: 24
      })
    ]
  });
}

function buildTable(headers, rows, colWidths = []) {
  const tableRows = [];

  // Header row
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: headers.map((h, i) => new TableCell({
        borders: cellBorders,
        width: colWidths[i] ? { size: colWidths[i], type: WidthType.DXA } : undefined,
        shading: { fill: COLOR_PRIMARY, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 140, right: 140 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: h,
                font: FONT_FAMILY,
                bold: true,
                color: 'FFFFFF',
                size: 22
              })
            ]
          })
        ]
      }))
    })
  );

  // Data rows
  rows.forEach((row, rIdx) => {
    const isEven = rIdx % 2 === 0;
    const bgFill = isEven ? 'FFFFFF' : 'F4F7FB';

    tableRows.push(
      new TableRow({
        children: row.map((cellText, cIdx) => {
          const isFirstColCentered = cIdx === 0 && (row.length > 2 || cellText.length < 5);
          return new TableCell({
            borders: cellBorders,
            width: colWidths[cIdx] ? { size: colWidths[cIdx], type: WidthType.DXA } : undefined,
            shading: { fill: bgFill, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              new Paragraph({
                alignment: isFirstColCentered ? AlignmentType.CENTER : AlignmentType.LEFT,
                spacing: { line: 280 },
                children: [
                  new TextRun({
                    text: cellText,
                    font: FONT_FAMILY,
                    size: 22,
                    color: COLOR_TEXT
                  })
                ]
              })
            ]
          });
        })
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: tableRows
  });
}

async function run() {
  const dtuLogoPath = path.resolve('dtu_logo.png');
  const dtuLogoExists = fs.existsSync(dtuLogoPath);
  const dtuLogoBuffer = dtuLogoExists ? fs.readFileSync(dtuLogoPath) : null;

  const smartparkLogoPath = path.resolve('frontend/public/smartpark-logo.png');
  const smartparkLogoExists = fs.existsSync(smartparkLogoPath);
  const smartparkLogoBuffer = smartparkLogoExists ? fs.readFileSync(smartparkLogoPath) : null;

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: 24,
            color: COLOR_TEXT
          }
        }
      }
    },
    sections: [
      // ================= SECTION 1: COVER PAGE =================
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 } // Standard 2cm-2cm-3cm-2cm
          }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'BỘ GIÁO DỤC VÀ ĐÀO TẠO', font: FONT_FAMILY, bold: true, size: 26, color: '000000' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'ĐẠI HỌC DUY TÂN', font: FONT_FAMILY, bold: true, size: 28, color: COLOR_ACCENT })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
            children: [
              new TextRun({ text: 'KHOA CÔNG NGHỆ THÔNG TIN', font: FONT_FAMILY, bold: true, size: 26, color: COLOR_SECONDARY })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              new TextRun({ text: '--------------🙖🙐✰🙖🙐-------------', font: FONT_FAMILY, bold: true, size: 22, color: COLOR_ACCENT })
            ]
          }),

          // DTU Logo if exists
          ...(dtuLogoBuffer ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 180 },
              children: [
                new ImageRun({
                  data: dtuLogoBuffer,
                  transformation: { width: 140, height: 140 }
                })
              ]
            })
          ] : []),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 80 },
            children: [
              new TextRun({ text: 'KẾ HOẠCH KIỂM THỬ (TEST PLAN)', font: FONT_FAMILY, bold: true, size: 30, color: COLOR_PRIMARY })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
            children: [
              new TextRun({ text: 'XÂY DỰNG HỆ THỐNG BÃI ĐỖ XE Ô TÔ THÔNG MINH\nTÍCH HỢP AI (SMARTPARK ĐÀ NẴNG)', font: FONT_FAMILY, bold: true, size: 30, color: COLOR_ACCENT })
            ]
          }),

          // SmartPark Logo if exists
          ...(smartparkLogoBuffer ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 140 },
              children: [
                new ImageRun({
                  data: smartparkLogoBuffer,
                  transformation: { width: 80, height: 80 }
                })
              ]
            })
          ] : []),

          new Paragraph({ spacing: { before: 180 } }),

          // Thông tin nhóm & Giảng viên
          new Paragraph({
            spacing: { before: 120, after: 60 },
            indent: { left: 2000 },
            children: [
              new TextRun({ text: 'GIẢNG VIÊN HƯỚNG DẪN: ', font: FONT_FAMILY, bold: true, size: 26, color: COLOR_SECONDARY }),
              new TextRun({ text: 'ThS. NGUYỄN MINH NHẬT', font: FONT_FAMILY, bold: true, size: 26, color: '000000' })
            ]
          }),
          new Paragraph({
            spacing: { after: 40 },
            indent: { left: 2000 },
            children: [
              new TextRun({ text: 'NHÓM SINH VIÊN THỰC HIỆN:', font: FONT_FAMILY, bold: true, size: 24, italic: true })
            ]
          }),
          new Paragraph({
            spacing: { after: 30 },
            indent: { left: 2200 },
            children: [
              new TextRun({ text: '1. Trương Thanh Trúc\t\t-  29211159303', font: FONT_FAMILY, bold: true, size: 24 })
            ]
          }),
          new Paragraph({
            spacing: { after: 30 },
            indent: { left: 2200 },
            children: [
              new TextRun({ text: '2. Nguyễn Văn Thuật\t\t-  29211164238', font: FONT_FAMILY, size: 24 })
            ]
          }),
          new Paragraph({
            spacing: { after: 30 },
            indent: { left: 2200 },
            children: [
              new TextRun({ text: '3. Phan Ngọc Tuyển\t\t-  29211155216', font: FONT_FAMILY, size: 24 })
            ]
          }),
          new Paragraph({
            spacing: { after: 60 },
            indent: { left: 2200 },
            children: [
              new TextRun({ text: '4. Vương Quang Minh\t\t-  29211151091', font: FONT_FAMILY, size: 24 })
            ]
          }),
          new Paragraph({
            spacing: { after: 180 },
            indent: { left: 2000 },
            children: [
              new TextRun({ text: 'LỚP: ', font: FONT_FAMILY, bold: true, size: 24, color: COLOR_SECONDARY }),
              new TextRun({ text: 'CS 445 CA', font: FONT_FAMILY, bold: true, size: 24 })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: 'Đà Nẵng, Tháng 10/2025', font: FONT_FAMILY, bold: true, size: 24, italic: true })
            ]
          }),

          new Paragraph({ children: [new PageBreak()] })
        ]
      },

      // ================= SECTION 2: MAIN CONTENT =================
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'SmartPark Đà Nẵng | Kế hoạch kiểm thử hệ thống (CS 445 CA)',
                    font: FONT_FAMILY,
                    size: 18,
                    italic: true,
                    color: COLOR_MUTED
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Trang ', font: FONT_FAMILY, size: 20 }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT_FAMILY, size: 20, bold: true }),
                  new TextRun({ text: ' / ', font: FONT_FAMILY, size: 20 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT_FAMILY, size: 20 })
                ]
              })
            ]
          })
        },
        children: [
          // MỤC LỤC
          createHeaderPara('MỤC LỤC', HeadingLevel.HEADING_1),
          createTextPara('I. Giới thiệu .................................................................................................................................... 3', { bold: true }),
          createTextPara('    1. Mục đích ................................................................................................................................ 3'),
          createTextPara('    2. Tổng quan hệ thống .............................................................................................................. 3'),
          createTextPara('    3. Phạm vi kiểm thử ................................................................................................................. 3'),
          createTextPara('    4. Kiểm thử các chức năng chi tiết ....................................................................................... 4'),
          createTextPara('    5. Những tài liệu sử dụng ........................................................................................................ 5'),
          createTextPara('II. Tài liệu tham khảo .................................................................................................................. 5', { bold: true }),
          createTextPara('III. Chiến lược kiểm thử ............................................................................................................. 5', { bold: true }),
          createTextPara('IV. Những yêu cầu về tài nguyên .............................................................................................. 6', { bold: true }),
          createTextPara('    1. Yêu cầu phần cứng ............................................................................................................. 6'),
          createTextPara('    2. Yêu cầu phần mềm .............................................................................................................. 6'),
          createTextPara('    3. Công cụ kiểm thử ................................................................................................................ 6'),
          createTextPara('    4. Phân công nhân sự nhóm ................................................................................................... 7'),
          createTextPara('V. Lịch trình công việc ................................................................................................................ 7', { bold: true }),
          createTextPara('    1. Bảng mốc thời gian tổng quát (Milestones) ......................................................................... 7'),
          createTextPara('    2. Bảng phân công chi tiết nhiệm vụ (WBS) .......................................................................... 8'),
          createTextPara('VI. Đánh giá rủi ro ........................................................................................................................ 9', { bold: true }),
          createTextPara('    1. Đánh giá rủi ro nghiệp vụ & kỹ thuật ................................................................................. 9'),
          createTextPara('    2. Rủi ro nhân sự ...................................................................................................................... 9'),
          createTextPara('    3. Rủi ro công cụ kiểm thử ..................................................................................................... 9'),
          createTextPara('    4. Rủi ro thời gian .................................................................................................................... 9'),
          createTextPara('VII. Defect Tracking (Theo dõi & phân loại lỗi) ........................................................................ 10', { bold: true }),
          createTextPara('VIII. Test Deliverables (Sản phẩm bàn giao) ............................................................................ 11', { bold: true }),

          new Paragraph({ children: [new PageBreak()] }),

          // CHƯƠNG I: GIỚI THIỆU
          createHeaderPara('I. Giới thiệu', HeadingLevel.HEADING_1),

          createHeaderPara('1. Mục đích', HeadingLevel.HEADING_2),
          createTextPara('Tài liệu Kế hoạch kiểm thử này được nhóm biên soạn nhằm phát hiện lỗi, quản lý bug và đánh giá toàn diện chất lượng vận hành của Hệ thống Bãi đỗ xe Ô tô Thông minh Tích hợp AI (SmartPark Đà Nẵng) trước khi triển khai chính thức lên môi trường Staging và Production.'),
          createTextPara('Tài liệu xác định rõ ràng phạm vi kiểm thử, chiến lược kiểm thử chức năng và phi chức năng, phân bổ nguồn lực 4 thành viên và lịch trình chi tiết nhằm làm định hướng rõ ràng cho toàn bộ hoạt động của đội ngũ QA/Tester trong nhóm dự án lớp CS 445 CA.'),

          createHeaderPara('2. Tổng quan hệ thống', HeadingLevel.HEADING_2),
          createTextPara('SmartPark Đà Nẵng là nền tảng quản trị và vận hành bãi đỗ xe thông minh ứng dụng công nghệ nhận diện biển số xe tự động qua camera AI (ANPR), kiểm soát cần gạt barrier tự động, thanh toán số Napas VietQR / Ví điện tử và cơ chế đặt chỗ trực tuyến trước (hạn vé tối đa 20 ngày). Hệ thống phân quyền chặt chẽ theo mô hình RBAC bao gồm 3 nhóm đối tượng tương tác cốt lõi:'),
          createBulletItem('Phía Khách hàng (Customer)', 'Đăng ký tài khoản, đăng nhập; xem bản đồ số trực quan 5 chi nhánh trung tâm bãi xe tại TP. Đà Nẵng và trạng thái ô trống từng tầng (G, B1, B2, B3); thực hiện quy trình đặt chỗ trước theo gói giờ/ngày/tuần/tháng; chọn loại phương tiện (Ô tô con 4-7 chỗ, SUV/Bán tải, Xe điện EV sạc nhanh 120kW, Xe máy); thanh toán trực tuyến qua cổng VietQR Napas 247, MoMo, ZaloPay; nhận thẻ thông hành điện tử QR Pass nội bộ (SP-PASS-..., BK-...); quản lý ví voucher, đổi điểm thưởng ParkPoints và tra cứu lịch sử gửi xe kèm hóa đơn VAT điện tử 8%.'),
          createBulletItem('Phía Nhân viên bốt trực (Staff)', 'Vận hành giám sát làn xe vào/ra thời gian thực; quét thẻ thông hành QR Pass của khách hàng và từ chối phát chuông báo động đối với mã QR ngoài hệ thống; giám sát camera AI ANPR trích xuất biển số xe; xử lý tình huống khẩn cấp mở barrier cưỡng chế bằng phím nóng F4 (tự động ghi nhận log an ninh); thu tiền mặt khách vãng lai và lập biên bản bàn giao ca trực (Shift Reports) niêm phong két đối soát cuối ca.'),
          createBulletItem('Phía Quản trị viên (Admin)', 'Theo dõi bảng điều khiển Dashboard tổng quan doanh thu, tỷ lệ lấp đầy ô đỗ; quản trị hạ tầng 5 chi nhánh và sơ đồ ô đỗ từng tầng; quản lý danh sách đơn đặt chỗ trước; cấu hình bảng biểu phí linh hoạt (Tariffs); quản trị danh mục chính sách khuyến mãi và voucher; quản lý hồ sơ người dùng và nhân sự bốt trực; đối soát doanh thu ca trực và tra cứu nhật ký kiểm toán hệ thống (Audit Logs).'),

          createHeaderPara('3. Phạm vi kiểm thử', HeadingLevel.HEADING_2),
          createHeaderPara('3.1. Kiểm thử chức năng (Functional Testing)', HeadingLevel.HEADING_3),
          createTextPara('Hệ thống tập trung bao phủ toàn bộ 10 phân hệ nghiệp vụ cốt lõi, bao gồm:'),
          createBulletItem('Xác thực & Phân quyền (AUTH)', 'Đăng ký, Đăng nhập, Duy trì phiên đăng nhập JWT, Phân quyền RBAC (Admin, Staff, Customer).'),
          createBulletItem('Hạ tầng Chi nhánh & Sơ đồ Ô đỗ (BRANCH/SLOT)', 'Hiển thị sơ đồ ô đỗ theo thời gian thực (Trống, Đang đỗ, Đã đặt trước, Đang bảo trì) của 5 chi nhánh tại Đà Nẵng.'),
          createBulletItem('Đặt chỗ trước & QR Pass (BOOKING)', 'Quy trình chọn ô, giữ chỗ trước tối đa 20 ngày, chống đặt trùng ô (Double-booking), tự động sinh thẻ QR Pass nội bộ.'),
          createBulletItem('Giám sát Làn Vào/Ra & Camera AI (SESSIONS - ANPR)', 'Check-in, Check-out, khớp lệnh nhận diện biển số ANPR, điều khiển đóng/mở cần gạt barrier tự động.'),
          createBulletItem('Phím nóng Mở cưỡng chế Khẩn cấp (F4)', 'Mở barrier khẩn cấp cho xe cứu thương/công an và ghi nhận vết an ninh vào bảng audit_logs.'),
          createBulletItem('Cổng quét thẻ QR Pass Thông hành (QR_GATE)', 'Xác thực mã QR hợp lệ nội bộ và chặn đứng, báo động toàn màn hình khi quét mã QR lạ ngoài hệ thống.'),
          createBulletItem('Cổng Thanh toán Số Napas VietQR (PAYMENT)', 'Sinh mã VietQR chuyển khoản 247 đúng số tiền, lắng nghe Webhook/Socket xác nhận giao dịch thành công.'),
          createBulletItem('Quản lý Biểu phí & Bảng cước (TARIFF)', 'Cấu hình giá cước 2 giờ đầu, giờ tiếp theo, vé ngày/tuần/tháng cho 4 nhóm phương tiện.'),
          createBulletItem('Quản lý Khuyến mãi, Voucher & ParkPoints (VOUCHER)', 'Đổi điểm tích lũy lấy mã giảm giá, cơ chế chống đổi trùng lặp vào ví cá nhân, áp dụng mã khi thanh toán.'),
          createBulletItem('Hóa đơn điện tử VAT & Bàn giao ca trực (INVOICE & SHIFT)', 'Xuất hóa đơn GTGT thuế suất 8% chuẩn Tổng cục Thuế kèm chữ ký số điện tử; lập biên bản bàn giao ca trực bốt.'),

          createHeaderPara('3.2. Kiểm thử phi chức năng (Non-Functional Testing)', HeadingLevel.HEADING_3),
          createBulletItem('Kiểm thử Giao diện (UI/UX & Responsive)', 'Xác thực khả năng hiển thị co giãn trên màn hình máy tính bàn, laptop và thiết bị bốt trực; hiển thị đúng màu sắc trực quan (Xanh: Trống, Đỏ: Đang đỗ, Vàng: Đã đặt trước); hiển thị tooltip phím nóng F4; hiển thị dấu hoa thị đỏ (*) cho các trường bắt buộc.'),
          createBulletItem('Kiểm thử An ninh & Bảo mật', 'Kiểm tra chống tấn công SQL Injection tại các thanh tìm kiếm biển số, mã hóa đơn; kiểm soát phân quyền URL (ngăn khách hàng truy cập trái phép vào trang quản trị /admin); bảo mật dữ liệu mật khẩu bằng thuật toán băm bcrypt.'),
          createBulletItem('Kiểm thử Hiệu năng & Đồng bộ Thời gian thực', 'Đảm bảo thời gian phản hồi mở barrier qua Socket.IO < 1 giây; kiểm tra chịu tải đồng thời khi nhiều khách hàng cùng truy cập đặt chỗ vào giờ cao điểm.'),

          createHeaderPara('4. Kiểm thử các chức năng chi tiết', HeadingLevel.HEADING_2),
          createBulletItem('Đăng nhập & Đăng ký (AUTH)', 'Kiểm tra đăng nhập bằng Email và Mật khẩu cho 3 vai trò (Admin, Staff, Customer); kiểm tra băm mật khẩu bcrypt; kiểm tra tính năng Remember Me; bắt lỗi để trống, sai định dạng email hoặc mật khẩu không đủ độ dài. Khi đăng ký mới, kiểm tra tự động cấp 500 điểm ParkPoints và voucher chào mừng 30.000đ.'),
          createBulletItem('Phân hệ Đặt chỗ trước (BOOKING)', 'Kiểm tra quy trình chọn chi nhánh, tầng, ô đỗ và thời gian gửi. Bắt lỗi logic thời gian (thời gian kết thúc sớm hơn hoặc bằng thời gian bắt đầu). Kiểm tra giới hạn thời hạn giữ vé tối đa 20 ngày. Kiểm tra chống tranh chấp ô đỗ (Double-booking) khi 2 người cùng chọn 1 vị trí.'),
          createBulletItem('Phân hệ Giám sát Bốt trực & Barrier (SESSIONS)', 'Kiểm tra nhận diện biển số xe qua camera AI ANPR; tự động kích hoạt barrier mở khi khớp dữ liệu; kiểm tra quy trình tính cước lũy tiến khi xe check-out; kiểm tra phím khẩn cấp F4 yêu cầu nhập lý do và lưu vào sổ kiểm toán.'),
          createBulletItem('Phân hệ Cổng quét QR Pass (QR_GATE)', 'Chấp nhận các mã bắt đầu bằng SP-PASS-..., SMARTPARK-..., BK-...; từ chối và phát chuông cảnh báo đỏ toàn màn hình khi quét mã QR ngoài hệ thống.'),
          createBulletItem('Phân hệ Quản trị Biểu phí (TARIFF)', 'Kiểm tra thêm mới và chỉnh sửa biểu phí theo từng loại xe; bắt lỗi nhập số tiền âm hoặc để trống thông tin.'),
          createBulletItem('Phân hệ Voucher & Điểm thưởng (VOUCHER)', 'Kiểm tra đổi điểm ParkPoints ra voucher; kiểm tra cơ chế chặn đổi trùng lặp mã đã có trong ví; kiểm tra trừ đúng số tiền giảm giá khi thanh toán đơn đặt chỗ.'),
          createBulletItem('Phân hệ Hóa đơn điện tử VAT (INVOICE)', 'Kiểm tra tính chính xác công thức VAT 8%; kiểm tra tính hợp lệ của mã hóa đơn 7 chữ số và chữ ký số điện tử SmartPark Authority.'),
          createBulletItem('Phân hệ Nhân sự & Bàn giao ca trực (SHIFT)', 'Kiểm tra nhập số tiền mặt thực thu tại bốt, kiểm tra đối soát tự động với số tiền thanh toán online qua VietQR; kiểm tra cơ chế khóa sổ niêm phong két.'),

          createHeaderPara('5. Những tài liệu sử dụng', HeadingLevel.HEADING_2),
          createBulletItem('Tài liệu SRS Đặc tả hệ thống SmartPark', 'Tệp HE_THONG_DU_LIEU_SMARTPARK.md của đồ án.'),
          createBulletItem('Thiết kế Cơ sở dữ liệu', 'Sơ đồ ERD 12 bảng PostgreSQL và quy chuẩn khóa chính/khóa ngoại.'),
          createBulletItem('Tài liệu User Story', 'Đặc tả yêu cầu chức năng hệ thống bãi đỗ xe thông minh lớp CS 445 CA.'),

          new Paragraph({ children: [new PageBreak()] }),

          // CHƯƠNG II: TÀI LIỆU THAM KHẢO
          createHeaderPara('II. Tài liệu tham khảo', HeadingLevel.HEADING_1),
          createBulletItem('Tiêu chuẩn Quốc tế IEEE 829-2008', 'Chuẩn tài liệu kiểm thử phần mềm và hệ thống (Software Test Documentation).'),
          createBulletItem('Tài liệu Hướng dẫn Cổng thanh toán VietQR', 'Quy chuẩn Napas 247 và định dạng mã QR thanh toán quốc gia.'),
          createBulletItem('Giáo trình Đồ án Tích hợp Hệ thống (CS 445 CA)', 'Tài liệu hướng dẫn thực hành – Khoa CNTT, Đại học Duy Tân.'),

          // CHƯƠNG III: CHIẾN LƯỢC KIỂM THỬ
          createHeaderPara('III. Chiến lược kiểm thử', HeadingLevel.HEADING_1),
          buildTable(
            ['Mục tiêu / Tiêu chí', 'Nội dung thực thi chiến lược kiểm thử'],
            [
              [
                'Mục đích kiểm tra',
                '• Xác thực API & Chức năng cốt lõi: Đảm bảo hệ thống và các liên kết dữ liệu giữa PostgreSQL, Express API và React UI phản hồi chính xác, đồng bộ thời gian thực qua Socket.IO.\n• Giả lập hành vi thực tế: Tester trực tiếp đóng vai là Khách hàng (đặt chỗ, quét VietQR, dùng voucher), Nhân viên bốt trực (quét QR Pass, xử lý kẹt barrier F4, bàn giao ca) và Quản trị viên (sửa biểu phí, quản trị bãi) nhằm phát hiện lỗi logic, lỗi vỡ giao diện hoặc trải nghiệm người dùng không hợp lý.\n• Đảm bảo tính chịu lỗi: Kiểm chứng hệ thống xử lý mượt mà và hiển thị thông báo lỗi chính xác khi quét mã QR sai định dạng hoặc thao tác sai kịch bản.'
              ],
              [
                'Kỹ thuật kiểm thử',
                '• Thực thi kiểm thử hộp đen (Black-box Testing) bằng cách thao tác trực tiếp trên giao diện web:\n• Sử dụng Dữ liệu Hợp lệ (Valid Data): Điền biển số xe đúng chuẩn (43A-123.45), email hợp lệ, quét mã QR nội bộ chuẩn để xác nhận hệ thống cập nhật đúng vào Database.\n• Sử dụng Dữ liệu Không hợp lệ (Invalid Data): Chủ động nhập sai (nhập giá vé âm, đặt giờ kết thúc trước giờ bắt đầu, quét mã QR MoMo ngoài vào bốt, đổi voucher khi không đủ điểm) nhằm kiểm tra xem hệ thống có hiển thị thông báo cảnh báo (Validation message) màu đỏ để ngăn chặn lỗi hay không.'
              ],
              [
                'Tiêu chuẩn dừng',
                '• Bao phủ kịch bản: Thực thi 100% các kịch bản kiểm thử (Testcase từ TC_AUTH_01 đến TC_SHIFT_50), không được bỏ sót bất kỳ luồng tính năng nào.\n• Báo cáo lỗi chi tiết: Mọi lỗi (Bug) phát hiện được phải ghi nhận đầy đủ: Tóm tắt lỗi, các bước tái hiện (Steps to Reproduce), ảnh chụp màn hình (Screenshot) và log hệ thống đính kèm.\n• Chất lượng bàn giao: Hệ thống không còn tồn tại các lỗi nghiêm trọng (Blocker, Critical, Major) gây kẹt barrier không mở được, sai lệch tiền cước hoặc thất thoát doanh thu.'
              ],
              [
                'Chịu trách nhiệm',
                'Toàn bộ 4 thành viên nhóm sinh viên lớp CS 445 CA đảm nhiệm vai trò Test Designer / Tester.'
              ],
              [
                'Cách thức kiểm thử',
                '• Thao tác trực tiếp: Tester sử dụng chuột và bàn phím tương tác trên các trình duyệt phổ biến (Chrome, Edge, Firefox) như người dùng thật.\n• Thực hiện tuần tự: Thao tác nghiêm ngặt theo từng bước trong kịch bản. Điền đúng bộ dữ liệu test mẫu để việc đối chiếu kết quả thực tế có độ chính xác cao nhất.'
              ],
              [
                'Xử lý ngoại lệ',
                '• Ghi nhận sự cố phát sinh: Trong lúc test, nếu gặp sự cố ngắt kết nối PostgreSQL, camera ANPR rớt mạng hoặc lỗi cổng thanh toán, lập tức cô lập môi trường.\n• Báo cáo & Phối hợp: Chụp màn hình, lưu log backend và chuyển ngay cho lập trình viên phụ trách module sửa lỗi (Hotfix) trước khi kiểm thử lại.'
              ]
            ],
            [3000, 6500]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // CHƯƠNG IV: NHỮNG YÊU CẦU VỀ TÀI NGUYÊN
          createHeaderPara('IV. Những yêu cầu về tài nguyên', HeadingLevel.HEADING_1),

          createHeaderPara('1. Yêu cầu phần cứng', HeadingLevel.HEADING_2),
          buildTable(
            ['CPU', 'RAM', 'Ổ cứng lưu trữ', 'Kiến trúc hệ thống', 'Thiết bị ngoại vi hỗ trợ'],
            [
              ['Intel Core i5 / AMD Ryzen 5 (>= 2.3 GHz)', '16 GB', 'SSD 256 GB (Trống >= 20 GB)', '64-bit OS (Windows 10/11)', 'Webcam / Camera giả lập quét mã QR & ANPR']
            ],
            [2200, 1200, 2000, 2000, 2100]
          ),

          createHeaderPara('2. Yêu cầu phần mềm', HeadingLevel.HEADING_2),
          buildTable(
            ['Tên phần mềm / Nền tảng', 'Phiên bản sử dụng', 'Phân loại', 'Mục đích sử dụng'],
            [
              ['Google Chrome', '126.0 (Latest)', 'Trình duyệt Web', 'Môi trường thực thi kiểm thử chính'],
              ['Microsoft Edge', 'Chromium 125+', 'Trình duyệt Web', 'Kiểm tra tương thích đa trình duyệt'],
              ['Mozilla Firefox', '125.0+', 'Trình duyệt Web', 'Kiểm tra giao diện CSS & SVG'],
              ['PostgreSQL Database', '16.x', 'Hệ quản trị CSDL', 'Lưu trữ và đối chiếu dữ liệu 12 bảng'],
              ['Node.js & Express', 'v18 / v20 LTS', 'Môi trường Backend', 'Xử lý REST API & Webhook Socket.IO'],
              ['Postman', 'v10.x', 'Công cụ Test API', 'Kiểm thử độc lập các REST API endpoints']
            ],
            [2500, 1800, 2000, 3200]
          ),

          createHeaderPara('3. Công cụ kiểm thử', HeadingLevel.HEADING_2),
          createTextPara('Hệ thống sử dụng kết hợp giữa Kiểm thử thủ công (Manual Testing) và công cụ tự động hóa Katalon Studio / Selenium WebDriver để kiểm tra các luồng đăng nhập, thanh toán và quét mã QR.'),

          createHeaderPara('4. Phân công nhân sự nhóm', HeadingLevel.HEADING_2),
          buildTable(
            ['Họ và tên thành viên', 'Mã sinh viên', 'Vai trò đảm nhiệm', 'Phân hệ & Nhiệm vụ phụ trách kiểm thử'],
            [
              [
                'Trương Thanh Trúc',
                '29211159303',
                'Nhóm trưởng / Test Designer',
                '• Thiết kế & thực thi Testcase cho: Xác thực & Phân quyền (AUTH: Đăng ký, Đăng nhập, RBAC Admin/Staff/Customer).\n• Thiết kế & thực thi Testcase cho: Cổng quét Thẻ QR Pass nội bộ (QR_GATE - Nhận diện mã hợp lệ, từ chối mã ngoài hệ thống).'
              ],
              [
                'Nguyễn Văn Thuật',
                '29211164238',
                'Test Designer / Tester',
                '• Thiết kế & thực thi Testcase cho: Quản lý Đặt chỗ trước (BOOKING: Đặt ô đỗ 20 ngày, chống tranh chấp Double-booking).\n• Thiết kế & thực thi Testcase cho: Sơ đồ Ô đỗ trực quan 5 chi nhánh (BRANCH/SLOT: available, occupied, reserved, maintenance).'
              ],
              [
                'Phan Ngọc Tuyển',
                '29211155216',
                'Test Designer / Tester',
                '• Thiết kế & thực thi Testcase cho: Giám sát Phiên lưu bãi thực tế (SESSIONS: Camera AI ANPR nhận diện biển số, điều khiển cần gạt Barrier tự động).\n• Thiết kế & thực thi Testcase cho: Cơ chế mở cưỡng chế khẩn cấp (Phím nóng F4 & Audit Logs an ninh).'
              ],
              [
                'Vương Quang Minh',
                '29211151091',
                'Test Designer / Tester',
                '• Thiết kế & thực thi Testcase cho: Quản trị Biểu phí & Bảng cước (TARIFF) và Hóa đơn điện tử GTGT (INVOICE - VAT 8%).\n• Thiết kế & thực thi Testcase cho: Quản lý Voucher, Điểm thưởng ParkPoints và Biên bản bàn giao ca trực (SHIFT).'
              ]
            ],
            [2000, 1600, 2200, 3700]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // CHƯƠNG V: LỊCH TRÌNH CÔNG VIỆC
          createHeaderPara('V. Lịch trình công việc', HeadingLevel.HEADING_1),

          createHeaderPara('1. Bảng mốc thời gian tổng quát (Milestones)', HeadingLevel.HEADING_2),
          buildTable(
            ['Mốc tiến độ (Milestone)', 'Sản phẩm bàn giao (Deliverables)', 'Thời lượng', 'Ngày bắt đầu', 'Ngày kết thúc'],
            [
              ['Lập kế hoạch kiểm thử', 'Tài liệu Test Plan hoàn chỉnh', '1 ngày', '02/10/2025', '03/10/2025'],
              ['Xem lại các tài liệu & đặc tả', 'Biên bản rà soát yêu cầu CSDL', '1 ngày', '03/10/2025', '04/10/2025'],
              ['Thiết kế các testcase', 'Bộ tài liệu Test Cases 10 phân hệ', '2 ngày', '02/10/2025', '04/10/2025'],
              ['Xem lại các testcase', 'Checklist Test Cases đã duyệt', '1 ngày', '04/10/2025', '04/10/2025'],
              ['Thực thi các testcase', 'Báo cáo ghi nhận lỗi Defect Log', '2 ngày', '04/10/2025', '05/10/2025'],
              ['Ghi nhận & Đánh giá kết quả', 'Báo cáo tổng kết Test Report', '2 ngày', '05/10/2025', '07/10/2025']
            ],
            [2600, 2800, 1100, 1500, 1500]
          ),

          createHeaderPara('2. Bảng phân công chi tiết nhiệm vụ (WBS)', HeadingLevel.HEADING_2),
          buildTable(
            ['STT', 'Tên nhiệm vụ chi tiết', 'Ngày bắt đầu', 'Ngày kết thúc', 'Người đảm nhiệm'],
            [
              ['1', 'Tạo tài liệu Test Plan hệ thống SmartPark', '02/10/2025', '03/10/2025', 'Trương Thanh Trúc'],
              ['2', 'Xem lại đặc tả yêu cầu CSDL SmartPark', '03/10/2025', '04/10/2025', 'Tất cả (4 thành viên)'],
              ['3', 'Thiết kế testcase chi tiết các phân hệ:', '02/10/2025', '04/10/2025', 'Tất cả'],
              ['', '- Thiết kế testcase Quản lý Đặt chỗ trước (BOOKING)', '03/10/2025', '05/10/2025', 'Nguyễn Văn Thuật'],
              ['', '- Thiết kế testcase Sơ đồ Ô đỗ & Chi nhánh', '03/10/2025', '05/10/2025', 'Nguyễn Văn Thuật'],
              ['', '- Thiết kế testcase Giám sát Làn Vào/Ra & Camera ANPR', '03/10/2025', '05/10/2025', 'Phan Ngọc Tuyển'],
              ['', '- Thiết kế testcase Barrier tự động & Phím khẩn F4', '03/10/2025', '05/10/2025', 'Phan Ngọc Tuyển'],
              ['', '- Thiết kế testcase Cổng quét QR Pass & Từ chối mã ngoài', '03/10/2025', '05/10/2025', 'Trương Thanh Trúc'],
              ['', '- Thiết kế testcase Đăng nhập & Đăng ký phân quyền RBAC', '03/10/2025', '05/10/2025', 'Trương Thanh Trúc'],
              ['', '- Thiết kế testcase Biểu phí cước & Hóa đơn VAT 8%', '03/10/2025', '05/10/2025', 'Vương Quang Minh'],
              ['', '- Thiết kế testcase Voucher, Điểm thưởng & Bàn giao ca', '03/10/2025', '05/10/2025', 'Vương Quang Minh'],
              ['4', 'Xem lại (Review) bộ testcase toàn hệ thống', '03/10/2025', '05/10/2025', 'Tất cả'],
              ['', '- Xem lại testcase Đặt chỗ trước & Sơ đồ ô đỗ', '03/10/2025', '05/10/2025', 'Thuật, Tuyển'],
              ['', '- Xem lại testcase Giám sát Làn Vào/Ra & Barrier', '03/10/2025', '05/10/2025', 'Tuyển, Trúc'],
              ['', '- Xem lại testcase Biểu phí & Hóa đơn điện tử VAT', '03/10/2025', '05/10/2025', 'Minh, Thuật'],
              ['', '- Xem lại testcase Cổng QR Pass & Xác thực người dùng', '03/10/2025', '05/10/2025', 'Trúc, Minh'],
              ['5', 'Thực thi các testcase trên môi trường Staging:', '03/10/2025', '05/10/2025', 'Tất cả'],
              ['', '- Thực thi testcase Đặt chỗ trước & Sơ đồ ô đỗ', '03/10/2025', '05/10/2025', 'Nguyễn Văn Thuật'],
              ['', '- Thực thi testcase Giám sát Làn Vào/Ra & Barrier', '03/10/2025', '05/10/2025', 'Phan Ngọc Tuyển'],
              ['', '- Thực thi testcase Cổng QR Pass & Xác thực người dùng', '03/10/2025', '05/10/2025', 'Trương Thanh Trúc'],
              ['', '- Thực thi testcase Biểu phí, Voucher & Bàn giao ca', '03/10/2025', '05/10/2025', 'Vương Quang Minh'],
              ['6', 'Ghi nhận bug, đánh giá kết quả & lập Test Report', '03/10/2025', '05/10/2025', 'Tất cả']
            ],
            [600, 4400, 1400, 1400, 1700]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // CHƯƠNG VI: ĐÁNH GIÁ RỦI RO
          createHeaderPara('VI. Đánh giá rủi ro', HeadingLevel.HEADING_1),

          createHeaderPara('1. Đánh giá rủi ro nghiệp vụ & kỹ thuật', HeadingLevel.HEADING_2),
          createBulletItem('Rủi ro', 'Nhiều khách hàng truy cập đặt chỗ cùng lúc vào khung giờ cao điểm (sáng đi làm, cuối tuần) có thể gây quá tải API hoặc lỗi tranh chấp ô đỗ (Race condition / Double-booking).'),
          createBulletItem('Giải pháp', 'Áp dụng cơ chế khóa tạm ô đỗ trong 5 phút khi người dùng chuyển sang bước thanh toán; tiến hành kiểm thử tải (Load Test) và kiểm thử hiệu năng API với Apache JMeter / Artillery.'),

          createHeaderPara('2. Rủi ro nhân sự', HeadingLevel.HEADING_2),
          createBulletItem('Rủi ro', 'Thành viên nhóm chưa có nhiều kinh nghiệm thực tế về kiểm thử tích hợp WebSocket (Socket.IO) và mô phỏng quét mã camera AI.'),
          createBulletItem('Giải pháp', 'Tổ chức các buổi chia sẻ kỹ thuật nội bộ, phân công cặp đôi (Pair Testing) và chéo kiểm tra (Review) test case kỹ lưỡng trước khi thực thi.'),

          createHeaderPara('3. Rủi ro công cụ kiểm thử', HeadingLevel.HEADING_2),
          createBulletItem('Rủi ro', 'Thư viện quét mã QR Html5-QRCode có thể hoạt động không ổn định hoặc bị từ chối quyền truy cập camera trên các trình duyệt khác nhau.'),
          createBulletItem('Giải pháp', 'Chuẩn bị sẵn cơ chế kiểm thử giả lập dữ liệu chuỗi QR Pass và gõ tay mã số biển xe trực tiếp trên giao diện bốt trực.'),

          createHeaderPara('4. Rủi ro thời gian', HeadingLevel.HEADING_2),
          createBulletItem('Rủi ro', 'Lịch kiểm thử trùng với thời gian thi cử và nộp đồ án các môn học song hành trong học kỳ.'),
          createBulletItem('Giải pháp', 'Phân chia nhiệm vụ độc lập, bám sát bảng tiến độ WBS và tổ chức họp chớp nhoáng (Daily Standup 15 phút) để gỡ vướng mắc kịp thời.'),

          new Paragraph({ children: [new PageBreak()] }),

          // CHƯƠNG VII: DEFECT TRACKING
          createHeaderPara('VII. Defect Tracking (Theo dõi & Phân loại lỗi)', HeadingLevel.HEADING_1),
          buildTable(
            ['Mức độ nghiêm trọng (Severity)', 'Đặc tả chi tiết lỗi thực tế trong hệ thống SmartPark'],
            [
              [
                'HIGH\n(Blocker / Critical)',
                '• Lỗi Kẹt Barrier không mở: Xe quét mã QR Pass hợp lệ hoặc thanh toán VietQR thành công nhưng Socket.IO không truyền tín hiệu, cần gạt barrier vẫn đóng khiến xe không thể ra/vào bãi gây ùn tắc giao thông nghiêm trọng.\n• Lỗi Chấp nhận sai mã QR lạ: Cổng quét bốt trực nhận diện một mã QR ngoài hệ thống (Zalo, MoMo cá nhân) nhưng lại hiển thị thành công và mở barrier cho xe vào trái phép.\n• Lỗi Đặt trùng ô đỗ (Double Booking): Hệ thống cho phép hai khách hàng đặt thành công cùng một ô đỗ (ví dụ: B1-08) trong cùng một khung giờ.\n• Lỗi Sai lệch dòng tiền: Biểu phí hiển thị 25.000đ nhưng gửi sang cổng thanh toán Napas VietQR lại là số tiền khác; hoặc thuế GTGT 8% bị tính nhân đôi gây sai lệch số liệu doanh thu.\n• Lỗi Phân quyền bảo mật: Khách hàng thông thường gõ trực tiếp URL /admin trên thanh trình duyệt mà vẫn vào được trang sửa biểu phí hoặc can thiệp đối soát tiền mặt của nhân viên.'
              ],
              [
                'MEDIUM\n(Major)',
                '• Lỗi Xuất hóa đơn VAT / Báo cáo ca: Nhân viên ấn nút "Xuất hóa đơn VAT điện tử" hoặc Admin ấn "Tải báo cáo giao ca Excel" bị báo lỗi hệ thống 500 (tuy nhiên dữ liệu trên màn hình web vẫn còn hiển thị đầy đủ).\n• Lỗi Bộ lọc tìm kiếm: Ô tìm kiếm biển số xe hoặc mã hóa đơn không lọc được khi người dùng nhập chữ thường không dấu (ví dụ: gõ "43a" không ra kết quả "43A").\n• Lỗi Chặn dữ liệu đầu vào: Form cấu hình biểu phí cho phép nhập số âm (ví dụ: -15.000đ/giờ), hoặc form đặt chỗ cho phép chọn ngày kết thúc trước ngày bắt đầu.\n• Lỗi Thiếu Validation: Form thêm mới chi nhánh bãi xe không hiển thị dấu hoa thị đỏ (*) tại ô Tên chi nhánh, khiến người dùng bấm Lưu mới biết là trường bắt buộc.'
              ],
              [
                'LOW\n(Minor / Cosmetic)',
                '• Lỗi Chính tả: Trên menu hiển thị sai từ ngữ chuyên môn (ví dụ: viết sai thành "Quản trị vourcher" hoặc "So do o do").\n• Lỗi Giao diện (Responsive): Khi co nhỏ màn hình trình duyệt, nút "Mở barrier khẩn cấp F4" bị thụt xuống dưới chân trang hoặc sơ đồ các ô đỗ tầng B2 bị tràn khung ngang.\n• Lỗi Màu sắc / Đồng bộ: Màu sắc hiển thị ô đỗ bảo trì bị nhầm thành màu xanh lá cây gây hiểu nhầm là ô đỗ đang trống.\n• Lỗi Gợi ý (Tooltip): Di chuột vào biểu tượng "Phím nóng F4" nhưng hệ thống không hiện hộp thoại nhỏ hướng dẫn "Nhấn F4 để mở cưỡng chế khẩn cấp".'
              ]
            ],
            [2600, 6900]
          ),

          new Paragraph({ spacing: { before: 240 } }),

          // CHƯƠNG VIII: TEST DELIVERABLES
          createHeaderPara('VIII. Test Deliverables (Sản phẩm bàn giao)', HeadingLevel.HEADING_1),
          buildTable(
            ['STT', 'Sản phẩm bàn giao (Deliverables)', 'Định dạng tài liệu', 'Mô tả nội dung chi tiết'],
            [
              ['1', 'Tài liệu Kế hoạch kiểm thử (Test Plan)', 'Word (.docx) & PDF', 'Bản kế hoạch chi tiết đã được GVHD phê duyệt, bao gồm phạm vi, chiến lược, lịch trình và phân công nhân sự.'],
              ['2', 'Bộ kịch bản kiểm thử (Test Cases Specification)', 'Excel (.xlsx)', 'Tập hợp đầy đủ các kịch bản kiểm thử từ TC_AUTH_01 đến TC_SHIFT_50 bao phủ 10 phân hệ của SmartPark.'],
              ['3', 'Nhật ký lỗi (Defect Tracking Report)', 'Excel (.xlsx) / Jira', 'Danh sách toàn bộ các bug phát hiện được, ảnh chụp màn hình bằng chứng, mức độ High/Medium/Low và trạng thái xử lý.'],
              ['4', 'Báo cáo tổng kết kiểm thử (Test Summary Report)', 'Word (.docx) & PDF', 'Đánh giá tỷ lệ đạt (Pass Rate), số lỗi đã sửa thành công và nghiệm thu hệ thống đủ điều kiện vận hành.']
            ],
            [600, 3200, 2000, 3700]
          ),

          new Paragraph({ spacing: { before: 360 } }),

          // Chữ ký xác nhận
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE }
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'XÁC NHẬN CỦA GVHD', font: FONT_FAMILY, bold: true, size: 24 })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 800 },
                        children: [
                          new TextRun({ text: 'ThS. NGUYỄN MINH NHẬT', font: FONT_FAMILY, bold: true, size: 24 })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE }
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'ĐẠI DIỆN NHÓM THỰC HIỆN', font: FONT_FAMILY, bold: true, size: 24 })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 800 },
                        children: [
                          new TextRun({ text: 'Trương Thanh Trúc (Nhóm trưởng)', font: FONT_FAMILY, bold: true, size: 24 })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const outputPath = path.resolve('KeHoachKiemThu_SmartPark_DTU.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log('SUCCESS: Generated updated Word file at ' + outputPath);
}

run().catch(err => {
  console.error('ERROR generating Word document:', err);
  process.exit(1);
});
