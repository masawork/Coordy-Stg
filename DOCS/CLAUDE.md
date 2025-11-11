# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 reservation application with role-based authentication and routing. The app supports three user roles: `user`, `instructor`, and `admin`, each with their own protected areas and login flows.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application with Turbopack
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Architecture Overview

### Role-Based Routing Structure

The application uses Next.js App Router with a role-based routing pattern:

```
/user/login       → User login page
/user             → Protected user dashboard (requires user role)
/instructor/login → Instructor login page
/instructor       → Protected instructor dashboard (requires instructor role)
/admin/login      → Admin login page
/admin            → Protected admin dashboard (requires admin role)
```

### Authentication Flow

1. **Middleware** (`middleware.ts:7-56`): Handles route protection and role validation
   - Redirects root `/` to `/user/login`
   - Checks authentication cookies (`auth=1` and `role=<role>`)
   - Redirects unauthorized users to appropriate login pages with `next` parameter
   - Redirects authenticated users away from login pages

2. **Mock Authentication** (`lib/fakeApi.ts:14-40`): Provides client-side authentication
   - Uses localStorage for session persistence
   - Mock users defined in `lib/mock.ts:10-14`
   - Login credentials: `user01/user01`, `inst01/inst01`, `admin01/admin01`

3. **Cookie Management**: Authentication state synchronized between client (localStorage) and server (HTTP-only cookies via `rf_auth` cookie)

### Key Components

- **RoleContext** (`contexts/RoleContext.tsx:20-43`): Provides role state automatically based on URL path (first segment)
- **ClientGuard** (`components/ClientGuard.tsx:13-46`): Client-side authentication guard that redirects unauthorized users
- **AuthForm** (`components/AuthForm.tsx`): Reusable login form component for all roles
- **ReservationWireframe** (`components/ReservationWireframe.tsx`): Main reservation interface component

### Type System

Central types are exported from `types.ts:1-2`:
- `Role`: Union type for user roles
- `MockUser`: User interface definition
- `AuthResult`, `AuthData`: Authentication-related types

## Development Notes

- Uses Turbopack for faster builds and hot reload
- Implements dual authentication: client-side (localStorage) + server-side (cookies via `rf_auth`)
- Role detection happens automatically from URL first segment (e.g., `/user/*` → user role)
- Protected routes use `(protected)` route groups in app directory
- Japanese language used for some UI text and error messages
- Cookie parsing utilities in `lib/authAdapter.ts:3-16` handle server-side auth extraction