# CLAUDE.md

## Project Overview

Garage Web UI is an admin dashboard for [Garage](https://garagehq.deuxfleurs.fr/), a self-hosted S3-compatible distributed object storage service. It has a React/TypeScript frontend and a Go backend. The backend proxies Garage's admin API and serves the frontend as a single binary.

## Tech Stack

**Frontend:** React 18 + TypeScript, Vite (SWC), Tailwind CSS + DaisyUI, TanStack React Query, Zustand, React Router, React Hook Form + Zod

**Backend:** Go 1.23, stdlib net/http, AWS SDK v2 (S3 operations), embedded frontend assets in production

## Commands

### Frontend
- `pnpm install` — install dependencies (uses pnpm, not npm/yarn)
- `pnpm run build` — typecheck with `tsc -b` then Vite production build
- `pnpm run lint` — ESLint across all TS/TSX files
- `pnpm run dev:client` — Vite dev server (port 5173, proxies `/api` to backend)

### Backend
- `cd backend && go build -o main -tags="prod" main.go` — build (CGO_ENABLED=0 for static binary)
- `cd backend && go run main.go` — run in development
- `cd backend && air` — hot-reload dev server (requires Air)

### Full Stack
- `pnpm run dev` — runs both frontend and backend dev servers via concurrently

### Docker
- `docker compose up` — runs Garage + WebUI together

## Project Structure

```
src/                    # Frontend
  app/                  # App root, router, themes, global styles
  pages/                # Route pages (auth, home, cluster, buckets, keys)
    buckets/manage/     # Bucket detail tabs (overview, browse, permissions)
  components/           # Reusable components
    layouts/            # MainLayout, AuthLayout
    ui/                 # Button, Input, Toggle, etc.
  hooks/                # useAuth, useConfig, useDebounce, useDisclosure
  stores/               # Zustand store (app-store.ts — theme state)
  context/              # React Context (page-context.tsx — page title/actions)
  types/                # TypeScript types (garage.ts)
  lib/                  # Utilities (api.ts, utils.ts, consts.ts)
backend/                # Go backend
  router/               # HTTP handlers (auth, buckets, browse, config, proxy)
  middleware/            # Auth middleware with session management
  schema/               # Go request/response structs
  utils/                # Garage API client, session, cache, image processing
  ui/                   # Static asset serving (ui.go dev, ui_prod.go prod)
```

## Code Conventions

### Frontend
- **Components:** PascalCase filenames (`BucketCard.tsx`), component name matches filename
- **Utilities/hooks:** kebab-case filenames (`app-store.ts`, `page-context.tsx`)
- **Imports:** use `@/` path alias for `src/` directory
- **State:** React Query for server state, Zustand for global app state (theme), React Context for scoped state (page metadata)
- **Forms:** Zod schemas for validation, integrated with React Hook Form
- **API calls:** custom `api` wrapper in `src/lib/api.ts`; 401 responses redirect to login
- **Pages:** lazy-loaded via React Router with `lazy()` + `Suspense`
- **Styling:** Tailwind utility classes + DaisyUI component classes; use `cn()` from `src/lib/utils.ts` for class merging

### Backend
- **Routing:** handler structs with methods, registered on `http.ServeMux`
- **Concurrency:** goroutines + channels for parallel Garage API calls (e.g., bucket listing)
- **Config:** loads from `garage.toml` (TOML), overridable via env vars
- **Auth:** optional, enabled via `AUTH_USER_PASS` env var with bcrypt hashing

## TypeScript Config

- Strict mode enabled (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- Target: ES2020
- JSX: react-jsx

## Linting

- ESLint 9 flat config (`eslint.config.js`)
- Extends: `@eslint/js` recommended + `typescript-eslint` recommended
- Plugins: `react-hooks` (recommended rules), `react-refresh` (warns on non-component exports)
- Scope: `**/*.{ts,tsx}`, ignores `dist/`

## Testing

No test framework is configured. There are no unit or integration tests.

## Environment Variables

**Frontend** (`.env`): `VITE_API_URL` — backend URL for dev proxy (default: `http://localhost:3909`)

**Backend** (`.env` or system): `CONFIG_PATH`, `BASE_PATH`, `API_BASE_URL`, `API_ADMIN_KEY`, `S3_REGION`, `S3_ENDPOINT_URL`, `AUTH_USER_PASS`, `HOST`, `PORT`
