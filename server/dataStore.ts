/**
 * Server-side Data Store for Eudermia
 *
 * Stores user-saved routines and genuine skin analysis progress sessions.
 * Never invents mock scans.
 */

import fs from 'fs';
import path from 'path';

export interface RoutineStep {
  id: string;
  name: string;
  category: 'cleanser' | 'toner' | 'serum' | 'eye_cream' | 'moisturizer' | 'sunscreen' | 'treatment' | 'mask';
  timeOfDay: 'am' | 'pm' | 'both';
  instructions?: string;
  order: number;
  completedToday?: boolean;
}

export interface UserRoutine {
  updatedAt: string;
  amSteps: RoutineStep[];
  pmSteps: RoutineStep[];
  notes?: string;
}

export interface SavedScanRecord {
  id: string;
  taskId: string;
  createdAt: string;
  overallScore?: number;
  skinType?: string;
  metrics: {
    moisture?: number | null;
    oiliness?: number | null;
    acne?: number | null;
    redness?: number | null;
    wrinkles?: number | null;
    radiance?: number | null;
    darkCircles?: number | null;
    pores?: number | null;
    firmness?: number | null;
  };
  notes?: string;
  imageThumbnailUrl?: string;
}

const DATA_DIR = path.resolve(process.cwd(), '.eudermia_data');
const SCANS_FILE = path.join(DATA_DIR, 'scans.json');
const ROUTINE_FILE = path.join(DATA_DIR, 'routine.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {
      // fallback in case of read-only fs
    }
  }
}

// In-memory fallback
let memoryScans: SavedScanRecord[] = [];
let memoryRoutine: UserRoutine | null = null;

// Initialize from disk if exists
try {
  ensureDataDir();
  if (fs.existsSync(SCANS_FILE)) {
    const raw = fs.readFileSync(SCANS_FILE, 'utf-8');
    memoryScans = JSON.parse(raw);
  }
  if (fs.existsSync(ROUTINE_FILE)) {
    const raw = fs.readFileSync(ROUTINE_FILE, 'utf-8');
    memoryRoutine = JSON.parse(raw);
  }
} catch {
  // Ignore filesystem errors and use memory
}

export function saveScanRecord(scan: SavedScanRecord): SavedScanRecord {
  // Prevent duplicate taskId
  const existingIdx = memoryScans.findIndex((s) => s.taskId === scan.taskId);
  if (existingIdx >= 0) {
    memoryScans[existingIdx] = scan;
  } else {
    memoryScans.unshift(scan);
  }

  // Keep up to 50 genuine scans
  if (memoryScans.length > 50) {
    memoryScans = memoryScans.slice(0, 50);
  }

  try {
    ensureDataDir();
    fs.writeFileSync(SCANS_FILE, JSON.stringify(memoryScans, null, 2), 'utf-8');
  } catch {
    // Memory store remains valid
  }

  return scan;
}

export function getScanRecords(): SavedScanRecord[] {
  return [...memoryScans];
}

export function clearScanRecords(): boolean {
  memoryScans = [];
  try {
    ensureDataDir();
    if (fs.existsSync(SCANS_FILE)) {
      fs.unlinkSync(SCANS_FILE);
    }
  } catch {
    // ignore
  }
  return true;
}

export function saveUserRoutine(routine: UserRoutine): UserRoutine {
  memoryRoutine = {
    ...routine,
    updatedAt: new Date().toISOString(),
  };

  try {
    ensureDataDir();
    fs.writeFileSync(ROUTINE_FILE, JSON.stringify(memoryRoutine, null, 2), 'utf-8');
  } catch {
    // ignore
  }

  return memoryRoutine;
}

export function getUserRoutine(): UserRoutine | null {
  return memoryRoutine;
}

export function clearUserRoutine(): boolean {
  memoryRoutine = null;
  try {
    ensureDataDir();
    if (fs.existsSync(ROUTINE_FILE)) {
      fs.unlinkSync(ROUTINE_FILE);
    }
  } catch {
    // ignore
  }
  return true;
}
