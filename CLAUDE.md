# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup & Commands

```bash
npm run setup       # Install deps, generate Prisma client, run migrations
npm run dev         # Start dev server (http://localhost:3000) with Turbopack
npm run build       # Production build
npm run lint        # ESLint
npm run test        # Run Vitest tests
```

To run a single test file:
```bash
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx
```

Environment: add `ANTHROPIC_API_KEY` to `.env`. Without it, a `MockLanguageModel` is used automatically (defined in `src/lib/provider.ts`).

## Architecture

UIGen is a Next.js 15 app that generates React components via AI chat with live preview.

### Three-Pane Layout (`src/app/main-content.tsx`)

- **Left (35%)**: `ChatInterface` — streaming chat with Claude
- **Right (65%)**: Toggle between:
  - **Preview**: `PreviewFrame` — sandboxed iframe with live component rendering
  - **Code**: `FileTree` (30%) + `CodeEditor` (70%) — Monaco editor

### Virtual File System

All file state lives in memory — no disk writes. `VirtualFileSystem` (`src/lib/file-system.ts`) is the core data structure. `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) exposes it to components. The file system state is serialized to JSON and saved to SQLite on each AI response completion.

### AI Integration & Streaming

`POST /api/chat` (`src/app/api/chat/route.ts`) receives messages + serialized file system state, calls Claude via Vercel AI SDK `streamText()`, and streams back tool calls + text. Two tools are available to the model:

- `str_replace_editor` (`src/lib/tools/str-replace.ts`): create/view/edit files via string replacement or insertion
- `file_manager` (`src/lib/tools/file-manager.ts`): file/directory operations

Tool results update `FileSystemContext` on the client, which triggers preview re-renders.

Model: `claude-haiku-4-5` (configured in `src/lib/provider.ts`). System prompt is in `src/lib/prompts/generation.tsx`.

### Live Preview Pipeline (`src/components/preview/PreviewFrame.tsx`)

When files change, `jsx-transformer.ts` runs:
1. Babel standalone transforms JSX → JS
2. Import maps are built mapping module names to blob URLs
3. An HTML document with the transformed code is injected into `iframe.srcdoc`

### Auth & Persistence

- JWT-based sessions via httpOnly cookies (7-day expiry), managed in `src/lib/auth.ts`
- Passwords hashed with bcrypt (10 rounds)
- SQLite via `better-sqlite3` (synchronous), accessed through `src/lib/db.ts`
- Prisma schema at `prisma/schema.prisma` — `User` and `Project` tables
- Anonymous users can generate; projects only persist for authenticated users
- Anonymous session tracking: `src/lib/anon-work-tracker.ts`

### State Management

- React Context only (no Redux/Zustand): `FileSystemContext` and `ChatContext`
- Vercel AI SDK `useChat()` hook handles streaming on the client side
- Server actions in `src/actions/` handle auth and project CRUD

### Path Alias

`@/*` maps to `src/*` throughout the codebase.

### Testing

Tests use Vitest + jsdom + `@testing-library/react`. Test files live at `src/**/__tests__/*.test.tsx`. Components are mocked with `vi.mock()`.

## Code Style

Use comments sparingly. Only comment complex code.
