import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppShell } from '@/components/layout/app-shell';

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute area="admin"><AppShell>{children}</AppShell></ProtectedRoute>;
}
