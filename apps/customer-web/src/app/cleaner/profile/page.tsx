'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Avatar, Button, CleanerNav, Content, Main, RatingValue, Screen, StatusPill, TopBar } from '@/components/ui';

export default function CleanerProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const profile = user.cleaner_profile;

  return (
    <Screen>
      <CleanerNav active="/cleaner/profile" />
      <Main>
        <TopBar title="Profile" />
        <Content>
          <div className="card text-center">
            <div className="flex justify-center mb-3">
              <Avatar name={user.full_name} size={64} />
            </div>
            <h3>{user.full_name}</h3>
            <div className="text-xs text-charcoal-muted mt-2">{user.email}</div>
            {user.phone && <div className="text-xs text-charcoal-muted mt-2">{user.phone}</div>}
            {profile && (
              <div className="mt-4">
                <StatusPill status={profile.status === 'approved' ? 'completed' : profile.status} />
              </div>
            )}
          </div>
          {profile && (
            <div className="card mt-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-charcoal-muted">City</span>
                <span>{profile.city || '—'}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="text-xs text-charcoal-muted">Rating</span>
                <RatingValue value={profile.rating} count={profile.rating_count} />
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="text-xs text-charcoal-muted">Jobs completed</span>
                <span>{profile.jobs_completed}</span>
              </div>
            </div>
          )}
          <Button variant="danger" className="mt-4" onClick={logout}>
            <LogOut size={16} />
            Log out
          </Button>
        </Content>
      </Main>
    </Screen>
  );
}
