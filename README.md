# ccdev

Multi-tenant web terminal with Cloudflare Sandbox SDK integration.

## Overview

ccdev provides isolated cloud development environments with:
- **Web Terminal** - Full terminal access via xterm.js
- **AI Chat** - Claude-powered development assistant
- **Project Management** - Multi-project support with isolated sandboxes
- **Admin Panel** - User, project, and permission management

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Cloudflare Worker  │────▶│  Cloudflare D1  │
│   (React/Vite)  │     │   (Hono API)         │     │  (SQLite)       │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │  Cloudflare Sandbox  │
                        │  (Durable Objects)   │
                        └──────────────────────┘
```

## Tech Stack

### Frontend (`apps/web`)
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Zustand (state management)
- xterm.js (terminal emulator)
- react-router-dom (routing)

### Backend (`apps/worker`)
- Cloudflare Workers
- Hono (web framework)
- D1 (SQLite database)
- Durable Objects (sandbox sessions)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Cloudflare account with Workers access

### Installation

```bash
# Clone and install dependencies
git clone <repo-url>
cd claude-dev
pnpm install
```

### Development

```bash
# Start both frontend and worker in dev mode
pnpm dev

# Or start individually
pnpm --filter @ccdev/web dev      # Frontend on http://localhost:5173
pnpm --filter @ccdev/worker dev   # Worker on http://localhost:8787
```

### Environment Setup

1. Copy environment template:
```bash
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
```

2. Configure Cloudflare Access (optional for production):
```toml
# apps/worker/wrangler.toml
[vars]
CF_ACCESS_TEAM_DOMAIN = "https://your-team.cloudflareaccess.com"
CF_ACCESS_POLICY_AUD = "your-policy-aud"
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/dev-login` | Development login (dev only) |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/sessions` | List sessions |
| POST | `/api/projects/:id/sessions` | Create session |
| DELETE | `/api/sessions/:id` | End session |

### Admin (requires admin role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | System statistics |
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/projects` | List all projects |
| GET | `/api/admin/permissions` | List permissions |
| POST | `/api/admin/permissions` | Create permission |
| DELETE | `/api/admin/permissions/:id` | Delete permission |

## Authentication

### Cloudflare Access (Production)

In production, authentication is handled by Cloudflare Access:

1. User accesses the app
2. Cloudflare Access intercepts and authenticates
3. `Cf-Access-Jwt-Assertion` header is added to requests
4. Worker validates JWT and creates/retrieves user

### Development Login

For local development, use the dev-login endpoint:

```bash
curl -X POST http://localhost:8787/api/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com"}'
```

## Deployment

### Worker

```bash
cd apps/worker
pnpm run deploy
```

### Frontend (Cloudflare Pages)

```bash
cd apps/web
pnpm run build
# Deploy dist/ to Cloudflare Pages
```

## Project Structure

```
claude-dev/
├── apps/
│   ├── web/                    # Frontend application
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   │   ├── Admin/      # Admin panel components
│   │   │   │   ├── Auth/       # Authentication components
│   │   │   │   ├── Chat/       # AI chat interface
│   │   │   │   ├── Project/    # Project management
│   │   │   │   ├── Sidebar/    # Navigation sidebar
│   │   │   │   └── Terminal/   # Terminal emulator
│   │   │   ├── pages/          # Page components
│   │   │   ├── stores/         # Zustand stores
│   │   │   ├── lib/            # Utilities and API client
│   │   │   └── App.tsx         # Main application
│   │   └── package.json
│   │
│   └── worker/                 # Cloudflare Worker API
│       ├── src/
│       │   ├── routes/         # API route handlers
│       │   ├── middleware/     # Auth and other middleware
│       │   ├── db/             # Database queries and types
│       │   └── index.ts        # Worker entry point
│       ├── wrangler.toml       # Cloudflare configuration
│       └── package.json
│
├── packages/                   # Shared packages (if any)
├── package.json                # Root package.json
└── pnpm-workspace.yaml         # pnpm workspace config
```

## Database Schema

### Users
- `id` - UUID primary key
- `email` - Unique email address
- `name` - Display name
- `avatar_url` - Profile picture URL
- `role` - 'admin' | 'user'
- `created_at`, `updated_at` - Timestamps

### Projects
- `id` - UUID primary key
- `user_id` - Owner reference
- `name` - Project name
- `description` - Optional description
- `sandbox_id` - Cloudflare Sandbox ID
- `created_at`, `updated_at`, `last_accessed_at` - Timestamps

### Sessions
- `id` - UUID primary key
- `project_id` - Project reference
- `user_id` - User reference
- `status` - 'active' | 'ended'
- `started_at`, `ended_at` - Timestamps

### Permissions
- `id` - UUID primary key
- `user_id` - User reference
- `resource_type` - 'project' | 'sandbox' | 'admin'
- `resource_id` - Optional specific resource
- `action` - 'read' | 'write' | 'delete' | 'admin'
- `created_at` - Timestamp

## License

MIT
