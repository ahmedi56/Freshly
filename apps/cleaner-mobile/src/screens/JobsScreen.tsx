import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Calendar, MapPin, Plus, SprayCan } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDeclineJob, useMyJobs, useUpdateJobStatus } from '../lib/hooks';
import { fmtDate, fmtZAR } from '../lib/format';
import { getServiceIcon } from '../lib/catalog-icons';
import { AlertBox, Button, Card, EmptyState, Spinner, StatusPill } from '../components/ui';
import { colors } from '../lib/theme';
import { ApiError } from '../lib/api';
import type { Booking, BookingStatus } from '@freshly/shared-types';

const NEXT_ACTION: Record<string, { label: string; next: BookingStatus }> = {
  assigned: { label: 'Start heading over', next: 'on_the_way' },
  on_the_way: { label: 'Mark as arrived', next: 'arrived' },
  arrived: { label: 'Start cleaning', next: 'cleaning' },
  cleaning: { label: 'Mark as completed', next: 'completed' },
};

type Filter = 'active' | 'completed' | 'all';

export default function JobsScreen() {
  const { data: bookings = [], isLoading, error, refetch, isRefetching } = useMyJobs();
  const updateStatus = useUpdateJobStatus();
  const declineJob = useDeclineJob();
  const [filter, setFilter] = useState<Filter>('active');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  const visible = bookings.filter((b) => {
    if (filter === 'active') return !['completed', 'cancelled'].includes(b.status);
    if (filter === 'completed') return b.status === 'completed';
    return true;
  });

  async function onUpdateStatus(id: number, status: BookingStatus) {
    setBusyId(id);
    setActionError('');
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  async function onDecline(id: number) {
    setBusyId(id);
    setActionError('');
    try {
      await declineJob.mutateAsync(id);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.header}>Your jobs</Text>
      <View style={styles.tabs}>
        {(['active', 'completed', 'all'] as Filter[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.tabBtn, filter === f && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, filter === f && styles.tabBtnTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>
      <AlertBox message={actionError || (error instanceof ApiError ? error.message : error ? 'Something went wrong.' : null)} />
      {isLoading ? (
        <Spinner />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={visible}
          keyExtractor={(b) => String(b.id)}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <EmptyState icon={SprayCan} title="No jobs here" message="New jobs assigned to you will show up here." />
          }
          renderItem={({ item: b }: { item: Booking }) => {
            const action = NEXT_ACTION[b.status];
            const isBusy = busyId === b.id;
            const ServiceIcon = getServiceIcon(b.service_name);
            return (
              <Card>
                <View style={styles.rowBetween}>
                  <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                    <ServiceIcon size={18} color={colors.forest} strokeWidth={1.75} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobTitle}>{b.service_name}</Text>
                      <Text style={styles.jobSub}>{b.customer_name}</Text>
                    </View>
                  </View>
                  <StatusPill status={b.status} />
                </View>
                <View style={styles.detailRow}>
                  <Calendar size={14} color={colors.charcoalMuted} />
                  <Text style={styles.detailText}>
                    {fmtDate(b.booking_date)} · {b.time_slot}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <MapPin size={14} color={colors.charcoalMuted} />
                  <Text style={styles.detailText}>{b.address}</Text>
                </View>
                {b.extras_ids && b.extras_ids.length > 0 && (
                  <View style={styles.detailRow}>
                    <Plus size={14} color={colors.charcoalMuted} />
                    <Text style={styles.detailText}>{b.extras_ids.length} extra(s)</Text>
                  </View>
                )}
                <Text style={styles.price}>{fmtZAR(b.total)}</Text>
                {(action || b.status === 'assigned') && (
                  <View style={styles.actions}>
                    {b.status === 'assigned' && (
                      <View style={{ flex: 1 }}>
                        <Button variant="ghost" onPress={() => onDecline(b.id)} disabled={isBusy}>
                          Decline
                        </Button>
                      </View>
                    )}
                    {action && (
                      <View style={{ flex: 2 }}>
                        <Button onPress={() => onUpdateStatus(b.id, action.next)} disabled={isBusy}>
                          {isBusy ? 'Updating…' : action.label}
                        </Button>
                      </View>
                    )}
                  </View>
                )}
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.warmWhite, paddingHorizontal: 20 },
  header: { fontSize: 22, fontWeight: '800', color: colors.forestDark, marginTop: 8, marginBottom: 14 },
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border },
  tabBtnActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: colors.charcoalMuted, textTransform: 'capitalize' },
  tabBtnTextActive: { color: '#fff' },
  list: { paddingBottom: 24 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  jobTitle: { fontWeight: '700', fontSize: 15, color: colors.forestDark },
  jobSub: { fontSize: 13, color: colors.charcoalMuted, marginTop: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  detailText: { fontSize: 13, color: colors.charcoalMuted },
  price: { fontWeight: '700', fontSize: 15, color: colors.forestDark, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
});
