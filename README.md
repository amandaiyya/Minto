# 💸 Minto — Personal Expense Tracker

**Minto** is a full-stack personal expense tracker built with Next.js, designed to help users manage their daily expenses through a clean, responsive dashboard.

The project features email/password authentication, private per-user expense records, server-side validation, and light/dark themes.

🚀 **Live Demo:** [Minto](https://minto-expense.vercel.app/)  
🌐 **Deployment:** Vercel  
🤖 **Development Approach:** AI-assisted development with OpenAI Codex

---

## ✨ Features

- 🔐 **Authentication** — Register, sign in, and sign out using Better Auth.
- 💰 **Expense Management** — Create, view, edit, and delete expenses.
- 👤 **Private User Data** — Every expense is scoped to its authenticated owner.
- 📊 **Dashboard Overview** — View summary metrics and your latest 100 expenses.
- 🇮🇳 **INR Support** — Format amounts in Indian Rupees while storing money as integer paise (`amountMinor`).
- 🌓 **Theme Switching** — Light and dark themes.
- 📱 **Responsive UI** — Designed for desktop and mobile screens.
- 🛡️ **Server-side Validation** — Validate expense inputs using Zod.
- 🔒 **CSRF Protection** — Protect cookie-authenticated expense mutations with origin checks.

## 🧰 Tech Stack

| Category | Technologies |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Authentication | Better Auth |
| Database | MongoDB, Mongoose |
| Authentication Adapter | Better Auth MongoDB Adapter |
| Validation | Zod |
| Deployment | Vercel |
| AI-assisted Development | OpenAI Codex |

## 🤖 AI-Assisted Development

Minto was developed as an **AI-assisted software engineering project**, using OpenAI Codex as a coding agent alongside manual development and review.

Codex was used to assist with:
- Project implementation across frontend and backend.
- Authentication and API development.
- Database integration and data ownership.
- Debugging, code reviews, and security audits.
- Incremental implementation through structured milestones.

The development process involved reviewing proposed changes, approving implementation steps, inspecting code diffs, running automated checks, and manually testing functionality.

The goal was not simply to generate code with AI, but to learn how to effectively work with AI coding agents while maintaining control over architecture, implementation decisions, and quality.

## 🛠️ Local Development

### Prerequisites

- Node.js **20.19.0 or newer**
- npm
- MongoDB database

### 1. Clone the repository

```bash
git clone https://github.com/amandaiyya/Minto.git
cd expense-tracker-ai
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Configure environment variables

Create a local environment file from the example:

```bash
cp .env.example .env.local
```

In PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Add your own values to `.env.local`:

| Variable | Purpose |
| --- | --- |
| `BETTER_AUTH_SECRET` | Strong random server-side authentication secret, at least 32 characters. |
| `MONGODB_URI` | MongoDB connection string. |
| `BETTER_AUTH_URL` | Canonical application origin. Optional in development; defaults to `http://localhost:3000`. Required as an HTTPS origin in production. |

These variables must remain server-side. Do not prefix them with `NEXT_PUBLIC_` or commit real credentials.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 📡 Expense API

All expense endpoints require a valid Better Auth session. Ownership is derived from the authenticated session, and clients cannot assign or modify an expense's owner.

Mutation requests also require a same-origin `Origin` header, or a same-origin `Referer` when `Origin` is absent.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/expenses` | List the authenticated user's latest 100 expenses. |
| `POST` | `/api/expenses` | Create an expense for the authenticated user. |
| `GET` | `/api/expenses/[id]` | Retrieve one of the authenticated user's expenses. |
| `PATCH` | `/api/expenses/[id]` | Update an existing expense. |
| `DELETE` | `/api/expenses/[id]` | Delete an expense. |

### Expense Payload

Create and update requests use:

- `amountMinor` — Positive safe integer representing paise.
- `description` — Expense description.
- `category` — Expense category.
- `date` — ISO date (`YYYY-MM-DD`) or ISO datetime.

Supported categories:

`food`, `transport`, `housing`, `utilities`, `healthcare`, `shopping`, `entertainment`, `other`.

## 🔑 Authentication

Better Auth handles authentication through:

`/api/auth/[...all]`

The frontend uses the Better Auth browser client for registration, login, session management, and logout.

Session cookies, passwords, tokens, and server credentials must never be exposed in client-side code or logs.

## 📁 Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/     # Better Auth route handler
│   │   └── expenses/          # Expense collection and item APIs
│   ├── login/                 # Login page
│   ├── register/              # Registration page
│   ├── globals.css            # Global styles and themes
│   ├── layout.tsx             # Root layout and metadata
│   └── page.tsx               # Protected dashboard
├── components/                # Dashboard, expense, and auth UI
├── lib/                       # Auth, sessions, MongoDB, CSRF, helpers
└── models/                    # Mongoose schemas
```

## 🚀 Deployment

Minto is deployed on **Vercel**.

Configure the following server-side environment variables in your Vercel project:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `MONGODB_URI`

Use the canonical HTTPS application URL for `BETTER_AUTH_URL`, a strong randomly generated authentication secret, and appropriate MongoDB credentials.

Configure variables for every deployment environment that will run the application, including Production and Preview where applicable.

Never commit secrets or expose them through client-side environment variables.

## 📜 Available Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Check TypeScript types |
| `npm run build -- --webpack` | Create a production build using Webpack |
| `npm start` | Start the production server after building |

## ⚠️ Current Limitations

- Email verification and password recovery are not implemented.
- Expense listing is limited to the latest 100 records; summary metrics reflect that returned collection.
- Charts and pagination are not currently implemented.
- Authentication rate limiting uses process-local storage and should be reviewed for multi-instance production deployments.
- Existing expenses without an owner are not automatically assigned to an account.

---

**Minto** — Built with Next.js, MongoDB, and AI-assisted development using OpenAI Codex. 💚