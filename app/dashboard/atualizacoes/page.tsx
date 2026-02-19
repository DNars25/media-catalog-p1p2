"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
interface Update { id: string; requestedTitle: string; type: string; seasonNumber: number | null; audioType: string | null; notes: string | null; status: string; posterUrl: string | null; createdAt: string; createdBy: { name: string; email: string }; }
const statusColor: Record<string, string> = { ABERTO: "bg-yellow-600", EM_PROGRESSO: "bg-blue-600", CONCLUIDO: "bg-green-600", REJEITADO: "bg-red-600" };
const statusLabel: Record<string, string> = { ABERTO: "Aberto", EM_PROGRESSO: "Em Progresso", CONCLUIDO: "Concluido", REJEITADO: "Rejeitado" };
export default function AtualizacoesPage() {
  const router = useRouter();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("");
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
          <p className="text-zinc-400 text-sm mt-1">Solicitacoes de atualizacao de temporadas e episodios.</p>
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
            <div key={u.id} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
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
              <select
                value={u.status}
                disabled={updatingId === u.id}
                onChange={(e) => handleStatusChange(u.id, e.target.value)}
                className={"text-white text-xs font-medium px-3 py-1.5 rounded-full border-0 cursor-pointer focus:outline-none " + (statusColor[u.status] || "bg-zinc-700")}
              >
                <option value="ABERTO">Aberto</option>
                <option value="EM_PROGRESSO">Em Progresso</option>
                <option value="CONCLUIDO">Concluido</option>
                <option value="REJEITADO">Rejeitado</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}