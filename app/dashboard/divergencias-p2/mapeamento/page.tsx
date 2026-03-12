'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';

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

function TitleModal({
  title,
  server,
  onClose,
  onConfirm,
  confirming,
}: {
  title: Title;
  server: Server;
  onClose: () => void;
  onConfirm: () => void;
  confirming: boolean;
}) {
  const actionLabel = server === 'b2p' ? 'Marcar como Adicionado ao P2B' : 'Marcar como Adicionado ao B2P';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-4 mb-5">
          {title.posterUrl ? (
            <img src={title.posterUrl} alt={title.title} className="w-20 h-28 object-cover rounded-lg flex-shrink-0" />
          ) : (
            <div className="w-20 h-28 bg-white/5 rounded-lg flex items-center justify-center text-muted-foreground text-xs flex-shrink-0">
              Sem capa
            </div>
          )}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-semibold text-base leading-snug">{title.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {title.releaseYear && `${title.releaseYear} · `}
              {title.type === 'TV' ? 'Série' : 'Filme'}
              {title.type === 'TV' && title.tvSeasons ? ` · ${title.tvSeasons}T/${title.tvEpisodes}ep` : ''}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${audioBadge(title.audioType)}`}>
                {audioLabel(title.audioType)}
              </span>
              {title.hasP1 && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-medium">B2P</span>}
              {title.hasP2 && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium">P2B</span>}
            </div>
          </div>
        </div>

        <button
          onClick={onConfirm}
          disabled={confirming}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
            server === 'b2p'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-orange-600 hover:bg-orange-700 text-white'
          }`}
        >
          {confirming ? 'Salvando...' : actionLabel}
        </button>
      </div>
    </div>
  );
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
  const [selected, setSelected] = useState<Title | null>(null);
  const [confirming, setConfirming] = useState(false);

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

  async function handleConfirm() {
    if (!selected) return;
    setConfirming(true);
    try {
      const action = server === 'b2p' ? 'marcar_p2b' : 'marcar_b2p';
      const res = await fetch('/api/exclusivos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, action }),
      });
      if (!res.ok) throw new Error();
      setTitles(prev => prev.filter(t => t.id !== selected.id));
      setTotal(prev => prev - 1);
      setSelected(null);
    } finally {
      setConfirming(false);
    }
  }

  const serverLabel = server === 'b2p' ? 'B2P' : 'P2B';
  const serverColor = server === 'b2p' ? 'text-orange-300' : 'text-blue-300';
  const serverBorder = server === 'b2p' ? 'border-orange-500/30 bg-orange-500/10' : 'border-blue-500/30 bg-blue-500/10';
  const typeLabel = titleType === 'MOVIE' ? 'Filmes' : 'Séries';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {selected && (
        <TitleModal
          title={selected}
          server={server}
          onClose={() => setSelected(null)}
          onConfirm={handleConfirm}
          confirming={confirming}
        />
      )}

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
              <div
                key={t.id}
                className="group cursor-pointer"
                onClick={() => setSelected(t)}
              >
                <div className="relative rounded-lg overflow-hidden aspect-[2/3] bg-white/5 mb-2 ring-0 group-hover:ring-2 group-hover:ring-primary/50 transition-all">
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
