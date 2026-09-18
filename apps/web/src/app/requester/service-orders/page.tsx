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
import type { ServiceOrder, ServiceOrderStatus } from "@/types/service-order";

type RequesterFilter = "ACTIVE" | "OPEN_RECEIVED" | ServiceOrderStatus | "ALL";

const filters: { value: RequesterFilter; label: string }[] = [
  { value: "ACTIVE", label: "Ativas" },
  { value: "OPEN_RECEIVED", label: "Abertas/Recebidas" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "COMPLETED", label: "Concluídas" },
  { value: "CANCELED", label: "Canceladas" },
  { value: "ALL", label: "Todas" },
];

export default function RequesterServiceOrdersPage() {
  const [items, setItems] = useState<ServiceOrder[]>([]);
  const [filter, setFilter] = useState<RequesterFilter>("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (pageNumber = 1) => {
    if (pageNumber === 1) setLoading(true);
    else setLoadingMore(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (filter === "ALL") query.set("view", "ALL");
      else if (filter === "OPEN_RECEIVED") query.set("view", "OPEN_RECEIVED");
      else if (filter !== "ACTIVE") {
        query.set("view", "ALL");
        query.set("status", filter);
      }
      query.set("page", String(pageNumber));
      query.set("limit", "50");
      const suffix = query.size ? `?${query.toString()}` : "";
      const result = await apiRequest<ServiceOrder[]>(`/service-orders/my${suffix}`);
      setItems((current) => pageNumber === 1 ? result : [...current, ...result]);
      setPage(pageNumber);
      setHasMore(result.length === 50);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar suas solicitações.",
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter]);
  useEffect(() => {
    void load(1);
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
      {error && <ErrorState message={error} retry={() => load(1)} />}
      <div className="requester-status-filter" role="group" aria-label="Filtrar solicitações por status">
        {filters.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`button small ${filter === option.value ? "primary" : "ghost"}`}
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
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
          {hasMore && (
            <button
              type="button"
              className="button ghost"
              disabled={loadingMore}
              onClick={() => void load(page + 1)}
            >
              {loadingMore ? "Carregando..." : "Carregar mais solicitações"}
            </button>
          )}
        </div>
      )}
    </>
  );
}
