# GoalkeeperAI

AI-powered personal scheduler. Chat with Pebble to set goals and deadlines — it finds free time in your calendar and schedules focused work blocks ("Pebbles") optimized for sleep, productivity, or fitness.

## Features

- **Chat-based scheduling** — describe a goal and Pebble schedules it automatically
- **Global optimization modes** — switch between 🌙 Sleep, ⚡ Productivity, and 💪 Fitness to apply science-backed scheduling rules
- **Global reschedule** — generate 3 full rescheduled previews and apply the one you like
- **Google Calendar import** — pull in existing events so Pebble schedules around your real commitments
- **Weekly review & scoring** — track completion and get a scored breakdown of your week
- **Daily check-in** — Pebble asks which sessions you completed each day

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, API routes) |
| UI | [React 19](https://react.dev/) + [Tailwind CSS 3](https://tailwindcss.com/) |
| AI | [Google Gemini 2.5 Flash](https://aistudio.google.com/) via `@google/generative-ai` |
| Auth / Calendar | Google OAuth 2.0 + Google Calendar API |
| Deployment | [Vercel](https://vercel.com/) |
| Language | TypeScript 5 |

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier works)
- (Optional) Google OAuth credentials for Calendar import

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/yeet302/GoalKeeperAI.git
cd GoalKeeperAI

# 2. Install dependencies
npm install

# 3. Add environment variables
cp .env.local.example .env.local
# Fill in .env.local:
# GEMINI_API_KEY=your_key_here
# GOOGLE_CLIENT_ID=...        (optional, for Google Calendar)
# GOOGLE_CLIENT_SECRET=...    (optional, for Google Calendar)

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key from [aistudio.google.com](https://aistudio.google.com) |
| `GOOGLE_CLIENT_ID` | No | OAuth client ID for Google Calendar integration |
| `GOOGLE_CLIENT_SECRET` | No | OAuth client secret for Google Calendar integration |

## Dependencies

### Runtime
| Package | Version | Purpose |
|---|---|---|
| `next` | ^16.1.6 | Full-stack React framework (routing, API routes) |
| `react` | ^19.0.0 | UI library |
| `react-dom` | ^19.0.0 | React DOM renderer |
| `@google/generative-ai` | ^0.21.0 | Gemini API client |

### Dev
| Package | Version | Purpose |
|---|---|---|
| `typescript` | ^5 | Type safety |
| `tailwindcss` | ^3.4.1 | Utility-first CSS |
| `postcss` | ^8 | CSS processing |
| `autoprefixer` | ^10.0.1 | CSS vendor prefixes |
| `eslint` | ^9 | Linting |
| `eslint-config-next` | ^16.1.6 | Next.js ESLint rules |
| `@types/node` | ^20 | Node.js type definitions |
| `@types/react` | ^19 | React type definitions |
| `@types/react-dom` | ^19 | React DOM type definitions |

## Scripts

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

## Project Structure

```
GoalKeeperAI/
├── app/
│   ├── api/
│   │   ├── schedule/route.ts       # POST /api/schedule — chat + scheduling
│   │   ├── reschedule/route.ts     # POST /api/reschedule — global reschedule (3 options)
│   │   ├── score/route.ts          # POST /api/score — weekly score
│   │   └── auth/google/            # Google OAuth flow
│   ├── layout.tsx
│   └── page.tsx                    # Main app shell
├── components/
│   ├── Calendar.tsx                # Week/month/year calendar with optimization mode tabs
│   ├── Chat.tsx                    # Chat message list
│   ├── ChatInput.tsx               # Message input
│   ├── GoalList.tsx                # Goals sidebar
│   ├── Landing.tsx                 # Onboarding / calendar import screen
│   ├── SchedulePickerModal.tsx     # 3-option reschedule preview modal
│   ├── ScoreCard.tsx               # Detailed weekly score breakdown
│   ├── ScorePanel.tsx              # Sidebar score summary
│   └── WeeklyReview.tsx            # Weekly review form
├── lib/
│   ├── gemini.ts                   # Gemini prompts, chat(), buildSystemPrompt()
│   ├── reschedule.ts               # generateRescheduleOptions() for global reschedule
│   ├── google-calendar.ts          # Google Calendar API helpers
│   ├── ics-parser.ts               # ICS file parser for calendar import
│   └── scoring.ts                  # Weekly score calculation prompt
├── types/
│   └── index.ts                    # Shared TypeScript types
└── .env.local                      # API keys (never commit)
```
