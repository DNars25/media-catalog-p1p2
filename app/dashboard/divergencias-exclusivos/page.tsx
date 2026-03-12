'use client';

import { useEffect, useState, useCallback } from 'react';

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

type Server = 'b2p' | 'p2b';
type TitleType = 'MOVIE' | 'TV';

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

export default function ExclusivosPage() {
  const [server, setServer] = useState<Server>('b2p');
  const [titleType, setTitleType] = useState<TitleType>('MOVIE');
  const [titles, setTitles] = useState<Title[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (s: Server, t: TitleType, p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exclusivos?server=${s}&type=${t}&page=${p}&limit=24`);
      const data = await res.json();
      setTitles(data.titles);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
    } catch {
      console.error('Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(server, titleType, 1);
  }, [server, titleType, fetchData]);

  function handleServerChange(s: Server) {
    setServer(s);
    setPage(1);
  }

  function handleTypeChange(t: TitleType) {
    setTitleType(t);
    setPage(1);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exclusivos por Servidor</h1>
        <p className="text-gray-500 mt-1">
          Títulos que existem em apenas um dos servidores
        </p>
      </div>

      {/* Abas servidor */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleServerChange('b2p')}
          className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            server === 'b2p'
              ? 'bg-orange-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🟠 Só B2P
        </button>
        <button
          onClick={() => handleServerChange('p2b')}
          className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            server === 'p2b'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🔵 Só P2B
        </button>
      </div>

      {/* Abas tipo */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => handleTypeChange('MOVIE')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            titleType === 'MOVIE'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🎬 Filmes
        </button>
        <button
          onClick={() => handleTypeChange('TV')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            titleType === 'TV'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📺 Séries
        </button>
      </div>

      {/* Contador */}
      <div className={`rounded-lg p-4 mb-6 flex items-center gap-3 ${
        server === 'b2p' ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'
      }`}>
        <span className="text-2xl">{server === 'b2p' ? '🟠' : '🔵'}</span>
        <div>
          <p className={`font-semibold ${server === 'b2p' ? 'text-orange-800' : 'text-blue-800'}`}>
            {total} {titleType === 'MOVIE' ? 'filmes' : 'séries'} exclusivos do {server === 'b2p' ? 'B2P' : 'P2B'}
          </p>
          <p className={`text-sm ${server === 'b2p' ? 'text-orange-600' : 'text-blue-600'}`}>
            {server === 'b2p'
              ? 'Esses títulos estão no B2P mas ainda não foram adicionados ao P2B'
              : 'Esses títulos estão no P2B mas ainda não foram adicionados ao B2P'}
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg aspect-[2/3] mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Vazio */}
      {!loading && titles.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-lg font-medium">
            Todos os {titleType === 'MOVIE' ? 'filmes' : 'séries'} estão nos dois servidores!
          </p>
        </div>
      )}

      {/* Grid de cards */}
      {!loading && titles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {titles.map(t => (
            <div key={t.id} className="group">
              <div className="relative rounded-lg overflow-hidden aspect-[2/3] bg-gray-100 mb-2">
                {t.posterUrl ? (
                  <img
                    src={t.posterUrl}
                    alt={t.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center p-2">
                    Sem capa
                  </div>
                )}
                {/* Badge áudio */}
                <span className={`absolute top-1 right-1 text-xs px-1.5 py-0.5 rounded font-medium backdrop-blur-sm ${audioBadge(t.audioType)}`}>
                  {audioLabel(t.audioType)}
                </span>
              </div>
              <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2">{t.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {t.releaseYear && `${t.releaseYear} · `}
                {t.type === 'TV' && t.tvSeasons ? `${t.tvSeasons}T/${t.tvEpisodes}ep` : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => fetchData(server, titleType, page - 1)}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            ← Anterior
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Página {page} de {pages}
          </span>
          <button
            onClick={() => fetchData(server, titleType, page + 1)}
            disabled={page === pages}
            className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
