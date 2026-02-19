"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// ─── Tipos ───────────────────────────────────────────────
interface TmdbItem {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  overview: string;
  type: string;
}

// ─── Modal de cadastro ────────────────────────────────────
function CadastroModal({
  item,
  onClose,
  onSuccess,
}: {
  item: TmdbItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [p1, setP1] = useState(false);
  const [p2, setP2] = useState(false);

  async function handleCadastrar() {
    setLoading(true);
    try {
      // Busca detalhes completos no TMDB antes de salvar
      const detailsRes = await fetch(
        `/api/tmdb/details?type=tv&tmdbId=${item.tmdbId}`
      );
      const details = await detailsRes.json();

      if (!detailsRes.ok) {
        throw new Error(details.error || "Erro ao buscar detalhes");
      }

      // Cadastra no sistema
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: item.tmdbId,
          title: item.title,
          type: "TV",
          posterPath: item.posterPath,
          overview: item.overview,
          releaseDate: item.releaseDate,
          availableP1: p1,
          availableP2: p2,
          ...details,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao cadastrar");
      }

      toast.success(`"${item.title}" cadastrada com sucesso!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header do modal */}
        <div className="flex items-start gap-4 p-5 border-b border-zinc-700">
          {item.posterPath ? (
            <img
              src={item.posterPath}
              alt={item.title}
              className="w-20 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-28 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-600 text-xs text-center flex-shrink-0">
              Sem capa
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-white text-lg leading-tight">
              {item.title}
            </h2>
            {item.releaseDate && (
              <p className="text-zinc-400 text-sm mt-1">
                {new Date(item.releaseDate).toLocaleDateString("pt-BR")}
              </p>
            )}
            <p className="text-zinc-500 text-xs mt-2 line-clamp-3">
              {item.overview || "Sem descrição disponível."}
            </p>
          </div>
        </div>

        {/* Opções de disponibilidade */}
        <div className="p-5 space-y-3">
          <p className="text-zinc-300 text-sm font-medium">Disponível em:</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={p1}
              onChange={(e) => setP1(e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
            <span className="text-zinc-200 text-sm">Servidor P1</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={p2}
              onChange={(e) => setP2(e.target.checked)}
              className="w-4 h-4 accent-purple-500"
            />
            <span className="text-zinc-200 text-sm">Servidor P2</span>
          </label>
        </div>

        {/* Botões */}
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleCadastrar}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition text-sm disabled:opacity-50"
          >
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de série ────────────────────────────────────────
function SeriesCard({
  item,
  onClick,
}: {
  item: TmdbItem;
  onClick: (item: TmdbItem) => void;
}) {
  return (
    <button
      onClick={() => onClick(item)}
      className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 hover:shadow-lg hover:shadow-black/40 transition-all duration-200 text-left"
    >
      <div className="aspect-[2/3] bg-zinc-800 relative overflow-hidden">
        {item.posterPath ? (
          <img
            src={item.posterPath}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
            Sem capa
          </div>
        )}
        {/* Overlay ao hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <span className="bg-purple-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            + Cadastrar
          </span>
        </div>
      </div>
      <div className="p-2">
        <p className="text-zinc-200 text-xs font-medium leading-tight line-clamp-2">
          {item.title}
        </p>
        {item.releaseDate && (
          <p className="text-zinc-500 text-xs mt-0.5">
            {new Date(item.releaseDate).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Seção de cards ───────────────────────────────────────
function Section({
  title,
  items,
  loading,
  onCardClick,
}: {
  title: string;
  items: TmdbItem[];
  loading: boolean;
  onCardClick: (item: TmdbItem) => void;
}) {
  return (
    <div className="mb-10">
      <h2 className="text-white text-xl font-semibold mb-4">{title}</h2>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] bg-zinc-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-zinc-500 text-sm">Nenhum resultado encontrado.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {items.map((item) => (
            <SeriesCard key={item.tmdbId} item={item} onClick={onCardClick} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────
export default function SeriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [onTheAir, setOnTheAir] = useState<TmdbItem[]>([]);
  const [popular, setPopular] = useState<TmdbItem[]>([]);
  const [loadingAir, setLoadingAir] = useState(true);
  const [loadingPop, setLoadingPop] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TmdbItem | null>(null);

  // Redireciona se não autenticado
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Busca "Em Exibição Hoje"
  useEffect(() => {
    fetch("/api/tmdb/discover?type=tv&section=on_the_air")
      .then((r) => r.json())
      .then((d) => setOnTheAir(d.results || []))
      .catch(() => toast.error("Erro ao carregar séries em exibição"))
      .finally(() => setLoadingAir(false));
  }, []);

  // Busca "Séries Populares"
  useEffect(() => {
    fetch("/api/tmdb/discover?type=tv&section=popular")
      .then((r) => r.json())
      .then((d) => setPopular(d.results || []))
      .catch(() => toast.error("Erro ao carregar séries populares"))
      .finally(() => setLoadingPop(false));
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-zinc-400">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">📺 Séries</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Clique em qualquer card para cadastrar a série no sistema.
        </p>
      </div>

      {/* Seções */}
      <Section
        title="📡 Em Exibição Hoje"
        items={onTheAir}
        loading={loadingAir}
        onCardClick={setSelectedItem}
      />
      <Section
        title="🔥 Séries Populares"
        items={popular}
        loading={loadingPop}
        onCardClick={setSelectedItem}
      />

      {/* Modal */}
      {selectedItem && (
        <CadastroModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSuccess={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
