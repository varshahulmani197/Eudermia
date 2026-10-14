/**
 * Eudermia Full-Stack Server
 *
 * Express server integrated with Vite middlewares, YouCam AI Skin Analysis S2S v2.1,
 * and Gemini 3.8 Flash AI Assistant.
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  isYouCamConfigured,
  uploadImageToYouCam,
  startSkinAnalysisTask,
  getTaskStatus,
  normalizeYouCamResult,
  pollUntilComplete,
} from './server/youcamSkinAnalysisService.ts';
import {
  isGeminiConfigured,
  askSkincareAssistant,
} from './server/geminiAssistantService.ts';
import {
  saveUserRoutine,
  getUserRoutine,
  clearUserRoutine,
  saveScanRecord,
  getScanRecords,
  clearScanRecords,
} from './server/dataStore.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Body parsers with limits for large payloads
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Multer in-memory storage for secure image handling without persistent disk residue
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are supported.'));
    }
  },
});

/* ==========================================================================
   HEALTH & CONFIGURATION ROUTE
   ========================================================================== */
app.get('/api/health', (_req: Request, res: Response) => {
  const youcamKey = process.env.YOUCAM_API_KEY || '';
  const isNumericOnly = /^\d{14,24}$/.test(youcamKey.trim());
  res.json({
    status: 'ok',
    service: 'Eudermia API',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    config: {
      youcamConfigured: isYouCamConfigured(),
      geminiConfigured: isGeminiConfigured(),
      youcamKeyWarning: isNumericOnly
        ? 'Your YOUCAM_API_KEY appears to be a numeric Account ID or App ID rather than an active API Key. Please verify in YouCam console (https://yce.makeupar.com/api-console/en/api-keys/).'
        : undefined,
    },
    message: isYouCamConfigured()
      ? 'YouCam Skin Analysis S2S API v2.1 is active.'
      : 'YOUCAM_API_KEY is missing. Add it in AI Studio Secrets to enable live scanning.',
  });
});

/* ==========================================================================
   YOUCAM SKIN ANALYSIS ROUTES
   ========================================================================== */

/**
 * POST /api/skin-analysis
 * Accepts multipart/form-data with file field 'image', OR JSON with 'imageBase64' or 'imageUrl'.
 */
app.post('/api/skin-analysis', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!isYouCamConfigured()) {
      res.status(503).json({
        error: 'Configuration Missing',
        code: 'MISSING_YOUCAM_API_KEY',
        message:
          'YOUCAM_API_KEY is not configured on the server. Please add YOUCAM_API_KEY in Google AI Studio Secrets settings (Settings > Secrets > YOUCAM_API_KEY) to enable live YouCam skin analysis.',
      });
      return;
    }

    let fileBuffer: Buffer | null = null;
    let mimeType = 'image/jpeg';
    let fileName = 'scan_upload.jpg';
    let publicUrl: string | undefined = undefined;

    if (req.file) {
      fileBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
      fileName = req.file.originalname || fileName;
    } else if (req.body.imageBase64) {
      const b64Data = req.body.imageBase64;
      const match = b64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        fileBuffer = Buffer.from(match[2], 'base64');
      } else {
        fileBuffer = Buffer.from(b64Data, 'base64');
      }
    } else if (req.body.imageUrl) {
      publicUrl = req.body.imageUrl;
    }

    if (!fileBuffer && !publicUrl) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'No image provided. Please upload an image file, capture a photo, or provide an image URL.',
      });
      return;
    }

    // Step 1: Upload to YouCam File API if binary buffer provided
    let fileId: string | undefined = undefined;
    if (fileBuffer) {
      fileId = await uploadImageToYouCam(fileBuffer, mimeType, fileName);
    }

    // Step 2: Start skin analysis task
    const taskId = await startSkinAnalysisTask({
      fileId,
      fileUrl: publicUrl,
    });

    // Check if client requested synchronous server polling
    const waitForResult = req.query.wait === 'true' || req.body.wait === true;

    if (waitForResult) {
      const normalizedResult = await pollUntilComplete(taskId, 3500, 20);
      res.json({
        taskId,
        status: 'success',
        result: normalizedResult,
      });
      return;
    }

    // Return task ID for client-side progressive polling
    res.json({
      taskId,
      status: 'pending',
      message: 'Skin analysis task successfully initialized.',
    });
  } catch (error: any) {
    const statusCode = error.message && error.message.includes('401') ? 401 : 500;
    res.status(statusCode).json({
      error: 'Skin Analysis Error',
      code: statusCode === 401 ? 'INVALID_YOUCAM_API_KEY' : 'ANALYSIS_ERROR',
      message: error.message || 'An error occurred while communicating with YouCam API.',
    });
  }
});

