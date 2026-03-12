# CMS Social Media

Small Next.js app for reviewing social media posts before they are published by an external agent.

## Stack

- Next.js 16 App Router
- React 19
- Prisma with SQLite
- MinIO for image storage

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

## Agent Guide

Project-specific instructions for coding agents live in [AGENTS.md](/home/ben/Desktop/CMS_Social_Media/AGENTS.md).
