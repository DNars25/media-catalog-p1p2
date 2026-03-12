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

type TitleType = 'MOVIE' | 'TV';
type Server = 'b2p' | 'p2b';
type Step = 'type' | 'server' | 'results';

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

export default function MapeamentoServidoresPage() {
  const [step, setStep] = useState<Step>('type');
  const [titleType, setTitleType] = useState<TitleType>('MOVIE');
  const [server, setServer] = useState<Server>('b2p');
  const [titles, setTitles] = useState<Title[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (s: Server, t: TitleType, p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exclusivos?server=${s}&type=${t}&page=${p}&limit=24`);
      const data = await res.json();
      setTitles(data.titles);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 'results') {
      fetchData(server, titleType, 1);
    }
  }, [step, server, titleType, fetchData]);

  function handleTypeSelect(t: TitleType) {
    setTitleType(t);
    setStep('server');
  }

  function handleServerSelect(s: Server) {
    setServer(s);
    setStep('results');
  }

  function goBack() {
    if (step === 'results') setStep('server');
    else if (step === 'server') setStep('type');
  }

  const typeLabel = titleType === 'MOVIE' ? 'Filmes' : 'Séries';
  const serverLabel = server === 'b2p' ? 'B2P' : 'P2B';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Mapeamento de Servidores</h1>
        <p className="text-muted-foreground mt-1">
          Compare a cobertura entre B2P e P2B — identifique títulos exclusivos de cada servidor.
        </p>
      </div>

      {/* Breadcrumb / progresso */}
      {step !== 'type' && (
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <button onClick={() => setStep('type')} className="hover:text-foreground transition-colors">
            Tipo
          </button>
          <span>›</span>
          <span className={step === 'server' ? 'text-foreground font-medium' : 'hover:text-foreground transition-colors cursor-pointer'} onClick={() => step === 'results' ? setStep('server') : undefined}>
            {typeLabel}
          </span>
          {step === 'results' && (
            <>
              <span>›</span>
              <span className="text-foreground font-medium">
                {server === 'b2p' ? 'Só no B2P' : 'Só no P2B'}
              </span>
            </>
          )}
        </div>
      )}

      {/* Passo 1 — escolher tipo */}
      {step === 'type' && (
        <div>
          <p className="text-sm text-muted-foreground mb-5 font-medium uppercase tracking-wider">Passo 1 — Selecione o tipo de conteúdo</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleTypeSelect('MOVIE')}
              className="group relative flex flex-col items-start gap-3 p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-orange-500/50 transition-all text-left"
            >
              <span className="text-4xl">🎬</span>
              <div>
                <p className="text-lg font-semibold">Filmes</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Analise a cobertura de filmes entre os dois servidores e identifique lacunas no catálogo.
                </p>
              </div>
              <span className="absolute top-4 right-4 text-muted-foreground group-hover:text-foreground transition-colors">→</span>
            </button>
            <button
              onClick={() => handleTypeSelect('TV')}
              className="group relative flex flex-col items-start gap-3 p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-500/50 transition-all text-left"
            >
              <span className="text-4xl">📺</span>
              <div>
                <p className="text-lg font-semibold">Séries</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Analise a cobertura de séries e temporadas entre os dois servidores.
                </p>
              </div>
              <span className="absolute top-4 right-4 text-muted-foreground group-hover:text-foreground transition-colors">→</span>
            </button>
          </div>
        </div>
      )}

      {/* Passo 2 — escolher servidor */}
      {step === 'server' && (
        <div>
          <p className="text-sm text-muted-foreground mb-5 font-medium uppercase tracking-wider">Passo 2 — Selecione o filtro de servidor</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleServerSelect('b2p')}
              className="group relative flex flex-col items-start gap-3 p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-orange-500/50 transition-all text-left"
            >
              <span className="text-3xl">🟠</span>
              <div>
                <p className="text-lg font-semibold">{typeLabel} no B2P sem cobertura no P2B</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Lista {typeLabel.toLowerCase()} que estão catalogados no B2P mas ainda não possuem correspondência no P2B. Útil para planejar expansão de catálogo.
                </p>
              </div>
              <span className="absolute top-4 right-4 text-muted-foreground group-hover:text-foreground transition-colors">→</span>
            </button>
            <button
              onClick={() => handleServerSelect('p2b')}
              className="group relative flex flex-col items-start gap-3 p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-500/50 transition-all text-left"
            >
              <span className="text-3xl">🔵</span>
              <div>
                <p className="text-lg font-semibold">{typeLabel} no P2B sem cobertura no B2P</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Lista {typeLabel.toLowerCase()} que estão catalogados no P2B mas ainda não possuem correspondência no B2P. Útil para identificar conteúdo a importar.
                </p>
              </div>
              <span className="absolute top-4 right-4 text-muted-foreground group-hover:text-foreground transition-colors">→</span>
            </button>
          </div>
        </div>
      )}

      {/* Passo 3 — resultados */}
      {step === 'results' && (
        <div>
          {/* Banner resumo */}
          <div className={`rounded-lg p-4 mb-6 flex items-center gap-3 ${
            server === 'b2p' ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-blue-500/10 border border-blue-500/30'
          }`}>
            <span className="text-2xl">{server === 'b2p' ? '🟠' : '🔵'}</span>
            <div>
              <p className={`font-semibold ${server === 'b2p' ? 'text-orange-300' : 'text-blue-300'}`}>
                {loading ? '...' : `${total} ${typeLabel.toLowerCase()} exclusivos do ${serverLabel}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {server === 'b2p'
                  ? `Esses ${typeLabel.toLowerCase()} estão no B2P mas ainda não foram adicionados ao P2B`
                  : `Esses ${typeLabel.toLowerCase()} estão no P2B mas ainda não foram adicionados ao B2P`}
              </p>
            </div>
          </div>

          {/* Loading skeleton */}
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

          {/* Vazio */}
          {!loading && titles.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-lg font-medium">
                Todos os {typeLabel.toLowerCase()} estão nos dois servidores!
              </p>
            </div>
          )}

          {/* Grid */}
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

          {/* Paginação */}
          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => fetchData(server, titleType, page - 1)}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-white/10 text-sm disabled:opacity-40 hover:bg-white/5"
              >
                ← Anterior
              </button>
              <span className="px-4 py-2 text-sm text-muted-foreground">
                Página {page} de {pages}
              </span>
              <button
                onClick={() => fetchData(server, titleType, page + 1)}
                disabled={page === pages}
                className="px-4 py-2 rounded-lg border border-white/10 text-sm disabled:opacity-40 hover:bg-white/5"
              >
                Próxima →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