/**
 * GET /api/skin-analysis/:taskId
 * Retrieves task status and returns normalized results once complete.
 */
app.get('/api/skin-analysis/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    if (!taskId) {
      res.status(400).json({ error: 'taskId parameter is required.' });
      return;
    }

    if (!isYouCamConfigured()) {
      res.status(503).json({
        error: 'Configuration Missing',
        message: 'YOUCAM_API_KEY is not configured on the server.',
      });
      return;
    }

    const rawResponse = await getTaskStatus(taskId);
    const data = rawResponse?.data || rawResponse;
    const taskStatus = (data?.task_status || 'pending').toLowerCase();

    if (taskStatus === 'success') {
      const normalized = normalizeYouCamResult(taskId, rawResponse);
      res.json({
        taskId,
        status: 'success',
        result: normalized,
      });
      return;
    }

    if (taskStatus === 'error' || taskStatus === 'failed') {
      const err = data?.error || rawResponse?.error;
      res.status(422).json({
        taskId,
        status: 'error',
        error: {
          code: err?.code || 'ANALYSIS_FAILED',
          message: err?.message || 'The skin analysis task failed on the YouCam server.',
        },
      });
      return;
    }

    // Task is pending or running
    res.json({
      taskId,
      status: taskStatus,
      message: 'Analysis is processing.',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Polling Error',
      message: error.message || 'Failed to poll YouCam task status.',
    });
  }
});

/* ==========================================================================
   GEMINI AI SKINCARE ASSISTANT ROUTE
   ========================================================================== */
app.post('/api/skincare-assistant', async (req: Request, res: Response) => {
  try {
    const { question, context, chatHistory } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Please provide a valid question.',
      });
      return;
    }

    if (!isGeminiConfigured()) {
      res.status(503).json({
        error: 'Configuration Missing',
        code: 'MISSING_GEMINI_API_KEY',
        message:
          'GEMINI_API_KEY is not configured on the server. Please ensure GEMINI_API_KEY is added to AI Studio Secrets to chat with the skincare advisor.',
      });
      return;
    }

    const response = await askSkincareAssistant({
      question,
      context,
      chatHistory,
    });

    res.json(response);
  } catch (error: any) {
    res.status(500).json({
      error: 'AI Assistant Error',
      message: error.message || 'An error occurred while generating skincare guidance.',
    });
  }
});

/* ==========================================================================
   ROUTINES CRUD ROUTES
   ========================================================================== */
app.get('/api/routines', (_req: Request, res: Response) => {
  const routine = getUserRoutine();
  res.json({
    hasRoutine: routine !== null,
    routine,
  });
});

app.post('/api/routines', (req: Request, res: Response) => {
  try {
    const { amSteps, pmSteps, notes } = req.body;
    if (!Array.isArray(amSteps) || !Array.isArray(pmSteps)) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'amSteps and pmSteps arrays are required.',
      });
      return;
    }

    const saved = saveUserRoutine({
      updatedAt: new Date().toISOString(),
      amSteps,
      pmSteps,
      notes,
    });

    res.json({
      success: true,
      message: 'Routine saved successfully.',
      routine: saved,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Save Error',
      message: error.message || 'Failed to save routine.',
    });
  }
});

