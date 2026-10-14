import React from 'react';
import {
  X,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Trash2,
  ExternalLink,
  Cpu,
  Database,
  Lock,
  Layers,
} from 'lucide-react';
import { SystemHealthStatus } from '../types/skinAnalysis.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemHealth: SystemHealthStatus | null;
  onClearHistory: () => void;
  onClearRoutine: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  systemHealth,
  onClearHistory,
  onClearRoutine,
}) => {
  if (!isOpen) return null;

  const isYouCamReady = systemHealth?.config?.youcamConfigured ?? false;
  const isGeminiReady = systemHealth?.config?.geminiConfigured ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#4E6554] flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif-heading text-xl font-bold text-stone-900">
                System Diagnostics & Settings
              </h2>
              <p className="text-xs text-stone-500">
                Eudermia Platform Architecture & Integration Health
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Secrets Status Overview */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            API Credentials Status (Server-Side Secrets)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* YouCam API Card */}
            <div
              className={`p-4 rounded-2xl border transition-colors ${
                isYouCamReady
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-amber-50/60 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900">YouCam S2S v2.1</span>
                {isYouCamReady ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> Missing Key
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-600 mt-1 font-mono">
                Env Secret: YOUCAM_API_KEY
              </p>
              <p className="text-[11px] text-stone-500 mt-1">
                Powers 16-indicator skin diagnostic tasks via{' '}
                <code className="text-[10px] bg-stone-100 px-1 py-0.5 rounded">
                  POST /s2s/v2.1/task/skin-analysis
                </code>
              </p>
              {systemHealth?.config?.youcamKeyWarning && (
                <div className="mt-2 p-2 rounded-lg bg-amber-100/90 border border-amber-300 text-[10px] text-amber-900 leading-tight">
                  ⚠️ <strong>Key Format Notice:</strong> {systemHealth.config.youcamKeyWarning}
                </div>
              )}
            </div>

            {/* Gemini API Card */}
            <div
              className={`p-4 rounded-2xl border transition-colors ${
                isGeminiReady
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-amber-50/60 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900">Gemini 3.8 Flash</span>
                {isGeminiReady ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> Missing Key
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-600 mt-1 font-mono">
                Env Secret: GEMINI_API_KEY
              </p>
              <p className="text-[11px] text-stone-500 mt-1">
                Powers conversational skincare advisory with strict safety guardrails.
              </p>
            </div>
          </div>
        </div>

        {/* Setup Instructions Box */}
        {(!isYouCamReady || !isGeminiReady) && (
          <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4 text-xs text-stone-700 space-y-2">
            <div className="flex items-center gap-2 font-bold text-stone-900">
              <KeyRound className="w-4 h-4 text-[#4E6554]" />
              <span>How to Configure Secrets in Google AI Studio</span>
            </div>
            <ol className="list-decimal pl-5 space-y-1 text-stone-600 leading-relaxed text-[11px]">
              <li>Open the <strong>Settings</strong> panel in the Google AI Studio sidebar.</li>
              <li>Navigate to the <strong>Secrets</strong> tab.</li>
              <li>
                Add secret key{' '}
                <code className="font-mono font-bold text-stone-900 bg-stone-200 px-1 py-0.5 rounded">
                  YOUCAM_API_KEY
                </code>{' '}
                with your Perfect Corp YouCam API key.
              </li>
              <li>
                Ensure{' '}
                <code className="font-mono font-bold text-stone-900 bg-stone-200 px-1 py-0.5 rounded">
                  GEMINI_API_KEY
                </code>{' '}
                is also configured for the AI Skincare Advisor.
              </li>
            </ol>
            <p className="text-[10px] text-stone-500 italic">
              Note: Eudermia never exposes credentials in client bundles, network responses, or client-side storage.
            </p>
          </div>
        )}

        {/* Data Privacy & Control Actions */}
        <div className="space-y-3 pt-2 border-t border-stone-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Privacy & Session Data Controls
          </h3>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                if (window.confirm('Delete all recorded scan history?')) {
                  onClearHistory();
                }
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 p-3 rounded-xl border border-stone-200 text-stone-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Delete Saved Scans</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Reset AM and PM routine to default template?')) {
                  onClearRoutine();
                }
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 p-3 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold transition-colors"
            >
              <Layers className="w-4 h-4 text-stone-500" />
              <span>Reset Custom Routine</span>
            </button>
          </div>
        </div>

        {/* Hackathon Architecture Summary */}
        <div className="rounded-2xl bg-[#FAF8F5] p-4 border border-stone-200/80 text-[11px] text-stone-600 space-y-1">
          <p className="font-bold text-stone-800 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-700" />
            Hackathon Zero-Data-Leaking Architecture
          </p>
          <p className="leading-relaxed">
            All user images are held in volatile RAM buffers during file transfer and transmitted via encrypted HTTPS directly to YouCam&apos;s pre-signed upload URL. No face images are permanently stored on public CDNs.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#4E6554] text-white text-xs font-semibold hover:bg-[#3E5244] transition-colors"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
