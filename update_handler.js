var fs = require('fs');
var c = fs.readFileSync('app/dashboard/atualizacoes/page.tsx', 'utf8');

var oldHandler = `  async function handleStatusChange(id: string, status: string) {
    try {
      const res = await fetch("/api/requests/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      toast.success("Status atualizado!");
      fetchUpdates();
      setSelected(null);
    } catch (err: any) { toast.error(err.message || "Erro inesperado"); }
  }`;

var newHandler = `  async function handleStatusChange(id: string, status: string, extra?: any) {
    try {
      const body: any = { status };
      if (extra) {
        if (extra.seasonNumber) body.seasonNumber = extra.seasonNumber;
        if (extra.audioType) body.audioType = extra.audioType;
        if (extra.notes) body.notes = extra.notes;
      }
      const res = await fetch("/api/requests/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      if (extra && extra.seriesFinalizada && extra.linkedTitleId) {
        await fetch("/api/titles/" + extra.linkedTitleId, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tvStatus: "FINALIZADA" }),
        });
        toast.success("Serie finalizada e biblioteca atualizada!");
      } else {
        toast.success("Atualizado com sucesso!");
      }
      fetchUpdates();
      setSelected(null);
    } catch (err: any) { toast.error(err.message || "Erro inesperado"); }
  }`;

c = c.replace(oldHandler, newHandler);
fs.writeFileSync('app/dashboard/atualizacoes/page.tsx', c);
console.log('OK');
