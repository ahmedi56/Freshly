const { z } = require('zod');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.issues[0];
      const message = first ? `${first.path.join('.') || 'body'}: ${first.message}` : 'Invalid request body';
      return res.status(400).json({ error: message });
    }
    req.body = result.data;
    next();
  };
}

const id = z.coerce.number().int().positive();

const schemas = {
  register: z.object({
    role: z.enum(['customer', 'cleaner']),
    full_name: z.string().trim().min(1, 'full_name is required').max(120),
    email: z.string().trim().toLowerCase().email('must be a valid email'),
    phone: z.string().trim().max(30).optional().nullable(),
    password: z.string().min(8, 'password must be at least 8 characters').max(200),
    city: z.string().trim().max(120).optional().nullable(),
    province: z.string().trim().max(120).optional().nullable(),
    bio: z.string().trim().max(2000).optional().nullable(),
  }),

  login: z.object({
    email: z.string().trim().toLowerCase().email('must be a valid email'),
    password: z.string().min(1, 'password is required').max(200),
  }),

  quote: z.object({
    service_id: id,
    rooms: z.coerce.number().int().min(1).max(50).optional(),
    extra_ids: z.array(id).max(50).optional(),
  }),

  createBooking: z.object({
    service_id: id,
    rooms: z.coerce.number().int().min(1).max(50).optional(),
    extra_ids: z.array(id).max(50).optional(),
    booking_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'booking_date must be YYYY-MM-DD'),
    time_slot: z.string().trim().min(1).max(60),
    address: z.string().trim().min(4, 'address is too short').max(500),
    access_instructions: z.string().trim().max(1000).optional().nullable(),
    property_type: z.string().trim().max(60).optional().nullable(),
    cleaner_id: id.optional(),
    auto_assign: z.boolean().optional(),
  }),

  bookingStatus: z.object({
    status: z.enum(['on_the_way', 'arrived', 'cleaning', 'completed']),
  }),

  rateBooking: z.object({
    rating: z.coerce.number().int().min(1).max(5),
    review: z.string().trim().max(2000).optional().nullable(),
  }),

  adminAssign: z.object({
    cleaner_id: id,
  }),

  adminCancel: z.object({
    reason: z.string().trim().max(500).optional().nullable(),
  }),

  adminCleanerStatus: z.object({
    status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
  }),

  adminServiceCreate: z.object({
    name: z.string().trim().min(1).max(120),
    category: z.string().trim().max(60).optional().nullable(),
    base_price: z.coerce.number().positive().max(1000000),
    icon: z.string().trim().max(10).optional().nullable(),
  }),

  adminServiceUpdate: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().max(60).optional().nullable(),
    base_price: z.coerce.number().positive().max(1000000).optional(),
    icon: z.string().trim().max(10).optional().nullable(),
    active: z
      .union([z.boolean(), z.literal(0), z.literal(1)])
      .transform((v) => (v === true || v === 1 ? 1 : v === false || v === 0 ? 0 : undefined))
      .optional(),
  }),

  refreshToken: z.object({
    refreshToken: z.string().min(1).optional(),
  }),
};

module.exports = { validate, schemas };
