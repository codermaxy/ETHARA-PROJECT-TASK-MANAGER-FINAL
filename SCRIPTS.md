# Ethara AI — Administrator & Developer Utility Scripts

The project contains several standalone Node.js utility scripts located in the root directory. These scripts bypass the Next.js routing stack to interact directly with the MongoDB database using mongoose. They are designed for database diagnostics, quick fixes, and seeding initial administrative access.

---

## ⚙️ Prerequisites for Running Scripts
1. **Environment Variables**: The scripts depend on a database connection string. They load variables from the `.env` file using the `dotenv` package.
2. **MongoDB Access**: The machine executing the script must have its IP address whitelisted on the target MongoDB cluster (e.g., MongoDB Atlas).
3. **Execution Command**: Use `node` with ES Modules support (since `"type": "module"` is configured in `package.json`).

---

## 📂 Scripts Directory & Usage Reference

### 1. `force_admin.js`
- **Purpose**: Instantly creates or upgrades an account to a verified administrator.
- **Action**: Connects to the database and runs `findOneAndUpdate` for the email specified in the script (`saurabhkumar.dpg@gmail.com` by default), sets `isAdmin: true`, `role: "admin"`, and `isverified: true`.
- **When to Use**: When setting up the project on a new database and you need to register the first system administrator without needing access to mailer tokens.
- **Command**:
  ```bash
  node force_admin.js
  ```

### 2. `fix_admins.js`
- **Purpose**: Resolves role conflicts in the user registry.
- **Action**: Finds all users in the database where `role` is `"admin"` but `isAdmin` is not yet set to `true`, and updates them in bulk.
- **When to Use**: Run this script if an administrator account is registered but cannot log in due to missing `isAdmin` boolean validation constraints.
- **Command**:
  ```bash
  node fix_admins.js
  ```

### 3. `verify_users.js`
- **Purpose**: Marks all registered users as email-verified.
- **Action**: Updates all users where `isverified` is not equal to `true`, setting it to `true`.
- **When to Use**: Useful in local development environments where SMTP credentials are not configured or when importing mock users that bypass the standard sign-up verification flow.
- **Command**:
  ```bash
  node verify_users.js
  ```

### 4. `reset_pass.js`
- **Purpose**: Resets a user's password to a secure value.
- **Action**: Hashes the new password (e.g., `Password@123` by default) using `bcryptjs` with 10 salt rounds and updates the document for the specified username (`Aadi_ai` by default). It also ensures the account is marked verified.
- **When to Use**: When a developer or user loses access to their account on a deployment where the email mailer is not active.
- **Command**:
  ```bash
  node reset_pass.js
  ```

### 5. `check_admin.js`
- **Purpose**: Diagnostics and query verification.
- **Action**:
  - Connects to the database and prints the profile details (email, role, admin status) of a primary diagnostic account (`saurabhkumar.poly123@gmail.com`).
  - Counts the total number of users matching query filters.
  - Searches the latest 120 registered accounts for a target email (`2301731114@krmu.edu.in`) and logs its array index.
- **When to Use**: To diagnose database querying bottlenecks or verify if a user's account is registered and indexed.
- **Command**:
  ```bash
  node check_admin.js
  ```
