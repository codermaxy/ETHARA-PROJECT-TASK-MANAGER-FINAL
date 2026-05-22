# Ethara AI — Enterprise Project & Task Management System

Ethara AI is a full-stack, enterprise-grade project and task management system built with role-based access control (RBAC). It is designed to coordinate operations between **Administrators** (who manage teams, users, projects, and assignments) and **Team Members** (who track progress, update task statuses, collaborate, and manage their assigned scopes).

The application is built on **Next.js 16 (App Router)**, **React 19**, and **MongoDB (Mongoose)** with a premium glassmorphic UI styled using Tailwind CSS and components from **shadcn/ui**.

---

## 📖 Complete Documentation Set

For in-depth explanations of specific areas of the codebase, consult the following dedicated markdown guides:

1. **[System Architecture & Workflows (ARCHITECTURE.md)](file:///c:/Users/Saurabh%20Kumar/OneDrive/Desktop/project-manager/ARCHITECTURE.md)**: Details the Next.js 16 `proxy.js` conventions, database relationships with Mermaid diagrams, authentication pipelines, and bulk team task assignment mechanics.
2. **[Backend API Endpoint Reference (src/app/api/README.md)](file:///c:/Users/Saurabh%20Kumar/OneDrive/Desktop/project-manager/src/app/api/README.md)**: Catalog of every API endpoint in the system, detailing inputs, outputs, query parameters, payloads, and role authorization requirements.
3. **[Developer & Maintenance Utility Scripts (SCRIPTS.md)](file:///c:/Users/Saurabh%20Kumar/OneDrive/Desktop/project-manager/SCRIPTS.md)**: Explains the standalone database scripts used for quick fixes, password resets, and admin provisioning.

---

## 🌟 Key Features & Functional Modules

### 1. 🔑 Security & Authentication System
- **Next.js 16 Proxy Engine**: Utilizes the modern `proxy.js` middleware (replacing the deprecated `middleware.js` convention) running under the **Node.js runtime** to allow direct database queries and JWT verification on routing hooks.
- **JWT-Token Cookie Architecture**: Implements a secure dual-cookie token system with HttpOnly, SameSite=strict cookies (1-day access token, 5-day refresh token).
- **Session Telemetry & Tracking**: Tracks logins in the `Session` model. Captures device type, browser, IP address, and location. Capped at a maximum of 5 concurrent sessions per user (oldest are automatically cleared).
- **Email Verification**: Admin accounts require email verification before their first login. Verification codes are sent using **Nodemailer** with custom **React Email** HTML templates.
- **Password Reset**: Secure token-based password reset via email.

### 2. 👑 Admin Workspace & Management Tools
- **Stats Dashboard**: High-level telemetry displaying active users, projects, task completion rates, a 6-month interactive Area Chart tracking progress, and recent activity logs.
- **User Management**:
  - Direct user registration.
  - **Bulk User Import**: Allows uploading a JSON array of users to register them simultaneously.
  - Paginated user list with full-text search.
  - Password resets and account deletion.
- **Team Management**: Create, edit, and delete teams. Assign members directly to team rosters.
- **Project Management**: Initialize projects and assign them to specific teams.
- **Task Management**:
  - Single task creation with priority, due date, and description.
  - **Bulk Team Assignment**: Admin can assign a single task to an *entire team* simultaneously, automatically creating individual task instances for each team member.
- **Progress Telemetry**: Visual filters to drill down into task completion statuses by project, team, or individual member.

### 3. 👥 Member Workspace & Collaboration Tools
- **Stats Dashboard**: Personal dashboard showing task counts (To Do, In Progress, Done), overdue alerts, upcoming deadlines, productivity completion rings, and recent direct messages.
- **Kanban Board & List Views**: Fully interactive views for managing assigned tasks. Members can drag tasks between columns, click to view details, and post progress notes.
- **Teammate Directory ("My Team")**:
  - Displays the active team details, department, and supervisor details.
  - Generates teammate directories with initial-derived, color-coordinated avatars.
  - Includes a direct **Message** shortcut next to each member to initialize chat rooms.
- **Project Telemetry ("My Projects")**:
  - Live list of projects assigned to the member's team.
  - Shows completion rate progress bars dynamically computed on the backend.
  - Lists status counters (To Do, In Dev, Completed) for each project.
  - Includes a shortcut link to filter the task board for that project.
- **Direct Messaging**: A real-time chat interface to message other members of the workspace.

### 4. 🔍 Global Header Search
- An interactive search bar in the global header with debouncing and animated glassmorphic dropdowns.
- Queries the `/api/search` endpoint. Admins can search across all tasks and projects, while team members can search tasks assigned to them and projects assigned to their team.
- Clicking a search result redirects the user directly to the target item on their task board.

---

## 📂 Project Architecture

```
src/
├── app/
│   ├── (admin)/admin/          # Admin pages (dashboard, teams, projects, tasks, users, progress)
│   ├── (auth)/auth/            # Authentication screens (login, signup, password-reset, email-verify)
│   ├── (member)/member/        # Member pages (dashboard, tasks, team, projects, messages)
│   └── api/                    # Backend API endpoints
│       ├── admin/              # Admin analytics & progress reports
│       ├── auth/               # Session, token refresh, registration, login, and verification APIs
│       ├── member/             # Member data sources (dashboard stats, tasks, team directory, projects)
│       ├── messages/           # Direct messaging backend
│       ├── projects/           # Projects CRUD operations
│       ├── search/             # Role-based search endpoint
│       ├── tasks/              # Tasks CRUD & bulk assignment logic
│       └── teams/              # Teams management endpoints
├── components/
│   ├── ui/                     # shadcn/ui components (card, dialog, table, badge, select, etc.)
│   └── app_component/          # Feature-specific widgets (welcome banners, charts, message boxes)
├── models/                     # Mongoose schemas (User, Team, Project, Task, Session, Message)
├── api/api.js                  # Axios client services
├── config/db_config.js         # Mongoose connection layer with active connection caching
├── schema/                     # Zod payload validation schemas
├── utils/                      # Auth helpers, Nodemailer, and Axios interceptor setups
├── hooks/                      # Custom React hooks (e.g. useDebounce)
├── logger/                     # Winston logging configuration
└── template/                   # Email templates
```

---

## 🚀 Installation & Local Development

### 1. Setup Environment Configuration
Create a `.env` file in the root directory:
```env
# Database Configuration
PROD_DATABASE_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/ethara

# JWT & Session Secrets
TOKEN_SECRET=your_jwt_access_secret_key
SESSION_SECRET=your_session_secret_key

# SMTP Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
SENDER_EMAIL=your_email@gmail.com

# Core URLs
DOMAIN_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Environment Mode
NODE_ENV=development
```

### 2. Install Dependencies
Ensure you have **pnpm** installed:
```bash
pnpm install
```

### 3. Start Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Build for Production
```bash
pnpm build
pnpm start
```
