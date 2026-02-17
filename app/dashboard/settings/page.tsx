export default function SettingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Configurações</h1>
      <p className="text-muted-foreground">Configurações do sistema</p>

      <div className="mt-8 bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-2">Sobre</h2>
        <p className="text-sm text-muted-foreground">Media Catalog P1P2 — sistema para catalogar filmes e séries com controle de disponibilidade em servidores P1 e P2.</p>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-xs mb-1">Stack</p>
            <p className="font-medium">Next.js 14 + Prisma + PostgreSQL</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-xs mb-1">UI</p>
            <p className="font-medium">Tailwind CSS + shadcn/ui</p>
          </div>
        </div>
      </div>
    </div>
  )
}
