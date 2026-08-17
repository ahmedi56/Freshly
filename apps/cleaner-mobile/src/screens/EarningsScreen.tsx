import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Star, Wallet } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEarnings } from '../lib/hooks';
import { fmtDateTime, fmtZAR } from '../lib/format';
import { AlertBox, Card, EmptyState, Spinner } from '../components/ui';
import { colors } from '../lib/theme';
import { ApiError } from '../lib/api';

export default function EarningsScreen() {
  const { data, isLoading, error } = useEarnings();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.header}>Earnings</Text>
      <AlertBox message={error instanceof ApiError ? error.message : error ? 'Something went wrong.' : null} />
      {isLoading ? (
        <Spinner />
      ) : !data ? null : (
        <FlatList
          contentContainerStyle={styles.list}
          data={data.recent_completed}
          keyExtractor={(j) => String(j.id)}
          ListHeaderComponent={
            <>
              <View style={styles.kpiGrid}>
                <Kpi label="Today's earnings" value={fmtZAR(data.today_earnings)} />
                <Kpi label="Total earnings" value={fmtZAR(data.total_earnings)} />
                <Kpi label="Completed jobs" value={String(data.completed_jobs)} />
                <Kpi
                  label="Rating"
                  value={data.rating.toFixed(1)}
                  icon={<Star size={16} color={colors.warning} fill={colors.warning} />}
                />
              </View>
              <Text style={styles.sectionTitle}>Recent completed jobs</Text>
            </>
          }
          ListEmptyComponent={
            <EmptyState icon={Wallet} title="No completed jobs yet" message="Completed jobs and their earnings will appear here." />
          }
          renderItem={({ item: j }) => (
            <Card>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.jobTitle}>{j.service_name}</Text>
                  <Text style={styles.jobSub}>
                    {j.customer_name} · {fmtDateTime(j.updated_at)}
                  </Text>
                </View>
                <Text style={styles.price}>{fmtZAR(j.total)}</Text>
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text style={styles.kpiValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.warmWhite, paddingHorizontal: 20 },
  header: { fontSize: 22, fontWeight: '800', color: colors.forestDark, marginTop: 8, marginBottom: 14 },
  list: { paddingBottom: 24 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  kpiCard: {
    width: '47%',
    backgroundColor: colors.cardWhite,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
  },
  kpiLabel: { fontSize: 12, color: colors.charcoalMuted, fontWeight: '600', marginBottom: 6 },
  kpiValue: { fontSize: 20, fontWeight: '800', color: colors.forestDark },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.charcoalMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobTitle: { fontWeight: '600', fontSize: 14, color: colors.charcoal },
  jobSub: { fontSize: 12, color: colors.charcoalMuted, marginTop: 4 },
  price: { fontWeight: '700', color: colors.forestDark },
});
