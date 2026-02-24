"use client"; // v3
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface Update {
  id: string;
  requestedTitle: string;
  type: string;
  seasonNumber: number | null;
  audioType: string | null;
  notes: string | null;
  status: string;
  posterUrl: string | null;
  createdAt: string;
  createdBy: { name: string; email: string };
  createdById?: string;
}

const statusColor: Record<string, string> = {
  ABERTO: "bg-yellow-600",
  EM_PROGRESSO: "bg-blue-600",
  CONCLUIDO: "bg-green-600",
  REJEITADO: "bg-red-600",
};
const statusLabel: Record<string, string> = {
  ABERTO: "Aberto",
  EM_PROGRESSO: "Em Progresso",
  CONCLUIDO: "Concluido",
  REJEITADO: "Rejeitado",
};

function DetalheModal({ update, onClose, onStatusChange, onDelete, isAdmin, userId }: {
  update: Update;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
  userId: string;
}) {
  const [updating, setUpdating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canEdit = isAdmin || update.createdById === userId;

  async function handleStatus(status: string) {
    setUpdating(true);
    await onStatusChange(update.id, status);
    setUpdating(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-4 p-6">
          {update.posterUrl ? (
            <img src={update.posterUrl} alt={update.requestedTitle} className="w-24 h-36 object-cover rounded-lg flex-shrink-0" />
          ) : (
            <div className="w-24 h-36 bg-zinc-800 rounded-lg flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-lg leading-tight">{update.requestedTitle}</h2>
            <span className={"inline-block mt-2 text-white text-xs font-medium px-3 py-1 rounded-full " + (statusColor[update.status] || "bg-zinc-700")}>
              {statusLabel[update.status] || update.status}
            </span>
            <div className="mt-3 space-y-1 text-sm text-zinc-400">
              {update.seasonNumber && <p>Temporada: {update.seasonNumber}</p>}
              {update.audioType && <p>Audio: {update.audioType}</p>}
              {update.notes && <p className="text-zinc-500 text-xs mt-2">{update.notes.replace(/[AUTO] M3U:/g, "No Servidor:")}</p>}
              <p className="text-xs text-zinc-500 mt-2">
                {new Date(update.createdAt).toLocaleDateString("pt-BR")} por {update.createdBy.name}
              </p>
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="px-6 pb-4">
            <p className="text-zinc-500 text-xs mb-2">Alterar status:</p>
            <div className="mb-3">
            <div className="relative">
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar série..." className="w-full rounded-lg px-4 py-2 pl-9 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }} />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
              {["ABERTO", "EM_PROGRESSO", "CONCLUIDO", "REJEITADO"].map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatus(s)}
                  disabled={updating || update.status === s}
                  className={"px-3 py-1.5 rounded-full text-xs font-medium transition disabled:opacity-40 " + (update.status === s ? (statusColor[s] + " text-white") : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}
                >
                  {statusLabel[s]}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="px-6 pb-6 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition">
            Fechar
          </button>
          {canEdit && (
            confirmDelete ? (
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg text-xs border border-zinc-700 text-zinc-400">Cancelar</button>
                <button onClick={() => onDelete(update.id)} className="px-3 py-1.5 rounded-lg text-xs bg-red-600 text-white hover:bg-red-500">Confirmar</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-lg text-sm bg-red-600/20 text-red-400 hover:bg-red-600/40 transition">
                Excluir
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function AtualizacoesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Update | null>(null);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [search, setSearch] = useState("");
  const isAdmin = session?.user?.role === "ADMIN";
  const userId = session?.user?.id || "";

  const fetchUpdates = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ isUpdate: "true", page: page.toString(), limit: "50" });
    if (filtroStatus) params.append("status", filtroStatus);
    if (search) params.append("search", search);
    fetch("/api/requests?" + params.toString())
      .then((r) => r.json())
      .then((d) => {
        setUpdates(d.requests || []);
        setTotal(d.total || 0);
        setTotalPages(d.pages || 1);
      })
      .catch(() => toast.error("Erro ao carregar atualizacoes"))
      .finally(() => setLoading(false));
  }, [filtroStatus, page, search]);

  useEffect(() => { fetchUpdates(); }, [fetchUpdates]);

  async function handleStatusChange(id: string, status: string) {
    try {
      const res = await fetch("/api/requests/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      toast.success("Status atualizado!");
      fetchUpdates();
      setSelected(null);
    } catch (err: any) { toast.error(err.message || "Erro inesperado"); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch("/api/requests/" + id, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      toast.success("Solicitacao excluida!");
      setSelected(null);
      fetchUpdates();
    } catch (err: any) { toast.error(err.message || "Erro inesperado"); }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Atualizações de Séries</h1>
          <p className="text-zinc-400 text-sm mt-1">Clique em uma solicitacao para ver os detalhes.</p>
        </div>
        <button onClick={() => router.push("/dashboard/atualizacoes/new")} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Nova Atualização
        </button>
      </div>

      <div className="relative mb-4">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar série..." className="w-full rounded-lg px-4 py-2.5 pl-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }} />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>
      <div className="flex gap-2 flex-wrap mb-6">
        {["", "ABERTO", "EM_PROGRESSO", "CONCLUIDO", "REJEITADO"].map((s) => (
          <button
            key={s}
            onClick={() => { setFiltroStatus(s); setPage(1); }}
            className={"px-4 py-1.5 rounded-full text-sm font-medium transition border " + (filtroStatus === s ? "bg-blue-600 border-blue-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500")}
          >
            {s === "" ? "Todos" : s === "EM_PROGRESSO" ? "Em Progresso" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-zinc-400">Carregando...</div>
      ) : updates.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">Nenhuma atualização encontrada.</div>
      ) : (
        <div className="space-y-3">
          {updates.map((u) => (
            <div key={u.id} onClick={() => setSelected(u)} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition">
              {u.posterUrl ? (
                <img src={u.posterUrl} alt={u.requestedTitle} className="w-12 h-16 object-cover rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-12 h-16 bg-zinc-800 rounded-lg flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">{u.requestedTitle}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {u.seasonNumber && <span className="text-zinc-400 text-xs">Temporada {u.seasonNumber}</span>}
                  {u.audioType && <span className="text-zinc-400 text-xs">{u.audioType}</span>}
                  <span className="text-zinc-500 text-xs">{new Date(u.createdAt).toLocaleDateString("pt-BR")}</span>
                  <span className="text-zinc-500 text-xs">por {u.createdBy.name}</span>
                </div>
                {u.notes && <p className="text-zinc-500 text-xs mt-1 line-clamp-1">{u.notes.replace(/[AUTO] M3U:/g, "No Servidor:")}</p>}
              </div>
              <span className={"text-white text-xs font-medium px-3 py-1 rounded-full " + (statusColor[u.status] || "bg-zinc-700")}>
                {statusLabel[u.status] || u.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-zinc-400">{total} atualizações no total</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg text-sm border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 disabled:opacity-40 transition">Anterior</button>
            <span className="px-4 py-2 text-sm text-zinc-400">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-lg text-sm border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 disabled:opacity-40 transition">Próxima</button>
          </div>
        </div>
      )}

      {selected && (
        <DetalheModal
          update={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          isAdmin={isAdmin}
          userId={userId}
        />
      )}
    </div>
  );
}
