# Deploy - Property Management Application

## Overview

Deploy is a property management application built with a modern full-stack architecture. The application provides calendar-based task management, material request tracking, and reporting capabilities for property management teams. It features a responsive React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM (actively connected)
- **Schema**: Shared TypeScript schema definitions with Zod validation and relations
- **API**: RESTful endpoints for tasks, materials, and communications
- **Storage**: Abstracted storage interface with PostgreSQL DatabaseStorage implementation

### Database Schema
- **Users**: Authentication and user management
- **Tasks**: Task management with categories, priorities, and scheduling
- **Material Requests**: Material procurement tracking with delivery management
- **Communications**: Task-related notes and updates

## Key Components

### Core Entities
1. **Tasks**: Construction tasks with scheduling, categorization, and assignment
2. **Material Requests**: Material procurement with quantity, delivery, and priority tracking
3. **Communications**: Task-related notes and updates
4. **Users**: User authentication and management

### Frontend Components
- **Calendar Views**: Month/week/day calendar with task visualization
- **Task Management**: Task creation, editing, and status tracking
- **Material Requests**: Material procurement workflow
- **Reports**: Analytics and progress tracking
- **Mobile Navigation**: Responsive bottom navigation for mobile devices

### Backend Services
- **Storage Layer**: Abstract interface supporting multiple storage backends
- **API Routes**: RESTful endpoints for all core functionality
- **Schema Validation**: Shared validation using Zod schemas
- **Error Handling**: Centralized error handling with proper HTTP status codes

## Data Flow

1. **Client Requests**: React components make API calls using TanStack Query
2. **API Processing**: Express routes handle requests, validate data, and interact with storage
3. **Database Operations**: Drizzle ORM handles PostgreSQL interactions
4. **Response Flow**: Data flows back through the same path with proper error handling
5. **State Management**: TanStack Query manages caching and synchronization

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight routing
- **react-hook-form**: Form management
- **zod**: Schema validation
- **date-fns**: Date manipulation utilities

### UI Dependencies
- **@radix-ui/***: Headless UI components
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type checking
- **tsx**: TypeScript execution
- **esbuild**: Production bundling

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React application to `dist/public`
2. **Backend Build**: esbuild bundles Express server to `dist/index.js`
3. **Database Migration**: Drizzle migrations applied via `db:push` script

### Environment Configuration
- **Development**: Uses tsx for hot reloading and Vite dev server
- **Production**: Serves built static files and runs compiled Node.js server
- **Database**: PostgreSQL connection via DATABASE_URL environment variable

### Deployment Commands
- `npm run dev`: Development server with hot reloading
- `npm run build`: Production build for both frontend and backend
- `npm start`: Production server
- `npm run db:push`: Database schema migration

The application uses a monorepo structure with shared TypeScript definitions, making it easy to maintain type safety across the full stack. The architecture supports both development and production environments with proper error handling and responsive design.

## Recent Changes

### Production Readiness Enhancements (December 2025)
- **Security**: `/api/users` endpoint restricted to admin and project manager roles only
- **Role-Based UI**: Task assignment dropdown hidden from workers, only visible to admins/project managers
- **Error Handling**: Improved user-friendly error messages across task, material request, and vacancy modals
- **Testing Support**: Added `data-testid` attributes to key interactive elements (login, tasks page filters/buttons)
- **Bug Fixes**: Fixed recurrence type enum mismatch (`bi-weekly` now consistent across schema, UI, and backend)

## Security Notes

- **API Authorization**: User roster endpoint requires admin or project manager role
- **Task Ownership**: `createdBy` field is server-enforced and stripped from client update requests
- **Role Permissions**: Workers cannot assign tasks to others (UI field hidden)
- **Authentication**: All protected routes use JWT-based session authentication