'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Avatar, Button, Content, CustomerNav, Main, Screen, TopBar } from '@/components/ui';

export default function CustomerProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <Screen>
      <CustomerNav active="/customer/profile" />
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
          </div>
          <Button variant="danger" className="mt-4" onClick={logout}>
            <LogOut size={16} />
            Log out
          </Button>
        </Content>
      </Main>
    </Screen>
  );
}
