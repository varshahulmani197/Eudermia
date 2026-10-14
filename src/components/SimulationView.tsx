import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Info,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { SkinAnalysisResult } from '../types/skinAnalysis.ts';

interface SimulationViewProps {
  latestScan: SkinAnalysisResult | null;
  onNavigate: (tab: string) => void;
}

export const SimulationView: React.FC<SimulationViewProps> = ({
  latestScan,
  onNavigate,
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [selectedConcern, setSelectedConcern] = useState<string>('hydration');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#4E6554] text-xs font-semibold mb-2">
          <Sliders className="w-3.5 h-3.5" />
          <span>Simulation & Overlay Guidance</span>
        </div>
        <h1 className="font-serif-heading text-3xl font-bold text-stone-900 tracking-tight">
          Before & After Treatment Simulation
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
          Interactive visualization interface. Eudermia separates diagnostic skin-analysis endpoints (v2.1) from cosmetic visual simulations with strict transparent labeling.
        </p>
      </div>

      {/* Honest Status Notice regarding YouCam Simulation Endpoint */}
      <div className="rounded-2xl bg-amber-50/80 border border-amber-200/90 p-5 text-xs text-amber-900 space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-950">
          <Info className="w-4 h-4 text-amber-700" />
          <span>Endpoint Architecture Notice</span>
        </div>
        <p className="leading-relaxed">
          The active API endpoint integrated in Eudermia is{' '}
          <code className="font-mono bg-amber-200/60 px-1 py-0.5 rounded font-bold">
            /s2s/v2.1/task/skin-analysis
          </code>
          , which returns quantitative diagnostic metadata. Perfect Corp&apos;s separate generative simulation endpoints (e.g. AI Look / AI Aging Simulation) require distinct product licensing and are labeled as illustrative demonstrations.
        </p>
      </div>

      {/* Interactive Simulation Comparison Card */}
      <div className="skincare-card rounded-3xl p-6 sm:p-8 bg-white border border-stone-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <h2 className="font-serif-heading text-lg font-bold text-stone-900">
              Illustrative Skin Improvement Demonstration
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Drag the central divider to inspect baseline vs post-regimen hydration radiance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-stone-500">Target Concern:</span>
            <select
              value={selectedConcern}
              onChange={(e) => setSelectedConcern(e.target.value)}
              className="text-xs p-1.5 rounded-lg border border-stone-300 bg-white font-medium text-stone-800"
            >
              <option value="hydration">Hydration & Glow</option>
              <option value="redness">Erythema Calming</option>
              <option value="texture">Texture Smoothing</option>
            </select>
          </div>
        </div>

        {/* Draggable Split Comparison Box */}
        <div className="relative max-w-md mx-auto aspect-3/4 rounded-2xl overflow-hidden shadow-md border-2 border-stone-200 select-none bg-stone-900">
          {/* Base Layer: Original Clean Facial Portrait */}
          <img
            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80"
            alt="Baseline skin portrait"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Top Layer: Simulated Enhanced Layer clipped via slider */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${sliderPosition}%` }}
          >
            <img
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80"
              alt="Simulated skin outcome"
              className="absolute inset-0 w-full h-full object-cover max-w-none filter contrast-105 brightness-105 saturate-105"
              style={{ width: '100%', height: '100%' }}
            />
            {/* Subtle radiance filter overlay for simulation side */}
            <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />

            <div className="absolute top-4 left-4 bg-emerald-900/80 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-emerald-500/40">
              Illustrative Simulation
            </div>
          </div>

          <div className="absolute top-4 right-4 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/20">
            Baseline
          </div>

          {/* Draggable Slider Divider Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-[#4E6554] text-xs font-bold border-2 border-[#4E6554]">
              ⇄
            </div>
          </div>

          {/* Range Slider Controller Overlay */}
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPosition}
            onChange={(e) => setSliderPosition(Number(e.target.value))}
            className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
            aria-label="Simulation slider"
          />
        </div>

        {/* Explanatory Slider Caption */}
        <p className="text-center text-xs text-stone-500">
          Slide left or right to interact with the split preview.
        </p>

        {/* Rigorous Medical & Biological Outcome Disclaimer */}
        <div className="rounded-xl bg-stone-50 p-4 border border-stone-200/80 text-xs text-stone-600 space-y-1">
          <p className="font-semibold text-stone-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Biological Outcome Disclaimer
          </p>
          <p className="leading-relaxed">
            Visual simulations are illustrative representations of general cosmetic improvement and do not guarantee or predict individual biological response. Skin barrier remodeling is influenced by genetics, diet, hormonal fluctuations, and adherence to SPF protection.
          </p>
        </div>
      </div>
    </div>
  );
};
