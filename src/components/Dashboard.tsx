import React from 'react';
import {
  Scan,
  Sparkles,
  CalendarDays,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  BotMessageSquare,
  Activity,
  Layers,
  Info,
} from 'lucide-react';
import {
  SkinAnalysisResult,
  UserRoutine,
  SavedScanRecord,
  SystemHealthStatus,
} from '../types/skinAnalysis.ts';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  latestScan: SkinAnalysisResult | null;
  savedScans: SavedScanRecord[];
  userRoutine: UserRoutine | null;
  systemHealth: SystemHealthStatus | null;
  onOpenSettings: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  latestScan,
  savedScans,
  userRoutine,
  systemHealth,
  onOpenSettings,
}) => {
  const isYouCamReady = systemHealth?.config?.youcamConfigured ?? false;
  const isGeminiReady = systemHealth?.config?.geminiConfigured ?? false;

  const totalScans = savedScans.length;
  const mostRecentScan = latestScan || (savedScans[0] ? {
    taskId: savedScans[0].taskId,
    status: 'success' as const,
    analyzedAt: savedScans[0].createdAt,
    overallScore: savedScans[0].overallScore,
    skinType: savedScans[0].skinType,
    metrics: {} as any,
    sevenAreaSummary: {} as any,
    disclaimer: '',
  } : null);

  const hasConfiguredRoutine = userRoutine && (userRoutine.amSteps.length > 0 || userRoutine.pmSteps.length > 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Configuration Alert Banner (if YOUCAM_API_KEY is missing) */}
      {!isYouCamReady && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200/90 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5 sm:mt-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 text-base">
                  YouCam AI Skin Analysis Secret Required
                </h3>
                <p className="text-sm text-amber-700 mt-0.5">
                  To perform real-time YouCam v2.1 skin diagnostics, configure{' '}
                  <code className="font-mono px-1.5 py-0.5 bg-amber-200/70 text-amber-900 rounded text-xs font-bold">
                    YOUCAM_API_KEY
                  </code>{' '}
                  in your Google AI Studio Secrets settings.
                </p>
              </div>
            </div>
            <button
              onClick={onOpenSettings}
              className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-xl transition-colors shrink-0 shadow-xs"
            >
              Setup Guide & Keys
            </button>
          </div>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4E6554] via-[#3E5244] to-[#2E3D32] text-white p-8 sm:p-10 shadow-md">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-100 text-xs font-medium mb-4 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>AI-Driven Dermatological Science</span>
          </div>

          <h1 className="font-serif-heading text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Evidence-Based Skincare, Tailored to Your Biology
          </h1>

          <p className="mt-3 text-stone-200 text-sm sm:text-base leading-relaxed">
            Eudermia pairs YouCam’s 16-indicator facial skin diagnostic engine with Gemini-powered routine intelligence to track your dermal health with scientific transparency.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('analysis')}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#FAF8F5] text-[#2E3D32] hover:bg-white text-sm font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <Scan className="w-4 h-4 text-[#4E6554]" />
              Start Skin Analysis
            </button>

            <button
              onClick={() => onNavigate('assistant')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/20 cursor-pointer"
            >
              <BotMessageSquare className="w-4 h-4 text-emerald-200" />
              Ask AI Skincare Advisor
            </button>
          </div>
        </div>

        {/* Decorative graphic elements */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <Activity className="w-72 h-72 text-white" />
        </div>
      </div>

      {/* Main Grid: Real Scan Snapshot & Routine / Onboarding */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Skin Analysis (Honest state: empty if no scan yet) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="skincare-card rounded-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800">
                  <Activity className="w-5 h-5 text-[#4E6554]" />
                </div>
                <div>
                  <h2 className="font-serif-heading text-lg font-bold text-stone-900">
                    Latest Skin Diagnostic Status
                  </h2>
                  <p className="text-xs text-stone-500">
                    {mostRecentScan
                      ? `Last analyzed on ${new Date(mostRecentScan.analyzedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}`
                      : 'No scans completed yet'}
                  </p>
                </div>
              </div>

              {mostRecentScan && (
                <button
                  onClick={() => onNavigate('analysis')}
                  className="text-xs font-semibold text-[#4E6554] hover:text-[#344538] flex items-center gap-1"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Display real scan summary or informative onboarding state */}
            {mostRecentScan ? (
              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/60">
                    <span className="text-xs text-stone-500 font-medium">Overall Health Index</span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-stone-900">
                        {mostRecentScan.overallScore !== undefined ? mostRecentScan.overallScore : '--'}
                      </span>
                      <span className="text-xs text-stone-500">/ 100</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/60">
                    <span className="text-xs text-stone-500 font-medium">Identified Skin Type</span>
                    <div className="mt-1 text-lg font-bold text-stone-900 capitalize">
                      {mostRecentScan.skinType || 'Analyzed'}
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-stone-50 border border-stone-200/60">
                    <span className="text-xs text-stone-500 font-medium">Engine Version</span>
                    <div className="mt-1 text-sm font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> YouCam S2S v2.1
                    </div>
                  </div>
                </div>

                {latestScan?.sevenAreaSummary && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                      Key Diagnostic Areas
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(latestScan.sevenAreaSummary).slice(0, 4).map(([key, val]) => (
                        <div key={key} className="p-2.5 rounded-lg bg-stone-50/80 border border-stone-100">
                          <p className="text-[11px] text-stone-500 capitalize">{key}</p>
                          <p className="text-sm font-bold text-stone-800">
                            {val.available ? val.label : 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <p className="text-xs text-stone-500 italic">
                    Genuine YouCam Task: {mostRecentScan.taskId}
                  </p>
                  <button
                    onClick={() => onNavigate('analysis')}
                    className="px-4 py-2 bg-[#4E6554] hover:bg-[#3E5244] text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Run New Scan
                  </button>
                </div>
              </div>
            ) : (
              /* Honest Onboarding Empty State */
              <div className="mt-6 text-center py-8 px-4 rounded-xl bg-[#FAF8F5] border border-dashed border-stone-300">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#4E6554] flex items-center justify-center mx-auto mb-3">
                  <Scan className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-stone-800 text-sm">No Skin Diagnostics On Record</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 leading-relaxed">
                  Eudermia never manufactures fake skin scores. Perform your first face scan or upload a clear, well-lit photo to measure moisture, oiliness, acne, and wrinkle indicators.
                </p>
                <button
                  onClick={() => onNavigate('analysis')}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4E6554] text-white hover:bg-[#3E5244] text-xs font-semibold transition-all shadow-xs"
                >
                  <Scan className="w-4 h-4" />
                  Perform First Scan
                </button>
              </div>
            )}
          </div>

          {/* Quick AI Skincare Advisor Card */}
          <div className="skincare-card rounded-2xl p-6 bg-gradient-to-r from-stone-50 to-[#F7ECE9]/30 border border-stone-200/80">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-emerald-800 text-white shrink-0">
                <BotMessageSquare className="w-6 h-6 text-emerald-200" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif-heading text-base font-bold text-stone-900">
                    Eudermia AI Skincare Advisor
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                    Gemini 3.8 Flash
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Have questions about active ingredients, product layering, or patch testing? Ask your AI Skincare Companion for safe, personalized advice grounded in your scan results.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => onNavigate('assistant')}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:border-stone-400 font-medium transition-colors cursor-pointer text-left"
                  >
                    &ldquo;Can I combine Retinol and Vitamin C?&rdquo;
                  </button>
                  <button
                    onClick={() => onNavigate('assistant')}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:border-stone-400 font-medium transition-colors cursor-pointer text-left"
                  >
                    &ldquo;How do I safely patch test actives?&rdquo;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Today's Routine Snapshot & Progress Summary */}
        <div className="space-y-6">
          {/* Today's AM & PM Routine */}
          <div className="skincare-card rounded-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-stone-100 text-stone-700">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <h3 className="font-serif-heading text-base font-bold text-stone-900">
                  Today&apos;s Regimen
                </h3>
              </div>
              <button
                onClick={() => onNavigate('routine')}
                className="text-xs font-semibold text-[#4E6554] hover:text-[#344538]"
              >
                Edit
              </button>
            </div>

            {hasConfiguredRoutine ? (
              <div className="mt-4 space-y-4">
                {/* AM Steps */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> Morning (AM)
                    </span>
                    <span>{userRoutine?.amSteps.length} steps</span>
                  </div>
                  <div className="space-y-1.5">
                    {userRoutine?.amSteps.slice(0, 3).map((step, idx) => (
                      <div
                        key={step.id || idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-stone-50 text-xs border border-stone-100"
                      >
                        <span className="font-medium text-stone-800 truncate">{step.name}</span>
                        <span className="text-[10px] uppercase font-semibold text-stone-500 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                          {step.category}
                        </span>
                      </div>
                    ))}
                    {(userRoutine?.amSteps.length || 0) > 3 && (
                      <p className="text-[11px] text-stone-500 text-center pt-1">
                        + {(userRoutine?.amSteps.length || 0) - 3} more AM steps
                      </p>
                    )}
                  </div>
                </div>

                {/* PM Steps */}
                <div className="pt-2 border-t border-stone-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" /> Evening (PM)
                    </span>
                    <span>{userRoutine?.pmSteps.length} steps</span>
                  </div>
                  <div className="space-y-1.5">
                    {userRoutine?.pmSteps.slice(0, 3).map((step, idx) => (
                      <div
                        key={step.id || idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-stone-50 text-xs border border-stone-100"
                      >
                        <span className="font-medium text-stone-800 truncate">{step.name}</span>
                        <span className="text-[10px] uppercase font-semibold text-stone-500 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                          {step.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-center py-6 px-3 rounded-xl bg-stone-50 border border-dashed border-stone-200">
                <Layers className="w-6 h-6 text-stone-400 mx-auto mb-2" />
                <p className="text-xs text-stone-600 font-medium">Routine not yet customized</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Design your personalized AM cleanser, treatment, and SPF steps.
                </p>
                <button
                  onClick={() => onNavigate('routine')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-[#4E6554] text-white text-xs font-semibold hover:bg-[#3E5244] transition-colors"
                >
                  Build Routine
                </button>
              </div>
            )}
          </div>

          {/* Progress Tracker Widget */}
          <div className="skincare-card rounded-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif-heading text-base font-bold text-stone-900">
                4-Week Progress Timeline
              </h3>
              <button
                onClick={() => onNavigate('progress')}
                className="text-xs font-semibold text-[#4E6554] hover:text-[#344538]"
              >
                View
              </button>
            </div>

            <div className="mt-4">
              {totalScans > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-stone-600">
                    <span>Saved Verified Scans:</span>
                    <span className="font-bold text-stone-900">{totalScans}</span>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Visual trend analysis is active. Scans track changes in hydration, sebum, and erythema over time.
                  </p>
                  <button
                    onClick={() => onNavigate('progress')}
                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition-colors text-center"
                  >
                    Open Comparative Charts
                  </button>
                </div>
              ) : (
                <div className="text-center py-5">
                  <p className="text-xs text-stone-500">
                    No historical scans recorded yet. Longitudinal comparisons activate after multiple scans.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
                    <Info className="w-3 h-3 text-emerald-600" />
                    Consistent lighting improves accuracy
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
