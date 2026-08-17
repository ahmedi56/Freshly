// Defines the valid booking status lifecycle and which transitions are allowed.
//
//   pending -> confirmed -> assigned -> on_the_way -> arrived -> cleaning -> completed
//
// 'cancelled' is reachable from any pre-completed state, but only via the admin
// cancel endpoint (not via the generic cleaner status-update endpoint).

const LIFECYCLE_ORDER = [
  'pending',
  'confirmed',
  'assigned',
  'on_the_way',
  'arrived',
  'cleaning',
  'completed',
];

// Transitions a cleaner is allowed to perform via PATCH /bookings/:id/status
const CLEANER_TRANSITIONS = {
  assigned: ['on_the_way'],
  on_the_way: ['arrived'],
  arrived: ['cleaning'],
  cleaning: ['completed'],
};

function isValidCleanerTransition(fromStatus, toStatus) {
  const allowed = CLEANER_TRANSITIONS[fromStatus];
  return Array.isArray(allowed) && allowed.includes(toStatus);
}

function isCancellable(status) {
  return status !== 'completed' && status !== 'cancelled';
}

module.exports = {
  LIFECYCLE_ORDER,
  CLEANER_TRANSITIONS,
  isValidCleanerTransition,
  isCancellable,
};
