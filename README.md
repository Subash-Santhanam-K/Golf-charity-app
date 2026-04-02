# 🏌️ Golf Charity Sweepstakes Platform

> **Play. Win. Make an Impact ❤️**

A production-grade golf-themed sweepstakes platform where users subscribe monthly, submit golf scores, participate in draws, win tier-based rewards, and contribute to charities — all through an emotionally engaging, animated dashboard.

---

## 🌟 Overview

This isn't just another full-stack project — it's a **complete product experience** built with real-world system design principles.

- **What it does:** Monthly sweepstakes where golf scores are matched against a randomized draw. Winners receive prize payouts from a pooled fund, with a portion going to charity.
- **Who it's for:** Golf enthusiasts who want to compete, win, and give back.
- **Why it's unique:** Implements a real financial distribution engine with jackpot rollover, fraud prevention via score locking, admin verification workflows, and charity impact tracking.

---

## ✨ Key Features

### 🎯 Core Platform
- **Subscription system** — Monthly/Yearly plans with active status tracking
- **Score tracking** — Submit golf scores (1–45), max 5 per cycle
- **Monthly draw system** — Random or algorithm-weighted number generation
- **Match-based rewards** — 3, 4, or 5 number matches unlock tiered prizes

### 🏆 Winner Verification System
- **Proof upload** — Winners upload image proof (PNG/JPEG, 5MB limit) via Supabase Storage
- **Admin approval workflow** — Approve / Reject / Mark as Paid pipeline
- **Payment tracking** — Full status lifecycle: Pending → Approved → Paid
- **Fraud prevention** — Only eligible winners can upload; duplicates blocked

### 💰 Prize Pool Distribution Engine
- **40/35/25 tier split** — Jackpot (5-match), Tier 2 (4-match), Tier 3 (3-match)
- **Equal distribution** — Each tier's pool splits equally among its winners
- **Jackpot rollover** — If no 5-match winners, the jackpot carries to next month
- **Score locking** — Cutoff dates prevent post-draw score manipulation

### 👨‍💼 Admin Dashboard
- **Draw management** — Create, review, and publish monthly draws
- **Winners verification console** — Table with status filters, proof viewer, action buttons
- **User management** — View all users with roles and subscription status
- **Charity CRUD** — Add, edit, delete charities with image/emoji support
- **Financial overview** — Pool breakdown, tier distribution, jackpot carry display

### 🌱 Charity System
- **Charity selection** — Choose from available organizations
- **Contribution slider** — Set percentage (10–100%) of impact allocation
- **Global impact tracker** — Animated counters showing community-wide contributions

### 📊 User Dashboard
- **Hero section** — "Play. Win. Make an Impact" with 3-card stats bar
- **Participation summary** — Draws entered, total rounds, current month status
- **Winnings overview** — Total earned, latest win details, payment status
- **Tournament results** — 3D animated draw reveal with match highlighting
- **Guided onboarding** — 5-step walkthrough for first-time users
- **Toast notifications** — Global success/error/info system with animations

---

## 🧠 System Design Highlights

### Prize Pool Calculation
- Pool = `active subscribers × subscription price`
- Previous month's unclaimed jackpot is added to the current pool

### Jackpot Rollover
- If no one matches all 5 numbers, the 40% jackpot portion carries forward
- Stored as `jackpot_carry` on the draw record for next-month chaining

### Fairness Engine
- `cutoff_date` is set when the draw is created
- `publishDraw()` uses `getUserScoresBeforeCutoff()` to snapshot only pre-cutoff scores
- Score submission is locked after draw publication via `checkTournamentOpen()`
- Double-publish prevention ensures results cannot be re-computed

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, TypeScript) |
| **Database & Auth** | Supabase (PostgreSQL, Auth, Storage) |
| **Styling** | Tailwind CSS |
| **Animations** | Framer Motion |
| **Deployment** | Vercel |

---

## 🔐 Authentication

- **Supabase Auth** with email/password signup
- **Email verification** — Premium modal with animated golf ball icon, 30-second resend cooldown
- **Session-based routing** — Protected dashboard and admin routes
- **Role-based access** — Admin panel restricted to `role: 'admin'` users

---

## ⚙️ Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/your-username/golf-charity-app.git
cd golf-charity-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 🚀 Deployment

- **Platform:** Vercel
- **Auto-deploy:** Pushes to `main` trigger automatic production builds
- **Environment:** Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel project settings

---

## 👤 Demo Flow

### User Journey
1. Sign up → Email verification modal
2. First-time onboarding walkthrough
3. Submit golf scores (1–45)
4. View monthly draw results with animated reveal
5. Select a charity and set contribution percentage
6. Track winnings and participation history

### Admin Access
1. Navigate to `/admin`
2. Create and publish monthly draws
3. Review winners, approve/reject, mark as paid
4. Manage users and charities

---

## 🗂 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── dashboard/page.tsx    # User dashboard
│   ├── admin/page.tsx        # Admin panel
│   ├── (auth)/               # Login & Signup
│   └── globals.css           # Design system
├── lib/
│   ├── supabaseClient.ts     # Supabase initialization
│   ├── auth.ts               # Authentication helpers
│   ├── scores.ts             # Score management + fairness
│   ├── draw.ts               # Draw generation + publishing
│   ├── prize.ts              # Prize distribution engine
│   ├── winners.ts            # Winner verification + proofs
│   ├── charity.ts            # Charity data + impact
│   ├── admin.ts              # Admin data management
│   └── onboarding.ts         # Onboarding state
├── components/
│   ├── onboarding/           # Walkthrough modal
│   ├── auth/                 # Email verification modal
│   └── ui/                   # CountUp, shared components
└── hooks/
    └── useToast.tsx           # Global toast system
```

---

## 🎯 Future Improvements

- **Stripe integration** for real payment processing
- **Live payouts** via bank transfer or UPI
- **Email notifications** for draw results and payment confirmations
- **Leaderboard** with monthly rankings
- **Mobile app** with React Native

---

## ❤️ Final Note

This project was built with a focus on **real-world system design**, **fairness**, and **meaningful impact**. Every feature — from the jackpot rollover engine to the animated draw reveal — was crafted to demonstrate production-level thinking, not just functionality.

> *"Every round you play helps someone, somewhere."*
