# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Internal admin panel for the DreamTeam/FinanceBro platform. Built for team use to manage users, workspaces, feature flags, and platform health.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Tech Stack

- **Next.js 14** with App Router and TypeScript
- **Tailwind CSS** with shadcn/ui components
- **Supabase** for auth and database (with RLS)

## Project Structure

```
src/
├── app/
│   ├── (admin)/           # Admin panel pages (protected)
│   │   ├── page.tsx       # Dashboard
│   │   ├── users/         # User management
│   │   ├── workspaces/    # Workspace management
│   │   ├── feature-flags/ # Feature toggles
│   │   ├── api-keys/      # API key management
│   │   ├── audit-logs/    # Admin action logs
│   │   └── settings/      # Platform settings
│   ├── (auth)/login/      # Login page
│   └── api/admin/         # Admin API routes
├── components/
│   ├── admin/             # Admin-specific components
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── supabase/          # Supabase clients
│   │   ├── client.ts      # Browser client
│   │   ├── server.ts      # Server client
│   │   └── admin.ts       # Admin client (bypasses RLS)
│   └── admin-auth.ts      # Auth helpers
└── types/
    └── database.ts        # Database types
```

## Key Patterns

### Authentication
- All `/admin/*` routes require superadmin status
- Use `requireSuperadmin()` from `@/lib/admin-auth` in API routes
- Middleware redirects unauthenticated users to `/login`

### Database Operations
- Use `createAdminClient()` for admin operations (bypasses RLS)
- Use `createClient()` for user-scoped operations
- All admin actions logged via `logAdminAction()`

### Adding New Admin Pages
1. Create page in `src/app/(admin)/[feature]/page.tsx`
2. Create API route in `src/app/api/admin/[feature]/route.ts`
3. Add navigation item in `src/components/admin/admin-sidebar.tsx`

## Database Setup

Run the migration in Supabase SQL Editor:
```bash
# Migration file: supabase/migrations/001_initial_schema.sql
```

To make yourself a superadmin:
```sql
UPDATE profiles SET is_superadmin = true WHERE email = 'your@email.com';
```

## Documentation

- `ADMIN_PANEL_GUIDE.md` - Implementation guide and feature specs
- `DREAMTEAM_API.md` - API reference for mobile developers
