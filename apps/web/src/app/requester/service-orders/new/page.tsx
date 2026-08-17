"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { labels } from "@/components/ui/page-state";
import type {
  CreateServiceOrder,
  Priority,
  ServiceOrder,
} from "@/types/service-order";

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
        <label>
          Categoria
          <input
            value={form.category ?? ""}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="Ex.: Acesso, equipamento, dúvida"
          />
        </label>
        <label>
          Sistema ou processo relacionado
          <input
            value={form.system ?? ""}
            onChange={(e) => setForm({ ...form, system: e.target.value })}
            placeholder="Ex.: ERP, e-mail, compras"
          />
        </label>
        <label>
          Unidade ou setor
          <input
            value={form.unit ?? ""}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            placeholder="Informe sua área"
          />
        </label>
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
