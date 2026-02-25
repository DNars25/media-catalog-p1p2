var fs = require('fs');
var c = fs.readFileSync('app/dashboard/atualizacoes/page.tsx', 'utf8');

var newStatusColor = `const statusColor: Record<string, string> = {
  ABERTO: "bg-yellow-600",
  EM_ANDAMENTO: "bg-blue-500",
  EM_PROGRESSO: "bg-blue-600",
  CONCLUIDO: "bg-green-600",
  REJEITADO: "bg-red-600",
};`;

var newStatusLabel = `const statusLabel: Record<string, string> = {
  ABERTO: "Aberto",
  EM_ANDAMENTO: "Em Andamento",
  EM_PROGRESSO: "Em Progresso",
  CONCLUIDO: "Concluido",
  REJEITADO: "Rejeitado",
};`;

var newModal = `function DetalheModal({ update, onClose, onStatusChange, onDelete, isAdmin, userId }: {
  update: Update;
  onClose: () => void;
  onStatusChange: (id: string, status: string, extra?: any) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
  userId: string;
}) {
  const [updating, setUpdating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [season, setSeason] = useState(1);
  const [episodes, setEpisodes] = useState(1);
  const [audio, setAudio] = useState("DUBLADO");
  const [seriesFinalizada, setSeriesFinalizada] = useState(false);
  const canEdit = isAdmin || update.createdById === userId;

  async function handleStatus(status: string) {
    setUpdating(true);
    await onStatusChange(update.id, status);
    setUpdating(false);
  }

  async function handleSaveUpdate() {
    setUpdating(true);
    const newStatus = seriesFinalizada ? "CONCLUIDO" : "ABERTO";
    const notes = "No Servidor: " + season + " temp/" + episodes + " eps. TMDB: " + (update.notes ? update.notes.split("TMDB:")[1]?.trim() || "" : "");
    await onStatusChange(update.id, newStatus, { 
      seasonNumber: season, 
      audioType: audio, 
      notes: notes,
      seriesFinalizada: seriesFinalizada,
      linkedTitleId: update.linkedTitleId
    });
    setUpdating(false);
    setShowUpdateForm(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-4 p-6">
          {update.posterUrl ? (
            <img src={update.posterUrl} alt={update.requestedTitle} className="w-24 h-36 object-cover rounded-lg flex-shrink-0" />
          ) : (
            <div className="w-24 h-36 bg-zinc-800 rounded-lg flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-lg leading-tight">{update.requestedTitle}</h2>
            <span className={"inline-block mt-2 text-white text-xs font-medium px-3 py-1 rounded-full " + (statusColor[update.status] || "bg-zinc-700")}>
              {statusLabel[update.status] || update.status}
            </span>
            <div className="mt-3 space-y-1 text-sm text-zinc-400">
              {update.seasonNumber && <p>Temporada: {update.seasonNumber}</p>}
              {update.audioType && <p>Audio: {update.audioType}</p>}
              {update.notes && <p className="text-zinc-500 text-xs mt-2">{update.notes.replace(/\[AUTO\] M3U:/g, "No Servidor:")}</p>}
              <p className="text-xs text-zinc-500 mt-2">
                {new Date(update.createdAt).toLocaleDateString("pt-BR")} por {update.createdBy.name}
              </p>
            </div>
          </div>
        </div>

        {showUpdateForm && (
          <div className="px-6 pb-4 border-t border-zinc-700 pt-4 space-y-3">
            <p className="text-sm font-semibold text-white mb-2">Registrar Atualização</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Temporada</label>
                <input type="number" min={1} value={season} onChange={e => setSeason(parseInt(e.target.value) || 1)} className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Episódios</label>
                <input type="number" min={1} value={episodes} onChange={e => setEpisodes(parseInt(e.target.value) || 1)} className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }} />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Tipo de Áudio</label>
              <div className="flex gap-2">
                {["DUBLADO","LEGENDADO","DUBLADO_LEGENDADO"].map(function(a) {
                  return (
                    <button key={a} onClick={() => setAudio(a)} className={"px-3 py-1.5 rounded-lg text-xs font-medium transition " + (audio === a ? "bg-primary text-white" : "bg-zinc-800 text-zinc-300")}>
                      {a === "DUBLADO" ? "Dub" : a === "LEGENDADO" ? "Leg" : "Dub+Leg"}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="finalizada" checked={seriesFinalizada} onChange={e => setSeriesFinalizada(e.target.checked)} className="w-4 h-4" />
              <label htmlFor="finalizada" className="text-sm text-zinc-300">Série finalizada no servidor</label>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setShowUpdateForm(false)} className="flex-1 py-2 rounded-lg text-sm text-zinc-400 border border-zinc-700">Cancelar</button>
              <button onClick={handleSaveUpdate} disabled={updating} className="flex-1 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: "#f97316" }}>Salvar</button>
            </div>
          </div>
        )}

        {canEdit && !showUpdateForm && (
          <div className="px-6 pb-4">
            <div className="flex gap-2 mb-3">
              <button onClick={() => setShowUpdateForm(true)} className="flex-1 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: "#f97316" }}>
                Registrar Atualização
              </button>
            </div>
            <p className="text-zinc-500 text-xs mb-2">Alterar status:</p>
            <div className="flex gap-2 flex-wrap">
              {["ABERTO", "EM_ANDAMENTO", "EM_PROGRESSO", "CONCLUIDO", "REJEITADO"].map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatus(s)}
                  disabled={updating || update.status === s}
                  className={"px-3 py-1.5 rounded-full text-xs font-medium transition disabled:opacity-40 " + (update.status === s ? (statusColor[s] + " text-white") : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}
                >
                  {statusLabel[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-6 pb-6 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition">
            Fechar
          </button>
          {canEdit && (
            confirmDelete ? (
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg text-xs border border-zinc-700 text-zinc-400">Cancelar</button>
                <button onClick={() => onDelete(update.id)} className="px-3 py-1.5 rounded-lg text-xs bg-red-600 text-white hover:bg-red-500">Confirmar</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-lg text-sm bg-red-600/20 text-red-400 hover:bg-red-600/40 transition">
                Excluir
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}`;

c = c.replace(/const statusColor: Record<string, string> = \{[\s\S]*?\};/, newStatusColor);
c = c.replace(/const statusLabel: Record<string, string> = \{[\s\S]*?\};/, newStatusLabel);
c = c.replace(/function DetalheModal\([\s\S]*?\n\}\n\nexport default/, newModal + '\n\nexport default');

fs.writeFileSync('app/dashboard/atualizacoes/page.tsx', c);
console.log('OK');
