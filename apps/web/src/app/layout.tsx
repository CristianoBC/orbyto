import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';

export const metadata: Metadata = {
  applicationName: 'Orbyto',
  title: { default: 'Orbyto — Gestão de Projetos e Ordens de Serviço', template: '%s | Orbyto' },
  description: 'Plataforma de Gestão de Projetos e Ordens de Serviço',
  keywords: ['gestão de projetos', 'ordens de serviço', 'tarefas', 'Orbyto'],
  icons: { icon: '/orbyto-logo.png', apple: '/orbyto-logo.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
