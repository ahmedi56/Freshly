// Loaded standalone via `npm run seed` as well as required from server.js
// (which already calls this) — safe to call twice, dotenv no-ops if the
// environment is already populated.
require('dotenv').config();

const db = require('./index');
const migrate = require('./migrate');
const { hashPassword } = require('../utils/auth');
const { computeQuote } = require('../utils/pricing');

function seed() {
  migrate();

  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount > 0) {
    console.log('[seed] database already has data, skipping seed');
    return;
  }

  console.log('[seed] seeding database...');

  const insertUser = db.prepare(`
    INSERT INTO users (role, full_name, email, phone, password_hash)
    VALUES (?, ?, ?, ?, ?)
  `);

  const DEMO_PASSWORD = 'password123';
  const passwordHash = hashPassword(DEMO_PASSWORD);

  // --- Admin ---
  const adminId = insertUser.run('admin', 'Naledi Khumalo', 'admin@freshly.co.za', '0821234567', passwordHash).lastInsertRowid;

  // --- Customers ---
  const customers = [
    ['Thabo Mokoena', 'thabo@example.co.za', '0721112222'],
    ['Sarah van der Merwe', 'sarah@example.co.za', '0731113333'],
    ['Priya Naidoo', 'priya@example.co.za', '0741114444'],
  ];
  const customerIds = customers.map(([full_name, email, phone]) =>
    insertUser.run('customer', full_name, email, phone, passwordHash).lastInsertRowid
  );

  // --- Cleaners ---
  const insertCleanerProfile = db.prepare(`
    INSERT INTO cleaner_profiles (user_id, status, city, province, bio, rating, rating_count, jobs_completed, id_document, references_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const approvedCleaners = [
    ['Nomvula Dlamini', 'nomvula@example.co.za', '0761115555', 'Sandton', 'Gauteng', '5 years experience in residential cleaning. Reliable and detail-oriented.', 4.8, 34, 34],
    ['Johannes Pretorius', 'johannes@example.co.za', '0771116666', 'Rosebank', 'Gauteng', 'Specializes in deep cleaning and move-in/move-out jobs.', 4.6, 21, 21],
    ['Lindiwe Zulu', 'lindiwe@example.co.za', '0781117777', 'Midrand', 'Gauteng', 'Office and home cleaning professional, punctual and thorough.', 4.9, 47, 47],
    ['Pieter Botha', 'pieter@example.co.za', '0791118888', 'Fourways', 'Gauteng', 'Gardening and outdoor cleaning specialist.', 4.5, 12, 12],
  ];

  const cleanerIds = [];
  for (const [full_name, email, phone, city, province, bio, rating, rating_count, jobs_completed] of approvedCleaners) {
    const uid = insertUser.run('cleaner', full_name, email, phone, passwordHash).lastInsertRowid;
    insertCleanerProfile.run(uid, 'approved', city, province, bio, rating, rating_count, jobs_completed, 'id_scan_placeholder.jpg', 'Available on request');
    cleanerIds.push(uid);
  }

  // One pending cleaner application
  const pendingCleanerId = insertUser.run('cleaner', 'Grace Mahlangu', 'grace@example.co.za', '0801119999', passwordHash).lastInsertRowid;
  insertCleanerProfile.run(pendingCleanerId, 'pending', 'Randburg', 'Gauteng', 'New to the platform, 2 years of private cleaning experience.', 0, 0, 0, 'id_scan_placeholder.jpg', 'Available on request');

  // --- Services ---
  const insertService = db.prepare(`
    INSERT INTO services (name, category, base_price, icon, active)
    VALUES (?, ?, ?, ?, 1)
  `);
  const services = [
    ['Home Cleaning', 'residential', 450, ''],
    ['Office Cleaning', 'commercial', 650, ''],
    ['Move In / Move Out Cleaning', 'residential', 900, ''],
    ['Outdoor Cleaning', 'outdoor', 400, ''],
    ['Gardening', 'outdoor', 350, ''],
    ['Laundry', 'residential', 250, ''],
    ['Ironing', 'residential', 200, ''],
    ['Window Cleaning', 'residential', 300, ''],
  ];
  const serviceIds = services.map(([name, category, base_price, icon]) =>
    insertService.run(name, category, base_price, icon).lastInsertRowid
  );

  // --- Extras ---
  const insertExtra = db.prepare(`
    INSERT INTO extras (name, price, icon, active)
    VALUES (?, ?, ?, 1)
  `);
  const extras = [
    ['Oven Cleaning', 150, ''],
    ['Fridge Cleaning', 120, ''],
    ['Wardrobe Packing', 180, ''],
    ['Rug Cleaning', 200, ''],
    ['Deep Cleaning', 350, ''],
  ];
  const extraIds = extras.map(([name, price, icon]) => insertExtra.run(name, price, icon).lastInsertRowid);

  // --- Bookings (a mix of statuses) ---
  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      customer_id, cleaner_id, service_id, property_type, rooms, extras_json,
      booking_date, time_slot, address, access_instructions,
      subtotal, discount, vat, total, status, payment_status, payment_method,
      rating, review, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertEvent = db.prepare(`
    INSERT INTO booking_events (booking_id, status, note, actor_user_id, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  const addresses = [
    '12 Rivonia Rd, Sandton',
    '45 Jan Smuts Ave, Rosebank',
    '78 Old Pretoria Rd, Midrand',
    '23 William Nicol Dr, Fourways',
  ];

  function makeBooking({ customerId, cleanerId, serviceId, extraIdList, rooms, status, paymentStatus, rating, review, daysOffset }) {
    const quote = computeQuote(serviceId, rooms, extraIdList);
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    const bookingDate = date.toISOString().slice(0, 10);

    const id = insertBooking.run(
      customerId,
      cleanerId,
      serviceId,
      'apartment',
      rooms,
      JSON.stringify(extraIdList),
      bookingDate,
      '09:00 - 11:00',
      addresses[Math.floor(Math.random() * addresses.length)],
      'Gate code 4521. Please call on arrival.',
      quote.subtotal,
      quote.discount,
      quote.vat,
      quote.total,
      status,
      paymentStatus,
      paymentStatus === 'paid' ? 'card' : null,
      rating || null,
      review || null
    ).lastInsertRowid;

    insertEvent.run(id, 'pending', 'Booking created', customerId);
    if (status !== 'pending') insertEvent.run(id, status, 'Status updated', cleanerId || adminId);
    return id;
  }

  // Completed booking with rating
  makeBooking({
    customerId: customerIds[0],
    cleanerId: cleanerIds[0],
    serviceId: serviceIds[0],
    extraIdList: [extraIds[0]],
    rooms: 3,
    status: 'completed',
    paymentStatus: 'paid',
    rating: 5,
    review: 'Excellent work, very thorough!',
    daysOffset: -3,
  });

  // Another completed booking
  makeBooking({
    customerId: customerIds[1],
    cleanerId: cleanerIds[2],
    serviceId: serviceIds[1],
    extraIdList: [],
    rooms: 5,
    status: 'completed',
    paymentStatus: 'paid',
    rating: 4,
    review: 'Good job, arrived on time.',
    daysOffset: -7,
  });

  // Assigned, upcoming
  makeBooking({
    customerId: customerIds[0],
    cleanerId: cleanerIds[1],
    serviceId: serviceIds[2],
    extraIdList: [extraIds[4]],
    rooms: 4,
    status: 'assigned',
    paymentStatus: 'unpaid',
    daysOffset: 1,
  });

  // Cleaning in progress
  makeBooking({
    customerId: customerIds[2],
    cleanerId: cleanerIds[0],
    serviceId: serviceIds[0],
    extraIdList: [extraIds[1], extraIds[3]],
    rooms: 2,
    status: 'cleaning',
    paymentStatus: 'unpaid',
    daysOffset: 0,
  });

  // Pending, unassigned - needs admin action
  makeBooking({
    customerId: customerIds[1],
    cleanerId: null,
    serviceId: serviceIds[4],
    extraIdList: [],
    rooms: 1,
    status: 'pending',
    paymentStatus: 'unpaid',
    daysOffset: 2,
  });

  // Confirmed, unassigned
  makeBooking({
    customerId: customerIds[2],
    cleanerId: null,
    serviceId: serviceIds[7],
    extraIdList: [],
    rooms: 3,
    status: 'confirmed',
    paymentStatus: 'unpaid',
    daysOffset: 3,
  });

  // --- Notifications ---
  const insertNotification = db.prepare(`
    INSERT INTO notifications (user_id, message, read, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `);
  insertNotification.run(customerIds[0], 'Your booking has been confirmed and a cleaner has been assigned.', 0);
  insertNotification.run(cleanerIds[1], 'You have a new job assigned for tomorrow.', 0);
  insertNotification.run(adminId, 'A new cleaner application is awaiting review.', 0);

  console.log('[seed] done.');
  console.log('');
  console.log('=== Demo accounts (all use password: ' + DEMO_PASSWORD + ') ===');
  console.log('Admin:     admin@freshly.co.za');
  console.log('Customer:  thabo@example.co.za / sarah@example.co.za / priya@example.co.za');
  console.log('Cleaner:   nomvula@example.co.za / johannes@example.co.za / lindiwe@example.co.za / pieter@example.co.za');
  console.log('Pending cleaner: grace@example.co.za');
}

if (require.main === module) {
  seed();
}

module.exports = seed;
