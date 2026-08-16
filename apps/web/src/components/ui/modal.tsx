'use client';
import { useEffect } from 'react';
export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose(): void }) {
  useEffect(() => { const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close); }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><header><div><p className="eyebrow">Novo registro</p><h2>{title}</h2></div><button type="button" onClick={onClose} aria-label="Fechar">×</button></header>{children}</section></div>;
}
