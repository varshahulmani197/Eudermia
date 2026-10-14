/**
 * YouCam AI Skin Analysis Service (v2.1)
 *
 * Implements the server-to-server (S2S) integration with Perfect Corp's YouCam API:
 * 1. File Upload via POST https://yce-api-01.makeupar.com/s2s/v2.0/file
 * 2. Pre-signed binary upload via PUT to the generated upload URL
 * 3. Task initialization via POST https://yce-api-01.makeupar.com/s2s/v2.1/task/skin-analysis
 * 4. Polling via GET https://yce-api-01.makeupar.com/s2s/v2.1/task/skin-analysis/{task_id}
 */

export interface YouCamRawResponse {
  status?: number;
  data?: {
    task_id?: string;
    task_status?: 'pending' | 'running' | 'success' | 'error' | string;
    result?: Record<string, any>;
    results?: Record<string, any>;
    error?: {
      code?: string | number;
      message?: string;
    };
    [key: string]: any;
  };
  error?: {
    code?: string | number;
    message?: string;
  };
  [key: string]: any;
}

export interface NormalizedMetric {
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

export interface NormalizedSkinAnalysisResult {
  taskId: string;
  status: 'success' | 'error' | 'pending' | 'running';
  analyzedAt: string;
  overallScore?: number;
  skinType?: string;
  metrics: Record<string, NormalizedMetric>;
  sevenAreaSummary: {
    pigmentation: { score: number | null; label: string; available: boolean; note?: string };
    oiliness: { score: number | null; label: string; available: boolean; note?: string };
    acne: { score: number | null; label: string; available: boolean; note?: string };
    redness: { score: number | null; label: string; available: boolean; note?: string };
    undereye: { score: number | null; label: string; available: boolean; note?: string };
    moisture: { score: number | null; label: string; available: boolean; note?: string };
    radiance: { score: number | null; label: string; available: boolean; note?: string };
  };
  rawResponse?: any;
  disclaimer: string;
}

const YOUCAM_BASE_URL = 'https://yce-api-01.makeupar.com';
const SKIN_ANALYSIS_V21_PATH = '/s2s/v2.1/task/skin-analysis';
const FILE_UPLOAD_V20_PATH = '/s2s/v2.0/file';

/**
 * Full action list for SD analysis as defined in the official specification.
 */
export const YOUCAM_ACTIONS = [
  'acne',
  'dark_circle_v2',
  'droopy_lower_eyelid',
  'droopy_upper_eyelid',
  'eye_bag',
  'firmness',
  'moisture',
  'oiliness',
  'pore',
  'radiance',
  'redness',
  'age_spot',
  'texture',
  'wrinkle',
  'skin_type',
  'tear_trough',
];

/**
 * Checks if the YOUCAM_API_KEY environment variable is configured.
 */
export function isYouCamConfigured(): boolean {
  const key = process.env.YOUCAM_API_KEY;
  return typeof key === 'string' && key.trim().length > 0;
}

/**
 * Initiates file upload to YouCam File API and uploads the binary image.
 * Returns the created file_id.
 */
export async function uploadImageToYouCam(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string = 'eudermia_scan.jpg'
): Promise<string> {
  const apiKey = process.env.YOUCAM_API_KEY;
  if (!apiKey) {
    throw new Error(
      'YOUCAM_API_KEY is not configured. Please add YOUCAM_API_KEY in Google AI Studio Secrets settings (Settings > Secrets > YOUCAM_API_KEY).'
    );
  }

  // 1. Request upload URL and file_id from YouCam
  const initResponse = await fetch(`${YOUCAM_BASE_URL}${FILE_UPLOAD_V20_PATH}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: [
        {
          content_type: mimeType,
          file_name: fileName,
          file_size: fileBuffer.length,
        },
      ],
      content_type: mimeType,
      file_name: fileName,
      file_size: fileBuffer.length,
    }),
  });

  if (!initResponse.ok) {
    const errorText = await initResponse.text();
    let parsed: any;
    try {
      parsed = JSON.parse(errorText);
    } catch {
      parsed = null;
    }

    let message = '';
    if (typeof parsed?.error === 'string') {
      message = parsed.error;
    } else if (parsed?.error?.message) {
      message = parsed.error.message;
    } else if (parsed?.message) {
      message = parsed.message;
    } else {
      message = `YouCam File API initialization failed with status ${initResponse.status}`;
    }

    if (parsed?.error_code) {
      message = `[${parsed.error_code}] ${message}`;
    }

    if (initResponse.status === 401 || parsed?.error_code === 'InvalidApiKey') {
      message += ' (The configured YOUCAM_API_KEY is not recognized by YouCam. Please verify you copied the active API Key from https://yce.makeupar.com/api-console/en/api-keys/ rather than an 18-digit Account ID).';
    }

    throw new Error(`YouCam File Upload Error (${initResponse.status}): ${message}`);
  }

  const initData = await initResponse.json();
  const fileItem = initData?.data?.files?.[0] || initData?.files?.[0];
  const fileId =
    fileItem?.file_id ||
    fileItem?.id ||
    initData?.data?.file_id ||
    initData?.file_id ||
    initData?.data?.id;

  // Find the pre-signed upload URL
  const uploadUrl =
    fileItem?.requests?.url ||
    fileItem?.upload_url ||
    initData?.data?.requests?.url ||
    initData?.data?.upload_url ||
    initData?.upload_url ||
    initData?.data?.requests?.[0]?.url;

  const uploadMethod =
    fileItem?.requests?.method ||
    initData?.data?.requests?.method ||
    initData?.data?.method ||
    'PUT';

  const uploadHeaders =
    fileItem?.requests?.headers ||
    initData?.data?.requests?.headers ||
    initData?.data?.headers ||
    { 'Content-Type': mimeType };

  if (!fileId) {
    throw new Error('YouCam File API did not return a valid file_id.');
  }

  // If a pre-signed upload URL is provided, upload the binary buffer
  if (uploadUrl) {
    const binaryResponse = await fetch(uploadUrl, {
      method: uploadMethod,
      headers: {
        'Content-Type': mimeType,
        ...uploadHeaders,
      },
      body: new Uint8Array(fileBuffer),
    });

    if (!binaryResponse.ok) {
      const uploadErrorText = await binaryResponse.text();
      throw new Error(
        `Failed to transfer image to YouCam pre-signed upload URL (${binaryResponse.status}): ${uploadErrorText}`
      );
    }
  }

  return fileId;
}

/**
 * Starts a skin analysis task using either an uploaded file_id or a verified public image URL.
 */
export async function startSkinAnalysisTask(params: {
  fileId?: string;
  fileUrl?: string;
}): Promise<string> {
  const apiKey = process.env.YOUCAM_API_KEY;
  if (!apiKey) {
    throw new Error(
      'YOUCAM_API_KEY is not configured. Please add YOUCAM_API_KEY in Google AI Studio Secrets settings.'
    );
  }

  if (!params.fileId && !params.fileUrl) {
    throw new Error('Either fileId or fileUrl must be provided to start skin analysis.');
  }

  const payload: Record<string, any> = {
    dst_actions: YOUCAM_ACTIONS,
    miniserver_args: {
      enable_mask_overlay: false,
    },
    format: 'json',
    pf_camera_kit: false,
  };

  if (params.fileId) {
    payload.src_file_id = params.fileId;
  } else if (params.fileUrl) {
    payload.src_file_url = params.fileUrl;
  }

  const response = await fetch(`${YOUCAM_BASE_URL}${SKIN_ANALYSIS_V21_PATH}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let parsed: any;
    try {
      parsed = JSON.parse(errorBody);
    } catch {
      parsed = null;
    }

    let errMsg = '';
    if (typeof parsed?.error === 'string') {
      errMsg = parsed.error;
    } else if (parsed?.error?.message) {
      errMsg = parsed.error.message;
    } else if (parsed?.message) {
      errMsg = parsed.message;
    } else {
      errMsg = `YouCam Task creation failed with HTTP ${response.status}`;
    }

    if (parsed?.error_code) {
      errMsg = `[${parsed.error_code}] ${errMsg}`;
    }

    if (response.status === 401 || parsed?.error_code === 'InvalidApiKey') {
      errMsg += ' (The configured YOUCAM_API_KEY is not recognized by YouCam. Please verify you copied the active API Key from https://yce.makeupar.com/api-console/en/api-keys/ rather than an 18-digit Account ID).';
    }

    throw new Error(`YouCam Skin Analysis Creation Error (${response.status}): ${errMsg}`);
  }

  const resultData = await response.json();
  const taskId =
    resultData?.data?.task_id ||
    resultData?.task_id ||
    resultData?.data?.id;

  if (!taskId) {
    throw new Error('YouCam API did not return a task_id.');
  }

  return taskId;
}

/**
 * Polls the YouCam task status for a given task ID.
 */
export async function getTaskStatus(taskId: string): Promise<YouCamRawResponse> {
  const apiKey = process.env.YOUCAM_API_KEY;
  if (!apiKey) {
    throw new Error('YOUCAM_API_KEY is not configured.');
  }

  const url = `${YOUCAM_BASE_URL}${SKIN_ANALYSIS_V21_PATH}/${encodeURIComponent(taskId)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let parsed: any;
    try {
      parsed = JSON.parse(errorBody);
    } catch {
      parsed = null;
    }
    const errMsg =
      parsed?.error?.message ||
      parsed?.message ||
      `Polling failed with HTTP ${response.status}`;
    throw new Error(`YouCam Polling Error (${response.status}): ${errMsg}`);
  }

  return (await response.json()) as YouCamRawResponse;
}

/**
 * Polls the task until completion, failure, or timeout.
 * Polling interval: ~3.5s, max retries: 20 (~70s).
 */
export async function pollUntilComplete(
  taskId: string,
  intervalMs: number = 3500,
  maxRetries: number = 20
): Promise<NormalizedSkinAnalysisResult> {
  let attempts = 0;

  while (attempts < maxRetries) {
    attempts++;
    const response = await getTaskStatus(taskId);
    const data = response?.data || response;
    const taskStatus = (data?.task_status || '').toLowerCase();

    if (taskStatus === 'success') {
      return normalizeYouCamResult(taskId, response);
    }

    if (taskStatus === 'error' || taskStatus === 'failed') {
      const err = data?.error || response?.error;
      const errorMsg =
        err?.message ||
        `Task ended with status "${taskStatus}" (code: ${err?.code || 'unknown'})`;
      throw new Error(`YouCam Skin Analysis Task Failed: ${errorMsg}`);
    }

    // Still pending / running / queued, wait before next attempt
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Analysis task timed out after ${maxRetries} polling cycles (~${Math.round((maxRetries * intervalMs) / 1000)}s). Please try again.`);
}

