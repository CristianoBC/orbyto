"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api";
import type { CreateServiceOrder, ServiceOrder } from "@/types/service-order";
import {
  EmptyState,
  ErrorState,
  formatDate,
  labels,
  LoadingState,
} from "@/components/ui/page-state";
import { Modal } from "@/components/ui/modal";
import { serviceOrderDeadline } from "@/lib/deadline";
import { emptyServiceOrderOptions, loadServiceOrderOptions } from "@/lib/lookups";
import type { ServiceOrderLookupOptions } from "@/types/lookup";
import {
  Field,
  FormActions,
  PageHeader,
  SelectPriority,
} from "@/components/ui/forms";

const initial: CreateServiceOrder = {
  title: "",
  description: "",
  category: "",
  system: "",
  unit: "",
  priority: "MEDIUM",
  dueDate: "",
};
const administrativeRoles = ["OWNER", "ADMIN", "MANAGER"];

export default function ServiceOrdersPage() {
  const { user, loading: authLoading, can } = useAuth();
  const canCreate = can("SERVICE_ORDERS", "create");
  const [items, setItems] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [lookupOptions, setLookupOptions] = useState<ServiceOrderLookupOptions>(emptyServiceOrderOptions);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    const endpoint =
      administrativeRoles.includes(user.role) || user.role === "VIEWER"
        ? "/service-orders"
        : "/service-orders/my";
    try {
      setItems(await apiRequest<ServiceOrder[]>(endpoint));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);
  useEffect(() => { if (!authLoading && user) void loadServiceOrderOptions().then(setLookupOptions).catch(() => setLookupOptions(emptyServiceOrderOptions)); }, [authLoading, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const { dueDate, ...fields } = form;
      await apiRequest("/service-orders", {
        method: "POST",
        body: {
          ...fields,
          ...(dueDate
            ? { dueDate: new Date(`${dueDate}T12:00:00`).toISOString() }
            : {}),
        },
      });
      setOpen(false);
      setForm(initial);
      await load();
    } catch (reason) {
      setFormError(
        reason instanceof Error ? reason.message : "Erro ao salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Ordens de Serviço"
        text="Visualize e acompanhe as solicitações do ambiente."
        action={canCreate ? () => setOpen(true) : undefined}
        label={canCreate ? "Nova ordem" : undefined}
      />
      {error && <ErrorState message={error} retry={load} />}
      {loading ? (
        <LoadingState />
      ) : !items.length ? (
        <EmptyState text="Nenhuma ordem de serviço encontrada." />
      ) : (
        <div className="data-list">
          {items.map((item) => (
            <Link
              className={`data-card${serviceOrderDeadline(item).status === "overdue" ? " service-order-overdue" : ""}`}
              href={`/service-orders/${item.id}`}
              key={item.id}
            >
              <div className="data-main">
                <span className="item-icon">▤</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div>
                    <small>
                      {item.category || "Sem categoria"} ·{" "}
                      {item.system || "Sistema não informado"} ·{" "}
                      {formatDate(item.createdAt)}
                    </small>
                  </div>
                  <div>
                    <small>
                      Solicitante: {item.requester?.name || "Não informado"}
                      {item.requester?.email
                        ? ` · ${item.requester.email}`
                        : ""}
                    </small>
                  </div>
                  <div>
                    <small className={serviceOrderDeadline(item).status === "overdue" ? "overdue-text" : ""}>
                      Prazo:{" "}
                      {item.dueDate
                        ? formatDate(item.dueDate)
                        : "não informado"}
                      {serviceOrderDeadline(item).status === "overdue" ? " · vencida" : ""}
                    </small>
                  </div>
                </div>
              </div>
              <div className="badges">
                <span
                  className={`badge priority-${item.priority?.toLowerCase()}`}
                >
                  {labels[item.priority ?? "MEDIUM"]}
                </span>
                <span className="badge status">{labels[item.status]}</span>
                <span className={`badge deadline-${serviceOrderDeadline(item).status}`}>{serviceOrderDeadline(item).label}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      {open && (
        <Modal title="Nova ordem de serviço" onClose={() => setOpen(false)}>
          <form className="form-grid" onSubmit={submit}>
            {formError && <div className="alert error span-2">{formError}</div>}
            <Field
              label="Título"
              value={form.title}
              set={(title) => setForm({ ...form, title })}
              required
              span
            />
            <Field
              label="Descrição"
              value={form.description}
              set={(description) => setForm({ ...form, description })}
              required
              textarea
              span
            />
            <LookupField label="Categoria" value={form.category??""} options={lookupOptions.categories} set={category=>setForm({...form,category})}/>
            <LookupField label="Sistema" value={form.system??""} options={lookupOptions.systems} set={system=>setForm({...form,system})}/>
            <LookupField label="Unidade" value={form.unit??""} options={lookupOptions.units} set={unit=>setForm({...form,unit})}/>
            <label>
              Prazo previsto
              <input
                type="date"
                value={form.dueDate ?? ""}
                onChange={(event) =>
                  setForm({ ...form, dueDate: event.target.value })
                }
              />
            </label>
            <SelectPriority
              value={form.priority ?? "MEDIUM"}
              set={(priority) => setForm({ ...form, priority })}
            />
            <FormActions saving={saving} close={() => setOpen(false)} />
          </form>
        </Modal>
      )}
    </>
  );
}

function LookupField({label,value,options,set}:{label:string;value:string;options:{id:string;name:string}[];set(value:string):void}) {
  return options.length ? <label>{label}<select value={value} onChange={event=>set(event.target.value)}><option value="">Selecione</option>{options.map(option=><option key={option.id} value={option.name}>{option.name}</option>)}</select></label> : <Field label={label} value={value} set={set}/>;
}
