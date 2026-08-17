import { createElement } from 'react';
import {
  Home,
  Sparkles,
  Shirt,
  Layers,
  Package,
  Briefcase,
  Wind,
  Snowflake,
  Flame,
  Trees,
  WashingMachine,
  Plus,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

const SERVICE_ICON_RULES: Array<[RegExp, LucideIcon]> = [
  [/garden|outdoor/i, Trees],
  [/laundry/i, WashingMachine],
  [/iron/i, Shirt],
  [/move/i, Package],
  [/office/i, Briefcase],
  [/window/i, Wind],
  [/home|house|residential/i, Home],
];

export function getServiceIcon(name: string): LucideIcon {
  for (const [re, Icon] of SERVICE_ICON_RULES) {
    if (re.test(name)) return Icon;
  }
  return Sparkles;
}

const EXTRA_ICON_RULES: Array<[RegExp, LucideIcon]> = [
  [/fridge/i, Snowflake],
  [/oven/i, Flame],
  [/rug|carpet/i, Layers],
  [/wardrobe|closet|packing/i, Shirt],
  [/deep/i, Sparkles],
];

export function getExtraIcon(name: string): LucideIcon {
  for (const [re, Icon] of EXTRA_ICON_RULES) {
    if (re.test(name)) return Icon;
  }
  return Plus;
}

// Components (rather than a resolved-and-rendered reference) so callers can
// just drop <ServiceIcon name={...} /> into JSX without binding the looked-up
// icon to a local variable themselves.
export function ServiceIcon({ name, ...props }: { name: string } & LucideProps) {
  return createElement(getServiceIcon(name), props);
}

export function ExtraIcon({ name, ...props }: { name: string } & LucideProps) {
  return createElement(getExtraIcon(name), props);
}
