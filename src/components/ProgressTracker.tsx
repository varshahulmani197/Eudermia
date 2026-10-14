import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Calendar,
  Trash2,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Scan,
  ShieldCheck,
  Info,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { SavedScanRecord } from '../types/skinAnalysis.ts';
import { fetchProgress, deleteProgressHistory } from '../services/api.ts';

interface ProgressTrackerProps {
  onNavigate: (tab: string) => void;
  savedScans: SavedScanRecord[];
  onRefreshScans: () => void;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  onNavigate,
  savedScans,
  onRefreshScans,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<
    'moisture' | 'oiliness' | 'acne' | 'redness' | 'wrinkles'
  >('moisture');
  const [isDeleting, setIsDeleting] = useState(false);

  // Scans sorted oldest to newest for chronological plotting
  const chronologicalScans = [...savedScans].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const handleDeleteHistory = async () => {
    if (!window.confirm('Are you sure you want to delete all saved scan history? This action cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteProgressHistory();
      onRefreshScans();
    } catch (err) {
      console.error('Failed to delete history:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const metricLabels: Record<string, { name: string; inverse: boolean; desc: string }> = {
    moisture: {
      name: 'Hydration Level',
      inverse: false,
      desc: 'Higher values indicate improved stratum corneum water retention.',
    },
    oiliness: {
      name: 'Surface Sebum',
      inverse: true,
      desc: 'Lower values indicate more balanced, less congested epidermal sebum.',
    },
    acne: {
      name: 'Acne / Blemish Index',
      inverse: true,
      desc: 'Lower values indicate reduced blemish presentation.',
    },
    redness: {
      name: 'Erythema / Redness',
      inverse: true,
      desc: 'Lower values indicate diminished vascular flushing or irritation.',
    },
    wrinkles: {
      name: 'Fine Lines & Wrinkles',
      inverse: true,
      desc: 'Lower values indicate smoother skin texture with less prominence.',
    },
  };

  const currentMetricInfo = metricLabels[selectedMetric];

  // Compute delta between first and latest scan
  const validMetricScans = chronologicalScans.filter(
    (s) => s.metrics && s.metrics[selectedMetric] !== null && s.metrics[selectedMetric] !== undefined
  );

  let delta: number | null = null;
  if (validMetricScans.length >= 2) {
    const firstVal = validMetricScans[0].metrics[selectedMetric] as number;
    const lastVal = validMetricScans[validMetricScans.length - 1].metrics[selectedMetric] as number;
    delta = lastVal - firstVal;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#4E6554] text-xs font-semibold mb-2">
            <LineChart className="w-3.5 h-3.5" />
            <span>Longitudinal Dermal Analysis</span>
          </div>
          <h1 className="font-serif-heading text-3xl font-bold text-stone-900 tracking-tight">
            Skin Progress Tracker
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
            Track verified biometric shifts across multiple YouCam analysis sessions. No fabricated historical data is ever shown.
          </p>
        </div>

        {savedScans.length > 0 && (
          <button
            onClick={handleDeleteHistory}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors self-start sm:self-auto disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Clear History
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {savedScans.length === 0 ? (
        /* Empty State: Honest notice that tracking requires scans */
        <div className="skincare-card rounded-3xl p-12 text-center bg-white border border-dashed border-stone-300">
          <div className="w-16 h-16 rounded-full bg-stone-100 text-[#4E6554] flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8" />
          </div>
          <h2 className="font-serif-heading text-xl font-bold text-stone-800">
            No Saved Scans Yet
          </h2>
          <p className="text-xs text-stone-500 max-w-md mx-auto mt-2 leading-relaxed">
            Eudermia does not invent artificial scan points to populate charts. Complete your first skin analysis and click &ldquo;Save to Progress Log&rdquo; to begin tracking changes over time.
          </p>
          <button
            onClick={() => onNavigate('analysis')}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4E6554] hover:bg-[#3E5244] text-white text-xs font-bold transition-all shadow-sm"
          >
            <Scan className="w-4 h-4" />
            Run Your First Scan
          </button>
        </div>
      ) : (
        /* Populated State: Real Trend Chart and Scan Timeline */
        <div className="space-y-6">
          {/* Chart Card */}
          <div className="skincare-card rounded-3xl p-6 sm:p-8 bg-white border border-stone-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
              <div>
                <h2 className="font-serif-heading text-lg font-bold text-stone-900">
                  {currentMetricInfo.name} Trend
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">{currentMetricInfo.desc}</p>
              </div>

              {/* Metric Selector Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {(
                  ['moisture', 'oiliness', 'acne', 'redness', 'wrinkles'] as const
                ).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMetric(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                      selectedMetric === m
                        ? 'bg-[#4E6554] text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Delta Snapshot */}
            {delta !== null && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200/80 text-xs">
                {currentMetricInfo.inverse ? (
                  delta <= 0 ? (
                    <TrendingDown className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-rose-600" />
                  )
                ) : delta >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                )}
                <span className="font-semibold text-stone-800">
                  Overall Change:{' '}
                  {delta > 0 ? `+${delta}` : delta} pts across {validMetricScans.length} scans
                </span>
              </div>
            )}

            {/* Responsive Pure SVG Chart */}
            <div className="pt-2">
              {validMetricScans.length < 2 ? (
                <div className="py-12 text-center text-xs text-stone-500 bg-[#FAF8F5] rounded-xl border border-stone-200">
                  <p>1 scan recorded. Complete a second scan in a few days to view the trend line graph.</p>
                </div>
              ) : (
                <div className="relative h-64 w-full">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4E6554" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#4E6554" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Y-axis guide lines */}
                    <line x1="40" y1="20" x2="580" y2="20" stroke="#E5E7EB" strokeDasharray="3 3" />
                    <text x="15" y="24" fill="#9CA3AF" fontSize="10">100</text>

                    <line x1="40" y1="95" x2="580" y2="95" stroke="#E5E7EB" strokeDasharray="3 3" />
                    <text x="20" y="99" fill="#9CA3AF" fontSize="10">50</text>

                    <line x1="40" y1="170" x2="580" y2="170" stroke="#E5E7EB" strokeDasharray="3 3" />
                    <text x="25" y="174" fill="#9CA3AF" fontSize="10">0</text>

                    {/* Plot coordinates */}
                    {(() => {
                      const paddingLeft = 60;
                      const paddingRight = 560;
                      const usableWidth = paddingRight - paddingLeft;
                      const count = validMetricScans.length;
                      const stepX = count > 1 ? usableWidth / (count - 1) : 0;

                      const points = validMetricScans.map((scan, idx) => {
                        const val = (scan.metrics[selectedMetric] as number) || 0;
                        const x = paddingLeft + idx * stepX;
                        // Map 0 -> 170, 100 -> 20
                        const y = 170 - (val / 100) * 150;
                        return { x, y, val, scan };
                      });

                      const pathD = points.reduce(
                        (acc, curr, idx) => (idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
                        ''
                      );

                      const areaD = `${pathD} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z`;

                      return (
                        <>
                          <path d={areaD} fill="url(#chartGradient)" />
                          <path d={pathD} fill="none" stroke="#4E6554" strokeWidth="3" strokeLinecap="round" />

                          {points.map((pt, idx) => (
                            <g key={idx}>
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="5"
                                fill="#FAF8F5"
                                stroke="#4E6554"
                                strokeWidth="2.5"
                              />
                              <text
                                x={pt.x}
                                y={pt.y - 10}
                                fill="#27272A"
                                fontSize="10"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {pt.val}
                              </text>
                              <text
                                x={pt.x}
                                y="190"
                                fill="#6B7280"
                                fontSize="9"
                                textAnchor="middle"
                              >
                                {new Date(pt.scan.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Historical Scans List */}
          <div className="skincare-card rounded-3xl p-6 sm:p-8 bg-white border border-stone-200">
            <h3 className="font-serif-heading text-lg font-bold text-stone-900 pb-3 border-b border-stone-100">
              Verified Scan Archive ({savedScans.length})
            </h3>

            <div className="mt-4 divide-y divide-stone-100">
              {savedScans.map((scan) => (
                <div
                  key={scan.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-[#4E6554] shrink-0 mt-0.5">
                      <Scan className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">
                          {new Date(scan.createdAt).toLocaleDateString(undefined, {
                            dateStyle: 'long',
                          })}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                          {scan.taskId.slice(-8)}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Skin Type: <strong className="capitalize text-stone-700">{scan.skinType || 'Analyzed'}</strong> | Overall Index:{' '}
                        <strong className="text-stone-700">{scan.overallScore ?? '--'}/100</strong>
                      </p>
                    </div>
                  </div>

                  {/* Key Metrics snapshot */}
                  <div className="flex items-center gap-3 text-xs text-stone-600 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200/60 self-start sm:self-auto">
                    <div>
                      <span className="text-[10px] text-stone-400 block">Moisture</span>
                      <span className="font-bold text-stone-800">{scan.metrics.moisture ?? 'N/A'}</span>
                    </div>
                    <div className="w-px h-6 bg-stone-200" />
                    <div>
                      <span className="text-[10px] text-stone-400 block">Oiliness</span>
                      <span className="font-bold text-stone-800">{scan.metrics.oiliness ?? 'N/A'}</span>
                    </div>
                    <div className="w-px h-6 bg-stone-200" />
                    <div>
                      <span className="text-[10px] text-stone-400 block">Acne</span>
                      <span className="font-bold text-stone-800">{scan.metrics.acne ?? 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lighting & Consistency Advisory */}
      <div className="rounded-2xl bg-stone-100/80 border border-stone-200 p-5 text-xs text-stone-600 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-stone-800">
          <Info className="w-4 h-4 text-[#4E6554]" />
          <span>Biometric Tracking Consistency Notice</span>
        </div>
        <p className="leading-relaxed">
          Differences in lighting temperature, camera lens distance, ambient humidity, and post-wash timing can affect cosmetic AI readings. For optimal longitudinal comparison, scan your skin at the same time of day under consistent diffuse natural lighting.
        </p>
      </div>
    </div>
  );
};
