import { Home, Sparkles, Shirt, Package, Briefcase, Wind, Trees, WashingMachine, type LucideIcon } from 'lucide-react-native';

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
