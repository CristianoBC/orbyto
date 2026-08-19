'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/forms';
import { ErrorState, LoadingState } from '@/components/ui/page-state';
import { apiRequest } from '@/lib/api';
import type { TenantSettings } from '@/types/settings';
type FormState = Omit<TenantSettings, 'id'|'tenantId'|'createdAt'|'updatedAt'>;
type DeadlineField = 'defaultServiceOrderDeadlineDays'|'defaultTaskDeadlineDays'|'defaultProjectDeadlineDays';
export default function SettingsPage(){
 const [form,setForm]=useState<FormState|null>(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{setLoading(true);try{const{id:_id,tenantId:_tenantId,createdAt:_createdAt,updatedAt:_updatedAt,...value}=await apiRequest<TenantSettings>('/settings');setForm(value);setError('')}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível carregar as configurações.')}finally{setLoading(false)}},[]);
 useEffect(()=>{void load()},[load]);
 async function submit(event:FormEvent){event.preventDefault();if(!form)return;setSaving(true);setError('');setNotice('');try{await apiRequest('/settings',{method:'PATCH',body:form});setNotice('Configurações salvas com sucesso.')}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível salvar as configurações.')}finally{setSaving(false)}}
 const text=(field:keyof FormState,value:string)=>setForm(current=>current?{...current,[field]:value||null}:current);
 const toggle=(field:keyof FormState)=>setForm(current=>current?{...current,[field]:!current[field]}:current);
 const deadline=(field:DeadlineField,value:string)=>setForm(current=>current?{...current,[field]:value===''?null:Number(value)}:current);
 if(loading)return <LoadingState/>;if(!form)return <ErrorState message={error} retry={load}/>;
 return <><PageHeader title="Configurações do sistema" text="Parametrize este ambiente do Orbyto. Credenciais e segredos continuam protegidos no servidor."/>{notice&&<div className="alert success">{notice}</div>}{error&&<div className="alert error">{error}</div>}<form className="settings-form" onSubmit={submit}>
 <Card title="Geral" text="Identidade textual e domínio institucional deste ambiente."><div className="settings-grid"><Field label="Nome do ambiente" value={form.environmentName} onChange={v=>text('environmentName',v)}/><Field label="Nome da instituição" value={form.institutionName} onChange={v=>text('institutionName',v)}/><Field wide label="Texto curto do ambiente" value={form.environmentDescription} onChange={v=>text('environmentDescription',v)}/><Field wide label="Domínio permitido para autocadastro" value={form.allowedEmailDomain} placeholder="colsan.org.br" hint="Informe apenas o domínio, sem @." onChange={v=>text('allowedEmailDomain',v)}/></div></Card>
 <Card title="Autocadastro" text="Controle o acesso público de novos solicitantes."><Toggle label="Autocadastro de solicitante" description="Permite criar uma conta no Portal do Solicitante." checked={form.requesterSelfRegistrationEnabled} onChange={()=>toggle('requesterSelfRegistrationEnabled')}/></Card>
 <Card title="Notificações" text="As flags do servidor continuam sendo respeitadas."><div className="settings-toggles"><Toggle label="Notificações internas" checked={form.internalNotificationsEnabled} onChange={()=>toggle('internalNotificationsEnabled')}/><Toggle label="E-mails operacionais" checked={form.operationalEmailsEnabled} onChange={()=>toggle('operationalEmailsEnabled')}/><Toggle label="Alertas diários de prazo" checked={form.deadlineAlertsEnabled} onChange={()=>toggle('deadlineAlertsEnabled')}/></div></Card>
 <Card title="Prazos padrão" text="Valores em dias. Deixe vazio para não aplicar prazo automático."><div className="settings-grid">{([['defaultServiceOrderDeadlineDays','Nova ordem de serviço'],['defaultTaskDeadlineDays','Nova tarefa'],['defaultProjectDeadlineDays','Novo projeto']] as [DeadlineField,string][]).map(([field,label])=><label key={field}>{label}<input type="number" min={1} max={3650} value={form[field]??''} onChange={e=>deadline(field,e.target.value)}/></label>)}</div></Card>
 <div className="settings-actions"><button className="button primary" disabled={saving}>{saving?'Salvando...':'Salvar configurações'}</button></div></form></>;
}
function Card({title,text,children}:{title:string;text:string;children:React.ReactNode}){return <section className="settings-card"><header><h2>{title}</h2><p>{text}</p></header>{children}</section>}
function Field({label,value,onChange,wide,placeholder,hint}:{label:string;value:string|null;onChange(v:string):void;wide?:boolean;placeholder?:string;hint?:string}){return <label className={wide?'span-2':''}>{label}<input maxLength={253} value={value??''} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>{hint&&<small>{hint}</small>}</label>}
function Toggle({label,description,checked,onChange}:{label:string;description?:string;checked:boolean;onChange():void}){return <label className="settings-toggle"><span><strong>{label}</strong>{description&&<small>{description}</small>}</span><input type="checkbox" checked={checked} onChange={onChange}/><i aria-hidden="true"/></label>}
