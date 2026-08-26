<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes. Read the relevant guide in
`node_modules/next/dist/docs/` before writing framework-specific code and heed
deprecation notices.

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
