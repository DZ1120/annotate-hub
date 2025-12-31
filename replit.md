# Image Annotator - Interactive Annotation Tool

## Overview

This is an interactive image annotation tool that allows users to upload images or PDFs and add annotation points, text notes, and geometric shapes. The application is designed for precision interactions with engineering drawings, maps, and photos. It follows a Figma-inspired design with Material Design 3 principles adapted for productivity tools.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: Custom React hooks (`useAnnotationStore`) for local annotation state, React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Server**: HTTP server with hot module replacement in development via Vite middleware
- **API Pattern**: RESTful endpoints under `/api` prefix for project CRUD operations
- **Storage**: Interface-based storage abstraction (`IStorage`) currently using in-memory implementation (`MemStorage`)

### Data Layer
- **Schema Definition**: Zod schemas in `shared/schema.ts` for type validation and inference
- **Database ORM**: Drizzle ORM configured for PostgreSQL (database not yet provisioned)
- **Shared Types**: TypeScript types derived from Zod schemas, shared between client and server

### Application Layout
- Full viewport canvas-based layout (100vh, 100vw)
- Fixed top toolbar for tools, upload, and settings
- Collapsible left sidebar for layers/annotations list
- Contextual right properties panel for editing selected elements
- Central canvas with zoom/pan controls

### Key Design Patterns
- **Discriminated Unions**: Annotations use Zod discriminated unions by type (point, text, shape)
- **Component Composition**: UI built from composable shadcn/ui primitives
- **Custom Hooks**: Business logic encapsulated in custom hooks for reusability
- **Path Aliases**: TypeScript path aliases (`@/`, `@shared/`) for clean imports

## External Dependencies

### UI & Styling
- **Radix UI**: Complete set of accessible, unstyled UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom theme configuration
- **class-variance-authority**: For creating component variants
- **Lucide React**: Icon library

### State & Data
- **@tanstack/react-query**: Server state management and caching
- **react-hook-form + @hookform/resolvers**: Form handling with Zod validation
- **Zod**: Schema validation and TypeScript type inference
- **Drizzle ORM + drizzle-zod**: Database ORM with Zod integration

### Development
- **Vite**: Frontend build tool with HMR
- **tsx**: TypeScript execution for server
- **esbuild**: Production bundling for server code

### Server
- **Express**: Web server framework
- **connect-pg-simple**: PostgreSQL session store (for future auth)
- **express-session**: Session middleware

### Database
- **PostgreSQL**: Target database (requires `DATABASE_URL` environment variable)
- **drizzle-kit**: Database migration tooling via `npm run db:push`