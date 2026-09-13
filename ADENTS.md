# RunStop Repository Guide

This file is the navigation index for AI coding agents working on RunStop.

## Read Order

When investigating the repository:

1. Read this file first.
2. Identify the subsystem related to the task.
3. Read that subsystem's README if present.
4. Inspect implementation files directly.
5. Consult `docs/` only when historical/design context is required.

When documentation and implementation disagree, treat the current implementation as the source of truth.

## Repository Map

```text
RunStop/
├─ backend/              Node.js + TypeScript API server
├─ routing-worker/       Python FastAPI routing / feature / ranking worker
├─ frontend/
│  ├─ mobile/            React Native mobile application
│  └─ admin/             Web admin application
├─ infra/
│  └─ db/                Database migrations, seeds and data imports
├─ docs/                 Planning, architecture and historical documents
├─ notebooks/            Experiments and exploratory work
├─ docker-compose.yml
├─ docker-compose.production.yml
└─ Caddyfile
```

## Backend

Main location:

```text
backend/src/
```

Responsibilities:

```text
routes/
    HTTP route definitions

controllers/
    HTTP request / response handling

services/
    application and business logic

repositories/
    database access

dto/
    request / response schemas and shared contracts

adapters/
    external systems
    ├─ llm/
    ├─ worker/
    ├─ tmap/
    └─ sms/

middleware/
    authentication, validation and error handling

infra/
    infrastructure code such as DB connection

server.ts
    process entry point

app.ts
    Express application composition
```

For a normal API request, trace approximately:

```text
route
→ controller
→ service
→ repository / adapter
```

For route recommendation integration, start with:

```text
backend/src/services/route-recommendation.service.ts
backend/src/adapters/worker/
backend/src/dto/worker/
backend/src/dto/route/
```

## Routing Worker

Main location:

```text
routing-worker/src/
```

Runtime entry:

```text
routing-worker/src/app.py
```

Routing algorithm:

```text
routing-worker/src/algo/
```

Important areas:

```text
algo/pipeline.py
    recommendation pipeline orchestration

algo/routing/
    route candidate generation and path construction

algo/features/
    elevation / facility / nature / surface features

algo/scoring/
    constraints, normalization, weighting and edge costs

algo/ai/
    AI-based candidate selection / future AI integration

algo/types.py
    core algorithm data structures

algo/config.py
    algorithm configuration

dto/
    FastAPI / Backend-worker request and response models
```

When investigating route-generation behavior, start from:

```text
pipeline.py
→ routing/
→ features/
→ scoring/
```

Do not start from AI/model code unless the task is specifically related to ranking or inference.

## Frontend

```text
frontend/mobile/
```

Main user-facing React Native application.

```text
frontend/admin/
```

Web admin application.

When a task mentions screens, navigation, GPS, maps or user interaction,
inspect `frontend/mobile/` first.

When a task mentions administrator features or inquiries,
inspect `frontend/admin/` first.

## Infrastructure

```text
infra/db/migrations/
```

Database schema migrations.

```text
infra/db/imports/
```

Public/spatial data import scripts.

```text
infra/db/seeds/
```

Seed data.

Deployment/runtime configuration is primarily located at repository root:

```text
docker-compose.yml
docker-compose.production.yml
Caddyfile
.env.*.example
```

## Documentation

`docs/` contains both current project material and historical/reference material.

Do not scan all documents by default.

Use `docs/INDEX.md` to locate relevant documentation.

Prefer this authority order:

```text
current code
> AGENTS.md / subsystem README
> current architecture documents
> historical planning documents
```

## Common Task → Starting Point

```text
API endpoint
→ backend/src/routes/

business logic
→ backend/src/services/

DB access
→ backend/src/repositories/

Backend ↔ Python communication
→ backend/src/adapters/worker/
→ backend/src/dto/worker/
→ routing-worker/src/app.py

route generation
→ routing-worker/src/algo/pipeline.py
→ routing-worker/src/algo/routing/

route features
→ routing-worker/src/algo/features/

route scoring
→ routing-worker/src/algo/scoring/

AI ranking / inference
→ routing-worker/src/algo/ai/
→ routing-worker/src/ranking/
→ routing-worker/inference/
→ routing-worker/training/

mobile UI / GPS / maps
→ frontend/mobile/

admin UI
→ frontend/admin/

deployment
→ docker-compose.production.yml
→ Caddyfile

database schema
→ infra/db/migrations/
```

## Important Project Boundary

The high-level service flow is:

```text
Mobile App
→ Node Backend
→ Python Routing Worker

Node Backend
→ PostgreSQL/PostGIS
```

The mobile application should not directly call the Routing Worker or database.

The Routing Worker owns route generation, feature extraction, scoring and AI inference.

The Node Backend owns external API handling, authentication, service orchestration and persistence.
