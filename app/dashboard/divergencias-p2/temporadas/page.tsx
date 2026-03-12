'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Divergence {
  p1Seasons: number;
  p1Episodes: number;
  tmdbSeasons: number;
  tmdbEpisodes: number;
  detectedAt: string;
}

interface Title {
  id: string;
  title: string;
  posterUrl: string | null;
  tvSeasons: number | null;
  tvEpisodes: number | null;
  tvStatus: string | null;
  hasP1: boolean;
  hasP2: boolean;
  audioType: string | null;
  p2Divergence: Divergence;
}

export default function DivergenciasTemporadasPage() {
  const [titles, setTitles] = useState<Title[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  async function fetchData(p = 1) {
    setLoading(true);
    try {
      const res = await fetch(`/api/divergencias?page=${p}&limit=20`);
      const data = await res.json();
      setTitles(data.titles);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
    } catch {
      toast.error('Erro ao carregar divergências');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleResolve(id: string, useTmdb: boolean, div: Divergence) {
    setResolving(id);
    try {
      const body = useTmdb
        ? { id, tvSeasons: div.tmdbSeasons, tvEpisodes: div.tmdbEpisodes }
        : { id };

      const res = await fetch('/api/divergencias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error();
      toast.success(useTmdb ? 'Atualizado com dados do TMDB!' : 'Marcado como verificado!');
      setTitles(prev => prev.filter(t => t.id !== id));
      setTotal(prev => prev - 1);
    } catch {
      toast.error('Erro ao resolver divergência');
    } finally {
      setResolving(null);
    }
  }

  function audioLabel(audio: string | null) {
    if (audio === 'DUBLADO_LEGENDADO') return 'Dub+Leg';
    if (audio === 'LEGENDADO') return 'Leg';
    return 'Dub';
  }

  function audioBadge(audio: string | null) {
    if (audio === 'DUBLADO_LEGENDADO') return 'bg-purple-500/20 text-purple-300';
    if (audio === 'LEGENDADO') return 'bg-blue-500/20 text-blue-300';
    return 'bg-orange-500/20 text-orange-300';
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Divergências de Temporadas</h1>
        <p className="text-muted-foreground mt-1">
          Séries com diferença entre temporadas/episódios do banco e o TMDB
        </p>
      </div>

      <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4 mb-6 flex items-center gap-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <p className="font-semibold text-yellow-300">{total} séries com divergência detectada</p>
          <p className="text-yellow-400/80 text-sm">Revise cada item e escolha manter os dados atuais ou atualizar com o TMDB</p>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-900 rounded-xl border border-gray-700 p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-24 bg-gray-700 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-700 rounded w-1/2" />
                  <div className="h-8 bg-gray-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && titles.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-lg font-medium">Nenhuma divergência encontrada!</p>
          <p className="text-sm">Todas as séries do P2 estão sincronizadas.</p>
        </div>
      )}

      {!loading && titles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {titles.map(title => {
            const div = title.p2Divergence;
            const seasonDiff = div.tmdbSeasons - div.p1Seasons;
            const episodeDiff = div.tmdbEpisodes - div.p1Episodes;

            return (
              <div key={title.id} className="bg-gray-900 rounded-xl border border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      {title.posterUrl ? (
                        <img src={title.posterUrl} alt={title.title} className="w-16 h-24 object-cover rounded-lg" />
                      ) : (
                        <div className="w-16 h-24 bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 text-xs text-center">
                          Sem capa
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{title.title}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {title.hasP1 && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-medium">P1</span>}
                        {title.hasP2 && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium">P2</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${audioBadge(title.audioType)}`}>
                          {audioLabel(title.audioType)}
                        </span>
                        {title.tvStatus && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${title.tvStatus === 'FINALIZADA' ? 'bg-gray-700 text-gray-300' : 'bg-green-500/20 text-green-300'}`}>
                            {title.tvStatus === 'FINALIZADA' ? 'Finalizada' : 'Em andamento'}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 bg-gray-800 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400 font-medium">No banco (P1)</span>
                          <span className="font-semibold text-gray-100">{div.p1Seasons} temp / {div.p1Episodes} ep</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400 font-medium">TMDB (atual)</span>
                          <span className="font-semibold text-gray-100">{div.tmdbSeasons} temp / {div.tmdbEpisodes} ep</span>
                        </div>
                        <div className="border-t border-gray-700 pt-2 flex justify-between items-center text-sm">
                          <span className="text-gray-400 font-medium">Diferença</span>
                          <span className={`font-bold ${seasonDiff > 0 || episodeDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {seasonDiff > 0 ? `+${seasonDiff}` : seasonDiff} temp &nbsp;/&nbsp;
                            {episodeDiff > 0 ? `+${episodeDiff}` : episodeDiff} ep
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleResolve(title.id, true, div)}
                      disabled={resolving === title.id}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition disabled:opacity-50"
                    >
                      {resolving === title.id ? 'Salvando...' : `Atualizar para ${div.tmdbSeasons}T/${div.tmdbEpisodes}ep`}
                    </button>
                    <button
                      onClick={() => handleResolve(title.id, false, div)}
                      disabled={resolving === title.id}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium py-2 px-3 rounded-lg transition disabled:opacity-50"
                    >
                      Manter atual e resolver
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button onClick={() => fetchData(page - 1)} disabled={page === 1} className="px-4 py-2 rounded-lg border border-white/10 text-sm disabled:opacity-40 hover:bg-white/5">
            ← Anterior
          </button>
          <span className="px-4 py-2 text-sm text-muted-foreground">Página {page} de {pages}</span>
          <button onClick={() => fetchData(page + 1)} disabled={page === pages} className="px-4 py-2 rounded-lg border border-white/10 text-sm disabled:opacity-40 hover:bg-white/5">
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
