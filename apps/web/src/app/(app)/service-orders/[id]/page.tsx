'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Modal } from '@/components/ui/modal';
import { Field, FormActions, SelectPriority } from '@/components/ui/forms';
import { labels } from '@/components/ui/page-state';
import { ApiError, apiDownload, apiRequest } from '@/lib/api';
import type { User } from '@/types/auth';
import type { Priority, ServiceOrder, ServiceOrderAttachment, ServiceOrderComment, ServiceOrderStatus, UpdateServiceOrder } from '@/types/service-order';

const statuses: ServiceOrderStatus[] = ['OPEN', 'IN_REVIEW', 'IN_PROGRESS', 'WAITING_REQUESTER', 'COMPLETED', 'CANCELED'];
const dateTime = (value?: string | null) => value
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Não informado';
const fileSize = (value: number) => value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;
const errorMessage = (reason: unknown, fallback: string) => reason instanceof Error ? reason.message : fallback;

function editValues(order: ServiceOrder): UpdateServiceOrder {
  return {
    title: order.title,
    description: order.description,
    category: order.category ?? '',
    system: order.system ?? '',
    unit: order.unit ?? '',
    channel: order.channel ?? '',
    origin: order.origin ?? '',
    observation: order.observation ?? '',
    priority: order.priority ?? 'MEDIUM',
    status: order.status,
    responsibleId: order.responsible?.id,
  };
}

