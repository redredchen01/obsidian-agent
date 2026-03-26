# Session Wrap Dashboard — Deployment Guide

**Phase 6C MVP for real-time team monitoring**

Quick links:
- 📁 [Dashboard source](web/)
- 🚀 [Vercel deployment](https://vercel.com)
- 📚 [Full README](web/README.md)

---

## 1. Local Development

### Start the dashboard

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173 — dashboard connects to backend at `http://localhost:3000/api` by default.

### Configure backend URL

Edit `web/.env.local`:

```env
VITE_API_URL=http://localhost:3000/api
```

For Railway backend:

```env
VITE_API_URL=https://your-railway-app.up.railway.app/api
```

### Test with mock data

Without a running backend, the dashboard shows empty state with graceful error handling:

```
ℹ️ Loading dashboard...
[After 5s] Failed to fetch tasks / No data available
```

The `api.ts` module includes fallbacks for all endpoints.

---

## 2. Production Deployment (Vercel)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

Or skip the CLI and use Vercel dashboard directly.

### Step 2: Deploy

From the project root:

```bash
cd web
vercel
```

Vercel will:
1. Detect Vite configuration
2. Build the project (`npm run build`)
3. Deploy to production
4. Provide a live URL

### Step 3: Set Environment Variables

In Vercel dashboard → Project Settings → Environment Variables:

```
VITE_API_URL = https://your-railway-backend.up.railway.app/api
```

### Step 4: Verify

```bash
vercel --prod                    # Deploy to production
vercel env pull .env.local       # Pull env vars locally
```

---

## 3. Docker Deployment

For self-hosted infrastructure:

### Build Docker image

```bash
cd web
docker build -t session-wrap-dashboard .
```

### Run container

```bash
docker run \
  -e VITE_API_URL=http://backend:3000/api \
  -p 3000:3000 \
  session-wrap-dashboard
```

Open http://localhost:3000

---

## 4. Integration with Backend

### Required Backend Endpoints

The dashboard expects a backend with these endpoints:

```
GET  /api/tasks              → { tasks: Task[] }
GET  /api/decisions          → { decisions: Decision[] }
GET  /api/memory/stats       → { stats: MemoryStat[] }
GET  /api/sync/status        → { status: SyncStatus }
```

### Response Examples

**GET /api/tasks**
```json
{
  "tasks": [
    {
      "id": "feature-x",
      "description": "Implement feature X",
      "status": "in_progress",
      "assigned_to": "claude-code",
      "depends_on": [],
      "created_at": "2026-03-26T12:00:00Z"
    }
  ]
}
```

**GET /api/decisions**
```json
{
  "decisions": [
    {
      "id": "auth-jwt-001",
      "date": "2026-03-26T14:30:00Z",
      "agent": "claude-code",
      "topic": "authentication",
      "decision": "Use JWT tokens",
      "reasoning": "Stateless, scales well",
      "trade_offs": "Higher token size, no server-side revocation"
    }
  ]
}
```

**GET /api/memory/stats**
```json
{
  "stats": [
    {
      "category": "sessions",
      "size_bytes": 102400,
      "file_count": 5
    },
    {
      "category": "decisions",
      "size_bytes": 51200,
      "file_count": 12
    }
  ]
}
```

**GET /api/sync/status**
```json
{
  "status": {
    "last_sync": "2026-03-26T17:45:23Z",
    "status": "synced",
    "agent_count": 3,
    "active_agents": ["claude-code", "cursor", "cline"]
  }
}
```

### Building the Backend

The backend should read from session-wrap memory files:

```python
# Pseudocode
GET /api/tasks
  → Read ~/.claude/projects/.../memory/tasks/tasks.json
  → Parse task.json
  → Return { tasks: [...] }

GET /api/decisions
  → Scan ~/.claude/projects/.../memory/decisions/*.md
  → Parse front matter + content
  → Return { decisions: [...] }
```

See `PRODUCTION-SETUP.md` for session-wrap-backend deployment.

---

## 5. Monitoring & Troubleshooting

### Dashboard not loading?

1. **Check backend connectivity:**
   ```bash
   curl http://localhost:3000/api/tasks
   ```

2. **Check browser console** for API errors:
   ```
   Failed to fetch tasks
   Failed to fetch decisions
   ```

3. **Verify environment variables:**
   ```bash
   # Local development
   cat web/.env.local

   # Vercel production
   vercel env ls
   ```

4. **Check CORS** — backend must allow dashboard origin:
   ```javascript
   // Express example
   app.use(cors({
     origin: ['http://localhost:5173', 'https://your-vercel-url.vercel.app'],
   }))
   ```

### Slow loading?

- Update polling interval in `src/App.tsx` (default 5s):
  ```typescript
  const unsubscribe = apiClient.subscribeToUpdates(
    (newState) => setState(newState),
    10000  // 10 seconds instead of 5s
  )
  ```

- Or implement WebSocket (Phase 7) for true real-time updates.

### Build failed?

```bash
cd web
npm run type-check              # Check TypeScript errors
npm run build -- --debug        # Verbose build output
```

---

## 6. Development Workflow

### Add new visualization component

```typescript
// web/src/components/NewComponent.tsx
import React from 'react'
import { SomeType } from '../types'

interface NewComponentProps {
  data: SomeType[]
}

const NewComponent: React.FC<NewComponentProps> = ({ data }) => {
  return (
    <div className="space-y-4">
      {/* Your component */}
    </div>
  )
}

export default NewComponent
```

### Use in App.tsx

```typescript
import NewComponent from './components/NewComponent'

// In render
{activeTab === 'new' && <NewComponent data={state.newData} />}
```

### Add new API endpoint

```typescript
// web/src/api.ts
async getNewData(): Promise<NewType[]> {
  try {
    const res = await this.client.get('/new-endpoint')
    return res.data.items || []
  } catch {
    console.error('Failed to fetch new data')
    return []
  }
}
```

---

## 7. Roadmap (Phase 7+)

- 🔲 WebSocket real-time updates (replace polling)
- 🔲 Task creation/editing from UI
- 🔲 Decision filtering and search
- 🔲 Multi-project view
- 🔲 Team collaboration (comments, @mentions)
- 🔲 Custom filters and aggregations
- 🔲 Export to CSV/PDF

---

## 8. Support

- 📚 [Dashboard README](web/README.md)
- 📖 [Full Documentation Index](README.md)
- 🐛 [Issue Tracker](https://github.com/redredchen01/session-wrap-skill/issues)

**Version:** 3.4.0 Dashboard MVP (Phase 6C)
