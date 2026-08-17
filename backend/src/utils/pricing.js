const db = require('../db');

const VAT_RATE = 0.15; // South Africa VAT
const EXTRA_ROOM_MULTIPLIER = 0.35; // each room beyond the first adds 35% of base price
const DISCOUNT_THRESHOLD = 1000; // ZAR - bookings over this subtotal get a discount
const DISCOUNT_RATE = 0.05;

/**
 * Computes subtotal, discount, vat, and total for a booking.
 * ALWAYS computed server-side. Never trust a price sent from the client.
 *
 * @param {number} serviceId
 * @param {number} rooms
 * @param {number[]} extraIds
 * @returns {{ subtotal: number, discount: number, vat: number, total: number, service: object, extras: object[] }}
 */
function computeQuote(serviceId, rooms, extraIds = []) {
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND active = 1').get(serviceId);
  if (!service) {
    const err = new Error('Invalid or inactive service');
    err.status = 400;
    throw err;
  }

  const roomCount = Math.max(1, parseInt(rooms, 10) || 1);

  let extras = [];
  if (extraIds && extraIds.length > 0) {
    const placeholders = extraIds.map(() => '?').join(',');
    extras = db
      .prepare(`SELECT * FROM extras WHERE id IN (${placeholders}) AND active = 1`)
      .all(...extraIds);
  }

  const roomMultiplier = 1 + (roomCount - 1) * EXTRA_ROOM_MULTIPLIER;
  const serviceCost = service.base_price * roomMultiplier;
  const extrasCost = extras.reduce((sum, e) => sum + e.price, 0);

  let subtotal = round2(serviceCost + extrasCost);

  let discount = 0;
  if (subtotal >= DISCOUNT_THRESHOLD) {
    discount = round2(subtotal * DISCOUNT_RATE);
  }

  const afterDiscount = round2(subtotal - discount);
  const vat = round2(afterDiscount * VAT_RATE);
  const total = round2(afterDiscount + vat);

  return {
    subtotal,
    discount,
    vat,
    total,
    service,
    extras,
    roomCount,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { computeQuote, VAT_RATE };
