# SmartDorm v2 — Almaty

Full-stack diploma prototype for a student dormitory management system focused on Almaty university students.

## What is included

- One-page public advertising/landing page
- Kazakh / Russian / English interface
- Login and multi-step registration
- First registration step: Student or Administrator
- Administrator: University dormitory or Private dormitory
- University dropdown with 35 Almaty higher education institutions
- Student registration: full name, email, Kazakhstan phone, university, faculty/major, year, password
- Administrator registration: full name, email, phone, position, dormitory type, university when relevant, dormitory name/address, password
- Client-side validation with red invalid fields
- Server-side validation
- Unique email check
- Password hashing with bcrypt
- SQLite database
- JWT login
- Successful registration message, then automatic switch to Login
- Login only asks for email + password
- Separate authenticated SmartDorm Portal
- Different Student/Admin menus
- Profile data loaded from database
- Smart Assistant / chatbot demo with chat history saved to database
- ML/Analytics area shown as a prototype
- Download application button still uses `href="#"`

## Run in VS Code / Windows

Open the SmartDorm-v2 folder in VS Code.

If PowerShell blocks npm scripts, use `npm.cmd`.

```powershell
npm.cmd install
npm.cmd run dev
```

Then open:

```text
http://localhost:5173
```

Backend API:

```text
http://localhost:4000
```

Database file is created automatically here:

```text
server/data/smartdorm.db
```

## Important

The dormitory availability numbers currently shown inside the portal are clearly marked as demo data. Registration, login, database storage, profile loading and the rule-based Smart Assistant are functional.

For production later:
- move JWT secret to `.env`
- use PostgreSQL instead of local SQLite
- add email verification / password reset
- add actual dormitory/application/maintenance tables
- add real ML model endpoints
- deploy backend and database to a server
