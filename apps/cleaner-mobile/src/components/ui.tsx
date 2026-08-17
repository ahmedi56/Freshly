import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, statusColors } from '../lib/theme';
import { statusLabel } from '../lib/format';

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Spinner() {
  return (
    <View style={styles.spinnerWrap}>
      <ActivityIndicator color={colors.forest} size="small" />
    </View>
  );
}

export function AlertBox({ message, type = 'error' }: { message?: string | null; type?: 'error' | 'info' }) {
  if (!message) return null;
  const bg = type === 'error' ? colors.dangerBg : colors.sage;
  const fg = type === 'error' ? colors.danger : colors.forestDark;
  return (
    <View style={[styles.alert, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 14 }}>{message}</Text>
    </View>
  );
}

export function StatusPill({ status }: { status: string }) {
  const c = statusColors[status] || { bg: colors.sage, fg: colors.forest };
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.fg }]}>{statusLabel(status)}</Text>
    </View>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Icon size={36} color={colors.charcoalMuted} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

export function Button({
  children,
  onPress,
  disabled,
  variant = 'primary',
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  const bg =
    variant === 'primary'
      ? colors.forest
      : variant === 'secondary'
      ? colors.sage
      : variant === 'danger'
      ? colors.dangerBg
      : 'transparent';
  const fg =
    variant === 'primary' ? '#fff' : variant === 'secondary' ? colors.forestDark : variant === 'danger' ? colors.danger : colors.forest;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: 1.5, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.warmWhite },
  card: {
    backgroundColor: colors.cardWhite,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  spinnerWrap: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  alert: { borderRadius: radius.sm, padding: 12, marginBottom: 14 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  emptyTitle: { color: colors.forestDark, fontWeight: '700', fontSize: 16, marginTop: 10, marginBottom: 4 },
  emptyMessage: { color: colors.charcoalMuted, fontSize: 14, textAlign: 'center' },
  button: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
});
