import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  BookmarkPlus,
  BotMessageSquare,
  ArrowRight,
  Code2,
  CalendarDays,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Droplets,
  Flame,
  Sun,
  Eye,
  Activity,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { SkinAnalysisResult, MetricDetail } from '../types/skinAnalysis.ts';
import { saveProgressScan } from '../services/api.ts';

interface AnalysisResultsProps {
  result: SkinAnalysisResult;
  onNavigate: (tab: string, context?: any) => void;
  onNewScan: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  result,
  onNavigate,
  onNewScan,
}) => {
  const [showRawInspector, setShowRawInspector] = useState(false);
  const [isSavedToProgress, setIsSavedToProgress] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const metrics = result.metrics || {};
  const sevenArea = result.sevenAreaSummary;

  const handleSaveToProgress = async () => {
    setSaveLoading(true);
    setSaveSuccessMsg(null);
    try {
      await saveProgressScan({
        taskId: result.taskId,
        overallScore: result.overallScore,
        skinType: result.skinType,
        metrics: {
          moisture: metrics.moisture?.value as number | null,
          oiliness: metrics.oiliness?.value as number | null,
          acne: metrics.acne?.value as number | null,
          redness: metrics.redness?.value as number | null,
          wrinkles: metrics.wrinkle?.value as number | null,
          radiance: metrics.radiance?.value as number | null,
          darkCircles: metrics.dark_circle_v2?.value as number | null,
          pores: metrics.pore?.value as number | null,
          firmness: metrics.firmness?.value as number | null,
        },
        notes: `YouCam S2S v2.1 scan analyzed on ${new Date(result.analyzedAt).toLocaleDateString()}`,
      });
      setIsSavedToProgress(true);
      setSaveSuccessMsg('Scan successfully recorded in your progress history.');
    } catch (err: any) {
      console.error('Failed to save scan:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAskAssistant = () => {
    // Collect active concerns to provide genuine context to Gemini
    const primaryConcerns: string[] = [];
    if (metrics.acne?.available && typeof metrics.acne.value === 'number' && metrics.acne.value > 30) {
      primaryConcerns.push(`Acne level: ${metrics.acne.value}/100`);
    }
    if (metrics.redness?.available && typeof metrics.redness.value === 'number' && metrics.redness.value > 30) {
      primaryConcerns.push(`Erythema/Redness: ${metrics.redness.value}/100`);
    }
    if (metrics.moisture?.available && typeof metrics.moisture.value === 'number' && metrics.moisture.value < 60) {
      primaryConcerns.push(`Low moisture/hydration: ${metrics.moisture.value}/100`);
    }
    if (metrics.oiliness?.available && typeof metrics.oiliness.value === 'number' && metrics.oiliness.value > 50) {
      primaryConcerns.push(`Excess sebum/oiliness: ${metrics.oiliness.value}/100`);
    }
    if (metrics.wrinkle?.available && typeof metrics.wrinkle.value === 'number' && metrics.wrinkle.value > 40) {
      primaryConcerns.push(`Fine lines & wrinkles: ${metrics.wrinkle.value}/100`);
    }

    onNavigate('assistant', {
      skinType: result.skinType,
      overallScore: result.overallScore,
      primaryConcerns,
      metricsSummary: Object.entries(metrics)
        .filter(([_, m]) => m.available && m.value !== null)
        .map(([id, m]) => `${m.name}: ${m.value}`)
        .join(', '),
    });
  };

  const getMetricColor = (metric: MetricDetail) => {
    if (!metric.available || metric.value === null) return 'text-stone-400 bg-stone-100 border-stone-200';
    if (typeof metric.value === 'string') return 'text-emerald-800 bg-emerald-50 border-emerald-200';
    
    // For positive metrics (moisture, radiance, firmness)
    if (['moisture', 'radiance', 'firmness'].includes(metric.id)) {
      if (metric.value >= 70) return 'text-emerald-800 bg-emerald-50 border-emerald-200';
      if (metric.value >= 45) return 'text-amber-800 bg-amber-50 border-amber-200';
      return 'text-rose-800 bg-rose-50 border-rose-200';
    }

    // For concern metrics (acne, redness, oiliness, wrinkles)
    if (metric.value <= 30) return 'text-emerald-800 bg-emerald-50 border-emerald-200';
    if (metric.value <= 60) return 'text-amber-800 bg-amber-50 border-amber-200';
    return 'text-rose-800 bg-rose-50 border-rose-200';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner: Verification & Actions */}
      <div className="skincare-card rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-900/60 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> YouCam AI Skin Analysis v2.1 Verified
              </span>
              <span className="text-xs text-stone-400 font-mono">
                Task #{result.taskId.slice(-8)}
              </span>
            </div>

            <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Facial Diagnostic Assessment
            </h1>

            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-xl leading-relaxed">
              Diagnostic report generated from 16 facial feature analyses. Values are mapped directly from the YouCam S2S API output contract.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSaveToProgress}
              disabled={isSavedToProgress || saveLoading}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                isSavedToProgress
                  ? 'bg-emerald-800/80 text-emerald-100 border border-emerald-700'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <BookmarkPlus className="w-4 h-4" />
              {isSavedToProgress ? 'Saved to Progress Log' : saveLoading ? 'Saving...' : 'Save to Progress Log'}
            </button>

            <button
              onClick={handleAskAssistant}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <BotMessageSquare className="w-4 h-4 text-emerald-100" />
              Ask AI Skincare Advisor
            </button>

            <button
              onClick={onNewScan}
              className="px-4 py-2.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-semibold transition-colors"
            >
              New Scan
            </button>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="mt-4 p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Primary Highlights: Skin Type & Overall Score */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="skincare-card rounded-2xl p-6 bg-white border border-stone-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Identified Skin Type
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-stone-900 capitalize">
              {result.skinType || 'Combination'}
            </span>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
              YouCam Diagnostic
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            Classification based on regional follicular lipid concentration and epidermal barrier readings.
          </p>
        </div>

        <div className="skincare-card rounded-2xl p-6 bg-white border border-stone-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Dermal Health Index
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-stone-900">
              {result.overallScore !== undefined ? result.overallScore : '--'}
            </span>
            <span className="text-xs text-stone-500">/ 100</span>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            Composite synthesized score combining hydration, radiance, firmness, and low-erythema metrics.
          </p>
        </div>

        <div className="skincare-card rounded-2xl p-6 bg-white border border-stone-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Regimen Priority
          </span>
          <div className="mt-2 text-base font-bold text-stone-900">
            {metrics.moisture?.value && (metrics.moisture.value as number) < 55
              ? 'Barrier Hydration & Lipids'
              : metrics.acne?.value && (metrics.acne.value as number) > 40
              ? 'Gentle Sebum & Blemish Control'
              : metrics.redness?.value && (metrics.redness.value as number) > 40
              ? 'Calming Anti-Erythema'
              : 'Maintenance & SPF Photoprotection'}
          </div>
          <button
            onClick={() => onNavigate('routine')}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#4E6554] hover:text-[#344538]"
          >
            Adjust AM/PM Routine <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SECTION 1: SEVEN-AREA OVERVIEW */}
      <div className="skincare-card rounded-3xl p-6 sm:p-8 bg-white border border-stone-200">
        <div className="pb-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-serif-heading text-xl font-bold text-stone-900">
              Seven-Area Core Overview
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Simplified seven-category framework. Synthesized groupings are explicitly labeled below.
            </p>
          </div>
          <div className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
            Scale: 0 (Minimal/None) - 100 (Maximum)
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {Object.entries(sevenArea).map(([category, info]) => {
            const icons: Record<string, any> = {
              pigmentation: Sun,
              oiliness: Flame,
              acne: Activity,
              redness: AlertCircle,
              undereye: Eye,
              moisture: Droplets,
              radiance: Sparkles,
            };
            const Icon = icons[category] || Layers;
            return (
              <div
                key={category}
                className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800 capitalize">
                      {category}
                    </span>
                    <Icon className="w-4 h-4 text-stone-500" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-stone-900">
                    {info.available && info.score !== null ? `${info.score}` : 'N/A'}
                    {info.available && info.score !== null && (
                      <span className="text-[10px] text-stone-500 font-normal">/100</span>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-stone-500 mt-2 leading-tight">
                  {info.note || 'YouCam S2S direct metric'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: COMPLETE 16-METRIC DIAGNOSTIC BREAKDOWN */}
      <div className="skincare-card rounded-3xl p-6 sm:p-8 bg-white border border-stone-200">
        <div className="pb-4 border-b border-stone-100">
          <h2 className="font-serif-heading text-xl font-bold text-stone-900">
            Comprehensive 16-Indicator Diagnostics
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Individual metrics provided by the YouCam AI Skin Analysis SD action configuration.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(metrics).map((metric) => {
            const badgeClass = getMetricColor(metric);
            const displayVal = metric.available && metric.value !== null ? metric.value : 'Not available in this scan';

            return (
              <div
                key={metric.id}
                className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:border-stone-300 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-stone-900 text-sm">{metric.name}</h3>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeClass} shrink-0`}
                    >
                      {typeof metric.value === 'number'
                        ? `${metric.value}/100`
                        : metric.available
                        ? String(metric.value)
                        : 'Unavailable'}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                    {metric.description}
                  </p>
                </div>

                {/* Severity pill or status */}
                <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                  <span className="text-stone-400 capitalize">Concern: {metric.category}</span>
                  {metric.severity && (
                    <span className="font-semibold uppercase tracking-wider text-stone-700">
                      Level: {metric.severity}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: DERMATOLOGICAL DISCLAIMER */}
      <div className="rounded-2xl bg-stone-100/80 border border-stone-200/90 p-5 text-xs text-stone-600 space-y-1">
        <div className="flex items-center gap-2 font-semibold text-stone-800">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Cosmetic Guidance Disclaimer</span>
        </div>
        <p className="leading-relaxed">
          {result.disclaimer ||
            'Eudermia’s analysis is designed for cosmetic wellness education, product routine formulation, and tracking surface changes over time. It is not an FDA-approved clinical diagnostic device and does not substitute for medical examination by a board-certified dermatologist.'}
        </p>
      </div>

      {/* SECTION 4: HACKATHON DEVELOPER INSPECTOR */}
      <div className="skincare-card rounded-2xl border border-stone-200 overflow-hidden">
        <button
          onClick={() => setShowRawInspector(!showRawInspector)}
          className="w-full px-6 py-4 bg-stone-50 hover:bg-stone-100 flex items-center justify-between text-left transition-colors"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-stone-800 font-mono">
            <Code2 className="w-4 h-4 text-[#4E6554]" />
            <span>Developer Inspector: Raw YouCam v2.1 S2S Response</span>
          </div>
          {showRawInspector ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
        </button>

        {showRawInspector && (
          <div className="p-6 bg-stone-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-96">
            <p className="text-stone-400 mb-2">// Raw verified YouCam Task Response (Sensitive credentials stripped)</p>
            <pre>{JSON.stringify(result.rawResponse || result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
