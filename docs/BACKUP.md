# Pontos de Restauracao (Tags Git)

## Como restaurar
Diga para o assistente: "Preciso restaurar para a tag NOME_DA_TAG"

## Tags disponiveis

| Tag | Descricao |
|-----|-----------|
| v-avatar-upload | Avatar upload funcionando |
| v-avatar-upload-stable | Avatar upload estavel com sidebar |
| v-login-encoding-solutions | Login com logo Encoding Solutions |
| v-layout-login-stable | Layout + login estaveis |

## Backup Automatico

- Repositorio: https://github.com/DNars25/Nars-Backup (privado)
- Frequencia: Todo dia as 6h UTC (3h Brasilia)
- Conteudo: dump completo do banco PostgreSQL
- Formato: database/backup-YYYY-MM-DD.dump

## Informacoes do projeto

- Repositorio: https://github.com/DNars25/media-catalog-p1p2
- Site: https://media-catalog-p1p2.vercel.app
- Stack: Next.js 13, TypeScript, Prisma, PostgreSQL (Neon), TailwindCSS
- Pasta local: C:projetosmedia-catalog-p1p2

## Funcionalidades implementadas

- Login com NextAuth JWT + tela Encoding Solutions
- Dashboard com contadores
- Biblioteca com 14.251 titulos
- Pedidos e Atualizacoes com paginacao
- Upload de avatar via Vercel Blob
- API /api/me para buscar avatar sem JWT
- Sidebar com logo Encoding Solutions
- Background layout aleatorio nas paginas
- Backup automatico diario do banco
