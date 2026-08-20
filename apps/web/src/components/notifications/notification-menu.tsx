'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import type { Notification, NotificationPage } from '@/types/notification';

function destination(item: Notification, requester: boolean) {
  if (!item.entityId) return null;
  if (item.entity === 'SERVICE_ORDER') return requester ? `/requester/service-orders/${item.entityId}` : `/service-orders/${item.entityId}`;
  if (item.entity === 'PROJECT') return `/projects/${item.entityId}`;
  if (item.entity === 'TASK') return '/tasks';
  if (item.entity === 'SATISFACTION') return '/satisfaction';
  return null;
}

export function NotificationMenu({ requester = false }: { requester?: boolean }) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCount = useCallback(() => {
    apiRequest<{ count: number }>('/notifications/unread-count').then((data) => setCount(data.count)).catch(() => undefined);
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await apiRequest<NotificationPage>('/notifications?limit=10');
      setItems(data.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar as notificações.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadCount();
    const timer = window.setInterval(loadCount, 30000);
    return () => window.clearInterval(timer);
  }, [loadCount]);

  useEffect(() => {
    if (open) void loadItems();
  }, [open, loadItems]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  async function markRead(item: Notification) {
    if (!item.readAt) {
      await apiRequest(`/notifications/${item.id}/read`, { method: 'PATCH' });
      setItems((current) => current.map((value) => value.id === item.id ? { ...value, readAt: new Date().toISOString() } : value));
      setCount((current) => Math.max(0, current - 1));
    }
    const href = destination(item, requester);
    if (href) { setOpen(false); router.push(href); }
  }

  async function markAllRead() {
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH' });
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
      setCount(0);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar as notificações.'); }
  }

  return <div className="notification-menu" ref={root}>
    <button className="notification-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-label={`Notificações${count ? `, ${count} não lidas` : ''}`} aria-expanded={open}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      {count > 0 && <span className="notification-count">{count > 99 ? '99+' : count}</span>}
    </button>
    {open && <section className="notification-panel" aria-label="Notificações recentes">
      <header><div><strong>Notificações</strong><span>{count ? `${count} não lida${count === 1 ? '' : 's'}` : 'Tudo em dia'}</span></div><button type="button" onClick={markAllRead} disabled={!count}>Marcar todas como lidas</button></header>
      {error && <div className="notification-feedback error">{error}<button type="button" onClick={loadItems}>Tentar novamente</button></div>}
      {loading ? <div className="notification-feedback"><span className="spinner" />Carregando...</div> : !error && items.length === 0 ? <div className="notification-empty"><span>✓</span><strong>Nenhuma notificação</strong><p>Os avisos importantes aparecerão aqui.</p></div> : <div className="notification-list">
        {items.map((item) => <button type="button" className={`notification-item ${item.readAt ? '' : 'unread'}`} key={item.id} onClick={() => void markRead(item)}>
          <span className={`notification-dot type-${item.type.toLowerCase()}`} />
          <span className="notification-copy"><strong>{item.title}</strong><span>{item.message}</span><time>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}</time></span>
        </button>)}
      </div>}
    </section>}
  </div>;
}
