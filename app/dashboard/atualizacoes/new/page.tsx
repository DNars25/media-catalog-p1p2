"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface TMDBResult {
  tmdbId: number;
  type: string;
  title: string;
  overview: string;
  posterUrl: string | null;
  releaseYear: number | null;
  number_of_seasons?: number;
  seasons?: { season_number: number; episode_count: number; name: string }[];
}

export default function NovaAtualizacaoPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [selected, setSelected] = useState<TMDBResult | null>(null);
  const [seasonNumber, setSeasonNumber] = useState<number | "">("");
  const [audioType, setAudioType] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/tmdb/search?q=" + encodeURIComponent(search) + "&type=TV");
      const d = await res.json();
      setResults(Array.isArray(d) ? d : (d.results || []));
    } catch {
      toast.error("Erro ao buscar");
    } finally {
      setSearching(false);
    }
  }

  async function handleSelect(r: TMDBResult) {
    try {
      const res = await fetch("/api/tmdb/details?tmdbId=" + r.tmdbId + "&type=TV");
      const d = await res.json();
      setSelected({ ...r, number_of_seasons: d.number_of_seasons, seasons: d.seasons });
    } catch {
      setSelected(r);
    }
    setResults([]);
    setSearch(r.title);
  }

  async function handleSubmit() {
    if (!selected) { toast.error("Selecione uma série"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedTitle: selected.title,
          type: "TV",
          tmdbId: selected.tmdbId,
          posterUrl: selected.posterUrl,
          isUpdate: true,
          seasonNumber: seasonNumber || null,
          audioType: audioType || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar");
      toast.success("Atualização solicitada!");
      router.push("/dashboard/atualizacoes");
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white transition text-sm">← Voltar</button>
        <h1 className="text-2xl font-bold text-white">Nova Atualização</h1>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        <div>
          <label className="text-zinc-400 text-sm mb-2 block">Buscar série</label>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Nome da série..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <button onClick={handleSearch} disabled={searching} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition disabled:opacity-50">
              {searching ? "..." : "Buscar"}
            </button>
          </div>
          {results.length > 0 && (
            <div className="mt-2 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
              {results.slice(0, 6).map((r) => (
                <div key={r.tmdbId} onClick={() => handleSelect(r)} className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-700 cursor-pointer transition">
                  {r.posterUrl ? <img src={r.posterUrl} alt={r.title} className="w-8 h-12 rounded object-cover" /> : <div className="w-8 h-12 bg-zinc-600 rounded" />}
                  <div>
                    <p className="text-white text-sm font-medium">{r.title}</p>
                    {r.releaseYear && <p className="text-zinc-400 text-xs">{r.releaseYear}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="flex gap-4 bg-zinc-800 rounded-lg p-3">
            {selected.posterUrl && <img src={selected.posterUrl} alt={selected.title} className="w-16 h-24 rounded-lg object-cover flex-shrink-0" />}
            <div>
              <p className="text-white font-semibold">{selected.title}</p>
              {selected.releaseYear && <p className="text-zinc-400 text-xs">{selected.releaseYear}</p>}
              {selected.number_of_seasons && <p className="text-zinc-400 text-xs">{selected.number_of_seasons} temporadas no TMDB</p>}
            </div>
          </div>
        )}

        <div>
          <label className="text-zinc-400 text-sm mb-2 block">Temporada (opcional)</label>
          {selected?.seasons && selected.seasons.length > 0 ? (
            <select
              value={seasonNumber}
              onChange={(e) => setSeasonNumber(e.target.value ? parseInt(e.target.value) : "")}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Todas as temporadas</option>
              {selected.seasons.filter(s => s.season_number > 0).map((s) => (
                <option key={s.season_number} value={s.season_number}>{s.name} ({s.episode_count} eps)</option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              value={seasonNumber}
              onChange={(e) => setSeasonNumber(e.target.value ? parseInt(e.target.value) : "")}
              placeholder="Ex: 3"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          )}
        </div>

        <div>
          <label className="text-zinc-400 text-sm mb-2 block">Tipo de áudio</label>
          <select
            value={audioType}
            onChange={(e) => setAudioType(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Selecionar...</option>
            <option value="DUBLADO">Dublado</option>
            <option value="LEGENDADO">Legendado</option>
            <option value="DUBLADO_LEGENDADO">Dublado e Legendado</option>
          </select>
        </div>

        <div>
          <label className="text-zinc-400 text-sm mb-2 block">Observações (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Episódios específicos, detalhes adicionais..."
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !selected}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Solicitar Atualização"}
        </button>
      </div>
    </div>
  );
}
