"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
interface TmdbResult { tmdbId: number; type: string; title: string; overview: string; posterUrl: string | null; releaseYear: number | null; }
interface TmdbDetails { number_of_seasons: number; number_of_episodes: number; seasons: { season_number: number; episode_count: number; name: string }[]; }
export default function NovaAtualizacaoPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TmdbResult | null>(null);
  const [details, setDetails] = useState<TmdbDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ seasonNumber: "", audioType: "Legendado", episodes: "", notes: "" });
  function handleSearch(value: string) {
    setQuery(value);
    if (!value.trim()) { setResults([]); return; }
    setSearching(true);
    fetch("/api/tmdb/search?query=" + encodeURIComponent(value) + "&type=tv")
      .then((r) => r.json())
      .then((d) => setResults(d.results || []))
      .catch(() => toast.error("Erro ao buscar"))
      .finally(() => setSearching(false));
  }
  function handleSelect(item: TmdbResult) {
    setSelected(item);
    setResults([]);
    setQuery(item.title);
    setLoadingDetails(true);
    fetch("/api/tmdb/details?type=tv&tmdbId=" + item.tmdbId)
      .then((r) => r.json())
      .then((d) => setDetails(d))
      .catch(() => toast.error("Erro ao buscar detalhes"))
      .finally(() => setLoadingDetails(false));
  }
  async function handleSalvar() {
    if (!selected) { toast.error("Selecione uma serie"); return; }
    if (!form.seasonNumber) { toast.error("Informe a temporada"); return; }
    setSaving(true);
    try {
      const notesText = [form.notes, form.episodes ? "Episodios: " + form.episodes : ""].filter(Boolean).join(" | ");
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedTitle: selected.title,
          type: "TV",
          tmdbId: selected.tmdbId,
          posterUrl: selected.posterUrl,
          isUpdate: true,
          seasonNumber: parseInt(form.seasonNumber),
          audioType: form.audioType,
          notes: notesText || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar");
      toast.success("Solicitacao de atualizacao enviada!");
      router.push("/dashboard/atualizacoes");
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Solicitar Atualizacao</h1>
        <p className="text-zinc-400 text-sm mt-1">Busque a serie e informe os detalhes da atualizacao.</p>
      </div>
      <div className="space-y-6">
        <div>
          <label className="text-zinc-300 text-sm font-medium block mb-2">Buscar Serie</label>
          <input value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="Digite o nome da serie..." className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-2.5 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-400" />
          {searching && <p className="text-zinc-500 text-xs mt-2">Buscando...</p>}
          {results.length > 0 && (
            <div className="mt-2 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
              {results.slice(0, 5).map((r) => (
                <button key={r.tmdbId} onClick={() => handleSelect(r)} className="w-full flex items-center gap-3 p-3 hover:bg-zinc-700 transition text-left border-b border-zinc-700 last:border-0">
                  {r.posterUrl ? (<img src={r.posterUrl} alt={r.title} className="w-8 h-12 object-cover rounded" />) : (<div className="w-8 h-12 bg-zinc-700 rounded" />)}
                  <div>
                    <p className="text-zinc-200 text-sm font-medium">{r.title}</p>
                    {r.releaseYear && <p className="text-zinc-500 text-xs">{r.releaseYear}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {selected && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex items-start gap-4">
            {selected.posterUrl ? (<img src={selected.posterUrl} alt={selected.title} className="w-16 rounded-lg object-cover flex-shrink-0" />) : (<div className="w-16 h-24 bg-zinc-800 rounded-lg flex-shrink-0" />)}
            <div className="flex-1">
              <p className="text-white font-bold">{selected.title}</p>
              {loadingDetails ? (<p className="text-zinc-500 text-xs mt-2 animate-pulse">Carregando detalhes...</p>) : details ? (
                <div className="mt-2 space-y-1">
                  <p className="text-zinc-400 text-xs">Total de temporadas: <span className="text-white font-semibold">{details.number_of_seasons}</span></p>
                  <p className="text-zinc-400 text-xs">Total de episodios: <span className="text-white font-semibold">{details.number_of_episodes}</span></p>
                  <div className="mt-2 space-y-0.5">
                    {details.seasons.filter((s) => s.season_number > 0).map((s) => (
                      <p key={s.season_number} className="text-zinc-500 text-xs">• {s.name}: <span className="text-zinc-300">{s.episode_count} episodios</span></p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
        {selected && (
          <div className="space-y-4">
            <div>
              <label className="text-zinc-300 text-sm font-medium block mb-2">Temporada que precisa ser atualizada</label>
              <select value={form.seasonNumber} onChange={(e) => setForm({ ...form, seasonNumber: e.target.value })} className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-zinc-400">
                <option value="">Selecione a temporada...</option>
                {details ? details.seasons.filter((s) => s.season_number > 0).map((s) => (
                  <option key={s.season_number} value={s.season_number}>{s.name} ({s.episode_count} episodios)</option>
                )) : null}
              </select>
            </div>
            <div>
              <label className="text-zinc-300 text-sm font-medium block mb-2">Tipo de audio</label>
              <select value={form.audioType} onChange={(e) => setForm({ ...form, audioType: e.target.value })} className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-zinc-400">
                <option value="Legendado">Legendado</option>
                <option value="Dublado">Dublado</option>
                <option value="Ambos">Ambos (Legendado e Dublado)</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-300 text-sm font-medium block mb-2">Episodios especificos (opcional)</label>
              <input value={form.episodes} onChange={(e) => setForm({ ...form, episodes: e.target.value })} placeholder="Ex: 1, 2, 3 ou deixe vazio para todos" className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-2.5 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-400" />
            </div>
            <div>
              <label className="text-zinc-300 text-sm font-medium block mb-2">Observacoes adicionais (opcional)</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex: Os episodios estao com legenda errada..." className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-2.5 text-zinc-200 text-sm placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-400" rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => router.push("/dashboard/atualizacoes")} className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition text-sm">Cancelar</button>
              <button onClick={handleSalvar} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition text-sm disabled:opacity-50">{saving ? "Enviando..." : "Solicitar Atualizacao"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}