# Session Wrap Backend API Documentation

Complete REST API reference for the Session Wrap Backend (v3.9.0).

## Base URL

```
http://localhost:3000/api
```

## Authentication

All endpoints except `/api/auth/*` require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### POST `/api/auth/login`

Authenticate user with GitHub token.

**Request:**
```json
{
  "github_token": "ghp_..."
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "user-1",
    "github_login": "username",
    "email": "user@example.com",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

**Status Codes:**
- `200` - Login successful
- `401` - Invalid token
- `500` - Server error

---

### POST `/api/auth/logout`

Logout current user (revoke token).

**Request Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

### GET `/api/auth/profile`

Get current user profile.

**Request Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "user-1",
    "github_login": "username",
    "email": "user@example.com",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

---

## Workspace Management

### GET `/api/workspaces`

List all workspaces for current user.

**Response:**
```json
{
  "data": [
    {
      "id": "ws-1",
      "name": "Team A",
      "owner_id": "user-1",
      "is_public": false,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST `/api/workspaces`

Create new workspace.

**Request:**
```json
{
  "name": "New Workspace",
  "is_public": false
}
```

**Response:**
```json
{
  "data": {
    "id": "ws-2",
    "name": "New Workspace",
    "owner_id": "user-1",
    "is_public": false,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  }
}
```

---

## Member Management

### GET `/api/workspaces/:workspaceId/members`

List all members in workspace.

**Response:**
```json
{
  "data": [
    {
      "id": "member-1",
      "github_login": "user1",
      "email": "user1@example.com",
      "avatar_url": "https://...",
      "roles": ["admin"]
    }
  ]
}
```

---

### POST `/api/workspaces/:workspaceId/members`

Add member to workspace.

**Request:**
```json
{
  "github_login": "newuser",
  "role": "editor"
}
```

**Response:**
```json
{
  "data": {
    "id": "member-2",
    "github_login": "newuser",
    "email": "newuser@example.com",
    "avatar_url": null,
    "roles": ["editor"]
  }
}
```

---

### PUT `/api/workspaces/:workspaceId/members/:userId`

Update member role.

**Request:**
```json
{
  "role": "viewer"
}
```

**Response:**
```json
{
  "data": {
    "id": "member-1",
    "github_login": "user1",
    "email": "user1@example.com",
    "avatar_url": "https://...",
    "roles": ["viewer"]
  }
}
```

---

### DELETE `/api/workspaces/:workspaceId/members/:userId`

Remove member from workspace.

**Response:**
```json
{
  "message": "Member removed successfully"
}
```

---

## Role-Based Access Control (RBAC)

### GET `/api/roles`

List all available roles.

**Response:**
```json
{
  "data": [
    {
      "id": "role-1",
      "name": "admin",
      "description": "Full access",
      "permissions": {
        "read": true,
        "write": true,
        "delete": true,
        "manage_members": true
      }
    },
    {
      "id": "role-2",
      "name": "editor",
      "description": "Edit permissions",
      "permissions": {
        "read": true,
        "write": true,
        "delete": false,
        "manage_members": false
      }
    },
    {
      "id": "role-3",
      "name": "viewer",
      "description": "Read-only access",
      "permissions": {
        "read": true,
        "write": false,
        "delete": false,
        "manage_members": false
      }
    }
  ]
}
```

---

### GET `/api/me/permissions`

Get current user's permissions in workspace.

**Query Parameters:**
- `workspace_id` - Workspace ID (required)

**Response:**
```json
{
  "data": {
    "workspace_id": "ws-1",
    "roles": ["admin"],
    "permissions": {
      "read": true,
      "write": true,
      "delete": true,
      "manage_members": true
    }
  }
}
```

---

## Analytics API

### GET `/api/analytics/dashboard/:workspaceId`

Get analytics dashboard snapshot.

**Query Parameters:**
- `days` - Time period: 7, 30, or 90 (default: 30)

**Response:**
```json
{
  "data": {
    "snapshot": {
      "total_tasks": 150,
      "completed_tasks": 120,
      "pending_tasks": 20,
      "in_progress_tasks": 10,
      "total_decisions": 45,
      "avg_decision_quality": 4.2,
      "active_agents": 5
    },
    "trends": [
      {
        "snapshot_date": "2026-03-27T00:00:00Z",
        "completed_tasks": 120,
        "pending_tasks": 20,
        "in_progress_tasks": 10,
        "total_decisions": 45,
        "avg_decision_quality": 4.2
      }
    ]
  }
}
```

---

### GET `/api/analytics/agents/:workspaceId`

Get agent performance metrics.

**Response:**
```json
{
  "data": [
    {
      "agent_name": "agent-1",
      "tasks_created": 50,
      "tasks_completed": 45,
      "comments_added": 120,
      "decisions_logged": 15,
      "response_time_ms": 250,
      "error_count": 2,
      "efficiency_score": 4.8
    }
  ]
}
```

---

### GET `/api/analytics/insights/:workspaceId`

Get AI-generated insights for workspace.

**Response:**
```json
{
  "data": [
    {
      "type": "positive",
      "message": "Task completion rate improved 15%",
      "recommendation": "Maintain current team velocity"
    },
    {
      "type": "warning",
      "message": "Decision quality trending downward",
      "recommendation": "Increase discussion time for complex decisions"
    }
  ]
}
```

---

## Integrations API

### GET `/api/integrations/:workspaceId`

List configured integrations for workspace.

**Response:**
```json
{
  "data": [
    {
      "id": "integration-1",
      "workspace_id": "ws-1",
      "service_name": "slack",
      "is_active": true,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST `/api/integrations/:workspaceId`

Setup new integration.

**Request:**
```json
{
  "service_name": "slack",
  "config": {
    "webhook_url": "https://hooks.slack.com/...",
    "channel_id": "C12345"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "integration-1",
    "workspace_id": "ws-1",
    "service_name": "slack",
    "is_active": true,
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

---

### PUT `/api/integrations/:integrationId/toggle`

Enable/disable integration.

**Request:**
```json
{
  "is_active": false
}
```

**Response:**
```json
{
  "data": {
    "id": "integration-1",
    "is_active": false
  }
}
```

---

### DELETE `/api/integrations/:integrationId`

Remove integration.

**Response:**
```json
{
  "message": "Integration deleted successfully"
}
```

---

## Error Handling

All error responses follow this format:

```json
{
  "error": {
    "message": "Description of what went wrong",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

### Common Status Codes

- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Health Check

### GET `/health`

Check API server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-27T13:04:00Z"
}
```

---

## Rate Limiting

- No rate limiting in development
- Production: 100 requests per minute per IP
- Rate limit headers included in response:
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 99`
  - `X-RateLimit-Reset: 1234567890`

---

## CORS Configuration

Allowed origins (development):
- `http://localhost:3000`
- `http://localhost:3001`

Credentials: Allowed
