"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
interface Update { id: string; requestedTitle: string; type: string; seasonNumber: number | null; audioType: string | null; notes: string | null; status: string; posterUrl: string | null; createdAt: string; createdBy: { name: string; email: string }; }
const statusColor: Record<string, string> = { ABERTO: "bg-yellow-600", EM_PROGRESSO: "bg-blue-600", CONCLUIDO: "bg-green-600", REJEITADO: "bg-red-600" };
const statusLabel: Record<string, string> = { ABERTO: "Aberto", EM_PROGRESSO: "Em Progresso", CONCLUIDO: "Concluido", REJEITADO: "Rejeitado" };
function DetalheModal({ update, onClose, onStatusChange }: { update: Update; onClose: () => void; onStatusChange: (id: string, status: string) => void; }) {
  const [updating, setUpdating] = useState(false);
  async function handleStatus(status: string) {
    setUpdating(true);
    await onStatusChange(update.id, status);
    setUpdating(false);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4 p-5 border-b border-zinc-700">
          {update.posterUrl ? (<img src={update.posterUrl} alt={update.requestedTitle} className="w-20 rounded-lg object-cover flex-shrink-0" />) : (<div className="w-20 h-28 bg-zinc-800 rounded-lg flex-shrink-0" />)}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-white text-xl leading-tight">{update.requestedTitle}</h2>
            <p className="text-zinc-500 text-xs mt-1">{new Date(update.createdAt).toLocaleDateString("pt-BR")} por {update.createdBy.name}</p>
            <span className={"inline-block mt-2 text-white text-xs font-medium px-3 py-1 rounded-full " + (statusColor[update.status] || "bg-zinc-700")}>{statusLabel[update.status] || update.status}</span>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-zinc-300 text-sm font-semibold">Detalhes da Solicitacao</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800 rounded-xl p-3">
              <p className="text-zinc-500 text-xs mb-1">Temporada</p>
              <p className="text-white text-sm font-medium">{update.seasonNumber ? "Temporada " + update.seasonNumber : "Nao informada"}</p>
            </div>
            <div className="bg-zinc-800 rounded-xl p-3">
              <p className="text-zinc-500 text-xs mb-1">Tipo de Audio</p>
              <p className="text-white text-sm font-medium">{update.audioType || "Nao informado"}</p>
            </div>
          </div>
          {update.notes && (
            <div className="bg-zinc-800 rounded-xl p-3">
              <p className="text-zinc-500 text-xs mb-1">Observacoes</p>
              <p className="text-zinc-200 text-sm whitespace-pre-wrap">{update.notes}</p>
            </div>
          )}
          <div>
            <p className="text-zinc-400 text-xs font-medium mb-2">Alterar Status</p>
            <div className="flex gap-2 flex-wrap">
              {["ABERTO", "EM_PROGRESSO", "CONCLUIDO", "REJEITADO"].map((s) => (
                <button key={s} onClick={() => handleStatus(s)} disabled={updating || update.status === s} className={"px-3 py-1.5 rounded-full text-xs font-medium transition disabled:opacity-40 " + (update.status === s ? (statusColor[s] + " text-white") : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}>
                  {statusLabel[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition text-sm">Fechar</button>
        </div>
      </div>
    </div>
  );
}
export default function AtualizacoesPage() {
  const router = useRouter();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [selected, setSelected] = useState<Update | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const fetchUpdates = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ isUpdate: "true" });
    if (filtroStatus) params.append("status", filtroStatus);
    fetch("/api/requests?" + params.toString())
      .then((r) => r.json())
      .then((d) => setUpdates(d.requests || []))
      .catch(() => toast.error("Erro ao carregar atualizacoes"))
      .finally(() => setLoading(false));
  }, [filtroStatus]);
  useEffect(() => { fetchUpdates(); }, [fetchUpdates]);
  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/requests/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      toast.success("Status atualizado!");
      setSelected((prev) => prev ? { ...prev, status } : null);
      fetchUpdates();
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado");
    } finally {
      setUpdatingId(null);
    }
  }
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Atualizacoes de Series</h1>
          <p className="text-zinc-400 text-sm mt-1">Clique em uma solicitacao para ver os detalhes.</p>
        </div>
        <button onClick={() => router.push("/dashboard/atualizacoes/new")} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition">+ Nova Atualizacao</button>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {["", "ABERTO", "EM_PROGRESSO", "CONCLUIDO", "REJEITADO"].map((s) => (
          <button key={s} onClick={() => setFiltroStatus(s)} className={"px-4 py-1.5 rounded-full text-sm font-medium transition border " + (filtroStatus === s ? "bg-blue-600 border-blue-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500")}>
            {s === "" ? "Todos" : statusLabel[s]}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-zinc-800 rounded-xl animate-pulse" />)}</div>
      ) : updates.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">Nenhuma solicitacao encontrada.</div>
      ) : (
        <div className="space-y-3">
          {updates.map((u) => (
            <div key={u.id} onClick={() => setSelected(u)} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition">
              {u.posterUrl ? (<img src={u.posterUrl} alt={u.requestedTitle} className="w-12 h-16 object-cover rounded-lg flex-shrink-0" />) : (<div className="w-12 h-16 bg-zinc-800 rounded-lg flex-shrink-0" />)}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">{u.requestedTitle}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {u.seasonNumber && <span className="text-zinc-400 text-xs">Temporada {u.seasonNumber}</span>}
                  {u.audioType && <span className="text-zinc-400 text-xs">{u.audioType}</span>}
                  <span className="text-zinc-500 text-xs">{new Date(u.createdAt).toLocaleDateString("pt-BR")}</span>
                  <span className="text-zinc-500 text-xs">por {u.createdBy.name}</span>
                </div>
                {u.notes && <p className="text-zinc-500 text-xs mt-1 line-clamp-1">{u.notes}</p>}
              </div>
              <span className={"text-white text-xs font-medium px-3 py-1 rounded-full " + (statusColor[u.status] || "bg-zinc-700")}>{statusLabel[u.status] || u.status}</span>
            </div>
          ))}
        </div>
      )}
      {selected && <DetalheModal update={selected} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} />}
    </div>
  );
}