// Mirrors apps/customer-web's design tokens (docs/DESIGN-SYSTEM.md) so the
// mobile app reads as the same product, not a different one.
export const colors = {
  forest: '#0E3B2E',
  forestDark: '#0A2B21',
  green: '#1F8A4C',
  greenDark: '#17693A',
  sage: '#DCEEE1',
  mint: '#B7E4C7',
  warmWhite: '#F7F8F5',
  cardWhite: '#FFFFFF',
  charcoal: '#1E2422',
  charcoalMuted: '#5B655F',
  border: '#E4E9E4',
  danger: '#D64545',
  dangerBg: '#FBEAE9',
  warning: '#D8A320',
  warningBg: '#FBF3E4',
  infoBg: '#E3EEFB',
  info: '#2C5FA8',
  purpleBg: '#EDE4FB',
  purple: '#6B3FA0',
};

export const statusColors: Record<string, { bg: string; fg: string }> = {
  pending: { bg: colors.warningBg, fg: colors.warning },
  confirmed: { bg: colors.infoBg, fg: colors.info },
  assigned: { bg: colors.infoBg, fg: colors.info },
  on_the_way: { bg: colors.purpleBg, fg: colors.purple },
  arrived: { bg: colors.purpleBg, fg: colors.purple },
  cleaning: { bg: colors.sage, fg: colors.forest },
  completed: { bg: colors.sage, fg: colors.forest },
  cancelled: { bg: colors.dangerBg, fg: colors.danger },
};

export const radius = { sm: 8, md: 12, lg: 20 };
