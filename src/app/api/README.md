# Ethara AI — API Endpoint Catalog & Developer Reference

This document catalogs every endpoint available in the Ethara AI backend, detailing their methods, request formats, query parameters, expected JSON payloads, and authorization requirements.

---

## 🔒 Authorization Categories
All endpoints enforce session authentication. Role classifications are verified via the JWT access token:
- **Public**: Available without an active session (e.g., login, registration).
- **Admin-Only**: Requires `role === "admin"` or `isAdmin === true`.
- **Member-Only**: Requires `role === "member"` (or administrative override).
- **Authenticated**: Requires any valid active user session.

---

## 🔑 Authentication & Session APIs (`/api/auth/*`)

### 1. User Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public
- **Request Payload**:
  ```json
  {
    "email": "user@company.com", // Or "username": "user_dev"
    "password": "Password@123",
    "role": "admin" // Optional: "admin" | "member"
  }
  ```
- **Description**: Verifies credentials and sets three HttpOnly cookies: `token` (Access Token - 1 day), `refreshToken` (5 days), and `sessionId` (5 days).
- **Response**:
  ```json
  {
    "message": "Logged In Successfully",
    "success": true,
    "user": {
      "id": "603d2b...",
      "username": "saurabh_dev",
      "full_name": "Saurabh Kumar",
      "email": "user@company.com",
      "role": "admin",
      "isAdmin": true,
      "company": "Ethara",
      "joined": "2026-05-22T12:00:00.000Z"
    },
    "sessionId": "603d2c..."
  }
  ```

### 2. User Registration (Admin accounts)
- **Endpoint**: `POST /api/auth/register`
- **Access**: Public
- **Request Payload**:
  ```json
  {
    "username": "admin_user",
    "email": "admin@company.com",
    "full_name": "Admin Name",
    "password": "StrongPassword@123",
    "job_title": "Project Director",
    "department": "Engineering",
    "company": "Ethara Corp"
  }
  ```
- **Description**: Registers a new administrator. Triggers an verification email containing a numeric verification code.
- **Response**:
  ```json
  {
    "message": "User Registered successfully. Verification email sent.",
    "success": true
  }
  ```

### 3. Verify Admin Account
- **Endpoint**: `POST /api/auth/verify_admin`
- **Access**: Public (requires code sent to email)
- **Request Payload**:
  ```json
  {
    "token": "123456" // 6-digit numeric verification code
  }
  ```
- **Response**:
  ```json
  {
    "message": "Email verified successfully",
    "success": true
  }
  ```

### 4. Fetch User Profile
- **Endpoint**: `GET /api/auth/user_profile`
- **Access**: Authenticated
- **Description**: Retrieves profile info of the currently logged-in user.

### 5. Update Profile
- **Endpoint**: `PATCH /api/auth/update_profile`
- **Access**: Authenticated
- **Request Payload**:
  ```json
  {
    "full_name": "Updated Name",
    "job_title": "Senior Project Manager"
  }
  ```

### 6. Active Session Registry
- **Endpoint**: `GET /api/auth/session`
- **Access**: Authenticated
- **Description**: Returns all active login sessions for the authenticated user, indicating which is current based on `device`, `browser`, and `ip`.

### 7. Terminate Session (Logout)
- **Endpoint**: `DELETE /api/auth/session`
- **Access**: Authenticated
- **Query Parameters**:
  - `id`: (Optional) ID of a specific session to terminate. If omitted, it clears the *current* session.
  - `all`: (Optional) If set to `true`, terminates all active sessions on other devices.

---

## 👑 Admin-Only APIs (`/api/*`)

### 1. Teams Management (`/api/teams`)
- **GET /api/teams**: Lists all teams in the system, populated with member details.
- **POST /api/teams**: Creates a team.
  - *Payload*: `{"name": "Alpha-Ops", "members": ["userId1", "userId2"]}`
- **PATCH /api/teams/[id]**: Modifies the team name or membership roster.
- **DELETE /api/teams/[id]**: Deletes the team.

