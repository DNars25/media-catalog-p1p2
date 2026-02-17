# Media Catalog P1P2

Sistema web fullstack para catalogar filmes e séries com controle de disponibilidade em servidores P1 e P2, integração com TMDB e gerenciamento de pedidos.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma ORM** + PostgreSQL
- **NextAuth** (Credentials) com RBAC (Admin/User)
- **TailwindCSS** + shadcn/ui
- **Sonner** para notificações
- **Docker** + docker-compose para deploy

## Configuração Local

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas configurações (TMDB_API_KEY, NEXTAUTH_SECRET, etc.)
```

### 3. Banco de dados

```bash
# Rodar migrations
pnpm db:migrate

# Criar admin padrão
pnpm db:seed
```

### 4. Rodar em desenvolvimento

```bash
pnpm dev
```

Acesse http://localhost:3000

Login padrão: `admin@local` / `admin123`

## Deploy com Docker

```bash
# Copiar e editar .env
cp .env.example .env

# Subir serviços (app + postgres)
docker-compose up -d

# O seed é executado automaticamente
```

## Funcionalidades

- **Autenticação**: Login por email/senha com roles ADMIN e USER
- **Catálogo de Títulos**: CRUD de filmes e séries com importação via TMDB
- **Controle P1/P2**: Toggles para marcar disponibilidade em cada servidor
- **Pedidos**: Sistema de requests com fluxo de status e data/hora
- **Usuários**: Gestão de usuários com controle de roles (somente admin)
- **Dashboard**: Contadores e métricas do catálogo
- **Filtros e busca**: Pesquisa por título, filtros por tipo, status, P1/P2, paginação

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL de conexão PostgreSQL |
| `NEXTAUTH_SECRET` | Chave secreta para JWT |
| `NEXTAUTH_URL` | URL base da aplicação |
| `TMDB_API_KEY` | API key do The Movie Database |
| `ADMIN_EMAIL` | Email do admin criado no seed |
| `ADMIN_PASSWORD` | Senha do admin criado no seed |
| `ADMIN_NAME` | Nome do admin criado no seed |

## Estrutura do Projeto

```
/app
  /(auth)/login         - Tela de login
  /(dashboard)
    /page.tsx           - Dashboard com métricas
    /titles             - Lista e gestão de títulos
    /titles/new         - Cadastro via TMDB
    /requests           - Pedidos
    /users              - Gestão de usuários (admin)
    /settings           - Configurações (admin)
  /api
    /auth               - NextAuth
    /titles             - CRUD títulos
    /requests           - CRUD pedidos
    /users              - CRUD usuários
    /tmdb               - Proxy TMDB (search + details)
/components             - Componentes reutilizáveis
/lib                    - Utilitários (auth, db, rbac, tmdb, validators)
/prisma                 - Schema e migrations
```

## RBAC

**ADMIN**: Acesso total — CRUD títulos, usuários, gerenciamento de pedidos

**USER**: Visualizar catálogo, criar e ver pedidos

## API Endpoints

### Titles
- `GET /api/titles` — lista com filtros e paginação
- `POST /api/titles` — criar (admin)
- `PATCH /api/titles/:id` — editar (admin)
- `DELETE /api/titles/:id` — excluir (admin)

### Requests
- `GET /api/requests` — lista com filtros
- `POST /api/requests` — criar
- `PATCH /api/requests/:id` — atualizar status (admin)
- `DELETE /api/requests/:id` — excluir (admin)

### Users (admin)
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### TMDB (proxy com rate limit)
- `GET /api/tmdb/search?query=...&type=movie|tv|multi`
- `GET /api/tmdb/details?type=movie|tv&tmdbId=123`
