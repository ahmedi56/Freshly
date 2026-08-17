'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Building, Briefcase, Check, CheckCircle2, Home, Minus, Plus, Sparkles } from 'lucide-react';
import {
  useAvailableCleaners,
  useCreateBooking,
  useExtras,
  useQuoteMutation,
  useServices,
} from '@/lib/hooks';
import { fmtDate, fmtZAR } from '@/lib/format';
import { getServiceIcon, getExtraIcon, ServiceIcon } from '@/lib/catalog-icons';
import { AlertBox, Avatar, Content, Main, RatingValue, Screen, Spinner, StatusPill, TopBar } from '@/components/ui';
import { ApiError } from '@/lib/api';
import type { Booking, Quote } from '@/lib/types';

const TIME_SLOTS = ['07:00 - 09:00', '09:00 - 11:00', '11:00 - 13:00', '13:00 - 15:00', '15:00 - 17:00'];
const PROPERTY_TYPES = [
  { id: 'apartment', label: 'Apartment', icon: Building2 },
  { id: 'house', label: 'House', icon: Home },
  { id: 'office', label: 'Office', icon: Briefcase },
  { id: 'other', label: 'Other', icon: Building },
];

const TOTAL_STEPS = 7;

export default function CustomerBookingFlowPage() {
  const router = useRouter();
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const { data: extras = [], isLoading: extrasLoading } = useExtras();
  const quoteMutation = useQuoteMutation();
  const createBooking = useCreateBooking();

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [propertyType, setPropertyType] = useState<string | null>(null);
  const [rooms, setRooms] = useState(1);
  const [extraIds, setExtraIds] = useState<number[]>([]);
  const [bookingDate, setBookingDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [address, setAddress] = useState('');
  const [accessInstructions, setAccessInstructions] = useState('');
  const [cleanerId, setCleanerId] = useState<number | null>(null);
  const [autoAssign, setAutoAssign] = useState(false);
  const [error, setError] = useState('');
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  // Computing today's date at render time (`new Date()`) would evaluate to
  // a different value on the server than on the client (different clocks/
  // timezones), producing a `min` attribute that mismatches during
  // hydration. Leave it unset for the first render (server and client
  // agree: no `min`) and fill it in after mount, once — this can never
  // itself become stale within a single page visit.
  const [minBookingDate, setMinBookingDate] = useState<string | undefined>(undefined);
  useEffect(() => {
    // Deferred to a microtask rather than called synchronously in the
    // effect body — same pattern as auth-context.tsx's mount check.
    Promise.resolve().then(() => setMinBookingDate(new Date().toISOString().slice(0, 10)));
  }, []);

  const { data: cleaners = [], isFetched: cleanersFetched } = useAvailableCleaners(step >= 6);

  const loading = servicesLoading || extrasLoading;
  const quote = quoteMutation.data;

  useEffect(() => {
    if (!serviceId) return;
    quoteMutation.mutate({ service_id: serviceId, rooms, extra_ids: extraIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, rooms, extraIds]);

  function goBack() {
    if (step === 1) {
      router.push('/customer/home');
      return;
    }
    setStep((s) => s - 1);
  }

  function canProceed() {
    switch (step) {
      case 1:
        return !!serviceId;
      case 2:
        return !!propertyType;
      case 3:
        return true;
      case 4:
        return !!bookingDate && !!timeSlot;
      case 5:
        return address.trim().length > 3;
      case 6:
        return autoAssign || !!cleanerId;
      case 7:
        return !!quote;
      default:
        return true;
    }
  }

  async function submitBooking() {
    setError('');
    try {
      const payload = {
        service_id: serviceId!,
        property_type: propertyType!,
        rooms,
        extra_ids: extraIds,
        booking_date: bookingDate,
        time_slot: timeSlot,
        address,
        access_instructions: accessInstructions,
        auto_assign: autoAssign,
        ...(cleanerId ? { cleaner_id: cleanerId } : {}),
      };
      const data = await createBooking.mutateAsync(payload);
      setCreatedBooking(data.booking);
      setStep(8);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    }
  }

  const isConfirmation = step === 8;

  return (
    <Screen>
      <Main>
        {isConfirmation ? (
          <TopBar title="Freshly" />
        ) : (
          <TopBar title={`Step ${step} of ${TOTAL_STEPS}`} onBack={goBack} />
        )}
        {!isConfirmation && (
          <div className="flex gap-1.5 px-5 md:px-8 pb-3.5 max-w-[560px]">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-[3px] ${
                  i + 1 < step ? 'bg-mint' : i + 1 === step ? 'bg-forest' : 'bg-border'
                }`}
              />
            ))}
          </div>
        )}
        <Content>
          <AlertBox message={error} />
          {loading ? (
            <Spinner />
          ) : (
            <>
              {step === 1 && (
                <div>
                  <h2 className="mb-4">What do you need?</h2>
                  <div className="grid grid-cols-2 gap-2.5">
                    {services.map((s) => {
                      const Icon = getServiceIcon(s.name);
                      return (
                        <div
                          key={s.id}
                          onClick={() => setServiceId(s.id)}
                          className={`border-[1.5px] rounded-[var(--radius-md)] p-4 cursor-pointer transition-colors bg-card-white ${
                            serviceId === s.id ? 'border-forest bg-sage' : 'border-border hover:border-green'
                          }`}
                        >
                          <Icon size={26} className="text-forest mb-2" strokeWidth={1.5} />
                          <div className="font-semibold text-sm text-forest-dark">{s.name}</div>
                          <div className="text-xs text-charcoal-muted mt-1">From {fmtZAR(s.base_price)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="mb-4">Property details</h2>
                  <EstTotalBar quote={quote} />
                  <div className="grid grid-cols-2 gap-2.5 mb-5">
                    {PROPERTY_TYPES.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setPropertyType(p.id)}
                        className={`border-[1.5px] rounded-[var(--radius-md)] p-4 cursor-pointer bg-card-white ${
                          propertyType === p.id ? 'border-forest bg-sage' : 'border-border hover:border-green'
                        }`}
                      >
                        <p.icon size={26} className="text-forest mb-2" strokeWidth={1.5} />
                        <div className="font-semibold text-sm text-forest-dark">{p.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs font-bold text-charcoal-muted uppercase tracking-wide mb-2.5">
                    Number of rooms
                  </div>
                  <div className="flex items-center justify-center gap-5 py-6">
                    <button
                      onClick={() => setRooms((r) => Math.max(1, r - 1))}
                      className="w-12 h-12 rounded-full border-[1.5px] border-border bg-card-white text-forest cursor-pointer flex items-center justify-center"
                    >
                      <Minus size={18} />
                    </button>
                    <div className="text-4xl font-extrabold text-forest-dark min-w-[50px] text-center">{rooms}</div>
                    <button
                      onClick={() => setRooms((r) => r + 1)}
                      className="w-12 h-12 rounded-full border-[1.5px] border-border bg-card-white text-forest cursor-pointer flex items-center justify-center"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="mb-4">Add extras</h2>
                  <EstTotalBar quote={quote} />
                  {extras.map((ex) => {
                    const selected = extraIds.includes(ex.id);
                    const Icon = getExtraIcon(ex.name);
                    return (
                      <div
                        key={ex.id}
                        onClick={() =>
                          setExtraIds((ids) => (selected ? ids.filter((id) => id !== ex.id) : [...ids, ex.id]))
                        }
                        className={`flex items-center justify-between px-4 py-3.5 border-[1.5px] rounded-[var(--radius-md)] mb-2.5 cursor-pointer ${
                          selected ? 'border-forest bg-sage' : 'border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={19} className="text-forest" strokeWidth={1.75} />
                          <div>
                            <div className="font-semibold text-sm">{ex.name}</div>
                            <div className="text-[13px] text-charcoal-muted">{fmtZAR(ex.price)}</div>
                          </div>
                        </div>
                        <div
                          className={`w-5.5 h-5.5 rounded-md border-[1.5px] flex items-center justify-center text-white ${
                            selected ? 'bg-forest border-forest' : 'bg-card-white border-border'
                          }`}
                        >
                          {selected && <Check size={14} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {step === 4 && (
                <div>
                  <h2 className="mb-4">When works for you?</h2>
                  <EstTotalBar quote={quote} />
                  <div className="mb-4 field">
                    <label className="block text-[13px] font-semibold text-charcoal-muted mb-1.5">Date</label>
                    <input
                      type="date"
                      value={bookingDate}
                      min={minBookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                    />
                  </div>
                  <div className="text-xs font-bold text-charcoal-muted uppercase tracking-wide mb-2.5">
                    Time slot
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {TIME_SLOTS.map((slot) => (
                      <div
                        key={slot}
                        onClick={() => setTimeSlot(slot)}
                        className={`p-3.5 text-center border-[1.5px] rounded-[var(--radius-sm)] cursor-pointer text-sm font-semibold ${
                          timeSlot === slot ? 'border-forest bg-sage text-forest-dark' : 'border-border text-charcoal'
                        }`}
                      >
                        {slot}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div>
                  <h2 className="mb-4">Where should we clean?</h2>
                  <EstTotalBar quote={quote} />
                  <div className="mb-4 field">
                    <label className="block text-[13px] font-semibold text-charcoal-muted mb-1.5">Address</label>
                    <textarea
                      rows={2}
                      placeholder="Street, suburb, city"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  <div className="mb-4 field">
                    <label className="block text-[13px] font-semibold text-charcoal-muted mb-1.5">
                      Access instructions (optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Gate code, parking notes, pets, etc."
                      value={accessInstructions}
                      onChange={(e) => setAccessInstructions(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {step === 6 && (
                <div>
                  <h2 className="mb-4">Choose your cleaner</h2>
                  <EstTotalBar quote={quote} />
                  <div
                    onClick={() => {
                      setAutoAssign(true);
                      setCleanerId(null);
                    }}
                    className={`card cursor-pointer mb-4 ${autoAssign ? 'border-forest bg-sage' : ''}`}
                  >
                    <div className="font-bold flex items-center gap-2">
                      <Sparkles size={17} className="text-forest" strokeWidth={1.75} />
                      Auto-assign best available
                    </div>
                    <div className="text-xs text-charcoal-muted mt-2">
                      We&apos;ll match you with our top-rated available cleaner.
                    </div>
                  </div>
                  <div className="text-xs font-bold text-charcoal-muted uppercase tracking-wide mb-2.5">
                    Or pick someone
                  </div>
                  {!cleanersFetched ? (
                    <Spinner />
                  ) : cleaners.length === 0 ? (
                    <p className="text-sm text-charcoal-muted">No cleaners loaded.</p>
                  ) : (
                    <div className="md:grid md:grid-cols-2 md:gap-2.5">
                      {cleaners.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setCleanerId(c.id);
                            setAutoAssign(false);
                          }}
                          className={`flex items-center gap-3 p-3.5 border-[1.5px] rounded-[var(--radius-md)] mb-2.5 md:mb-0 cursor-pointer ${
                            cleanerId === c.id ? 'border-forest bg-sage' : 'border-border'
                          }`}
                        >
                          <Avatar name={c.full_name} />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">{c.full_name}</div>
                            <div className="text-xs text-charcoal-muted mt-0.5 flex items-center gap-1.5">
                              <RatingValue value={c.rating} count={c.rating_count} />
                              <span>
                                · {c.jobs_completed} jobs · {c.city || ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 7 && (
                <div className="md:grid md:grid-cols-2 md:gap-4">
                  <div>
                    <h2 className="mb-4">Review & confirm</h2>
                    <div className="card mb-4">
                      <div className="text-xs font-bold text-charcoal-muted uppercase tracking-wide mb-2.5">
                        Details
                      </div>
                      <div className="text-sm">{quote ? quote.service.name : ''}</div>
                      <div className="text-xs text-charcoal-muted mt-2">
                        {propertyType || '—'} · {rooms} room(s)
                      </div>
                      <div className="text-xs text-charcoal-muted mt-2">
                        {fmtDate(bookingDate)} · {timeSlot}
                      </div>
                      <div className="text-xs text-charcoal-muted mt-2">{address || '—'}</div>
                      <div className="text-xs text-charcoal-muted mt-2">
                        {autoAssign
                          ? 'Cleaner: Auto-assign best available'
                          : `Cleaner: ${cleaners.find((c) => c.id === cleanerId)?.full_name || '—'}`}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="card md:mt-[52px]">
                      <div className="text-xs font-bold text-charcoal-muted uppercase tracking-wide mb-2.5">
                        Price breakdown
                      </div>
                      {quote ? (
                        <div>
                          <Row label="Subtotal" value={fmtZAR(quote.subtotal)} />
                          {quote.discount > 0 && <Row label="Discount" value={`- ${fmtZAR(quote.discount)}`} />}
                          <Row label="VAT (15%)" value={fmtZAR(quote.vat)} />
                          <div className="flex justify-between border-t-[1.5px] border-border mt-1.5 pt-3.5 text-[17px] font-bold text-forest-dark">
                            <span>Total</span>
                            <span>{fmtZAR(quote.total)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-charcoal-muted">Could not load pricing.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 8 && createdBooking && (
                <div className="text-center pt-10">
                  <CheckCircle2 size={52} className="mx-auto mb-4 text-forest" strokeWidth={1.5} />
                  <h2 className="mb-4">Booking confirmed!</h2>
                  <p className="text-charcoal-muted mb-4">
                    Your {createdBooking.service_name} is booked for {fmtDate(createdBooking.booking_date)} at{' '}
                    {createdBooking.time_slot}.
                  </p>
                  <div className="card text-left max-w-[400px] mx-auto">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-charcoal-muted flex items-center gap-1.5">
                        <ServiceIcon name={createdBooking.service_name} size={14} className="text-forest" strokeWidth={1.75} />
                        Status
                      </span>
                      <StatusPill status={createdBooking.status} />
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-xs text-charcoal-muted">Total</span>
                      <span className="font-bold">{fmtZAR(createdBooking.total)}</span>
                    </div>
                    {createdBooking.cleaner_name && (
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-xs text-charcoal-muted">Cleaner</span>
                        <span>{createdBooking.cleaner_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="max-w-[400px] mx-auto">
                    <button
                      className="w-full mt-4 py-3.5 rounded-[var(--radius-md)] font-semibold bg-forest text-white cursor-pointer"
                      onClick={() => router.push(`/customer/bookings/${createdBooking.id}`)}
                    >
                      View booking
                    </button>
                    <button
                      className="w-full mt-4 py-3.5 rounded-[var(--radius-md)] font-semibold bg-transparent border-[1.5px] border-border text-forest cursor-pointer"
                      onClick={() => router.push('/customer/home')}
                    >
                      Back to home
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Content>

        {!isConfirmation && !loading && (
          <div className="sticky bottom-0 bg-warm-white px-5 md:px-8 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] border-t border-border flex gap-2.5">
            {step === 7 ? (
              <button
                disabled={createBooking.isPending || !canProceed()}
                onClick={submitBooking}
                className="w-full md:w-auto md:px-10 py-3.5 rounded-[var(--radius-md)] font-semibold bg-forest text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createBooking.isPending ? 'Booking…' : 'Confirm booking'}
              </button>
            ) : (
              <button
                disabled={!canProceed()}
                onClick={() => setStep((s) => s + 1)}
                className="w-full md:w-auto md:px-10 py-3.5 rounded-[var(--radius-md)] font-semibold bg-forest text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            )}
          </div>
        )}
      </Main>
    </Screen>
  );
}

function EstTotalBar({ quote }: { quote: Quote | undefined }) {
  if (!quote) return null;
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 bg-sage rounded-[var(--radius-sm)] mb-4 text-sm">
      <span>Estimated total</span>
      <span className="font-bold text-forest-dark text-base">{fmtZAR(quote.total)}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 text-sm text-charcoal-muted">
      <span>{label}</span>
      <span className="text-charcoal font-medium">{value}</span>
    </div>
  );
}