### 2. Projects Management (`/api/projects`)
- **GET /api/projects**: Lists all projects with their assigned teams.
- **POST /api/projects**: Instantiates a project under a team.
  - *Payload*: `{"name": "Revamp API", "description": "Backend upgrade", "teamId": "teamId"}`
- **GET /api/projects/[id]**: Returns detailed info about a single project.
- **PATCH /api/projects/[id]**: Modifies project fields.
- **DELETE /api/projects/[id]**: Deletes the project.

### 3. Tasks Management (`/api/tasks`)
- **GET /api/tasks**: Lists all tasks. Supports filtering via query parameters: `?projectId=603d2b...`.
- **POST /api/tasks**: Creates tasks. Supports **Single assignment** or **Bulk Team assignment**:
  - *Single Assignment Payload*:
    ```json
    {
      "title": "Fix bug",
      "description": "Resolve compiler warning",
      "projectId": "projectId",
      "assignedTo": "memberId",
      "dueDate": "2026-06-01",
      "priority": "High"
    }
    ```
  - *Bulk Team Assignment Payload*:
    ```json
    {
      "title": "Complete Training Module",
      "description": "Read documentation",
      "projectId": "projectId",
      "assignToTeam": true,
      "memberIds": ["memberId1", "memberId2", "memberId3"],
      "dueDate": "2026-06-01",
      "priority": "Medium"
    }
    ```
- **PATCH /api/tasks/[id]**: Edits task variables or overrides progress status.
- **DELETE /api/tasks/[id]**: Removes the task.

### 4. User Accounts Management (`/api/users`)
- **GET /api/users**: Returns a paginated list of team members with full-text search capabilities.
  - *Query Params*: `?page=1&limit=10&search=Saurabh`
- **POST /api/users**: Registers one or more members. Accepts a single object or a **bulk upload JSON array**:
  ```json
  [
    {
      "username": "amit_dev",
      "email": "amit@company.com",
      "full_name": "Amit Sharma",
      "password": "Password@123",
      "job_title": "Developer",
      "department": "Engineering",
      "company": "Ethara"
    }
  ]
  ```
- **PATCH /api/users/[id]**: Overwrites passwords, updates profile details, or reassigns `teamId`.
- **DELETE /api/users/[id]**: Deletes the user account.

### 5. Progress Telemetry (`/api/admin/progress`)
- **GET /api/admin/progress**: Computes statistics for dashboard rendering.
  - *Query Params*: `?projectId=projectId` (stats for specific project tasks) or `?memberId=memberId` (stats for specific member).

---

## 💻 Member Workspace APIs (`/api/member/*`)

### 1. Member Dashboard Analytics
- **Endpoint**: `GET /api/member/dashboard`
- **Access**: Authenticated (Member / Admin)
- **Response**: Aggregates task stats (todo, in-progress, done, overdue counts), due dates, and recent direct message snippets.

### 2. My Team Directory
- **Endpoint**: `GET /api/member/team`
- **Access**: Authenticated (Member / Admin)
- **Description**: Identifies the team the logged-in user belongs to, fetches the Team details, lists the Manager/Supervisor (the Admin who created the team), and populates all active teammates.

### 3. My Projects Telemetry
- **Endpoint**: `GET /api/member/projects`
- **Access**: Authenticated (Member / Admin)
- **Description**: Returns all projects assigned to the member's team. Dynamically aggregates tasks under each project to calculate the project completion percentage:
  $$\text{Progress \%} = \left(\frac{\text{Completed Tasks}}{\text{Total Project Tasks}}\right) \times 100$$
  Also outputs status counts (`todo`, `in-progress`, `done`) for each project.

---

## 💬 Messaging & Search APIs

### 1. Direct Messages (`/api/messages`)
- **GET /api/messages?receiverId=...**: Pulls chat history between the logged-in user and the specified recipient.
- **POST /api/messages**: Sends a direct message.
  - *Payload*: `{"receiver": "receiverUserId", "content": "Hello!"}`

### 2. Role-Restricted Global Search (`/api/search`)
- **GET /api/search?q=...**: Queries data with debouncing.
  - *Admins*: Searches across all tasks and projects.
  - *Members*: Limits task search to tasks assigned to them, and project search to projects belonging to their team.
