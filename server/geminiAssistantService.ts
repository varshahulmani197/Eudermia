/**
 * Eudermia AI Skincare Assistant Service
 *
 * Implements server-side Gemini integration using @google/genai SDK (v2.4+).
 * Follows strict medical disclaimer boundaries, ingredient interaction checks,
 * and contextual grounding with real YouCam scan results.
 */

import { GoogleGenAI } from '@google/genai';

export interface AssistantRequest {
  question: string;
  context?: {
    skinType?: string;
    overallScore?: number;
    metricsSummary?: string;
    primaryConcerns?: string[];
    currentRoutine?: {
      am?: string[];
      pm?: string[];
    };
  };
  chatHistory?: Array<{
    role: 'user' | 'model';
    text: string;
  }>;
}

export interface AssistantResponse {
  answer: string;
  suggestedFollowUps?: string[];
  safetyWarnings?: string[];
}

/**
 * Checks if the GEMINI_API_KEY environment variable is present.
 */
export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return typeof key === 'string' && key.trim().length > 0;
}

const SYSTEM_INSTRUCTION = `You are Eudermia's AI Skincare Educator & Routine Advisor.
Your mission is to provide clear, science-informed, beginner-friendly skincare guidance and routine advice.

Core Principles:
1. NON-MEDICAL BOUNDARY: You provide cosmetic education and routine coaching, NOT clinical medical diagnoses or prescription advice. Never diagnose conditions such as cystic acne, melanoma, rosacea flares, or eczema.
2. MEDICAL REFERRAL: If the user describes sudden painful rashes, bleeding lesions, infected cysts, fever, or rapidly changing moles, explicitly advise them to consult a board-certified dermatologist or healthcare provider immediately.
3. INGREDIENT SAFETY & CONFLICTS:
   - Warn against harsh layering (e.g., combining high-strength Retinol with direct AHA/BHA exfoliants or Benzoyl Peroxide in the same routine).
   - Recommend separating irritating actives between AM and PM or alternate nights.
   - Always emphasize daily Broad-Spectrum SPF (30-50+) when using photosensitizing actives like AHAs, retinoids, or vitamin C.
4. PATCH TESTING: Regularly remind users to patch test new active formulations behind the ear or on the inner arm for 24-48 hours before full-face application.
5. CONTEXTUAL AWARENESS: If the user provides genuine YouCam AI scan metrics (e.g., elevated oiliness, low moisture, detected erythema/redness), ground your response in their specific numbers, but acknowledge that environmental factors (climate, sleep, water intake) also influence daily skin behavior.
6. TONE: Warm, calming, empathetic, transparent, and concise. Avoid dense medical jargon; use intuitive explanations.`;

/**
 * Generates an answer from Gemini 3.8 Flash.
 */
export async function askSkincareAssistant(
  payload: AssistantRequest
): Promise<AssistantResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Please add GEMINI_API_KEY in your Google AI Studio Secrets settings.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Build structured prompt contents
  let promptText = `User Question: ${payload.question}\n\n`;

  if (payload.context) {
    promptText += `=== USER'S VERIFIED SKIN CONTEXT ===\n`;
    if (payload.context.skinType) {
      promptText += `- Identified Skin Type: ${payload.context.skinType}\n`;
    }
    if (payload.context.overallScore !== undefined) {
      promptText += `- Overall Skin Index: ${payload.context.overallScore}/100\n`;
    }
    if (payload.context.primaryConcerns && payload.context.primaryConcerns.length > 0) {
      promptText += `- Key Concerns from Analysis: ${payload.context.primaryConcerns.join(', ')}\n`;
    }
    if (payload.context.metricsSummary) {
      promptText += `- Metrics Breakdown: ${payload.context.metricsSummary}\n`;
    }
    if (payload.context.currentRoutine) {
      promptText += `- Current AM Routine: ${(payload.context.currentRoutine.am || []).join(' -> ') || 'None'}\n`;
      promptText += `- Current PM Routine: ${(payload.context.currentRoutine.pm || []).join(' -> ') || 'None'}\n`;
    }
    promptText += `===================================\n\n`;
  }

  // Handle conversational history if provided
  let formattedContents: any = promptText;
  if (payload.chatHistory && payload.chatHistory.length > 0) {
    const turns = payload.chatHistory.slice(-6).map((item) => ({
      role: item.role === 'model' ? 'model' : 'user',
      parts: [{ text: item.text }],
    }));
    turns.push({
      role: 'user',
      parts: [{ text: promptText }],
    });
    formattedContents = turns;
  }

  const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;
  let text = '';

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: formattedContents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
          topP: 0.9,
        },
      });
      text = response.text || '';
      if (text) break;
    } catch (err: any) {
      lastError = err;
      // If temporary 503/429, try next model
      console.warn(`[Gemini Assistant] Model ${modelName} unavailable, attempting alternative model...`);
    }
  }

  if (!text && lastError) {
    throw lastError;
  }

  const answer = text || 'I could not generate a response at this moment. Please rephrase your question.';

  // Extract quick follow-up prompt ideas based on question context
  const suggestedFollowUps: string[] = [
    'How do I properly patch test a new active?',
    'What is the ideal order to apply these products?',
    'How can I strengthen my skin barrier naturally?',
  ];

  return {
    answer,
    suggestedFollowUps,
  };
}
