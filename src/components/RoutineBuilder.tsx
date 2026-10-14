import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Check,
  AlertTriangle,
  Sun,
  Moon,
  Sparkles,
  Info,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { RoutineStep, UserRoutine, SkinAnalysisResult } from '../types/skinAnalysis.ts';
import { fetchUserRoutine, saveUserRoutine } from '../services/api.ts';

interface RoutineBuilderProps {
  latestScan: SkinAnalysisResult | null;
  onNavigate: (tab: string) => void;
}

export const RoutineBuilder: React.FC<RoutineBuilderProps> = ({
  latestScan,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'am' | 'pm'>('am');
  const [amSteps, setAmSteps] = useState<RoutineStep[]>([]);
  const [pmSteps, setPmSteps] = useState<RoutineStep[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Modal for adding a custom step
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepCategory, setNewStepCategory] = useState<RoutineStep['category']>('cleanser');
  const [newStepInstructions, setNewStepInstructions] = useState('');

  // Initial load
  useEffect(() => {
    loadRoutine();
  }, []);

  const loadRoutine = async () => {
    try {
      const data = await fetchUserRoutine();
      if (data.routine) {
        setAmSteps(data.routine.amSteps || []);
        setPmSteps(data.routine.pmSteps || []);
        setNotes(data.routine.notes || '');
      } else {
        // Suggested starter baseline if empty
        applyStarterTemplate();
      }
    } catch {
      applyStarterTemplate();
    }
  };

  const applyStarterTemplate = () => {
    const defaultAm: RoutineStep[] = [
      {
        id: 'step_am_1',
        name: 'Gentle Hydrating Cleanser',
        category: 'cleanser',
        timeOfDay: 'am',
        instructions: 'Wash face with lukewarm water, pat dry gently.',
        order: 1,
        completedToday: false,
      },
      {
        id: 'step_am_2',
        name: 'Hydrating Essence / Niacinamide Serum',
        category: 'serum',
        timeOfDay: 'am',
        instructions: 'Apply 3-4 drops to damp skin to boost barrier hydration.',
        order: 2,
        completedToday: false,
      },
      {
        id: 'step_am_3',
        name: 'Barrier Ceramide Moisturizer',
        category: 'moisturizer',
        timeOfDay: 'am',
        instructions: 'Seal in hydration before sunscreen application.',
        order: 3,
        completedToday: false,
      },
      {
        id: 'step_am_4',
        name: 'Broad Spectrum SPF 50+ Sunscreen',
        category: 'sunscreen',
        timeOfDay: 'am',
        instructions: 'Apply 2 full finger lengths 15 mins before UV exposure.',
        order: 4,
        completedToday: false,
      },
    ];

    const defaultPm: RoutineStep[] = [
      {
        id: 'step_pm_1',
        name: 'Clarifying / Barrier Cleanser',
        category: 'cleanser',
        timeOfDay: 'pm',
        instructions: 'Double cleanse if wearing water-resistant SPF or makeup.',
        order: 1,
        completedToday: false,
      },
      {
        id: 'step_pm_2',
        name: 'Active Treatment / Retinoid / Azelaic Acid',
        category: 'treatment',
        timeOfDay: 'pm',
        instructions: 'Apply pea-sized amount to dry skin (2-3 nights per week).',
        order: 2,
        completedToday: false,
      },
      {
        id: 'step_pm_3',
        name: 'Deep Night Recovery Cream',
        category: 'moisturizer',
        timeOfDay: 'pm',
        instructions: 'Massage gently into face and neck for nocturnal repair.',
        order: 3,
        completedToday: false,
      },
    ];

    setAmSteps(defaultAm);
    setPmSteps(defaultPm);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await saveUserRoutine(amSteps, pmSteps, notes);
      setSaveMessage('Your skincare routine has been saved.');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      setSaveMessage('Failed to save routine. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddStep = () => {
    if (!newStepName.trim()) return;

    const newStep: RoutineStep = {
      id: `step_${Date.now()}`,
      name: newStepName.trim(),
      category: newStepCategory,
      timeOfDay: activeTab,
      instructions: newStepInstructions.trim() || undefined,
      order: activeTab === 'am' ? amSteps.length + 1 : pmSteps.length + 1,
      completedToday: false,
    };

    if (activeTab === 'am') {
      setAmSteps([...amSteps, newStep]);
    } else {
      setPmSteps([...pmSteps, newStep]);
    }

    setNewStepName('');
    setNewStepInstructions('');
    setIsAddModalOpen(false);
  };

  const handleRemoveStep = (id: string, tab: 'am' | 'pm') => {
    if (tab === 'am') {
      setAmSteps(amSteps.filter((s) => s.id !== id));
    } else {
      setPmSteps(pmSteps.filter((s) => s.id !== id));
    }
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down', tab: 'am' | 'pm') => {
    const list = tab === 'am' ? [...amSteps] : [...pmSteps];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    // reindex order
    list.forEach((step, idx) => {
      step.order = idx + 1;
    });

    if (tab === 'am') setAmSteps(list);
    else setPmSteps(list);
  };

  const handleToggleComplete = (id: string, tab: 'am' | 'pm') => {
    if (tab === 'am') {
      setAmSteps(
        amSteps.map((s) => (s.id === id ? { ...s, completedToday: !s.completedToday } : s))
      );
    } else {
      setPmSteps(
        pmSteps.map((s) => (s.id === id ? { ...s, completedToday: !s.completedToday } : s))
      );
    }
  };

  const currentList = activeTab === 'am' ? amSteps : pmSteps;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#4E6554] text-xs font-semibold mb-2">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Circadian Regimen Architect</span>
          </div>
          <h1 className="font-serif-heading text-3xl font-bold text-stone-900 tracking-tight">
            AM & PM Skincare Routine
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Build and reorder your daily steps. Check off steps as you complete them today.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4E6554] hover:bg-[#3E5244] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Routine'}</span>
        </button>
      </div>

      {saveMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* AM vs PM Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl bg-stone-200/80 p-1 shadow-inner">
          <button
            onClick={() => setActiveTab('am')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'am'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            Morning Regimen ({amSteps.length})
          </button>
          <button
            onClick={() => setActiveTab('pm')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'pm'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-500" />
            Evening Regimen ({pmSteps.length})
          </button>
        </div>
      </div>

      {/* Routine Steps List */}
      <div className="skincare-card rounded-3xl p-6 sm:p-8 bg-white border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h2 className="font-serif-heading text-lg font-bold text-stone-900">
              {activeTab === 'am' ? 'Morning Protection & Hydration' : 'Evening Repair & Actives'}
            </h2>
            <p className="text-xs text-stone-500">
              {activeTab === 'am'
                ? 'Focus on gentle cleansing, antioxidant defense, and UV shielding.'
                : 'Focus on thorough particulate removal, cellular repair, and barrier restoration.'}
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Step
          </button>
        </div>

        {currentList.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xs text-stone-500">No steps defined for {activeTab.toUpperCase()}.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-3 px-4 py-2 bg-[#4E6554] text-white text-xs font-semibold rounded-lg"
            >
              Add First Step
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {currentList.map((step, index) => (
              <div
                key={step.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  step.completedToday
                    ? 'bg-emerald-50/40 border-emerald-200/80'
                    : 'bg-stone-50/80 border-stone-200/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleComplete(step.id, activeTab)}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                      step.completedToday
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-stone-300 hover:border-[#4E6554] bg-white'
                    }`}
                    title="Mark as completed today"
                  >
                    {step.completedToday && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-400">#{index + 1}</span>
                      <h3
                        className={`text-sm font-bold ${
                          step.completedToday ? 'text-stone-500 line-through' : 'text-stone-900'
                        }`}
                      >
                        {step.name}
                      </h3>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white text-stone-600 border border-stone-200">
                        {step.category}
                      </span>
                    </div>
                    {step.instructions && (
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                        {step.instructions}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions: Reorder and Delete */}
                <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleMoveStep(index, 'up', activeTab)}
                    disabled={index === 0}
                    className="p-1.5 text-stone-400 hover:text-stone-700 disabled:opacity-20 rounded-md hover:bg-white transition-colors"
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveStep(index, 'down', activeTab)}
                    disabled={index === currentList.length - 1}
                    className="p-1.5 text-stone-400 hover:text-stone-700 disabled:opacity-20 rounded-md hover:bg-white transition-colors"
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveStep(step.id, activeTab)}
                    className="p-1.5 text-rose-400 hover:text-rose-600 rounded-md hover:bg-white transition-colors ml-1"
                    title="Remove step"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dermatological Actives Compatibility & Safety Box */}
      <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-5 text-xs text-amber-900 space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-950">
          <ShieldAlert className="w-4 h-4 text-amber-700" />
          <span>Active Ingredient Safety & Layering Rules</span>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-amber-900/90 leading-relaxed">
          <li>
            <strong>Retinoids & Direct Acids:</strong> Avoid combining strong Retinol with direct Glycolic/Salicylic Acid in the same application. Alternate evenings to prevent barrier irritation.
          </li>
          <li>
            <strong>Daytime Sunscreen:</strong> Always wear broad-spectrum SPF 30-50+ daily when using cell-turnover actives (AHAs, BHAs, retinoids).
          </li>
          <li>
            <strong>Patch Testing:</strong> When introducing any new concentrated formulation, patch test a dime-sized amount behind the ear for 24-48 hours.
          </li>
        </ul>
      </div>

      {/* Add Step Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-stone-200">
            <h3 className="font-serif-heading text-lg font-bold text-stone-900">
              Add New {activeTab.toUpperCase()} Step
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Product / Step Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Squalane Barrier Oil"
                  value={newStepName}
                  onChange={(e) => setNewStepName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#4E6554]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Category
                </label>
                <select
                  value={newStepCategory}
                  onChange={(e) => setNewStepCategory(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#4E6554] bg-white"
                >
                  <option value="cleanser">Cleanser</option>
                  <option value="toner">Toner / Essence</option>
                  <option value="serum">Serum / Hydrator</option>
                  <option value="treatment">Active Treatment / Acid / Retinoid</option>
                  <option value="eye_cream">Eye Care</option>
                  <option value="moisturizer">Moisturizer / Lipid Cream</option>
                  <option value="sunscreen">Sunscreen (AM SPF)</option>
                  <option value="mask">Overnight Mask</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Application Instructions
                </label>
                <textarea
                  placeholder="e.g. Press gently into face and neck before heavier cream"
                  value={newStepInstructions}
                  onChange={(e) => setNewStepInstructions(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#4E6554]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-stone-600 text-xs font-semibold hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStep}
                disabled={!newStepName.trim()}
                className="px-5 py-2 rounded-lg bg-[#4E6554] hover:bg-[#3E5244] text-white text-xs font-semibold disabled:opacity-50"
              >
                Add Step
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
