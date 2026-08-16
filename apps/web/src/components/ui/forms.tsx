import type { Priority } from '@/types/service-order';
import { labels } from './page-state';

export function PageHeader({ title, text, action, label }: { title: string; text: string; action?(): void; label?: string }) {
  return <div className="page-heading"><div><p className="eyebrow">Orbyto · Área de trabalho</p><h1>{title}</h1><p>{text}</p></div>{label && <button className="button primary" onClick={action}><span aria-hidden="true">+</span> {label}</button>}</div>;
}
export function Field({ label, value, set, required, textarea, span }: { label: string; value: string; set(v: string): void; required?: boolean; textarea?: boolean; span?: boolean }) {
  return <label className={span ? 'span-2' : ''}>{label}{textarea ? <textarea value={value} onChange={(e) => set(e.target.value)} required={required} rows={4} /> : <input value={value} onChange={(e) => set(e.target.value)} required={required} />}</label>;
}
export function SelectPriority({ value, set }: { value: Priority; set(v: Priority): void }) {
  return <label>Prioridade<select value={value} onChange={(e) => set(e.target.value as Priority)}>{(['LOW','MEDIUM','HIGH','CRITICAL'] as Priority[]).map((v) => <option key={v} value={v}>{labels[v]}</option>)}</select></label>;
}
export function FormActions({ saving, close }: { saving: boolean; close(): void }) {
  return <div className="form-actions span-2"><button type="button" className="button ghost" onClick={close}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button></div>;
}
