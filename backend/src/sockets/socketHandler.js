/**
 * SMARTPARK DANANG - SOCKET.IO REALTIME HANDLER
 * Đồng bộ trạng thái Barrier, Camera ANPR, Đơn đặt chỗ & Thanh toán tức thời
 */

// src/sockets/ (Tầng Giao Tiếp Thời Gian Thực)
// socketHandler.js – Quản lý Kênh WebSockets
// Chức năng: Lắng nghe các kết nối từ client (io.on('connection')). 
// Khi có sự kiện phát sinh từ bất kỳ đâu (nhân viên mở barrier, khách đặt chỗ thành công, admin đổi banner),
//  nó sẽ phát sóng (broadcast) sự kiện đó đến toàn bộ các máy khách đang mở trình duyệt mà không cần phải bấm F5 tải lại trang.



export function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log(`⚡ [Socket.IO] Client kết nối thành công: ${socket.id}`);

    // Tham gia phòng trạm bãi xe cụ thể
    socket.on('join:branch', (branchId) => {
      socket.join(branchId);
      console.log(`Client ${socket.id} đã vào phòng chi nhánh: ${branchId}`);
    });

    // Nhận diện biển số xe tại barrier
    socket.on('gate:anpr_scan', (data) => {
      console.log(`[ANPR] Quét biển số xe: ${data.plate} tại ${data.gate}`);
      io.emit('gate:vehicle_detected', {
        ...data,
        scanTime: new Date().toLocaleTimeString('vi-VN')
      });
    });

    // Lệnh nâng/hạ barrier từ nhân viên trực bốt hoặc cưỡng chế F4
    socket.on('barrier:control', (data) => {
      console.log(`[Barrier] Lệnh điều khiển: ${data.command} tại ${data.gate}`);
      io.emit('barrier:status_updated', {
        gate: data.gate,
        status: data.command,
        time: new Date().toLocaleTimeString('vi-VN')
      });
    });

    // Ngắt kết nối
    socket.on('disconnect', () => {
      console.log(`🔌 [Socket.IO] Client đã ngắt kết nối: ${socket.id}`);
    });
  });
}
