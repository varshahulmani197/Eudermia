/**
 * Eudermia API Client Service
 */

import {
  SkinAnalysisResult,
  UserRoutine,
  RoutineStep,
  SavedScanRecord,
  SkincareProduct,
  SystemHealthStatus,
} from '../types/skinAnalysis.ts';

export async function fetchHealth(): Promise<SystemHealthStatus> {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`);
  }
  return res.json();
}

/**
 * Initiates skin analysis task.
 */
export async function startSkinAnalysis(
  payload: FormData | { imageBase64?: string; imageUrl?: string }
): Promise<{ taskId: string; status: string }> {
  let res: Response;
  if (payload instanceof FormData) {
    res = await fetch('/api/skin-analysis', {
      method: 'POST',
      body: payload,
    });
  } else {
    res = await fetch('/api/skin-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `Task submission failed (${res.status})`);
  }

  return data;
}

/**
 * Polls the task status for taskId until completion or error.
 */
export async function pollAnalysisTask(
  taskId: string,
  onStatusUpdate?: (status: string, attempt: number) => void,
  maxAttempts: number = 25,
  intervalMs: number = 3000
): Promise<SkinAnalysisResult> {
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    const res = await fetch(`/api/skin-analysis/${encodeURIComponent(taskId)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || data.error || `Polling failed (${res.status})`);
    }

    if (data.status === 'success' && data.result) {
      return data.result as SkinAnalysisResult;
    }

    if (data.status === 'error') {
      const err = data.error;
      throw new Error(err?.message || 'YouCam analysis task failed.');
    }

    if (onStatusUpdate) {
      onStatusUpdate(data.status || 'running', attempt);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Analysis polling timed out after ${maxAttempts} cycles. Please try again.`);
}

/**
 * Skincare Assistant API
 */
export async function askAssistant(
  question: string,
  context?: any,
  chatHistory?: Array<{ role: 'user' | 'model'; text: string }>
): Promise<{ answer: string; suggestedFollowUps?: string[] }> {
  const res = await fetch('/api/skincare-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, context, chatHistory }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to reach AI assistant');
  }

  return data;
}

/**
 * Routines API
 */
export async function fetchUserRoutine(): Promise<{ hasRoutine: boolean; routine: UserRoutine | null }> {
  const res = await fetch('/api/routines');
  if (!res.ok) throw new Error('Failed to load routine');
  return res.json();
}

export async function saveUserRoutine(
  amSteps: RoutineStep[],
  pmSteps: RoutineStep[],
  notes?: string
): Promise<{ success: boolean; routine: UserRoutine }> {
  const res = await fetch('/api/routines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amSteps, pmSteps, notes }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to save routine');
  }
  return res.json();
}

/**
 * Progress Scans API
 */
export async function fetchProgress(): Promise<{
  hasHistory: boolean;
  count: number;
  scans: SavedScanRecord[];
  message?: string;
}> {
  const res = await fetch('/api/progress');
  if (!res.ok) throw new Error('Failed to load progress records');
  return res.json();
}

export async function saveProgressScan(
  record: Partial<SavedScanRecord>
): Promise<{ success: boolean; record: SavedScanRecord }> {
  const res = await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to save scan record');
  }
  return res.json();
}

export async function deleteProgressHistory(): Promise<{ success: boolean }> {
  const res = await fetch('/api/progress', {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete history');
  return res.json();
}

/**
 * Products Catalog API
 */
export async function fetchProducts(): Promise<{
  verifiedCatalog: boolean;
  count: number;
  products: SkincareProduct[];
  disclaimer: string;
}> {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error('Failed to load products');
  return res.json();
}
