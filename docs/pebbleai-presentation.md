---
marp: true
theme: default
paginate: true
title: PebbleAI - Product Presentation
---

# PebbleAI
## AI-Powered Personal Scheduling with Pebble

- Turn goals into calendar time blocks automatically
- Optimize for sleep, productivity, or fitness
- Built with Next.js, React, Gemini, and Google Calendar

---

# The Problem

Most people do not fail at goals because of motivation.
They fail because goals never get translated into protected time.

- Calendars are already full
- Planning is manual and inconsistent
- One-size-fits-all schedules ignore personal constraints

---

# Our Solution

PebbleAI introduces **Pebble**, a chat-based scheduling assistant.

1. User describes a goal and deadline
2. Pebble finds real free slots around existing commitments
3. Pebble creates focused work blocks ("Pebbles")
4. User tracks execution with daily check-ins and weekly scoring

---

# Core Experience

- Conversational onboarding collects profile context:
  - wake/sleep times
  - energy peak
  - preferred block length
  - free days
- Goal scheduling from natural language
- Calendar-first interface (week, month, year)
- Edit, delete, and complete events directly in calendar

---

# Differentiator: Optimization Modes

Users can switch planning strategy instantly:

- **Sleep mode**: protects wind-down and avoids late stimulating blocks
- **Productivity mode**: aligns deep work with energy peak windows
- **Fitness mode**: spaces workouts for recovery and consistency

This makes scheduling adaptive to user intent, not static templates.

---

# Differentiator: Global Reschedule

Single click -> generate 3 complete schedule previews:

- Sleep-optimized timeline
- Productivity-optimized timeline
- Fitness-optimized timeline

Users compare options visually and apply the best one.

---

# Intelligence Layer

Gemini powers:

- Goal interpretation from chat
- Safe schedule diffs (add/update/remove events/goals)
- Personalized optimization logic from user profile
- Weekly wellness scoring with category-level feedback

Safety constraints in prompt/system logic:

- Never modify imported calendar commitments
- Preserve event IDs on reschedule
- Respect wake/sleep boundaries and free-day preferences

---

# Integration and Architecture

## Frontend
- Next.js App Router + React 19 + Tailwind CSS
- Main shell: calendar, goals sidebar, assistant chat panel

## Backend APIs
- `POST /api/schedule` for chat + scheduling
- `POST /api/reschedule` for optimization previews
- `POST /api/score` for weekly health/performance score

## Data Sources
- Local state persistence for fast UX
- Optional Google Calendar OAuth import

---

# Outcomes for Users

- Faster conversion of goals into action
- Better alignment between schedule and personal physiology
- Reduced planning overhead
- More accountability via:
  - daily completion check-ins
  - weekly score panel and deep-dive review

---

# Demo Script (5 Minutes)

1. Start from landing screen
2. Import Google Calendar (or skip)
3. Set a goal with deadline in chat
4. Show Pebbles on week view
5. Toggle optimization modes
6. Open Reschedule and compare 3 previews
7. Apply one option
8. Open Week Score and explain insights

---

# Why This Matters

Calendars are where intentions become behavior.

PebbleAI closes the gap between:

- what users want to do
- what their week actually allows

This creates a practical, personalized operating system for progress.

---

# Next Steps

- Team/coach shared plans and accountability
- Mobile-first companion experience
- Habit streak and outcome tracking
- Smarter long-range planning over multi-week horizons
- Experiments to quantify retention and goal completion lift

---

# Thank You

## PebbleAI
**Chat. Schedule. Execute. Improve.**

Questions?