export default function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, can } = useAuth();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [comments, setComments] = useState<ServiceOrderComment[]>([]);
  const [attachments, setAttachments] = useState<ServiceOrderAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentError, setCommentError] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const [text, setText] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<UpdateServiceOrder | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canEdit = can('SERVICE_ORDERS', 'edit');
  const canContribute = can('SERVICE_ORDERS', 'create') || canEdit;
  const canAssign = can('SERVICE_ORDERS', 'manage');

  const loadOrder = useCallback(async () => {
    const serviceOrder = await apiRequest<ServiceOrder>(`/service-orders/${id}`);
    setOrder(serviceOrder);
    return serviceOrder;
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true); setError(''); setCommentError(''); setAttachmentError('');
    try {
      await loadOrder();
      const [commentResult, attachmentResult] = await Promise.allSettled([
        apiRequest<ServiceOrderComment[]>(`/comments/service-order/${id}`),
        apiRequest<ServiceOrderAttachment[]>(`/attachments/service-order/${id}`),
      ]);
      if (commentResult.status === 'fulfilled') setComments(commentResult.value);
      else setCommentError(errorMessage(commentResult.reason, 'Não foi possível carregar os comentários.'));
      if (attachmentResult.status === 'fulfilled') setAttachments(attachmentResult.value);
      else setAttachmentError(errorMessage(attachmentResult.reason, 'A área de anexos não está disponível.'));
    } catch (reason) {
      setOrder(null);
      setError(reason instanceof ApiError && (reason.status === 403 || reason.status === 404)
        ? 'Esta ordem de serviço não existe ou você não possui acesso a ela.'
        : errorMessage(reason, 'Não foi possível carregar a ordem de serviço.'));
    } finally { setLoading(false); }
  }, [id, loadOrder]);

  useEffect(() => { void load(); }, [load]);

  async function openEditor() {
    if (!order) return;
    setForm(editValues(order)); setEditError(''); setSuccess(''); setEditing(true);
    if (canAssign && users.length === 0) {
      setUsersLoading(true);
      try { setUsers(await apiRequest<User[]>('/users')); }
      catch (reason) { setEditError(errorMessage(reason, 'Não foi possível carregar a lista de responsáveis.')); }
      finally { setUsersLoading(false); }
    }
  }

  async function saveOrder(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true); setEditError('');
    const body: UpdateServiceOrder = { ...form };
    if (!canAssign || !body.responsibleId) delete body.responsibleId;
    try {
      await apiRequest(`/service-orders/${id}`, { method: 'PATCH', body });
      await loadOrder();
      setEditing(false); setSuccess('Ordem de serviço atualizada com sucesso.');
    } catch (reason) { setEditError(errorMessage(reason, 'Não foi possível salvar as alterações.')); }
    finally { setSaving(false); }
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setCommenting(true); setCommentError('');
    try {
      await apiRequest('/comments', { method: 'POST', body: { refType: 'SERVICE_ORDER', refId: id, text: text.trim() } });
      setText('');
      setComments(await apiRequest<ServiceOrderComment[]>(`/comments/service-order/${id}`));
    } catch (reason) { setCommentError(errorMessage(reason, 'Não foi possível publicar o comentário.')); }
    finally { setCommenting(false); }
  }

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true); setAttachmentError('');
    const body = new FormData(); body.append('file', file);
    try {
      await apiRequest(`/attachments/service-order/${id}`, { method: 'POST', body });
      setAttachments(await apiRequest<ServiceOrderAttachment[]>(`/attachments/service-order/${id}`));
      if (inputRef.current) inputRef.current.value = '';
    } catch (reason) { setAttachmentError(errorMessage(reason, 'Não foi possível enviar o arquivo.')); }
    finally { setUploading(false); }
  }

  if (loading) return <div className="detail-state" role="status"><span className="spinner" />Carregando ordem de serviço...</div>;
  if (error || !order) return <div className="detail-state detail-error"><strong>Não foi possível abrir esta OS</strong><p>{error}</p><div><button className="button primary" onClick={() => void load()}>Tentar novamente</button><Link className="button ghost" href="/service-orders">Voltar às ordens</Link></div></div>;

  return <div className="order-detail">
    <Link className="back-link" href="/service-orders">← Voltar para Ordens de Serviço</Link>
    {success && <div className="alert success" role="status">{success}<button type="button" onClick={() => setSuccess('')} aria-label="Fechar aviso">×</button></div>}
    <header className="detail-header"><div><p className="eyebrow">Ordem de Serviço</p><h1>{order.title}</h1><p>Criada em {dateTime(order.createdAt)}</p></div><div className="detail-actions">{canEdit && <button type="button" className="button ghost" onClick={() => void openEditor()}>Editar</button>}<div className="badges"><span className={`badge priority-${(order.priority ?? 'MEDIUM').toLowerCase()}`}>{labels[order.priority ?? 'MEDIUM']}</span><span className="badge status">{labels[order.status]}</span></div></div></header>
    <div className="detail-layout"><main className="detail-main">
      <section className="detail-card"><h2>Descrição</h2><p className="order-description">{order.description || 'Nenhuma descrição informada.'}</p><div className="info-grid"><Info label="Categoria" value={order.category} /><Info label="Sistema" value={order.system} /><Info label="Unidade" value={order.unit} /><Info label="Canal" value={order.channel} /><Info label="Origem" value={order.origin} /><Info label="Tags" value={order.tags} /></div>{order.observation && <div className="detail-note"><span>Observações</span><p>{order.observation}</p></div>}</section>
      <section className="detail-card"><div className="section-head"><div><h2>Comentários</h2><p>Acompanhe o histórico e registre atualizações.</p></div><span>{comments.length}</span></div>
        {canContribute && <form className="comment-form" onSubmit={submitComment}>{commentError && <div className="alert error" role="alert">{commentError}</div>}<textarea aria-label="Novo comentário" placeholder="Escreva um comentário..." rows={4} maxLength={5000} value={text} onChange={(event) => setText(event.target.value)} /><div><small>{text.length}/5000</small><button className="button primary" disabled={commenting || !text.trim()}>{commenting ? 'Publicando...' : 'Publicar comentário'}</button></div></form>}
        <div className="comment-list">{comments.length === 0 ? <p className="inline-empty">Ainda não há comentários nesta ordem.</p> : comments.map((comment) => <article className="comment" key={comment.id}><span className="avatar">{comment.author.name.slice(0, 2)}</span><div><header><strong>{comment.author.name}</strong><time dateTime={comment.createdAt}>{dateTime(comment.createdAt)}</time></header><p>{comment.text}</p></div></article>)}</div>
      </section>
      <section className="detail-card"><div className="section-head"><div><h2>Anexos</h2><p>Documentos e imagens vinculados à ordem.</p></div><span>{attachments.length}</span></div>
        {attachmentError && <div className="alert error" role="alert">{attachmentError}</div>}{canContribute && <label className="upload-box"><input ref={inputRef} type="file" disabled={uploading} accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={(event) => void upload(event.target.files?.[0])} /><strong>{uploading ? 'Enviando arquivo...' : 'Selecionar arquivo'}</strong><small>Documentos ou imagens de até 10 MB</small></label>}
        <div className="attachment-list">{attachments.length === 0 ? <p className="inline-empty">Nenhum anexo enviado.</p> : attachments.map((attachment) => { const name = attachment.originalName || attachment.fileName; return <article className="attachment" key={attachment.id}><span>⇩</span><div><strong>{name}</strong><small>{fileSize(attachment.size)} · enviado por {attachment.uploadedBy.name} · {dateTime(attachment.createdAt)}</small></div><button type="button" className="button ghost small" onClick={() => void apiDownload(`/attachments/${attachment.id}/download`, name).catch((reason) => setAttachmentError(errorMessage(reason, 'Erro no download.')))}>Baixar</button></article>; })}</div>
      </section>
    </main><aside className="detail-sidebar"><section className="summary-card"><h2>Resumo da OS</h2><Info label="Status" value={labels[order.status]} badge /><Info label="Prioridade" value={labels[order.priority ?? 'MEDIUM']} /><Info label="Solicitante" value={order.requester?.name} subvalue={order.requester?.email} /><Info label="Responsável" value={order.responsible?.name} subvalue={order.responsible?.email} /><Info label="Prazo" value={dateTime(order.dueDate)} /><Info label="Conclusão" value={dateTime(order.finishedAt)} /><Info label="Criada em" value={dateTime(order.createdAt)} /><Info label="Atualizada em" value={dateTime(order.updatedAt)} /></section></aside></div>
    {editing && form && <Modal title="Editar ordem de serviço" eyebrow="Atualizar registro" onClose={() => !saving && setEditing(false)}><form className="form-grid" onSubmit={saveOrder}>{editError && <div className="alert error span-2" role="alert">{editError}</div>}<Field label="Título" value={form.title ?? ''} set={(title) => setForm({ ...form, title })} required span /><Field label="Descrição" value={form.description ?? ''} set={(description) => setForm({ ...form, description })} required textarea span /><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ServiceOrderStatus })}>{statuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label><SelectPriority value={(form.priority ?? 'MEDIUM') as Priority} set={(priority) => setForm({ ...form, priority })} /><Field label="Categoria" value={form.category ?? ''} set={(category) => setForm({ ...form, category })} /><Field label="Sistema" value={form.system ?? ''} set={(system) => setForm({ ...form, system })} /><Field label="Unidade" value={form.unit ?? ''} set={(unit) => setForm({ ...form, unit })} /><Field label="Canal" value={form.channel ?? ''} set={(channel) => setForm({ ...form, channel })} /><Field label="Origem" value={form.origin ?? ''} set={(origin) => setForm({ ...form, origin })} />{canAssign && <label>Responsável<select value={form.responsibleId ?? ''} disabled={usersLoading} onChange={(event) => setForm({ ...form, responsibleId: event.target.value || undefined })}><option value="">{usersLoading ? 'Carregando responsáveis...' : order.responsible ? 'Manter responsável atual' : 'Sem responsável'}</option>{users.filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<Field label="Observações" value={form.observation ?? ''} set={(observation) => setForm({ ...form, observation })} textarea span /><FormActions saving={saving} close={() => setEditing(false)} /></form></Modal>}
  </div>;
}

function Info({ label, value, subvalue, badge = false }: { label: string; value?: string | null; subvalue?: string | null; badge?: boolean }) {
  return <div className="info-item"><span>{label}</span>{badge ? <strong className="badge status">{value || 'Não informado'}</strong> : <strong>{value || 'Não informado'}</strong>}{subvalue && <small>{subvalue}</small>}</div>;
}
