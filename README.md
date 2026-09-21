# Deploy - Property Management System

Full-stack property management app with calendar/timeline views, task management, material requests, and team collaboration. Features role-based permissions, recurring tasks, vacancy tracking, worker-based color coding, email notifications, and mobile-responsive design. Built with React, Express, and PostgreSQL.

## Features

### Task Management
- Create, edit, and track tasks with categories, priorities, and scheduling
- Recurring task support (daily, weekly, bi-weekly, monthly)
- Task status workflow (pending, in progress, completed)
- Apartment/location-based task organization

### Calendar & Timeline Views
- Month, week, and day calendar views
- Timeline view with horizontal scrolling for desktop
- Worker-based color coding for admin oversight
- Mobile-responsive stacked card layout

### Material Requests
- Track material procurement with quantities and delivery status
- Priority levels and delivery date tracking
- Link materials to specific tasks

### Team Collaboration
- Role-based permissions (Admin, Project Manager, Worker)
- Task assignment and ownership tracking
- Real-time notifications via WebSocket
- Email notifications for task updates (SendGrid)

### Vacancy Management
- Track unit vacancies and move-in/move-out dates
- Link tasks to specific units

### Reporting
- Task completion analytics
- Export capabilities (PDF)

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for development and builds
- TanStack Query for server state
- Tailwind CSS + shadcn/ui components
- Wouter for routing
- React Hook Form + Zod validation

### Backend
- Express.js with TypeScript
- PostgreSQL with Drizzle ORM
- WebSocket for real-time updates
- SendGrid for email notifications

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Installation

1. Clone the repository
```bash
git clone https://github.com/iliarafa/deploy.git
cd deploy
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
DATABASE_URL=your_postgresql_connection_string
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=your_sender_email
ACTIVITY_ALERT_EMAILS=info@csrllc.net,ilias@csrllc.net,geodiac@aol.com,billing@csrllc.net
```

`SENDGRID_API_KEY` and `FROM_EMAIL` must be present on the Vercel project that hosts this app. `ACTIVITY_ALERT_EMAILS` is a comma-separated list of recipients for create/edit activity alerts; if unset, the four addresses above are used.

4. Push database schema
```bash
npm run db:push
```

5. Start development server
```bash
npm run dev
```

The app will be available at `http://localhost:5000`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run db:push` | Push schema to database |

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # Utilities
├── server/                 # Backend Express server
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Database operations
│   └── email.ts            # Email notifications
├── shared/                 # Shared types and schemas
│   ├── schema.ts           # Database schema
│   └── roles.ts            # Role permissions
└── package.json
```

## Role Permissions

| Role | Capabilities |
|------|-------------|
| Admin | Full access, user management, all task operations |
| Project Manager | Task management, material requests, team oversight |
| Worker | View assigned tasks, update task status |

## License

MIT
