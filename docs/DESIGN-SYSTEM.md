# Freshly — Design System

Derived from the provided brand reference (logo + web/mobile mock).

## 1. Brand tokens

```css
:root {
  --freshly-forest:      #0E3B2E; /* Deep Forest Green — primary text, dark surfaces */
  --freshly-green:        #1F8A4C; /* Fresh Green — primary actions, brand accent */
  --freshly-green-dark:   #17693A; /* hover/active state of primary */
  --freshly-sage:          #DCEEE1; /* Soft Sage — subtle backgrounds, badges */
  --freshly-warm-white:    #F7F8F5; /* app background */
  --freshly-white:          #FFFFFF; /* card surfaces */
  --freshly-charcoal:        #1E2422; /* body text */
  --freshly-charcoal-muted:  #5B655F; /* secondary text */
  --freshly-border:           #E4E9E4; /* hairline borders */
  --freshly-danger:            #D64545; /* decline / cancel actions */
  --freshly-warning:            #D8A320; /* pending states */
}
```

Typography: **Manrope** (headings, weight 700/600) and **Inter** (body,
weight 400/500). Both available on Google Fonts, loaded via `next/font` in
web apps and `expo-font` in the mobile app so there's no FOUT.

Type scale: 12 / 14 / 16 / 18 / 22 / 28 / 36 / 44 px, 1.4 line-height for
body, 1.15 for headings.

Radius scale: `--radius-sm: 8px; --radius-md: 12px; --radius-lg: 20px;
--radius-full: 999px` — matches the rounded-card language in the reference
mock.

Shadow: a single soft elevation token
`--shadow-card: 0 1px 2px rgba(14,59,46,0.04), 0 8px 24px rgba(14,59,46,0.06)`
— used consistently rather than ad-hoc shadow values per component.

## 2. Component inventory (packages/ui)

Matches Rule 23. Each component ships as: unstyled logic + Tailwind classes
using the tokens above, no inline hex values anywhere in component code.

- `Button` — variants: primary (filled forest/green), secondary (outline),
  ghost, destructive. Sizes: sm/md/lg.
- `Input`, `Select`, `Textarea` — consistent 44px min touch target.
- `Modal`, `Drawer` (bottom-sheet on mobile widths)
- `Card` (base), `ServiceCard`, `CleanerCard`, `BookingCard`
- `StatusBadge` — color mapped per BookingStatus enum (e.g. green=CONFIRMED
  family, amber=pending family, red=cancelled/rejected)
- `PriceSummary` — renders the PricingService response breakdown
- `DatePicker`, `TimeSlot` (pill selector)
- `NotificationItem`, `Avatar`, `Rating` (star display + input variants)
- `Navigation` (top nav, web), `Sidebar` (admin), `BottomNavigation`
  (customer + cleaner mobile — matches the reference mock's bottom tab bar)
- `Toast`, `Skeleton`, `EmptyState`, `ErrorState`

## 3. Layout conventions

- Customer web: 1200px max content width, 24px gutter, mobile breakpoint
  <640px collapses nav to hamburger + bottom sheet booking CTA.
- Admin web: fixed 240px dark-forest sidebar (matches reference mock), content
  area on `--freshly-warm-white`.
- Mobile apps: bottom tab bar, 5 items max, safe-area aware.

## 4. Imagery & iconography

- Lucide icon set (already available in this environment via `lucide-react`
  for web; `lucide-react-native` for Expo) — outline style, 1.5px stroke,
  matches the reference mock's icon language.
- Photography: real people, natural light, warm tones — never stock-photo
  stiff poses. Placeholder images in dev seed data use consistent aspect
  ratios (1:1 avatars, 4:3 service cards) so layout doesn't shift once real
  photography is added.

## 5. Motion

- 150ms ease-out for hover/press states, 250ms for modal/drawer enter,
  respecting `prefers-reduced-motion`.
