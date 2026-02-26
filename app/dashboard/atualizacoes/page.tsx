"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface TitleEpisode {
  season: number;
  episode: number;
}

interface LatestRequest {
  id: string;
  status: string;
  audioType: string | null;
  seasonNumber: number | null;
  notes: string | null;
  createdAt: string;
  createdById: string;
  createdBy: { name: string; email: string };
}

interface SerieCard {
  id: string;
  title: string;
  posterUrl: string | null;
  tvSeasons: number | null;
  tmdbId: number;
  latestRequest: LatestRequest | null;
}

const statusColor: Record<string, string> = {
  ABERTO: "bg-yellow-600",
  EM_ANDAMENTO: "bg-blue-500",
  EM_PROGRESSO: "bg-purple-600",
  CONCLUIDO: "bg-green-600",
  REJEITADO: "bg-red-600",
};
const statusLabel: Record<string, string> = {
  ABERTO: "Aberto",
  EM_ANDAMENTO: "Em Andamento",
  EM_PROGRESSO: "Em Progresso",
  CONCLUIDO: "Concluído",
  REJEITADO: "Rejeitado",
};

function EpisodeGrid({
  savedEpisodes, tmdbSeasons, selectedEpisodes, onToggle, onSelectAll, onClear, selectedSeason, onSeasonChange,
  manualSeasonCounts, onManualCount,
}: {
  savedEpisodes: TitleEpisode[];
  tmdbSeasons: Record<number, number>;
  selectedEpisodes: Record<number, number[]>;
  onToggle: (season: number, ep: number) => void;
  onSelectAll: (season: number) => void;
  onClear: (season: number) => void;
  selectedSeason: number;
  onSeasonChange: (s: number) => void;
  manualSeasonCounts: Record<number, number>;
  onManualCount: (season: number, count: number) => void;
}) {
  const baseSeasons = Object.keys(tmdbSeasons).length > 0
    ? Object.keys(tmdbSeasons).map(Number).sort((a, b) => a - b)
    : Array.from(new Set(savedEpisodes.map(e => e.season))).sort((a, b) => a - b);
  const maxSeason = baseSeasons.length > 0 ? Math.max(...baseSeasons) : 0;
  // Always include the next season so users can request upcoming content
  const seasons = maxSeason > 0 ? [...baseSeasons, maxSeason + 1] : baseSeasons;
  if (seasons.length === 0) return null;

  const selectedEpsInSeason = selectedEpisodes[selectedSeason] || [];
  const savedEpsInSeason = savedEpisodes.filter(e => e.season === selectedSeason).map(e => e.episode);

  // TMDB may return episode_count = 0 for upcoming seasons — use || not ??
  const tmdbCount = tmdbSeasons[selectedSeason] > 0 ? tmdbSeasons[selectedSeason] : 0;
  const savedMax = savedEpsInSeason.length > 0 ? Math.max(...savedEpsInSeason) : 0;
  const maxFromData = tmdbCount || savedMax;
  const maxEpInSeason = maxFromData || (manualSeasonCounts[selectedSeason] ?? 0);
  const needsManualInput = maxFromData === 0;

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-3">
        {seasons.map(s => {
          const selCount = (selectedEpisodes[s] || []).length;
          const tmdbTotal = tmdbSeasons[s] ?? 0;
          return (
            <button key={s} onClick={() => onSeasonChange(s)}
              className={"px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 " + (selectedSeason === s ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}
            >
              T{s}
              {selCount > 0 && (
                <span className={"rounded-full px-1.5 text-[10px] font-bold " + (selectedSeason === s ? "bg-white/20" : "bg-orange-500/20 text-orange-400")}>
                  {selCount}{tmdbTotal > 0 ? "/" + tmdbTotal : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {needsManualInput && (
        <div className="mb-3 flex items-center gap-3">
          <p className="text-xs text-zinc-500">TMDB sem dados para T{selectedSeason}. Quantos episódios tem?</p>
          <input
            type="number" min={1} max={100}
            value={manualSeasonCounts[selectedSeason] || ""}
            onChange={e => {
              const n = parseInt(e.target.value);
              onManualCount(selectedSeason, isNaN(n) || n < 1 ? 0 : n);
            }}
            placeholder="Ex: 8"
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white w-20 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      )}
      {maxEpInSeason > 0 && (
        <div className="bg-zinc-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">
              Temporada {selectedSeason}
              {tmdbCount > 0 && <span className="ml-1 text-zinc-500">({tmdbCount} eps no TMDB)</span>}
            </span>
            <div className="flex gap-1.5">
              <button onClick={() => onSelectAll(selectedSeason)} className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition">Todos</button>
              <button onClick={() => onClear(selectedSeason)} className="px-2 py-0.5 rounded text-xs bg-zinc-700 text-zinc-400 hover:bg-zinc-600 transition">Limpar</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: maxEpInSeason }, (_, i) => i + 1).map(ep => {
              const isSelected = selectedEpsInSeason.includes(ep);
              const wasAlreadySaved = savedEpsInSeason.includes(ep);
              return (
                <button key={ep} onClick={() => onToggle(selectedSeason, ep)}
                  title={wasAlreadySaved ? "Já estava no servidor" : isSelected ? "Adicionado agora" : "Não disponível"}
                  className={"w-10 h-8 rounded text-xs font-semibold transition " + (isSelected ? (wasAlreadySaved ? "bg-orange-500 text-white" : "bg-green-600 text-white") : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700")}
                >
                  {ep}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-xs text-zinc-500">{selectedEpsInSeason.length} de {maxEpInSeason} selecionados</p>
            {selectedEpsInSeason.some(ep => !savedEpsInSeason.includes(ep)) && (
              <p className="text-xs text-green-500">+{selectedEpsInSeason.filter(ep => !savedEpsInSeason.includes(ep)).length} novos</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SerieModal({ serie, onClose, onRefresh, isAdmin, userId }: {
  serie: SerieCard;
  onClose: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
  userId: string;
}) {
  const [updating, setUpdating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [audio, setAudio] = useState(serie.latestRequest?.audioType || "DUBLADO");
  const [manualSeasonCounts, setManualSeasonCounts] = useState<Record<number, number>>({});
  const [seriesFinalizada, setSeriesFinalizada] = useState(false);
  const [obs, setObs] = useState("");
  const [currentEpisodes, setCurrentEpisodes] = useState<TitleEpisode[]>([]);
  const [tmdbSeasons, setTmdbSeasons] = useState<Record<number, number>>({});
  const [selectedEpisodes, setSelectedEpisodes] = useState<Record<number, number[]>>({});
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const canEdit = isAdmin || serie.latestRequest?.createdById === userId;

  useEffect(() => {
    async function load() {
      setLoadingEpisodes(true);
      try {
        const titleRes = await fetch("/api/titles/" + serie.id);
        const data = await titleRes.json();
        const eps: TitleEpisode[] = data.episodes || [];
        setCurrentEpisodes(eps);
        const bySeasonMap: Record<number, number[]> = {};
        for (const ep of eps) {
          if (!bySeasonMap[ep.season]) bySeasonMap[ep.season] = [];
          bySeasonMap[ep.season].push(ep.episode);
        }
        setSelectedEpisodes(bySeasonMap);
        if (data.tmdbId && data.type === "TV") {
          try {
            const tmdbRes = await fetch("/api/tmdb/details?type=tv&tmdbId=" + data.tmdbId);
            const tmdbData = await tmdbRes.json();
            if (Array.isArray(tmdbData.seasons)) {
              const seasonMap: Record<number, number> = {};
              for (const s of tmdbData.seasons) {
                if (s.season_number > 0) seasonMap[s.season_number] = s.episode_count;
              }
              setTmdbSeasons(seasonMap);
            }
          } catch (_) {}
        }
        if (eps.length > 0) setSelectedSeason(Math.max(...eps.map(e => e.season)));
      } finally {
        setLoadingEpisodes(false);
      }
    }
    load();
  }, [serie.id]);

  const toggleEpisode = (season: number, ep: number) => {
    setSelectedEpisodes(prev => {
      const current = prev[season] || [];
      const idx = current.indexOf(ep);
      if (idx === -1) return { ...prev, [season]: [...current, ep].sort((a, b) => a - b) };
      return { ...prev, [season]: current.filter(e => e !== ep) };
    });
  };
  const selectAllInSeason = (season: number) => {
    const tmdbCount = tmdbSeasons[season] > 0 ? tmdbSeasons[season] : 0;
    const savedMax = Math.max(0, ...currentEpisodes.filter(e => e.season === season).map(e => e.episode));
    const maxEp = tmdbCount || savedMax || manualSeasonCounts[season] || 0;
    if (maxEp > 0) setSelectedEpisodes(prev => ({ ...prev, [season]: Array.from({ length: maxEp }, (_, i) => i + 1) }));
  };
  const clearSeason = (season: number) => setSelectedEpisodes(prev => ({ ...prev, [season]: [] }));

  const buildNotesFromEpisodes = () => {
    const parts = Object.entries(selectedEpisodes)
      .filter(([, eps]) => eps.length > 0)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([season, eps]) => {
        const sorted = [...eps].sort((a, b) => a - b);
        return `Temp ${season}: eps ${sorted[0]}-${sorted[sorted.length - 1]}`;
      });
    return parts.length > 0 ? parts.join(", ") : null;
  };

  async function handleStatusChange(newStatus: string) {
    if (!serie.latestRequest) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/requests/" + serie.latestRequest.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status atualizado!");
      onRefresh();
      onClose();
    } catch {
      toast.error("Erro ao atualizar status");
    } finally {
      setUpdating(false);
    }
  }

  async function handleSaveUpdate() {
    setUpdating(true);
    try {
      const newStatus = seriesFinalizada ? "CONCLUIDO" : "ABERTO";
      const epNotes = buildNotesFromEpisodes();
      const notes = [epNotes, obs.trim()].filter(Boolean).join("\n") || null;

      const episodesData = Object.entries(selectedEpisodes).flatMap(([season, eps]) =>
        eps.map(ep => ({ season: parseInt(season), episode: ep }))
      );
      await fetch("/api/titles/" + serie.id + "/episodes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodesData }),
      });

      if (serie.latestRequest) {
        await fetch("/api/requests/" + serie.latestRequest.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus, audioType: audio, notes }),
        });
      } else {
        await fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestedTitle: serie.title,
            type: "TV",
            isUpdate: true,
            linkedTitleId: serie.id,
            tmdbId: serie.tmdbId,
            posterUrl: serie.posterUrl,
            audioType: audio,
            notes,
          }),
        });
      }

      if (seriesFinalizada) {
        await fetch("/api/titles/" + serie.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tvStatus: "FINALIZADA" }),
        });
        toast.success("Série finalizada e biblioteca atualizada!");
      } else {
        toast.success("Atualização registrada!");
      }
      onRefresh();
      onClose();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteRequest() {
    if (!serie.latestRequest) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/requests/" + serie.latestRequest.id, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Pedido excluído!");
      onRefresh();
      onClose();
    } catch {
      toast.error("Erro ao excluir");
    } finally {
      setUpdating(false);
    }
  }

  const episodesBySeason = currentEpisodes.reduce<Record<number, number[]>>((acc, ep) => {
    if (!acc[ep.season]) acc[ep.season] = [];
    acc[ep.season].push(ep.episode);
    return acc;
  }, {});

  function fmtRange(eps: number[]): string {
    const s = [...eps].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = s[0], end = s[0];
    for (let i = 1; i < s.length; i++) {
      if (s[i] === end + 1) { end = s[i]; }
      else { ranges.push(start === end ? `${start}` : `${start}–${end}`); start = end = s[i]; }
    }
    ranges.push(start === end ? `${start}` : `${start}–${end}`);
    return ranges.join(", ");
  }

  const rawNotes = serie.latestRequest?.notes?.replace(/\[AUTO\] M3U:/g, "No Servidor:") ?? null;
  const noteLines = rawNotes ? rawNotes.split("\n") : [];
  const epLine = noteLines.find(l => /^Temp\s/i.test(l.trim())) ?? null;
  const obsLine = noteLines.filter(l => !/^Temp\s/i.test(l.trim()) && l.trim()).join(" ") || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex gap-4 p-6">
          {serie.posterUrl
            ? <img src={serie.posterUrl} alt={serie.title} className="w-24 h-36 object-cover rounded-lg flex-shrink-0" />
            : <div className="w-24 h-36 bg-zinc-800 rounded-lg flex-shrink-0" />
          }
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-lg leading-tight">{serie.title}</h2>
            {serie.tvSeasons && <p className="text-zinc-500 text-xs mt-1">{serie.tvSeasons} temporada{serie.tvSeasons !== 1 ? 's' : ''}</p>}
            {serie.latestRequest ? (
              <>
                <span className={"inline-block mt-2 text-white text-xs font-medium px-3 py-1 rounded-full " + (statusColor[serie.latestRequest.status] || "bg-zinc-700")}>
                  {statusLabel[serie.latestRequest.status] || serie.latestRequest.status}
                </span>
                <div className="mt-3 space-y-1.5 text-sm text-zinc-400">
                  {serie.latestRequest.audioType && <p>Áudio: {serie.latestRequest.audioType}</p>}
                  {epLine && <p className="text-zinc-500 text-xs">{epLine}</p>}
                  {obsLine && (
                    <div className="flex items-start gap-1.5 mt-1 bg-zinc-800/60 rounded-lg px-2.5 py-1.5">
                      <svg className="w-3 h-3 text-yellow-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs text-yellow-200/80 leading-relaxed">{obsLine}</p>
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 mt-1">
                    {new Date(serie.latestRequest.createdAt).toLocaleDateString("pt-BR")} por {serie.latestRequest.createdBy.name}
                  </p>
                </div>
              </>
            ) : (
              <span className="inline-block mt-2 text-zinc-400 text-xs font-medium px-3 py-1 rounded-full bg-zinc-800">
                Sem pedido de atualização
              </span>
            )}
          </div>
        </div>

        {/* Episodes display */}
        <div className="px-6 pb-4 border-t border-zinc-700 pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">No Servidor</p>
            {!loadingEpisodes && currentEpisodes.length > 0 && (
              <span className="text-xs text-zinc-500">{Object.keys(episodesBySeason).length} temp · {currentEpisodes.length} eps</span>
            )}
          </div>
          {loadingEpisodes ? (
            <p className="text-xs text-zinc-600 animate-pulse">Carregando...</p>
          ) : currentEpisodes.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">Nenhum episódio registrado</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(episodesBySeason)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([season, eps]) => (
                  <span key={season} title={`Temporada ${season}: eps ${fmtRange(eps)}`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs"
                  >
                    <span className="text-zinc-400 font-semibold">T{season}</span>
                    <span className="text-orange-400">{fmtRange(eps)}</span>
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Update form */}
        {showUpdateForm && (
          <div className="px-6 pb-4 border-t border-zinc-700 pt-4 space-y-3">
            <p className="text-sm font-semibold text-white mb-2">Registrar Atualização</p>
            {(Object.keys(tmdbSeasons).length > 0 || currentEpisodes.length > 0) && (
              <div>
                <label className="text-xs text-zinc-400 block mb-2">Episódios disponíveis</label>
                <EpisodeGrid
                  savedEpisodes={currentEpisodes}
                  tmdbSeasons={tmdbSeasons}
                  selectedEpisodes={selectedEpisodes}
                  onToggle={toggleEpisode}
                  onSelectAll={selectAllInSeason}
                  onClear={clearSeason}
                  selectedSeason={selectedSeason}
                  onSeasonChange={setSelectedSeason}
                  manualSeasonCounts={manualSeasonCounts}
                  onManualCount={(season, count) => setManualSeasonCounts(prev => ({ ...prev, [season]: count }))}
                />
              </div>
            )}
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Tipo de Áudio</label>
              <div className="flex flex-wrap gap-2">
                {["DUBLADO", "LEGENDADO", "DUBLADO_LEGENDADO"].map((a) => (
                  <button key={a} onClick={() => setAudio(a)}
                    className={"px-3 py-1.5 rounded-lg text-xs font-medium transition " + (audio === a ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}
                  >
                    {a === "DUBLADO" ? "Dublado" : a === "LEGENDADO" ? "Legendado" : "Dub+Leg"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="finalizada" checked={seriesFinalizada} onChange={e => setSeriesFinalizada(e.target.checked)} className="w-4 h-4 accent-orange-500" />
              <label htmlFor="finalizada" className="text-sm text-zinc-300 cursor-pointer">Série completa no servidor</label>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Observação <span className="text-zinc-600">(opcional)</span></label>
              <textarea
                value={obs}
                onChange={e => setObs(e.target.value)}
                placeholder="Ex: Eps 05 a 09 estão legendados"
                rows={2}
                className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 resize-none"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setShowUpdateForm(false)} className="flex-1 py-2 rounded-lg text-sm text-zinc-400 border border-zinc-700 hover:bg-zinc-800 transition">Cancelar</button>
              <button onClick={handleSaveUpdate} disabled={updating} className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition disabled:opacity-50">
                {updating ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {!showUpdateForm && (
          <div className="px-6 pb-4">
            <button onClick={() => setShowUpdateForm(true)} className="w-full py-2 rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition mb-3">
              Registrar Atualização
            </button>
            {serie.latestRequest && canEdit && (
              <>
                <p className="text-zinc-500 text-xs mb-2">Alterar status:</p>
                <div className="flex gap-2 flex-wrap">
                  {["ABERTO", "EM_ANDAMENTO", "EM_PROGRESSO", "CONCLUIDO", "REJEITADO"].map((s) => (
                    <button key={s} onClick={() => handleStatusChange(s)}
                      disabled={updating || serie.latestRequest?.status === s}
                      className={"px-3 py-1.5 rounded-full text-xs font-medium transition disabled:opacity-40 " + (serie.latestRequest?.status === s ? (statusColor[s] + " text-white") : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}
                    >
                      {statusLabel[s]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition">
            Fechar
          </button>
          {serie.latestRequest && canEdit && (
            confirmDelete ? (
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg text-xs border border-zinc-700 text-zinc-400">Cancelar</button>
                <button onClick={handleDeleteRequest} className="px-3 py-1.5 rounded-lg text-xs bg-red-600 text-white hover:bg-red-500">Confirmar</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-lg text-sm bg-red-600/20 text-red-400 hover:bg-red-600/40 transition">
                Excluir pedido
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
  const [series, setSeries] = useState<SerieCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SerieCard | null>(null);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role ?? '');
  const userId = session?.user?.id || "";

  const fetchSeries = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "20" });
    if (filtroStatus) params.append("status", filtroStatus);
    if (search) params.append("search", search);
    fetch("/api/atualizacoes?" + params.toString())
      .then((r) => r.json())
      .then((d) => {
        setSeries(d.series || []);
        setTotal(d.total || 0);
        setTotalPages(d.pages || 1);
      })
      .catch(() => toast.error("Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [filtroStatus, page, search]);

  useEffect(() => { fetchSeries(); }, [fetchSeries]);

  const visibilityFilters = [
    { key: "", label: "Todas" },
    { key: "SEM_PEDIDO", label: "Sem pedido" },
  ];
  const requestStatusFilters = [
    { key: "ABERTO", label: "Aberto" },
    { key: "EM_ANDAMENTO", label: "Em Andamento" },
    { key: "EM_PROGRESSO", label: "Em Progresso" },
    { key: "CONCLUIDO", label: "Concluído" },
    { key: "REJEITADO", label: "Rejeitado" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Atualizações de Séries</h1>
          <p className="text-zinc-400 text-sm mt-1">{total} série{total !== 1 ? "s" : ""} em andamento na biblioteca</p>
        </div>
        <button onClick={() => router.push("/dashboard/atualizacoes/new")} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Nova Atualização
        </button>
      </div>

      <div className="relative mb-4">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar série..."
          className="w-full rounded-lg px-4 py-2.5 pl-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {visibilityFilters.map(({ key, label }) => (
          <button key={key} onClick={() => { setFiltroStatus(key); setPage(1); }}
            className={"px-4 py-1.5 rounded-full text-sm font-medium transition border " + (filtroStatus === key ? "bg-blue-600 border-blue-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500")}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center mb-6">
        <span className="text-xs text-zinc-600 mr-1">Pedido:</span>
        {requestStatusFilters.map(({ key, label }) => (
          <button key={key} onClick={() => { setFiltroStatus(key); setPage(1); }}
            className={"px-4 py-1.5 rounded-full text-sm font-medium transition border " + (filtroStatus === key ? "bg-blue-600 border-blue-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500")}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-zinc-400">Carregando...</div>
      ) : series.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">Nenhuma série encontrada.</div>
      ) : (
        <div className="space-y-3">
          {series.map((s) => (
            <div key={s.id} onClick={() => setSelected(s)}
              className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition"
            >
              {s.posterUrl
                ? <img src={s.posterUrl} alt={s.title} className="w-12 h-16 object-cover rounded-lg flex-shrink-0" />
                : <div className="w-12 h-16 bg-zinc-800 rounded-lg flex-shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">{s.title}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {s.tvSeasons && <span className="text-zinc-400 text-xs">{s.tvSeasons} temp</span>}
                  {s.latestRequest?.audioType && <span className="text-zinc-400 text-xs">{s.latestRequest.audioType}</span>}
                  {s.latestRequest && (
                    <span className="text-zinc-500 text-xs">
                      {new Date(s.latestRequest.createdAt).toLocaleDateString("pt-BR")} · {s.latestRequest.createdBy.name}
                    </span>
                  )}
                </div>
                {s.latestRequest?.notes && (() => {
                  const lines = s.latestRequest!.notes!.replace(/\[AUTO\] M3U:/g, "No Servidor:").split("\n");
                  const ep = lines.find(l => /^Temp\s/i.test(l.trim()));
                  const ob = lines.filter(l => !/^Temp\s/i.test(l.trim()) && l.trim()).join(" ");
                  return (
                    <div className="mt-1 space-y-0.5">
                      {ep && <p className="text-zinc-500 text-xs line-clamp-1">{ep}</p>}
                      {ob && (
                        <p className="text-yellow-500/70 text-xs line-clamp-1 flex items-center gap-1">
                          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                          {ob}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
              <span className={"text-white text-xs font-medium px-3 py-1 rounded-full flex-shrink-0 " + (s.latestRequest ? (statusColor[s.latestRequest.status] || "bg-zinc-700") : "bg-zinc-800 text-zinc-400")}>
                {s.latestRequest ? (statusLabel[s.latestRequest.status] || s.latestRequest.status) : "Sem pedido"}
              </span>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-zinc-400">{total} séries no total</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg text-sm border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 disabled:opacity-40 transition">Anterior</button>
            <span className="px-4 py-2 text-sm text-zinc-400">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-lg text-sm border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 disabled:opacity-40 transition">Próxima</button>
          </div>
        </div>
      )}

      {selected && (
        <SerieModal
          serie={selected}
          onClose={() => setSelected(null)}
          onRefresh={fetchSeries}
          isAdmin={isAdmin}
          userId={userId}
        />
      )}
    </div>
  );
}
