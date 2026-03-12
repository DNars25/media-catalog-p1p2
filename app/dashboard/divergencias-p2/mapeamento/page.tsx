'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Title {
  id: string;
  title: string;
  posterUrl: string | null;
  releaseYear: number | null;
  tvSeasons: number | null;
  tvEpisodes: number | null;
  tvStatus: string | null;
  audioType: string | null;
  hasP1: boolean;
  hasP2: boolean;
  type: string;
  internalStatus: string;
}

type TitleType = 'MOVIE' | 'TV';
type Server = 'b2p' | 'p2b';

function audioBadge(audio: string | null) {
  if (audio === 'DUBLADO_LEGENDADO') return 'bg-purple-500/20 text-purple-300';
  if (audio === 'LEGENDADO') return 'bg-blue-500/20 text-blue-300';
  return 'bg-orange-500/20 text-orange-300';
}

function audioLabel(audio: string | null) {
  if (audio === 'DUBLADO_LEGENDADO') return 'Dub+Leg';
  if (audio === 'LEGENDADO') return 'Leg';
  return 'Dub';
}

function MapeamentoContent() {
  const searchParams = useSearchParams();
  const server = (searchParams.get('server') ?? 'b2p') as Server;

  const [titleType, setTitleType] = useState<TitleType>('MOVIE');
  const [titles, setTitles] = useState<Title[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (t: TitleType, p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exclusivos?server=${server}&type=${t}&page=${p}&limit=24`);
      const data = await res.json();
      setTitles(data.titles);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [server]);

  useEffect(() => {
    fetchData(titleType, 1);
  }, [titleType, fetchData]);

  const serverLabel = server === 'b2p' ? 'B2P' : 'P2B';
  const serverColor = server === 'b2p' ? 'text-orange-300' : 'text-blue-300';
  const serverBorder = server === 'b2p' ? 'border-orange-500/30 bg-orange-500/10' : 'border-blue-500/30 bg-blue-500/10';
  const typeLabel = titleType === 'MOVIE' ? 'Filmes' : 'Séries';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {server === 'b2p' ? '🟠 Títulos no B2P sem P2B' : '🔵 Títulos no P2B sem B2P'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {server === 'b2p'
            ? 'Títulos presentes no B2P que ainda não possuem cobertura no P2B.'
            : 'Títulos presentes no P2B que ainda não possuem cobertura no B2P.'}
        </p>
      </div>

      {/* Abas Filmes / Séries */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTitleType('MOVIE')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${titleType === 'MOVIE' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
        >
          🎬 Filmes
        </button>
        <button
          onClick={() => setTitleType('TV')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${titleType === 'TV' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
        >
          📺 Séries
        </button>
      </div>

      {/* Resultados */}
      <div>
          <div className={`rounded-lg p-4 mb-6 flex items-center gap-3 border ${serverBorder}`}>
            <span className="text-2xl">{server === 'b2p' ? '🟠' : '🔵'}</span>
            <div>
              <p className={`font-semibold ${serverColor}`}>
                {loading ? '...' : `${total} ${typeLabel.toLowerCase()} exclusivos do ${serverLabel}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {server === 'b2p'
                  ? `Esses ${typeLabel.toLowerCase()} estão no B2P mas ainda não foram adicionados ao P2B`
                  : `Esses ${typeLabel.toLowerCase()} estão no P2B mas ainda não foram adicionados ao B2P`}
              </p>
            </div>
          </div>

          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-white/10 rounded-lg aspect-[2/3] mb-2" />
                  <div className="h-3 bg-white/10 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {!loading && titles.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-lg font-medium">
                Todos os {typeLabel.toLowerCase()} estão nos dois servidores!
              </p>
            </div>
          )}

          {!loading && titles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {titles.map(t => (
                <div key={t.id} className="group">
                  <div className="relative rounded-lg overflow-hidden aspect-[2/3] bg-white/5 mb-2">
                    {t.posterUrl ? (
                      <img
                        src={t.posterUrl}
                        alt={t.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center p-2">
                        Sem capa
                      </div>
                    )}
                    <span className={`absolute top-1 right-1 text-xs px-1.5 py-0.5 rounded font-medium backdrop-blur-sm ${audioBadge(t.audioType)}`}>
                      {audioLabel(t.audioType)}
                    </span>
                  </div>
                  <p className="text-xs font-medium leading-tight line-clamp-2">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.releaseYear && `${t.releaseYear} · `}
                    {t.type === 'TV' && t.tvSeasons ? `${t.tvSeasons}T/${t.tvEpisodes}ep` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}

          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => fetchData(titleType, page - 1)}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-white/10 text-sm disabled:opacity-40 hover:bg-white/5"
              >
                ← Anterior
              </button>
              <span className="px-4 py-2 text-sm text-muted-foreground">Página {page} de {pages}</span>
              <button
                onClick={() => fetchData(titleType, page + 1)}
                disabled={page === pages}
                className="px-4 py-2 rounded-lg border border-white/10 text-sm disabled:opacity-40 hover:bg-white/5"
              >
                Próxima →
              </button>
            </div>
          )}
      </div>
    </div>
  );
}

export default function MapeamentoPage() {
  return (
    <Suspense>
      <MapeamentoContent />
    </Suspense>
  );
}
