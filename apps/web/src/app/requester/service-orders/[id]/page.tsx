'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ApiError, apiDownload, apiRequest } from '@/lib/api';
import { labels } from '@/components/ui/page-state';
import type { ServiceOrder, ServiceOrderAttachment, ServiceOrderComment } from '@/types/service-order';

const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Não informado';
const fileSize = (value: number) => value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;
const message = (reason: unknown, fallback: string) => reason instanceof Error ? reason.message : fallback;

export default function RequesterServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [comments, setComments] = useState<ServiceOrderComment[]>([]);
  const [attachments, setAttachments] = useState<ServiceOrderAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [commentError, setCommentError] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const [text, setText] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const serviceOrder = await apiRequest<ServiceOrder>(`/service-orders/${id}`);
      setOrder(serviceOrder);
      const [commentResult, attachmentResult] = await Promise.allSettled([
        apiRequest<ServiceOrderComment[]>(`/comments/service-order/${id}`),
        apiRequest<ServiceOrderAttachment[]>(`/attachments/service-order/${id}`),
      ]);
      if (commentResult.status === 'fulfilled') setComments(commentResult.value); else setCommentError(message(commentResult.reason, 'Não foi possível carregar as mensagens.'));
      if (attachmentResult.status === 'fulfilled') setAttachments(attachmentResult.value); else setAttachmentError(message(attachmentResult.reason, 'Não foi possível carregar os anexos.'));
    } catch (reason) {
      setError(reason instanceof ApiError && [403, 404].includes(reason.status) ? 'Esta solicitação não existe ou não pertence a você.' : message(reason, 'Não foi possível carregar a solicitação.'));
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { const success = sessionStorage.getItem('requester-success'); if (success) { setNotice(success); sessionStorage.removeItem('requester-success'); } void load(); }, [load]);

  async function submitComment(event: FormEvent) {
    event.preventDefault(); if (!text.trim()) return;
    setCommenting(true); setCommentError('');
    try { await apiRequest('/comments', { method: 'POST', body: { refType: 'SERVICE_ORDER', refId: id, text: text.trim() } }); setText(''); setComments(await apiRequest(`/comments/service-order/${id}`)); }
    catch (reason) { setCommentError(message(reason, 'Não foi possível enviar sua mensagem.')); }
    finally { setCommenting(false); }
  }

  async function upload(file?: File) {
    if (!file) return; setUploading(true); setAttachmentError('');
    const body = new FormData(); body.append('file', file);
    try { await apiRequest(`/attachments/service-order/${id}`, { method: 'POST', body }); setAttachments(await apiRequest(`/attachments/service-order/${id}`)); if (inputRef.current) inputRef.current.value = ''; }
    catch (reason) { setAttachmentError(message(reason, 'Não foi possível enviar o arquivo.')); }
    finally { setUploading(false); }
  }

  if (loading) return <div className="detail-state"><span className="spinner" />Carregando sua solicitação...</div>;
  if (error || !order) return <div className="detail-state detail-error"><strong>Não foi possível abrir esta solicitação</strong><p>{error}</p><Link className="button ghost" href="/requester/service-orders">Voltar</Link></div>;

  return <div className="order-detail requester-detail">
    <Link className="back-link" href="/requester/service-orders">← Voltar para minhas solicitações</Link>
    {notice && <div className="alert success" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Fechar aviso">×</button></div>}
    <header className="detail-header"><div><p className="eyebrow">Solicitação de atendimento</p><h1>{order.title}</h1><p>Aberta em {dateTime(order.createdAt)}</p></div><div className="badges"><span className={`badge priority-${(order.priority ?? 'MEDIUM').toLowerCase()}`}>{labels[order.priority ?? 'MEDIUM']}</span><span className="badge status">{labels[order.status]}</span></div></header>
    <div className="detail-layout"><main className="detail-main">
      <section className="detail-card"><h2>O que foi solicitado</h2><p className="order-description">{order.description}</p><div className="info-grid"><Info label="Categoria" value={order.category} /><Info label="Sistema ou processo" value={order.system} /><Info label="Unidade ou setor" value={order.unit} /></div></section>
      <section className="detail-card"><div className="section-head"><div><h2>Mensagens</h2><p>Converse com a equipe responsável pelo atendimento.</p></div><span>{comments.length}</span></div>{commentError && <div className="alert error">{commentError}</div>}<form className="comment-form" onSubmit={submitComment}><textarea rows={4} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma mensagem ou informação complementar..." /><div><small>{text.length}/5000</small><button className="button primary" disabled={commenting || !text.trim()}>{commenting ? 'Enviando...' : 'Enviar mensagem'}</button></div></form><div className="comment-list">{comments.length ? comments.map((comment) => <article className="comment" key={comment.id}><span className="avatar">{comment.author.name.slice(0, 2)}</span><div><header><strong>{comment.author.name}</strong><time>{dateTime(comment.createdAt)}</time></header><p>{comment.text}</p></div></article>) : <p className="inline-empty">Ainda não há mensagens.</p>}</div></section>
      <section className="detail-card"><div className="section-head"><div><h2>Anexos</h2><p>Envie imagens ou documentos que ajudem no atendimento.</p></div><span>{attachments.length}</span></div>{attachmentError && <div className="alert error">{attachmentError}</div>}<label className="upload-box"><input ref={inputRef} type="file" disabled={uploading} accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={(e) => void upload(e.target.files?.[0])} /><strong>{uploading ? 'Enviando arquivo...' : 'Selecionar arquivo'}</strong><small>Documentos ou imagens de até 10 MB</small></label><div className="attachment-list">{attachments.length ? attachments.map((attachment) => { const name = attachment.originalName || attachment.fileName; return <article className="attachment" key={attachment.id}><span>↓</span><div><strong>{name}</strong><small>{fileSize(attachment.size)} · {dateTime(attachment.createdAt)}</small></div><button className="button ghost small" onClick={() => void apiDownload(`/attachments/${attachment.id}/download`, name).catch((reason) => setAttachmentError(message(reason, 'Erro no download.')))}>Baixar</button></article>; }) : <p className="inline-empty">Nenhum anexo enviado.</p>}</div></section>
    </main><aside className="detail-sidebar"><section className="summary-card"><h2>Acompanhamento</h2><Info label="Status" value={labels[order.status]} /><Info label="Prioridade" value={labels[order.priority ?? 'MEDIUM']} /><Info label="Responsável pelo atendimento" value={order.responsible?.name} /><Info label="Aberta em" value={dateTime(order.createdAt)} /><Info label="Última atualização" value={dateTime(order.updatedAt)} /></section></aside></div>
  </div>;
}

function Info({ label, value }: { label: string; value?: string | null }) { return <div className="info-item"><span>{label}</span><strong>{value || 'Não informado'}</strong></div>; }
