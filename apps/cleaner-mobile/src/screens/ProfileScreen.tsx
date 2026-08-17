import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth-context';
import { initials } from '../lib/format';
import { Button, Card, StatusPill } from '../components/ui';
import { colors } from '../lib/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const profile = user.cleaner_profile;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.header}>Profile</Text>
        <Card style={styles.centerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user.full_name)}</Text>
          </View>
          <Text style={styles.name}>{user.full_name}</Text>
          <Text style={styles.meta}>{user.email}</Text>
          {user.phone && <Text style={styles.meta}>{user.phone}</Text>}
          {profile && (
            <View style={{ marginTop: 12 }}>
              <StatusPill status={profile.status === 'approved' ? 'completed' : profile.status} />
            </View>
          )}
        </Card>
        {profile && (
          <Card>
            <Row label="City" value={profile.city || '—'} />
            <Row
              label="Rating"
              value={`${profile.rating.toFixed(1)} (${profile.rating_count})`}
              icon={<Star size={14} color={colors.warning} fill={colors.warning} />}
            />
            <Row label="Jobs completed" value={String(profile.jobs_completed)} />
          </Card>
        )}
        <View style={{ marginTop: 4 }}>
          <Button variant="danger" onPress={logout}>
            Log out
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.warmWhite, paddingHorizontal: 20 },
  list: { paddingBottom: 24 },
  header: { fontSize: 22, fontWeight: '800', color: colors.forestDark, marginTop: 8, marginBottom: 14 },
  centerCard: { alignItems: 'center' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 22 },
  name: { fontSize: 17, fontWeight: '700', color: colors.forestDark },
  meta: { fontSize: 13, color: colors.charcoalMuted, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowLabel: { fontSize: 13, color: colors.charcoalMuted },
  rowValue: { fontSize: 14, color: colors.charcoal, fontWeight: '600' },
});
