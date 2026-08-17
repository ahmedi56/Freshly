'use client';

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Inbox,
  Star,
  Home,
  ClipboardList,
  User,
  SprayCan,
  Wallet,
  LayoutDashboard,
  CalendarDays,
  UserCog,
  Receipt,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { initials, statusLabel } from '@/lib/format';

// Top-level page shell: a persistent nav (bottom tabs on mobile, a left
// sidebar from md up) alongside a main column. Compose as:
//   <Screen><CustomerNav .../><Main><TopBar/><Content>...</Content></Main></Screen>
export function Screen({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col md:flex-row min-h-screen bg-warm-white">{children}</div>;
}

export function Main({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 flex flex-col min-h-screen min-w-0">{children}</div>;
}

export function Content({ wide = false, children }: { wide?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`px-5 md:px-8 pb-[100px] md:pb-12 flex-1 w-full mx-auto ${
        wide ? 'max-w-[1200px]' : 'max-w-[560px]'
      }`}
    >
      {children}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-forest text-white hover:bg-forest-dark',
  secondary: 'bg-sage text-forest-dark hover:bg-mint',
  ghost: 'bg-transparent text-forest border border-[1.5px] border-border hover:border-green',
  danger: 'bg-danger-bg text-danger hover:bg-[#f5d8d6]',
} as const;

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  onClick,
  type = 'button',
  className = '',
}: {
  children: React.ReactNode;
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: 'md' | 'sm';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-semibold cursor-pointer border-0 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
        size === 'sm' ? 'px-3.5 py-2.5 text-[13px] w-auto' : 'px-5.5 py-3.5 text-[15px] w-full md:w-auto'
      } ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="spinner" />
    </div>
  );
}

export function AlertBox({ message, type = 'error' }: { message?: string | null; type?: 'error' | 'info' | 'warn' }) {
  if (!message) return null;
  const classes =
    type === 'error'
      ? 'bg-danger-bg text-danger'
      : type === 'warn'
      ? 'bg-warning-bg text-warning'
      : 'bg-sage text-forest-dark';
  return <div className={`rounded-[var(--radius-sm)] px-3.5 py-3 text-sm mb-3.5 ${classes}`}>{message}</div>;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="text-center py-12 px-5 text-charcoal-muted">
      <Icon className="mx-auto mb-3 text-charcoal-muted" size={36} strokeWidth={1.5} />
      <h3 className="text-base mb-1.5">{title}</h3>
      <p className="text-sm mb-4">{message}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="!w-auto px-6 py-3">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

const PILL_CLASSES: Record<string, string> = {
  pending: 'bg-warning-bg text-warning',
  confirmed: 'bg-info-bg text-info',
  assigned: 'bg-info-bg text-info',
  on_the_way: 'bg-purple-bg text-purple',
  arrived: 'bg-purple-bg text-purple',
  cleaning: 'bg-sage text-forest',
  completed: 'bg-sage text-forest',
  cancelled: 'bg-danger-bg text-danger',
};

export function StatusPill({ status }: { status: string }) {
  const cls = PILL_CLASSES[status] || 'bg-sage text-forest';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {statusLabel(status)}
    </span>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-green text-white flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  );
}

export function RatingValue({ value, count, size = 14 }: { value: number; count?: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Star size={size} className="text-warning" fill="currentColor" strokeWidth={0} />
      <span>
        {value.toFixed(1)}
        {count !== undefined ? ` (${count})` : ''}
      </span>
    </span>
  );
}

export function StarPicker({ value, onChange, size = 32 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div className="flex gap-1.5 justify-center py-2.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={`${onChange ? 'cursor-pointer' : ''} ${n <= value ? 'text-[#E8A33D]' : 'text-border'}`}
        >
          <Star size={size} fill={n <= value ? 'currentColor' : 'none'} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

export function TopBar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 md:px-8 py-4.5 md:py-6 sticky top-0 bg-warm-white z-10">
      {onBack ? (
        <button
          onClick={onBack}
          className="w-9.5 h-9.5 rounded-full border border-border bg-card-white flex items-center justify-center text-forest-dark cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
      ) : (
        <div className="w-9.5" />
      )}
      <div className="text-[17px] md:text-2xl font-bold text-forest-dark">{title}</div>
      {right || <div className="w-9.5" />}
    </div>
  );
}

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const CUSTOMER_ITEMS: NavItem[] = [
  { href: '/customer/home', icon: Home, label: 'Home' },
  { href: '/customer/bookings', icon: ClipboardList, label: 'Bookings' },
  { href: '/customer/profile', icon: User, label: 'Profile' },
];

const CLEANER_ITEMS: NavItem[] = [
  { href: '/cleaner/jobs', icon: SprayCan, label: 'Jobs' },
  { href: '/cleaner/earnings', icon: Wallet, label: 'Earnings' },
  { href: '/cleaner/profile', icon: User, label: 'Profile' },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: '/admin/overview', icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/bookings', icon: CalendarDays, label: 'Bookings' },
  { href: '/admin/cleaners', icon: UserCog, label: 'Cleaners' },
  { href: '/admin/customers', icon: Receipt, label: 'Customers' },
  { href: '/admin/services', icon: Wrench, label: 'Services' },
];

// Bottom tab bar on mobile widths, a persistent left sidebar from md up.
// `active` is the currently selected item's href.
function SideNav({ items, active, brand }: { items: NavItem[]; active: string; brand: string }) {
  const router = useRouter();
  return (
    <>
      {/* Mobile: bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card-white border-t border-border flex px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-20">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === active;
          return (
            <div
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-[var(--radius-sm)] cursor-pointer text-[11px] font-semibold ${
                isActive ? 'text-forest bg-sage' : 'text-charcoal-muted'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Desktop: persistent sidebar */}
      <div className="hidden md:flex md:flex-col md:w-64 md:shrink-0 md:border-r md:border-border md:min-h-screen md:sticky md:top-0 md:py-6 md:px-4">
        <div className="px-3 mb-8 flex items-center gap-2">
          <Image src="/logo.png" alt="" width={30} height={30} className="shrink-0" />
          <span className="text-xl font-extrabold text-forest tracking-tight">{brand}</span>
        </div>
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === active;
            return (
              <div
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] cursor-pointer text-sm font-semibold transition-colors ${
                  isActive ? 'text-forest bg-sage' : 'text-charcoal-muted hover:bg-sage/50'
                }`}
              >
                <Icon size={19} strokeWidth={isActive ? 2.25 : 1.75} />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
}

export function CustomerNav({ active }: { active: string }) {
  return <SideNav items={CUSTOMER_ITEMS} active={active} brand="Freshly" />;
}
export function CleanerNav({ active }: { active: string }) {
  return <SideNav items={CLEANER_ITEMS} active={active} brand="Freshly" />;
}
export function AdminNav({ active }: { active: string }) {
  return <SideNav items={ADMIN_ITEMS} active={active} brand="Freshly Admin" />;
}

// Helper for pages that want to derive the nav's `active` value from the
// current route without hardcoding it (keeps nested routes like
// /customer/bookings/[id] correctly highlighting /customer/bookings).
export function useActiveNavPath(prefix: string): string {
  const pathname = usePathname();
  return pathname?.startsWith(prefix) ? prefix : pathname || prefix;
}
