# GoalkeeperAI

AI-powered personal scheduler. Input your goals and schedule — GoalkeeperAI uses Gemini to build and manage your week for you.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free)

## Setup

```bash
# 1. Clone the repo and navigate into the project
git clone <repo-url>
cd GoalKeeperAI

# 2. Install dependencies
npm install

# 3. Add your Gemini API key
cp .env.local.example .env.local
# Open .env.local and fill in your key:
# GEMINI_API_KEY=your_key_here

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

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
| `postcss` | ^8 | CSS processing (required by Tailwind) |
| `autoprefixer` | ^10.0.1 | CSS vendor prefixes |
| `eslint` | ^9 | Linting |
| `eslint-config-next` | ^16.1.6 | Next.js ESLint rules |
| `@types/node` | ^20 | Node.js type definitions |
| `@types/react` | ^19 | React type definitions |
| `@types/react-dom` | ^19 | React DOM type definitions |

## Scripts

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Structure

```
GoalKeeperAI/
├── app/
│   ├── api/schedule/route.ts   # POST /api/schedule — calls Gemini
│   ├── layout.tsx
│   └── page.tsx                # Main page (calendar + chat)
├── components/
│   ├── Calendar.tsx            # Weekly calendar grid
│   ├── ChatInput.tsx           # Natural language input bar
│   └── GoalList.tsx            # Goals sidebar
├── lib/
│   └── gemini.ts               # Gemini API wrapper + prompt
├── types/
│   └── index.ts                # Shared TypeScript types
└── .env.local                  # Your API key (never commit this)
```
