import { ProtectedRoute } from '@/components/auth/protected-route';
import { RequesterShell } from '@/components/requester/requester-shell';

export default function RequesterLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute area="requester"><RequesterShell>{children}</RequesterShell></ProtectedRoute>;
}
