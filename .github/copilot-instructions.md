# Project rules
Read CONTEXT.md in the repo root before answering. It is the source of truth.

- Frontend is in /frontend: Next.js App Router, TypeScript, Tailwind, shadcn/ui, lucide-react, sonner.
- Client-side only: use "use client". No Server Actions, no Next API routes, no server-side data fetching.
- All data comes from FastAPI via lib/api.ts. Never call fetch directly in pages.
- Use the design tokens from CONTEXT.md section 7. Reuse components from components/shared.
- Every list page needs: search, skeleton, empty state, toast, confirm dialog on delete.
- One task per request. Do not add libraries or features outside the TZ.