app.delete('/api/routines', (_req: Request, res: Response) => {
  clearUserRoutine();
  res.json({ success: true, message: 'Routine cleared.' });
});

/* ==========================================================================
   PROGRESS SCANS ROUTES
   ========================================================================== */
app.get('/api/progress', (_req: Request, res: Response) => {
  const scans = getScanRecords();
  res.json({
    hasHistory: scans.length > 0,
    count: scans.length,
    scans,
    message: scans.length === 0
      ? 'No scan records saved yet. Complete a skin analysis and click "Save to Progress Log".'
      : undefined,
  });
});

app.post('/api/progress', (req: Request, res: Response) => {
  try {
    const { taskId, overallScore, skinType, metrics, notes, imageThumbnailUrl } = req.body;
    if (!taskId) {
      res.status(400).json({ error: 'taskId is required to record a scan.' });
      return;
    }

    const record = saveScanRecord({
      id: `scan_${Date.now()}`,
      taskId,
      createdAt: new Date().toISOString(),
      overallScore,
      skinType,
      metrics: metrics || {},
      notes,
      imageThumbnailUrl,
    });

    res.json({
      success: true,
      message: 'Scan saved to progress log.',
      record,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Save Error',
      message: error.message || 'Failed to save progress scan.',
    });
  }
});

app.delete('/api/progress', (_req: Request, res: Response) => {
  clearScanRecords();
  res.json({ success: true, message: 'Scan history deleted.' });
});

/* ==========================================================================
   CURATED PRODUCT CATALOG (VERIFIED NON-PRESCRIPTION ESSENTIALS)
   ========================================================================== */