/**
 * Normalizes raw YouCam v2.1 response into the structured, frontend-safe format.
 * Preserves exact metrics without fabricating missing values.
 */
export function normalizeYouCamResult(
  taskId: string,
  raw: YouCamRawResponse
): NormalizedSkinAnalysisResult {
  const data = raw?.data || raw;
  const rawResults = data?.result || data?.results || {};

  const metrics: Record<string, NormalizedMetric> = {};

  // Helper to extract numeric score safely
  const extractScore = (obj: any): number | null => {
    if (obj === null || obj === undefined) return null;
    if (typeof obj === 'number') return obj;
    if (typeof obj === 'object') {
      if (typeof obj.score === 'number') return obj.score;
      if (typeof obj.value === 'number') return obj.value;
      if (typeof obj.level === 'number') return obj.level;
      if (typeof obj.ui_score === 'number') return obj.ui_score;
    }
    return null;
  };

  // Helper to get severity or classification
  const getSeverity = (score: number | null, inverseGood: boolean = false): NormalizedMetric['severity'] => {
    if (score === null) return undefined;
    if (inverseGood) {
      // Higher is better (e.g., radiance, moisture, firmness)
      if (score >= 80) return 'optimal';
      if (score >= 60) return 'good';
      if (score >= 40) return 'moderate';
      return 'mild';
    } else {
      // Lower is better (e.g., acne, wrinkle, redness, oiliness, pores)
      if (score <= 20) return 'normal';
      if (score <= 45) return 'mild';
      if (score <= 70) return 'moderate';
      return 'high';
    }
  };

  // 1. Acne
  const acneRaw = rawResults.acne;
  const acneScore = extractScore(acneRaw);
  metrics.acne = {
    id: 'acne',
    name: 'Acne & Blemishes',
    category: 'acne',
    value: acneScore,
    severity: getSeverity(acneScore, false),
    description: acneScore !== null ? `Blemish detection level: ${acneScore}/100` : 'Not available in this scan',
    rawValue: acneRaw,
    available: acneScore !== null,
  };

  // 2. Dark Circles
  const darkCircleRaw = rawResults.dark_circle_v2 || rawResults.dark_circle;
  const darkCircleScore = extractScore(darkCircleRaw);
  metrics.dark_circle_v2 = {
    id: 'dark_circle_v2',
    name: 'Dark Circles',
    category: 'undereye',
    value: darkCircleScore,
    severity: getSeverity(darkCircleScore, false),
    description: darkCircleScore !== null ? `Under-eye darkness index: ${darkCircleScore}/100` : 'Not available in this scan',
    rawValue: darkCircleRaw,
    available: darkCircleScore !== null,
  };

  // 3. Eye Bags
  const eyeBagRaw = rawResults.eye_bag;
  const eyeBagScore = extractScore(eyeBagRaw);
  metrics.eye_bag = {
    id: 'eye_bag',
    name: 'Eye Bags',
    category: 'undereye',
    value: eyeBagScore,
    severity: getSeverity(eyeBagScore, false),
    description: eyeBagScore !== null ? `Infraorbital fullness index: ${eyeBagScore}/100` : 'Not available in this scan',
    rawValue: eyeBagRaw,
    available: eyeBagScore !== null,
  };

  // 4. Droopy Upper Eyelid
  const droopyUpperRaw = rawResults.droopy_upper_eyelid;
  const droopyUpperScore = extractScore(droopyUpperRaw);
  metrics.droopy_upper_eyelid = {
    id: 'droopy_upper_eyelid',
    name: 'Upper Eyelid Contour',
    category: 'undereye',
    value: droopyUpperScore,
    severity: droopyUpperScore !== null ? (droopyUpperScore > 50 ? 'moderate' : 'normal') : undefined,
    description: droopyUpperScore !== null ? `Upper lid slackness index: ${droopyUpperScore}/100` : 'Not available in this scan',
    rawValue: droopyUpperRaw,
    available: droopyUpperScore !== null,
  };

  // 5. Droopy Lower Eyelid
  const droopyLowerRaw = rawResults.droopy_lower_eyelid;
  const droopyLowerScore = extractScore(droopyLowerRaw);
  metrics.droopy_lower_eyelid = {
    id: 'droopy_lower_eyelid',
    name: 'Lower Eyelid Contour',
    category: 'undereye',
    value: droopyLowerScore,
    severity: droopyLowerScore !== null ? (droopyLowerScore > 50 ? 'moderate' : 'normal') : undefined,
    description: droopyLowerScore !== null ? `Lower lid contour index: ${droopyLowerScore}/100` : 'Not available in this scan',
    rawValue: droopyLowerRaw,
    available: droopyLowerScore !== null,
  };

  // 6. Tear Trough
  const tearTroughRaw = rawResults.tear_trough;
  const tearTroughScore = extractScore(tearTroughRaw);
  metrics.tear_trough = {
    id: 'tear_trough',
    name: 'Tear Trough Prominence',
    category: 'undereye',
    value: tearTroughScore,
    severity: tearTroughScore !== null ? (tearTroughScore > 50 ? 'moderate' : 'normal') : undefined,
    description: tearTroughScore !== null ? `Nasojugal groove depth: ${tearTroughScore}/100` : 'Not available in this scan',
    rawValue: tearTroughRaw,
    available: tearTroughScore !== null,
  };

  // 7. Firmness
  const firmnessRaw = rawResults.firmness;
  const firmnessScore = extractScore(firmnessRaw);
  metrics.firmness = {
    id: 'firmness',
    name: 'Skin Firmness & Elasticity',
    category: 'aging',
    value: firmnessScore,
    severity: getSeverity(firmnessScore, true),
    description: firmnessScore !== null ? `Dermal resilience score: ${firmnessScore}/100` : 'Not available in this scan',
    rawValue: firmnessRaw,
    available: firmnessScore !== null,
  };

  // 8. Moisture / Hydration
  const moistureRaw = rawResults.moisture;
  const moistureScore = extractScore(moistureRaw);
  metrics.moisture = {
    id: 'moisture',
    name: 'Moisture & Hydration Level',
    category: 'moisture',
    value: moistureScore,
    severity: getSeverity(moistureScore, true),
    description: moistureScore !== null ? `Hydration index: ${moistureScore}/100` : 'Not available in this scan',
    rawValue: moistureRaw,
    available: moistureScore !== null,
  };

  // 9. Oiliness / Sebum
  const oilinessRaw = rawResults.oiliness;
  const oilinessScore = extractScore(oilinessRaw);
  metrics.oiliness = {
    id: 'oiliness',
    name: 'Surface Oiliness & Sebum',
    category: 'oiliness',
    value: oilinessScore,
    severity: getSeverity(oilinessScore, false),
    description: oilinessScore !== null ? `Sebum activity level: ${oilinessScore}/100` : 'Not available in this scan',
    rawValue: oilinessRaw,
    available: oilinessScore !== null,
  };

  // 10. Pores
  const poreRaw = rawResults.pore;
  const poreScore = extractScore(poreRaw);
  metrics.pore = {
    id: 'pore',
    name: 'Pore Visibility & Refinement',
    category: 'texture',
    value: poreScore,
    severity: getSeverity(poreScore, false),
    description: poreScore !== null ? `Pore prominence index: ${poreScore}/100` : 'Not available in this scan',
    rawValue: poreRaw,
    available: poreScore !== null,
  };

  // 11. Radiance
  const radianceRaw = rawResults.radiance;
  const radianceScore = extractScore(radianceRaw);
  metrics.radiance = {
    id: 'radiance',
    name: 'Skin Radiance & Luminosity',
    category: 'radiance',
    value: radianceScore,
    severity: getSeverity(radianceScore, true),
    description: radianceScore !== null ? `Luminosity score: ${radianceScore}/100` : 'Not available in this scan',
    rawValue: radianceRaw,
    available: radianceScore !== null,
  };

  // 12. Redness / Sensitivity
  const rednessRaw = rawResults.redness;
  const rednessScore = extractScore(rednessRaw);
  metrics.redness = {
    id: 'redness',
    name: 'Erythema & Redness',
    category: 'redness',
    value: rednessScore,
    severity: getSeverity(rednessScore, false),
    description: rednessScore !== null ? `Redness irritation index: ${rednessScore}/100` : 'Not available in this scan',
    rawValue: rednessRaw,
    available: rednessScore !== null,
  };

  // 13. Age Spots / Pigmentation
  const ageSpotRaw = rawResults.age_spot || rawResults.spot;
  const ageSpotScore = extractScore(ageSpotRaw);
  metrics.age_spot = {
    id: 'age_spot',
    name: 'Age Spots & Hyperpigmentation',
    category: 'pigmentation',
    value: ageSpotScore,
    severity: getSeverity(ageSpotScore, false),
    description: ageSpotScore !== null ? `Pigment irregularity level: ${ageSpotScore}/100` : 'Not available in this scan',
    rawValue: ageSpotRaw,
    available: ageSpotScore !== null,
  };

  // 14. Texture
  const textureRaw = rawResults.texture;
  const textureScore = extractScore(textureRaw);
  metrics.texture = {
    id: 'texture',
    name: 'Surface Smoothness & Texture',
    category: 'texture',
    value: textureScore,
    severity: getSeverity(textureScore, false),
    description: textureScore !== null ? `Surface micro-relief index: ${textureScore}/100` : 'Not available in this scan',
    rawValue: textureRaw,
    available: textureScore !== null,
  };

  // 15. Wrinkles
  const wrinkleRaw = rawResults.wrinkle;
  const wrinkleScore = extractScore(wrinkleRaw);
  metrics.wrinkle = {
    id: 'wrinkle',
    name: 'Fine Lines & Wrinkles',
    category: 'aging',
    value: wrinkleScore,
    severity: getSeverity(wrinkleScore, false),
    description: wrinkleScore !== null ? `Line depth & prominence: ${wrinkleScore}/100` : 'Not available in this scan',
    rawValue: wrinkleRaw,
    available: wrinkleScore !== null,
  };

  // 16. Skin Type
  const skinTypeRaw = rawResults.skin_type;
  let detectedSkinType = 'Normal';
  let skinTypeAvailable = false;
  if (skinTypeRaw) {
    skinTypeAvailable = true;
    if (typeof skinTypeRaw === 'string') {
      detectedSkinType = skinTypeRaw;
    } else if (skinTypeRaw.type || skinTypeRaw.result || skinTypeRaw.name) {
      detectedSkinType = String(skinTypeRaw.type || skinTypeRaw.result || skinTypeRaw.name);
    }
  }

  metrics.skin_type = {
    id: 'skin_type',
    name: 'Skin Type Classification',
    category: 'oiliness',
    value: skinTypeAvailable ? detectedSkinType : null,
    description: skinTypeAvailable ? `Identified phenotype: ${detectedSkinType}` : 'Not available in this scan',
    rawValue: skinTypeRaw,
    available: skinTypeAvailable,
  };

  // Seven-Area Overview mapping (clearly labeled synthesis)
  // 1. Pigmentation -> age_spot
  // 2. Oiliness -> oiliness
  // 3. Acne -> acne
  // 4. Redness -> redness
  // 5. Under-eye appearance -> composite of dark circles, eye bags, tear trough
  // 6. Moisture -> moisture
  // 7. Radiance -> radiance

  const undereyeCandidates = [darkCircleScore, eyeBagScore, tearTroughScore].filter(
    (s): s is number => s !== null
  );
  const undereyeAvg =
    undereyeCandidates.length > 0
      ? Math.round(undereyeCandidates.reduce((a, b) => a + b, 0) / undereyeCandidates.length)
      : null;

  const sevenAreaSummary = {
    pigmentation: {
      score: ageSpotScore,
      label: ageSpotScore !== null ? `${ageSpotScore}/100` : 'Unavailable',
      available: ageSpotScore !== null,
      note: 'Mapped from YouCam age_spot metric',
    },
    oiliness: {
      score: oilinessScore,
      label: oilinessScore !== null ? `${oilinessScore}/100` : 'Unavailable',
      available: oilinessScore !== null,
      note: 'Mapped from YouCam oiliness metric',
    },
    acne: {
      score: acneScore,
      label: acneScore !== null ? `${acneScore}/100` : 'Unavailable',
      available: acneScore !== null,
      note: 'Mapped from YouCam acne metric',
    },
    redness: {
      score: rednessScore,
      label: rednessScore !== null ? `${rednessScore}/100` : 'Unavailable',
      available: rednessScore !== null,
      note: 'Mapped from YouCam redness metric',
    },
    undereye: {
      score: undereyeAvg,
      label: undereyeAvg !== null ? `${undereyeAvg}/100` : 'Unavailable',
      available: undereyeAvg !== null,
      note: 'Synthesized by Eudermia from dark circles, eye bags & tear trough metrics',
    },
    moisture: {
      score: moistureScore,
      label: moistureScore !== null ? `${moistureScore}/100` : 'Unavailable',
      available: moistureScore !== null,
      note: 'Mapped from YouCam moisture metric',
    },
    radiance: {
      score: radianceScore,
      label: radianceScore !== null ? `${radianceScore}/100` : 'Unavailable',
      available: radianceScore !== null,
      note: 'Mapped from YouCam radiance metric',
    },
  };

  // Calculate overall skin score if valid metrics exist
  const scoreMetrics = [
    moistureScore,
    radianceScore,
    firmnessScore,
    acneScore !== null ? 100 - acneScore : null,
    rednessScore !== null ? 100 - rednessScore : null,
    wrinkleScore !== null ? 100 - wrinkleScore : null,
  ].filter((s): s is number => s !== null);

  const overallScore =
    scoreMetrics.length > 0
      ? Math.round(scoreMetrics.reduce((a, b) => a + b, 0) / scoreMetrics.length)
      : undefined;

  return {
    taskId,
    status: 'success',
    analyzedAt: new Date().toISOString(),
    overallScore,
    skinType: skinTypeAvailable ? detectedSkinType : undefined,
    metrics,
    sevenAreaSummary,
    rawResponse: data,
    disclaimer:
      'Cosmetic assessment provided via YouCam AI Skin Analysis API v2.1. This is not a medical diagnosis or clinical evaluation. For persistent, painful, or concerning dermatological issues, consult a board-certified dermatologist.',
  };
}
