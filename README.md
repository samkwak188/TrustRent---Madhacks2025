## TrustRent – Evidence-First Move‑In Inspections for Renters and Property Managers

TrustRent is a production‑ready web app that helps renters **prove the true condition of their unit** and helps property managers **standardize move‑in inspections** across entire portfolios.

Renters use a guided checklist, photos, and AI‑assisted lease analysis to create a defensible inspection report. Property managers invite renters via email, track participation, and access submitted PDFs for every unit.

---

### 🎯 What Problem Does TrustRent Solve?

Move‑in inspections today are usually:

- Paper checklists that get lost or never fully filled out  
- Photos scattered across phones with no structure or narrative  
- No standard process across buildings or leasing teams  
- Security‑deposit disputes where it becomes **“my word vs. yours”**  

This hurts:

- **Renters**, who often lose money because they can’t prove pre‑existing damage.  
- **Property managers and owners**, who waste time on disputes and lack a consistent inspection workflow.  

TrustRent turns this into a **structured, auditable process** with a clear digital paper trail.

---

### 👥 Who TrustRent Is For

- **Renters / Tenants**
  - Guided move‑in checklist with photo evidence  
  - One place to store inspection data and a final PDF report  

- **Property Managers & Owners**
  - Invite renters with a 6‑digit token and email  
  - Portfolio view of buildings, units, invitations, and active renters  
  - Downloadable PDFs for each unit’s inspection record  

- **Leasing / Ops Teams**
  - Standardized inspection workflow across properties  
  - Central source of truth for internal questions and deposit disputes  

---

### ✨ Core Features

- **Token‑based renter onboarding**
  - Admins create a company, apartments, and units.  
  - Each renter receives a unique 6‑digit **access token** by email with a link to the hosted app (`/access`).  
  - Renter verifies the token and creates an account tied to the correct unit and company.  

- **Guided move‑in checklist from a photo**
  - Renter takes a photo of the paper checklist.  
  - The app calls an AI service to parse the image into structured checklist items.  
  - Renter can rename items, add notes, and organize them into meaningful categories.  

- **Move‑in / move‑out photos per checklist item**
  - For each item, renters can capture **move‑in** and **move‑out** photos (or short videos).  
  - Photos are timestamped and attached to the specific area (e.g. “Bedroom wall by window”).  
  - UI suggests time windows for fairness but still allows late uploads so renters can always finish their report.  

- **AI‑assisted lease advisor**
  - Separate “Lease Advisor” tab where renters upload a lease PDF or paste text.  
  - Backend uses Google Gemini to:
    - Summarize key clauses  
    - Highlight important information tenants often forget  
    - Surface local/legal considerations and risks  
  - Output is structured into clear sections that are easy to skim on mobile.  

- **PDF report generation & submission**
  - The client compiles checklist items, notes, and photos into a clean PDF using `pdf-lib`.  
  - The PDF is submitted to the backend and stored in the database (as base64 text) along with metadata (renter, unit, timestamps, size).  
  - Renters can:
    - Download the PDF for their own records  
    - Submit a “final” report to their property manager  

- **Admin dashboard for buildings, renters, and submissions**
  - Admin login for property managers.  
  - Register a company, add apartment buildings and units.  
  - Generate renter invitations with tokens and track statuses: **pending / used / active**.  
  - View active renters, their move‑in dates, and submitted inspection PDFs.  

---

### 🧱 High‑Level Architecture & Tech Stack

- **Framework & UI**
  - **Next.js 16 App Router** (`src/app/**`)  
  - **React 19** with TypeScript  
  - Styling via utility classes defined in `globals.css`  
  - Mobile‑first UX designed for renters on phones  

- **Routing & Pages (selected)**
  - `landing/` – marketing / entry page  
  - `access/` – renter token entry (6‑digit access token)  
  - `register/` – renter account creation, pre‑filled from invitation  
  - `renter/login/` – renter login  
  - `app/` – renter inspection app (checklist, photos, lease advisor, PDF)  
  - `admin/` – admin dashboard for invitations, units, and submissions  
  - `admin/login/`, `admin/signup/` – admin auth flows  
  - `company/register/` – property manager company + portfolio onboarding  

