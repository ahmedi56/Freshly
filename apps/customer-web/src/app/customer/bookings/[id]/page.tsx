'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking, useRateBooking } from '@/lib/hooks';
import { fmtDate, fmtDateTime, fmtZAR, statusLabel } from '@/lib/format';
import { ServiceIcon } from '@/lib/catalog-icons';
import { AlertBox, Avatar, Content, Main, Screen, Spinner, StarPicker, StatusPill, TopBar } from '@/components/ui';
import { ApiError } from '@/lib/api';

export default function CustomerBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: booking, isLoading, error } = useBooking(id);
  const rateBooking = useRateBooking();
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [rateError, setRateError] = useState('');

  async function submitRating() {
    if (!ratingValue) return;
    setRateError('');
    try {
      await rateBooking.mutateAsync({ id: Number(id), rating: ratingValue, review: reviewText });
    } catch (e) {
      setRateError(e instanceof ApiError ? e.message : 'Something went wrong.');
    }
  }

  return (
    <Screen>
      <Main>
        <TopBar title="Booking details" onBack={() => router.push('/customer/bookings')} />
        <Content>
          <AlertBox
            message={
              rateError ||
              (error instanceof ApiError ? error.message : error ? 'Something went wrong.' : null)
            }
          />
          {isLoading ? (
            <Spinner />
          ) : !booking ? null : (
            <div className="md:grid md:grid-cols-2 md:gap-6 md:items-start">
              <div>
                <div className="card">
                  <div className="flex justify-between items-center">
                    <h3 className="flex items-center gap-2">
                      <ServiceIcon name={booking.service_name} size={20} className="text-forest" strokeWidth={1.75} />
                      {booking.service_name}
                    </h3>
                    <StatusPill status={booking.status} />
                  </div>
                  <div className="text-xs text-charcoal-muted mt-2">
                    {fmtDate(booking.booking_date)} · {booking.time_slot}
                  </div>
                  <div className="text-xs text-charcoal-muted mt-2">{booking.address}</div>
                  {booking.cleaner_name ? (
                    <div className="flex justify-between items-center mt-4">
                      <div>
                        <div className="font-semibold text-sm">{booking.cleaner_name}</div>
                        <div className="text-xs text-charcoal-muted">{booking.cleaner_phone || ''}</div>
                      </div>
                      <Avatar name={booking.cleaner_name} />
                    </div>
                  ) : (
                    <div className="text-xs text-charcoal-muted mt-4">We&apos;re finding you a cleaner.</div>
                  )}
                </div>

                <div className="text-xs font-bold text-charcoal-muted uppercase tracking-wide mt-6 mb-2.5">Price</div>
                <div className="card">
                  <PriceRow label="Subtotal" value={fmtZAR(booking.subtotal)} />
                  {booking.discount > 0 && <PriceRow label="Discount" value={`- ${fmtZAR(booking.discount)}`} />}
                  <PriceRow label="VAT" value={fmtZAR(booking.vat)} />
                  <div className="flex justify-between border-t-[1.5px] border-border mt-1.5 pt-3.5 text-[17px] font-bold text-forest-dark">
                    <span>Total</span>
                    <span>{fmtZAR(booking.total)}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-charcoal-muted uppercase tracking-wide mt-6 md:mt-0 mb-2.5">
                  Timeline
                </div>
                <div className="card">
                  {(booking.events || []).map((ev) => (
                    <div key={ev.id} className="flex gap-3 pb-4.5 relative last:pb-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-mint mt-1.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-sm text-forest-dark capitalize">{statusLabel(ev.status)}</div>
                        <div className="text-xs text-charcoal-muted mt-0.5">{fmtDateTime(ev.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {booking.status === 'completed' && !booking.rating ? (
                  <div>
                    <div className="text-xs font-bold text-charcoal-muted uppercase tracking-wide mt-6 mb-2.5">
                      Rate this cleaning
                    </div>
                    <div className="card">
                      <StarPicker value={ratingValue} onChange={setRatingValue} />
                      <textarea
                        rows={3}
                        placeholder="Leave a review (optional)"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        className="w-full rounded-[var(--radius-sm)] border-[1.5px] border-border p-3 text-sm"
                      />
                      <button
                        disabled={!ratingValue || rateBooking.isPending}
                        onClick={submitRating}
                        className="w-full mt-4 py-3.5 rounded-[var(--radius-md)] font-semibold bg-forest text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {rateBooking.isPending ? 'Submitting…' : 'Submit rating'}
                      </button>
                    </div>
                  </div>
                ) : booking.rating ? (
                  <div>
                    <div className="text-xs font-bold text-charcoal-muted uppercase tracking-wide mt-6 mb-2.5">
                      Your rating
                    </div>
                    <div className="card">
                      <StarPicker value={booking.rating} />
                      {booking.review && (
                        <p className="text-sm text-charcoal-muted text-center mt-2">{booking.review}</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </Content>
      </Main>
    </Screen>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 text-sm text-charcoal-muted">
      <span>{label}</span>
      <span className="text-charcoal font-medium">{value}</span>
    </div>
  );
}
