/**
 * Eudermia Skin Analysis & Routine Type Definitions
 */

export interface MetricDetail {
  id: string;
  name: string;
  category: 'pigmentation' | 'oiliness' | 'acne' | 'redness' | 'undereye' | 'moisture' | 'radiance' | 'aging' | 'texture';
  value: number | string | null;
  unit?: string;
  severity?: 'normal' | 'mild' | 'moderate' | 'high' | 'severe' | 'good' | 'optimal';
  description: string;
  rawValue?: any;
  available: boolean;
}

export interface SevenAreaSummary {
  pigmentation: { score: number | null; label: string; available: boolean; note?: string };
  oiliness: { score: number | null; label: string; available: boolean; note?: string };
  acne: { score: number | null; label: string; available: boolean; note?: string };
  redness: { score: number | null; label: string; available: boolean; note?: string };
  undereye: { score: number | null; label: string; available: boolean; note?: string };
  moisture: { score: number | null; label: string; available: boolean; note?: string };
  radiance: { score: number | null; label: string; available: boolean; note?: string };
}

export interface SkinAnalysisResult {
  taskId: string;
  status: 'success' | 'error' | 'pending' | 'running';
  analyzedAt: string;
  overallScore?: number;
  skinType?: string;
  metrics: Record<string, MetricDetail>;
  sevenAreaSummary: SevenAreaSummary;
  rawResponse?: any;
  disclaimer: string;
}

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

export interface SkincareProduct {
  id: string;
  name: string;
  brand: string;
  category: 'cleanser' | 'toner' | 'serum' | 'eye_cream' | 'moisturizer' | 'sunscreen' | 'treatment' | 'mask';
  timeOfDay: 'am' | 'pm' | 'both';
  budget: '$' | '$$' | '$$$';
  targetConcerns: string[];
  keyIngredients: string[];
  description: string;
  instructions: string;
  patchTestAdvice: string;
  verified: boolean;
}

export interface SystemHealthStatus {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  config: {
    youcamConfigured: boolean;
    geminiConfigured: boolean;
    youcamKeyWarning?: string;
  };
  message: string;
}
