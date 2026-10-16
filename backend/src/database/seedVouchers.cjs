const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:123456@localhost:5432/smartpark' });

async function seed() {
  const vouchers = [
    {
      id: 'V-SMART50',
      code: 'SMART50',
      title: 'Giảm 50% Chuyến Đầu',
      pts_cost: 200,
      discount_val: '50',
      discount_type: 'percent',
      min_order_val: 25000,
      conditions: 'Áp dụng cho mọi bãi đỗ khi đặt chỗ trước lần đầu',
      status: 'Kích hoạt',
      expiry_date: '31/12/2026',
      is_hidden: false,
      visibility: 'public'
    },
    {
      id: 'V-FREE2H',
      code: 'FREE2H',
      title: 'Miễn Phí 2 Giờ Đầu',
      pts_cost: 150,
      discount_val: '25000',
      discount_type: 'fixed',
      min_order_val: 25000,
      conditions: 'Trải nghiệm bãi mới Aeon Mall & Sân Bay Đà Nẵng',
      status: 'Kích hoạt',
      expiry_date: '15/11/2026',
      is_hidden: false,
      visibility: 'public'
    },
    {
      id: 'V-PEAK20',
      code: 'PEAK20',
      title: 'Giảm 20% Giờ Cao Điểm',
      pts_cost: 100,
      discount_val: '20',
      discount_type: 'percent',
      min_order_val: 40000,
      conditions: 'Áp dụng khung giờ tan tầm 17h00 - 19h00',
      status: 'Kích hoạt',
      expiry_date: '20/12/2026',
      is_hidden: false,
      visibility: 'public'
    }
  ];

  for (const v of vouchers) {
    await pool.query(
      `INSERT INTO vouchers (id, code, title, pts_cost, discount_val, discount_type, min_order_val, conditions, status, expiry_date, is_hidden, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, pts_cost = EXCLUDED.pts_cost, discount_val = EXCLUDED.discount_val`,
      [v.id, v.code, v.title, v.pts_cost, v.discount_val, v.discount_type, v.min_order_val, v.conditions, v.status, v.expiry_date, v.is_hidden, v.visibility]
    );
  }
  console.log('Seeded vouchers successfully into PostgreSQL!');
  await pool.end();
}

seed().catch(console.error);
