# AGENTS.md

This file is for coding agents working in `/home/ben/Desktop/CMS_Social_Media`.

## Purpose

This application is a moderation dashboard for social media posts:

- reviewers create and edit queued posts
- reviewers approve or reject posts
- an external posting agent can query approved posts and mark them as posted
- uploaded images are stored in MinIO and referenced from the database

## Stack

- Next.js 16 App Router
- React 19 client dashboard in `src/components/dashboard.tsx`
- Prisma ORM with SQLite in `prisma/dev.db`
- MinIO object storage for images

## Important Files

- `src/app/page.tsx`: loads posts and renders the dashboard
- `src/components/dashboard.tsx`: primary UI for filtering, editing, approving, rejecting, and creating posts
- `src/app/api/posts/route.ts`: list and create posts
- `src/app/api/posts/[id]/route.ts`: fetch and update a single post
- `src/app/api/uploads/route.ts`: multipart upload endpoint for images
- `src/lib/posts.ts`: query + serialization layer
- `src/lib/minio.ts`: server-side MinIO upload and URL generation
- `src/lib/minio-public.ts`: client-side public image URL builder
- `src/lib/validation.ts`: request schemas
- `src/lib/topics.ts`: topic query + serialization layer
- `prisma/schema.prisma`: database schema

## Environment

Copy `.env.example` to `.env`.

Required values:

- `DATABASE_URL`
- `MINIO_PUBLIC_BASE_URL`
- `MINIO_BUCKET_NAME`
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_USE_SSL`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_MINIO_BUCKET_NAME`

Default local database:

```env
DATABASE_URL="file:./dev.db"
```

The app assumes MinIO is already running and the bucket exists.

## Commands

- `npm install`
- `npm run db:generate`
- `npm run db:push`
- `npm run dev`
- `npm run lint`
- `npm run build`

## Data Model

`Post`
- moderation fields: `platform`, `handle`, `text`, `status`
- relations: `images`, `agentState`

`PostImage`
- stores the uploaded object key in MinIO

`AgentPostState`
- tracks whether the external agent has posted the content
- values: `NOT_POSTED`, `POSTED`

`Topic`
- stores reusable topics linked to a required `platform` and `handle`
- duplicate rows for the same `platform + handle + topic` are blocked

Moderation status values:

- `PENDING`
- `APPROVED`
- `REJECTED`

## API Behavior

`GET /api/posts`
- optional query params: `status`, `agentPostingStatus`

`POST /api/posts`
- creates a post
- automatically creates `agentState` with `NOT_POSTED`

`GET /api/posts/:id`
- returns one serialized post

`PATCH /api/posts/:id`
- updates moderation fields and images
- replacing `images` deletes existing image rows and recreates them
- marking `agentPostingStatus` as `POSTED` is only allowed when the post is approved
- when marked `POSTED`, `postedAt` is set to the current timestamp

`POST /api/uploads`
- accepts multipart form data under `files`
- uploads to MinIO and returns `objectKey` plus `imageUrl`

`GET /api/topics`
- optional query params: `platform`, `handle`

`POST /api/topics`
- creates a topic row for a required `platform` and `handle`
- duplicate `platform + handle + topic` values return `409`

`GET /api/topics/:id`
- returns one topic row

`PATCH /api/topics/:id`
- updates a topic row
- uniqueness on `platform + handle + topic` is still enforced

`DELETE /api/topics/:id`
- deletes a topic row

`GET /api/topic-refreshes`
- optional query params: `platform`, `handle`

`POST /api/topic-refreshes`
- creates a topic refresh row
- duplicate `platform + handle` values return `409`

`PUT /api/topic-refreshes`
- idempotent upsert for agents keyed on `platform + handle`
- replaces or creates the `prompt` for a single account

`GET /api/topic-refreshes/:id`
- returns one topic refresh row

`PATCH /api/topic-refreshes/:id`
- updates a topic refresh row by id

`DELETE /api/topic-refreshes/:id`
- deletes a topic refresh row

## Working Rules

- Preserve the current API contracts. The dashboard depends on the serialized shape from `src/lib/posts.ts`.
- Preserve the topic API contracts. Agents may rely on `GET /api/topics` with `platform` and `handle` filters.
- Preserve the topic refresh API contracts. Agents may rely on `PUT /api/topic-refreshes` as an idempotent write path.
- Keep client/server boundaries intact. MinIO credentials must stay server-side.
- Do not bypass Zod validation when changing API inputs.
- If you change Prisma models, also run `npm run db:generate` and `npm run db:push`.
- Prefer additive schema changes unless the task explicitly requires destructive migration work.
- There is no test suite in this repo right now. At minimum, run `npm run lint` after changes.

## Known Constraints

- Storage is external to the app. Uploads fail if MinIO is unreachable or the bucket is missing.
- SQLite is used for local persistence; concurrent multi-user production assumptions do not apply by default.
- The repository currently includes generated/local state such as `.next/`, `node_modules/`, `.minio-data/`, and `prisma/dev.db`. Be careful not to rely on those artifacts in code changes.
