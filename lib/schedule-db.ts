import { promises as fs } from "fs";
import path from "path";
import { ScheduleState } from "@/types";

const DEFAULT_STATE: ScheduleState = { events: [], goals: [] };
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "schedule-db.json");

async function ensureDbFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
  }
}

export async function readScheduleDb(): Promise<ScheduleState> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw) as ScheduleState;
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export async function writeScheduleDb(state: ScheduleState): Promise<void> {
  await ensureDbFile();
  await fs.writeFile(DB_FILE, JSON.stringify(state, null, 2), "utf8");
}

export async function resetScheduleDb(): Promise<void> {
  await writeScheduleDb(DEFAULT_STATE);
}

