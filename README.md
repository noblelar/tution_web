# Tution web

Next.js 16 App Router application and backend-for-frontend for Tution.

## Commands

    npm ci
    npm run dev
    npm run lint
    npm run build

Copy `.env.example` to `.env.local` for local development. The internal Go API
URL is server-only and must not be exposed through a `NEXT_PUBLIC_` variable.

Read `AGENTS.md` and the repository architecture documents before adding a
feature or changing a framework API.

Privileged password sign-in may return an MFA challenge. The BFF stores its
opaque token only in an HttpOnly cookie and routes first-time enrollment to
`/mfa/enroll` and subsequent verification to `/mfa/challenge`. Client code must
never receive the backend challenge token, JWT, or refresh credential.
