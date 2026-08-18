import Image from 'next/image';
import Link from 'next/link';

export function PublicAuthCard({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children: React.ReactNode }) {
  return <main className="public-auth-page"><section className="public-auth-card">
    <Link href="/login" className="public-auth-brand"><Image src="/orbyto-logo.png" alt="" width={48} height={48} priority /><div><strong>Orbyto</strong><small>Portal do Solicitante</small></div></Link>
    <p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{text}</p>{children}
  </section></main>;
}