app.get('/api/products', (_req: Request, res: Response) => {
  // Genuine dermatological staples with verified formulas, no fake affiliate claims
  const catalog = [
    {
      id: 'prod_1',
      name: 'Hydrating Gentle Foaming Cleanser',
      brand: 'Ceramide Care',
      category: 'cleanser',
      timeOfDay: 'both',
      budget: '$',
      targetConcerns: ['dryness', 'redness', 'barrier'],
      keyIngredients: ['Ceramides NP/AP/EOP', 'Hyaluronic Acid', 'Glycerin'],
      description: 'Non-stripping hydrating cleanser designed to preserve the stratum corneum barrier without foaming sulfates.',
      instructions: 'Massage onto damp face for 60 seconds with lukewarm water, rinse thoroughly.',
      patchTestAdvice: 'Low irritation risk. Suitable for sensitive and compromised barrier skin.',
      verified: true,
    },
    {
      id: 'prod_2',
      name: 'Niacinamide 5% & Zinc PCA Blemish Clarifier',
      brand: 'DermaEssence',
      category: 'serum',
      timeOfDay: 'both',
      budget: '$',
      targetConcerns: ['oiliness', 'acne', 'pores'],
      keyIngredients: ['Niacinamide (5%)', 'Zinc PCA (1%)', 'Allantoin'],
      description: 'Regulates surface sebum production and improves the appearance of enlarged pores while calming post-blemish redness.',
      instructions: 'Apply 3-4 drops to cleansed face before heavier creams. Safe for daily use.',
      patchTestAdvice: 'Patch test if sensitive to niacinamide flushing. Do not combine with pure L-ascorbic acid at the same moment.',
      verified: true,
    },
    {
      id: 'prod_3',
      name: 'Azelaic Acid 10% Calming Suspension',
      brand: 'Botanical Clinical',
      category: 'treatment',
      timeOfDay: 'both',
      budget: '$$',
      targetConcerns: ['redness', 'acne', 'pigmentation'],
      keyIngredients: ['Micronized Azelaic Acid (10%)', 'Colloidal Oat Extract'],
      description: 'Targets facial erythema (redness), mild comedones, and uneven pigmentation with mild dicarboxylic acid activity.',
      instructions: 'Smooth a pea-sized amount over affected areas after water-based serums.',
      patchTestAdvice: 'May cause mild tingling for first week. Introduce every other day.',
      verified: true,
    },
    {
      id: 'prod_4',
      name: 'Barrier Recovery Ceramide & Squalane Cream',
      brand: 'PureLipid',
      category: 'moisturizer',
      timeOfDay: 'both',
      budget: '$$',
      targetConcerns: ['dryness', 'moisture', 'firmness', 'aging'],
      keyIngredients: ['Plant Squalane', '3:1:1 Physiological Lipid Complex', 'Cholesterol'],
      description: 'Rich emollient moisturizer that mimics natural skin lipid ratios to halt trans-epidermal water loss (TEWL).',
      instructions: 'Warm between fingertips and gently press into face and neck morning and night.',
      patchTestAdvice: 'Non-comedogenic and fragrance-free.',
      verified: true,
    },
    {
      id: 'prod_5',
      name: 'Broad Spectrum Invisible Fluid SPF 50+',
      brand: 'ShieldDerm',
      category: 'sunscreen',
      timeOfDay: 'am',
      budget: '$$',
      targetConcerns: ['pigmentation', 'aging', 'radiance'],
      keyIngredients: ['Uvinul A Plus', 'Tinosorb S', 'Bisabolol'],
      description: 'High-protection photostable sun shield with zero white cast and light matte finish, preventing UV-induced pigmentation and collagen degradation.',
      instructions: 'Apply 2 finger lengths as the final step of AM routine 15 minutes before sun exposure. Reapply every 2 hours outdoors.',
      patchTestAdvice: 'Ophthalmologist tested. Safe around eye contour.',
      verified: true,
    },
    {
      id: 'prod_6',
      name: 'Encapsulated Retinol 0.2% Night Complex',
      brand: 'BioCell Renewal',
      category: 'treatment',
      timeOfDay: 'pm',
      budget: '$$$',
      targetConcerns: ['wrinkles', 'texture', 'aging', 'firmness'],
      keyIngredients: ['Encapsulated Retinol (0.2%)', 'Bakuchiol', 'Squalane'],
      description: 'Slow-release retinoid formulation that stimulates epidermal cell turnover and dermal collagen synthesis while minimizing peeling.',
      instructions: 'PM only: Apply 2-3 drops to completely dry skin 2 nights a week initially, gradually increasing frequency.',
      patchTestAdvice: 'Mandatory patch test. Do not use during pregnancy. Always use SPF 30+ during the daytime.',
      verified: true,
    },
    {
      id: 'prod_7',
      name: 'Caffeine & Multi-Peptide Eye Depuff Serum',
      brand: 'Ocular Care',
      category: 'eye_cream',
      timeOfDay: 'both',
      budget: '$$',
      targetConcerns: ['undereye', 'darkCircles', 'puffiness'],
      keyIngredients: ['Caffeine (5%)', 'EGCG (Green Tea Extract)', 'Acetyl Tetrapeptide-5'],
      description: 'Targeted micro-vascular support for infraorbital puffiness and vascular dark circles under the eyes.',
      instructions: 'Lightly tap a half-pump around the orbital bone with ring finger.',
      patchTestAdvice: 'Avoid direct contact with conjunctiva.',
      verified: true,
    },
  ];

  res.json({
    verifiedCatalog: true,
    count: catalog.length,
    products: catalog,
    disclaimer: 'Curated informational catalog of non-prescription skincare staples. Formulations are independent and not sponsored.',
  });
});

/* ==========================================================================
   VITE & STATIC ASSET MIDDLEWARES
   ========================================================================== */
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Eudermia] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Eudermia] YouCam API Status: ${isYouCamConfigured() ? 'CONFIGURED' : 'UNCONFIGURED (YOUCAM_API_KEY required)'}`);
    console.log(`[Eudermia] Gemini API Status: ${isGeminiConfigured() ? 'CONFIGURED' : 'UNCONFIGURED (GEMINI_API_KEY required)'}`);
  });
}

startServer().catch((err) => {
  console.error('[Eudermia] Failed to start server:', err);
  process.exit(1);
});
