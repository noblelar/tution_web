<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Tution frontend instructions

- Prefer Server Components by default.
- Use Client Components only where interactivity requires them.
- Browser code calls local `/api/*` routes, never the Go API directly.
- Route Handlers own secure session cookies and backend credentials.
- Keep backend snake_case DTOs separate from camelCase UI models.
- Put backend-to-frontend mappings in `src/lib/server-*.ts`.
- Keep reusable UI in `src/components`.
- Keep domain components in domain-named component directories.
- Preserve strict TypeScript settings.
- Ask before adding a production dependency.

Expected vertical-slice shape:

    src/app/api/examples/route.ts
    src/lib/server-example.ts
    src/types/example.ts
    src/app/examples/page.tsx
