"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface TmdbItem {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  overview: string;
  type: string;
}

function CadastroModal({ item, onClose, onSuccess }: { item: TmdbItem; onClose: () => void; onSuccess: () => void; }) {
  const [loading, setLoading] = useState(false);
  const [p1, setP1] = useState(false);
  const [p2, setP2] = useState(false);

  async function handleCadastrar() {
    setLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedTitle: item.title,
          type: "MOVIE",
          tmdbId: item.tmdbId,
          posterUrl: item.posterPath,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao cadastrar");
      toast.success(`"${item.title}" cadastrado com sucesso!`);
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
        <div className="flex items-start gap-4 p-5 border-b border-zinc-700">
          {item.posterPath ? (
            <img src={item.posterPath} alt={item.title} className="w-20 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-28 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-600 text-xs flex-shrink-0">Sem capa</div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-white text-lg leading-tight">{item.title}</h2>
            {item.releaseDate && <p className="text-zinc-400 text-sm mt-1">{new Date(item.releaseDate).toLocaleDateString("pt-BR")}</p>}
            <p className="text-zinc-500 text-xs mt-2 line-clamp-3">{item.overview || "Sem descrição disponível."}</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-zinc-300 text-sm font-medium">Disponível em:</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={p1} onChange={(e) => setP1(e.target.checked)} className="w-4 h-4 accent-blue-500" />
            <span className="text-zinc-200 text-sm">Servidor P1</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={p2} onChange={(e) => setP2(e.target.checked)} className="w-4 h-4 accent-purple-500" />
            <span className="text-zinc-200 text-sm">Servidor P2</span>
          </label>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition text-sm">Cancelar</button>
          <button onClick={handleCadastrar} disabled={loading} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition text-sm disabled:opacity-50">{loading ? "Cadastrando..." : "Cadastrar"}</button>
        </div>
      </div>
    </div>
  );
}

function MovieCard({ item, onClick }: { item: TmdbItem; onClick: (item: TmdbItem) => void; }) {
  return (
    <button onClick={() => onClick(item)} className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 hover:shadow-lg transition-all duration-200 text-left">
      <div className="aspect-[2/3] bg-zinc-800 relative overflow-hidden">
        {item.posterPath ? (
          <img src={item.posterPath} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">Sem capa</div>
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">+ Cadastrar</span>
        </div>
      </div>
      <div className="p-2">
        <p className="text-zinc-200 text-xs font-medium leading-tight line-clamp-2">{item.title}</p>
        {item.releaseDate && <p className="text-zinc-500 text-xs mt-0.5">{new Date(item.releaseDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</p>}
      </div>
    </button>
  );
}

function Section({ title, items, loading, onCardClick }: { title: string; items: TmdbItem[]; loading: boolean; onCardClick: (item: TmdbItem) => void; }) {
  return (
    <div className="mb-10">
      <h2 className="text-white text-xl font-semibold mb-4">{title}</h2>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[2/3] bg-zinc-800 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-zinc-500 text-sm">Nenhum resultado encontrado.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {items.map((item) => <MovieCard key={item.tmdbId} item={item} onClick={onCardClick} />)}
        </div>
      )}
    </div>
  );
}

export default function FilmesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [nowPlaying, setNowPlaying] = useState<TmdbItem[]>([]);
  const [upcoming, setUpcoming] = useState<TmdbItem[]>([]);
  const [loadingNow, setLoadingNow] = useState(true);
  const [loadingUp, setLoadingUp] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TmdbItem | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/tmdb/discover?type=movie&section=now_playing")
      .then((r) => r.json())
      .then((d) => setNowPlaying(d.results || []))
      .catch(() => toast.error("Erro ao carregar filmes em cartaz"))
      .finally(() => setLoadingNow(false));
  }, []);

  useEffect(() => {
    fetch("/api/tmdb/discover?type=movie&section=upcoming")
      .then((r) => r.json())
      .then((d) => setUpcoming(d.results || []))
      .catch(() => toast.error("Erro ao carregar próximas estreias"))
      .finally(() => setLoadingUp(false));
  }, []);

  if (status === "loading") return <div className="flex items-center justify-center h-64"><span className="text-zinc-400">Carregando...</span></div>;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">🎬 Filmes</h1>
        <p className="text-zinc-400 text-sm mt-1">Clique em qualquer card para solicitar o filme via pedidos.</p>
      </div>
      <Section title="🎥 Em Cartaz Hoje" items={nowPlaying} loading={loadingNow} onCardClick={setSelectedItem} />
      <Section title="🚀 Próximas Estreias" items={upcoming} loading={loadingUp} onCardClick={setSelectedItem} />
      {selectedItem && <CadastroModal item={selectedItem} onClose={() => setSelectedItem(null)} onSuccess={() => setSelectedItem(null)} />}
    </div>
  );
}
