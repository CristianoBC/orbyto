"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { labels } from "@/components/ui/page-state";
import type {
  CreateServiceOrder,
  Priority,
  ServiceOrder,
} from "@/types/service-order";
import { emptyServiceOrderOptions, loadServiceOrderOptions } from "@/lib/lookups";
import type { LookupItem, ServiceOrderLookupOptions } from "@/types/lookup";

const initial: CreateServiceOrder = {
  title: "",
  description: "",
  category: "",
  system: "",
  unit: "",
  channel: "PORTAL",
  origin: "PORTAL_REQUESTER",
  priority: "MEDIUM",
  dueDate: "",
};

export default function NewRequesterServiceOrderPage() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<ServiceOrderLookupOptions>(emptyServiceOrderOptions);
  useEffect(()=>{void loadServiceOrderOptions().then(setOptions).catch(()=>setOptions(emptyServiceOrderOptions))},[]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { dueDate, ...fields } = form;
      const created = await apiRequest<ServiceOrder>("/service-orders", {
        method: "POST",
        body: {
          ...fields,
          ...(dueDate
            ? { dueDate: new Date(`${dueDate}T12:00:00`).toISOString() }
            : {}),
        },
      });
      sessionStorage.setItem(
        "requester-success",
        "Solicitação aberta com sucesso. Nossa equipe já pode acompanhá-la.",
      );
      router.push(`/requester/service-orders/${created.id}`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível abrir sua solicitação.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="requester-form-page">
      <Link className="back-link" href="/requester/service-orders">
        ← Voltar para minhas solicitações
      </Link>
      <div className="requester-heading">
        <div>
          <p className="eyebrow">Novo atendimento</p>
          <h1>Como podemos ajudar?</h1>
          <p>
            Conte o que aconteceu com detalhes. Isso ajuda nossa equipe a
            atender você mais rápido.
          </p>
        </div>
      </div>
      <form className="requester-form" onSubmit={submit}>
        {error && (
          <div className="alert error span-2" role="alert">
            {error}
          </div>
        )}
        <label className="span-2">
          Título da solicitação
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            maxLength={180}
            placeholder="Resuma o que você precisa"
          />
        </label>
        <label className="span-2">
          Descrição
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            rows={6}
            placeholder="Descreva o problema, quando começou e o resultado esperado"
          />
        </label>
        <OptionField label="Categoria" value={form.category??""} options={options.categories} placeholder="Ex.: Acesso, equipamento, dúvida" set={category=>setForm({...form,category})}/>
        <OptionField label="Sistema ou processo relacionado" value={form.system??""} options={options.systems} placeholder="Ex.: ERP, e-mail, compras" set={system=>setForm({...form,system})}/>
        <OptionField label="Unidade" value={form.unit??""} options={options.units} placeholder="Informe sua unidade" set={unit=>setForm({...form,unit})}/>
        <label>
          Prazo sugerido
          <input
            type="date"
            value={form.dueDate ?? ""}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
          <small className="field-help">
            A equipe poderá ajustar esta data durante o atendimento.
          </small>
        </label>
        <label>
          Prioridade sugerida
          <select
            value={form.priority ?? "MEDIUM"}
            onChange={(e) =>
              setForm({ ...form, priority: e.target.value as Priority })
            }
          >
            {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as Priority[]).map(
              (value) => (
                <option key={value} value={value}>
                  {labels[value]}
                </option>
              ),
            )}
          </select>
          <small className="field-help">
            Use Crítica apenas quando o trabalho estiver totalmente
            interrompido.
          </small>
        </label>
        <div className="form-actions span-2">
          <Link className="button ghost" href="/requester/service-orders">
            Cancelar
          </Link>
          <button className="button primary" disabled={saving}>
            {saving ? "Enviando..." : "Abrir solicitação"}
          </button>
        </div>
      </form>
    </div>
  );
}

function OptionField({label,value,options,placeholder,set}:{label:string;value:string;options:LookupItem[];placeholder:string;set(value:string):void}){
  return <label>{label}{options.length?<select value={value} onChange={event=>set(event.target.value)}><option value="">Selecione</option>{options.map(option=><option value={option.name} key={option.id}>{option.name}</option>)}</select>:<><input value={value} onChange={event=>set(event.target.value)} placeholder={placeholder}/><small className="field-help">Nenhuma opção cadastrada; informe livremente.</small></>}</label>;
}
