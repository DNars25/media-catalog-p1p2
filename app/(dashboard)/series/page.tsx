"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
interface TmdbItem { tmdbId: number; title: string; posterPath: string | null; releaseDate: string | null; overview: string; type: string; }
interface TmdbDetails { number_of_seasons: number; number_of_episodes: number; seasons: { season_number: number; episode_count: number; name: string }[]; }
function CadastroModal({ item, onClose, onSuccess }: { item: TmdbItem; onClose: () => void; onSuccess: () => void; }) {
  const [aba, setAba] = useState<"pedido" | "atualizacao">("pedido");
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [details, setDetails] = useState<TmdbDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  useEffect(() => {
    if (aba === "atualizacao" && !details) {
      setLoadingDetails(true);
      fetch("/api/tmdb/details?type=tv&tmdbId=" + item.tmdbId)
        .then((r) => r.json())
        .then((d) => setDetails(d))
        .catch(() => toast.error("Erro ao buscar detalhes"))
        .finally(() => setLoadingDetails(false));
    }
  }, [aba]);
  async function handleEnviar() {
    setLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedTitle: item.title,
          type: "TV",
          tmdbId: item.tmdbId,
          posterUrl: item.posterPath,
          notes: aba === "atualizacao" ? ("[ATUALIZACAO] " + notes).trim() : (notes || null),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar");
      toast.success("Pedido enviado com sucesso!");
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
          {item.posterPath ? (<img src={item.posterPath} alt={item.title} className="w-20 rounded-lg object-cover flex-shrink-0" />) : (<div className="w-20 h-28 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-600 text-xs flex-shrink-0">Sem capa</div>)}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-white text-lg leading-tight">{item.title}</h2>
            {item.releaseDate && <p className="text-zinc-400 text-sm mt-1">{new Date(item.releaseDate).toLocaleDateString("pt-BR")}</p>}
            <p className="text-zinc-500 text-xs mt-2 line-clamp-2">{item.overview || "Sem descricao."}</p>
          </div>
        </div>
        <div className="flex border-b border-zinc-700">
          <button onClick={() => setAba("pedido")} className={"flex-1 py-2.5 text-sm font-medium transition " + (aba === "pedido" ? "text-purple-400 border-b-2 border-purple-400 bg-zinc-800" : "text-zinc-400 hover:text-zinc-200")}>
            Novo Pedido
          </button>
          <button onClick={() => setAba("atualizacao")} className={"flex-1 py-2.5 text-sm font-medium transition " + (aba === "atualizacao" ? "text-blue-400 border-b-2 border-blue-400 bg-zinc-800" : "text-zinc-400 hover:text-zinc-200")}>
            Solicitar Atualizacao
          </button>
        </div>
        <div className="p-5 space-y-4">
          {aba === "atualizacao" && (
            <div className="bg-zinc-800 rounded-xl p-4 text-sm space-y-2">
              {loadingDetails ? (<p className="text-zinc-400 animate-pulse">Buscando informacoes no TMDB...</p>) : details ? (
                <div>
                  <p className="text-zinc-300 font-medium mb-2">Informacoes da Serie</p>
                  <p className="text-zinc-400">Temporadas: <span className="text-white font-semibold">{details.number_of_seasons}</span></p>
                  <p className="text-zinc-400">Total de episodios: <span className="text-white font-semibold">{details.number_of_episodes}</span></p>
                  <div className="mt-2 space-y-1">
                    {details.seasons.filter((s) => s.season_number > 0).map((s) => (
                      <p key={s.season_number} className="text-zinc-500 text-xs">• {s.name}: <span className="text-zinc-300">{s.episode_count} episodios</span></p>
                    ))}
                  </div>
                </div>
              ) : (<p className="text-zinc-500">Informacoes nao disponiveis.</p>)}
            </div>
          )}
          <div>
            <label className="text-zinc-300 text-sm font-medium block mb-2">Observacoes (opcional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={aba === "atualizacao" ? "Ex: Preciso da temporada 3 completa..." : "Ex: Prefiro dublado..."} className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 text-sm placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-400" rows={3} />
          </div>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition text-sm">Cancelar</button>
          <button onClick={handleEnviar} disabled={loading} className={"flex-1 px-4 py-2 rounded-lg text-white font-medium transition text-sm disabled:opacity-50 " + (aba === "atualizacao" ? "bg-blue-600 hover:bg-blue-500" : "bg-purple-600 hover:bg-purple-500")}>
            {loading ? "Enviando..." : aba === "atualizacao" ? "Solicitar Atualizacao" : "Novo Pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
function SeriesCard({ item, onClick }: { item: TmdbItem; onClick: (item: TmdbItem) => void; }) {
  return (
    <button onClick={() => onClick(item)} className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 hover:shadow-lg transition-all duration-200 text-left">
      <div className="aspect-[2/3] bg-zinc-800 relative overflow-hidden">
        {item.posterPath ? (<img src={item.posterPath} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />) : (<div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">Sem capa</div>)}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <span className="bg-purple-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">+ Pedido</span>
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
      {loading ? (<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[2/3] bg-zinc-800 rounded-xl animate-pulse" />)}</div>)
      : items.length === 0 ? (<p className="text-zinc-500 text-sm">Nenhum resultado encontrado.</p>)
      : (<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">{items.map((item) => <SeriesCard key={item.tmdbId} item={item} onClick={onCardClick} />)}</div>)}
    </div>
  );
}
export default function SeriesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [onTheAir, setOnTheAir] = useState<TmdbItem[]>([]);
  const [popular, setPopular] = useState<TmdbItem[]>([]);
  const [loadingAir, setLoadingAir] = useState(true);
  const [loadingPop, setLoadingPop] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TmdbItem | null>(null);
  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => { fetch("/api/tmdb/discover?type=tv&section=on_the_air").then((r) => r.json()).then((d) => setOnTheAir(d.results || [])).catch(() => toast.error("Erro ao carregar series em exibicao")).finally(() => setLoadingAir(false)); }, []);
  useEffect(() => { fetch("/api/tmdb/discover?type=tv&section=popular").then((r) => r.json()).then((d) => setPopular(d.results || [])).catch(() => toast.error("Erro ao carregar series populares")).finally(() => setLoadingPop(false)); }, []);
  if (status === "loading") return <div className="flex items-center justify-center h-64"><span className="text-zinc-400">Carregando...</span></div>;
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Series</h1>
        <p className="text-zinc-400 text-sm mt-1">Clique em qualquer card para solicitar ou pedir atualizacao de uma serie.</p>
      </div>
      <Section title="Em Exibicao Hoje" items={onTheAir} loading={loadingAir} onCardClick={setSelectedItem} />
      <Section title="Series Populares" items={popular} loading={loadingPop} onCardClick={setSelectedItem} />
      {selectedItem && <CadastroModal item={selectedItem} onClose={() => setSelectedItem(null)} onSuccess={() => setSelectedItem(null)} />}
    </div>
  );
}