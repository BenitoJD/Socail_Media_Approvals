# CMS Social Media

Next.js app for reviewing social media posts and serving them to posting agents through an API-driven queue.

## Stack

- Next.js 16 App Router
- React 19
- Prisma with SQLite
- MinIO for image storage

## What It Does

- reviewers create, edit, approve, reject, and delete posts
- images are uploaded to MinIO and stored as object keys in SQLite
- agents fetch approved posts through API endpoints
- agents can claim work, report failure, and mark posts as posted

## Local Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Generate the Prisma client with `npm run db:generate`.
4. Push the schema to SQLite with `npm run db:push`.
5. Start the app with `npm run dev`.

The app expects a reachable MinIO instance using the values in `.env`.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run db:generate`
- `npm run db:push`

## Data Model

Main entities:

- `Post`
- `PostImage`
- `AgentPostState`

Moderation states:

- `PENDING`
- `APPROVED`
- `REJECTED`

Agent posting states:

- `NOT_POSTED`
- `CLAIMED`
- `POSTED`
- `FAILED`

Agent queue metadata:

- `claimedAt`
- `postedAt`
- `lastAttemptedAt`
- `failureReason`
- `retryCount`

## API

General post APIs:

- `GET /api/posts`
- `POST /api/posts`
- `GET /api/posts/:id`
- `PATCH /api/posts/:id`
- `DELETE /api/posts/:id`
- `POST /api/uploads`

Supported list filters:

- `status`
- `agentPostingStatus`
- `handle`

Agent-oriented APIs:

- `GET /api/posts/next`
  Returns the next eligible approved post for an agent.

- `POST /api/posts/:id/claim`
  Moves an approved post from `NOT_POSTED` or `FAILED` to `CLAIMED`.

- `POST /api/posts/:id/post-failed`
  Marks a claimed post as `FAILED` and increments `retryCount`.
  Optional payload:

```json
{
  "failureReason": "rate limited"
}
```

- `POST /api/posts/:id/post-success`
  Marks a claimed post as `POSTED`.

## Agent Workflow

Recommended flow for posting agents:

1. Call `GET /api/posts/next` optionally with `?platform=...`.
   You can also pass `?handle=...` to target a specific account.
2. Claim the returned post with `POST /api/posts/:id/claim`.
3. Attempt to publish the content externally.
4. If publish succeeds, call `POST /api/posts/:id/post-success`.
5. If publish fails, call `POST /api/posts/:id/post-failed`.

Notes:

- only `APPROVED` posts should enter the agent workflow
- `post-success` and `post-failed` require the post to be in `CLAIMED`
- failed posts can be reclaimed later
- `GET /api/posts/next` returns the oldest eligible approved post

## Agent Guide

Project-specific instructions for coding agents live in [AGENTS.md](/home/ben/Desktop/CMS_Social_Media/AGENTS.md).