- **API & Backend (Next.js Route Handlers)**
  - `src/app/api/**` contains all server endpoints, including:
    - `admin/*` – admin auth, sessions, and renter listing  
    - `renters/*` – renter auth, draft storage, and session lookups  
    - `company/register` – create company + apartments + units + invitations  
    - `portfolio/*` – load/save portfolio, send and withdraw invites  
    - `invitations/[token]` – load invitation preview from a token  
    - `validate-token` – verify a renter’s 6‑digit access token  
    - `renter-submissions/*` – accept and serve submitted inspection PDFs  
    - `analyze-lease` / `parse-checklist` – AI endpoints that call Google Gemini  

- **Database & Persistence**
  - **PostgreSQL** with **Drizzle ORM** (`src/server/db/schema.ts`)  
  - Key tables:
    - `rental_companies`, `apartment_buildings`, `rental_units`  
    - `renter_invitations` with `accessToken`, status, timestamps  
    - `renters`, `renter_sessions` (cookie‑backed auth)  
    - `submissions` (final PDFs + metadata)  
    - `renter_drafts` (JSON snapshot of in‑progress checklists and photos)  
  - Database client via `drizzle-orm/node-postgres` in `src/server/db/client.ts`.  

- **Authentication & Invitations**
  - Cookie‑based sessions for admins and renters.  
  - Renter onboarding flow:
    1. Admin generates invitations (one per renter & unit).  
    2. System reserves a **unique 6‑digit `accessToken`** in `renter_invitations`.  
    3. Email is sent with the token and link to the hosted `/access` page.  
    4. Renter validates the token, then registers and logs in.  
    5. Once the invitation is used, status is updated (for example, to `used` or `active`).  

- **Email Delivery**
  - **SendGrid** via `@sendgrid/mail` (`src/server/email.ts`).  
  - Invitation email includes:
    - Renter name, company, building, unit  
    - The 6‑digit access token  
    - Direct link to the deployed TrustRent access page  
  - If API key or sender is missing, the server logs a warning and skips sending (useful for local development).  

- **AI & Document Processing**
  - Google **Gemini 1.5 Flash** (via `@google/generative-ai`) for:
    - Parsing checklist photos into structured items (`parse-checklist` route)  
    - Analyzing lease PDFs or pasted text (`analyze-lease` route)  
  - Prompts are tuned to produce:
    - Clear sections (key info, forgotten details, legal context, risks)  
    - Tenant‑friendly language in multiple supported languages.  

- **PDF Generation**
  - `pdf-lib` is used client‑side to:
    - Lay out renter profile, dates, and unit info  
    - Render checklist items with notes  
    - Embed move‑in / move‑out photos with timestamps  
  - Final PDF is uploaded via `FormData` to `api/renter-submissions` and stored in Postgres.  

- **Hosting / Deployment**
  - Designed to run on platforms like **Render**, with:
    - Continuous deployment from GitHub  
    - Environment variables for DB connection, SendGrid, and AI keys  

---

### 🔁 End‑to‑End Flow Summary

1. **Property manager onboards**
   - Registers a company, adds buildings and units.  
   - Generates renter invitations (one per unit) with 6‑digit access tokens.  

2. **Renter receives email**
   - Invitation email from SendGrid contains the token and link to the `/access` page.  

3. **Renter verifies token and registers**
   - Enters token on the access page, sees unit + building information.  
   - Creates an account and is redirected into the TrustRent app.  

4. **Renter completes move‑in inspection**
   - Uploads a checklist photo → AI parses into items.  
   - Edits labels, adds notes, and captures move‑in photos for each item.  
   - Optionally uses Lease Advisor to understand the lease.  

5. **Renter generates & submits final PDF**
   - Downloads a personal copy.  
   - Submits a final PDF to the property manager; submission is stored in Postgres.  

6. **Admin reviews**
   - Uses the admin dashboard to view invitations, active renters, and submission history.  
   - Downloads the renter’s PDF for records or to resolve any future disputes.  

---

TrustRent is built to be **practical enough for real properties** and **friendly enough for first‑time renters**.  
If you’re extending it, start by exploring `src/app/app/page.tsx` (renter experience), `src/app/admin/page.tsx` (admin dashboard), and `src/server/**/*` (database + email + AI integration).