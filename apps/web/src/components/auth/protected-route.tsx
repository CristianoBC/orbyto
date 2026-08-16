'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export function ProtectedRoute({ children, area = 'any' }: { children: React.ReactNode; area?: 'any' | 'admin' | 'requester' }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const wrongArea = !!user && ((area === 'admin' && user.role === 'REQUESTER') || (area === 'requester' && user.role !== 'REQUESTER'));
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    else if (!loading && wrongArea) router.replace(user?.role === 'REQUESTER' ? '/requester/service-orders' : '/dashboard');
  }, [loading, user, wrongArea, router]);
  if (loading || !user || wrongArea) return <div className="screen-loader"><span className="spinner" />Verificando acesso...</div>;
  return children;
}
