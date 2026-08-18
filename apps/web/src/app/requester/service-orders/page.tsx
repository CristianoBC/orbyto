"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  EmptyState,
  ErrorState,
  formatDate,
  labels,
  LoadingState,
} from "@/components/ui/page-state";
import { apiRequest } from "@/lib/api";
import { serviceOrderDeadline } from "@/lib/deadline";
import type { ServiceOrder } from "@/types/service-order";


export default function RequesterServiceOrdersPage() {
  const [items, setItems] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await apiRequest<ServiceOrder[]>("/service-orders/my"));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar suas solicitações.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div className="requester-heading">
        <div>
          <p className="eyebrow">Atendimento Orbyto</p>
          <h1>Minhas solicitações</h1>
          <p>Acompanhe seus pedidos e as respostas da equipe de atendimento.</p>
        </div>
        <Link className="button primary" href="/requester/service-orders/new">
          + Nova solicitação
        </Link>
      </div>
      {error && <ErrorState message={error} retry={load} />}
      {loading ? (
        <LoadingState />
      ) : !items.length ? (
        <EmptyState text="Você ainda não abriu nenhuma solicitação." />
      ) : (
        <div className="requester-orders">
          {items.map((item) => (
            <Link
              href={`/requester/service-orders/${item.id}`}
              className={`requester-order-card${serviceOrderDeadline(item).status === "overdue" ? " service-order-overdue" : ""}`}
              key={item.id}
            >
              <div>
                <div className="requester-order-title">
                  <h2>{item.title}</h2>
                  <span className="badge status">{labels[item.status]}</span>
                  <span className={`badge deadline-${serviceOrderDeadline(item).status}`}>{serviceOrderDeadline(item).label}</span>
                </div>
                <p>{item.description}</p>
                <small>
                  Aberta em {formatDate(item.createdAt)} ·{" "}
                  {item.category || "Sem categoria"} ·{" "}
                  {item.system || "Sistema não informado"}
                </small>
                <small className={serviceOrderDeadline(item).status === "overdue" ? "overdue-text" : ""}>
                  Prazo:{" "}
                  {item.dueDate ? formatDate(item.dueDate) : "não informado"}
                  {serviceOrderDeadline(item).status === "overdue" ? " · vencida" : ""}
                </small>
              </div>
              <span
                className={`badge priority-${(item.priority ?? "MEDIUM").toLowerCase()}`}
              >
                {labels[item.priority ?? "MEDIUM"]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
