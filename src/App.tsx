import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { SkinAnalysis } from './components/SkinAnalysis.tsx';
import { AnalysisResults } from './components/AnalysisResults.tsx';
import { RoutineBuilder } from './components/RoutineBuilder.tsx';
import { ProductExplorer } from './components/ProductExplorer.tsx';
import { ProgressTracker } from './components/ProgressTracker.tsx';
import { SimulationView } from './components/SimulationView.tsx';
import { AiAssistant } from './components/AiAssistant.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import {
  fetchHealth,
  fetchProgress,
  fetchUserRoutine,
  deleteProgressHistory,
} from './services/api.ts';
import {
  SkinAnalysisResult,
  SavedScanRecord,
  UserRoutine,
  SystemHealthStatus,
} from './types/skinAnalysis.ts';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [latestScan, setLatestScan] = useState<SkinAnalysisResult | null>(null);
  const [savedScans, setSavedScans] = useState<SavedScanRecord[]>([]);
  const [userRoutine, setUserRoutine] = useState<UserRoutine | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthStatus | null>(null);
  const [attachedContext, setAttachedContext] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const health = await fetchHealth();
      setSystemHealth(health);
    } catch (e) {
      console.warn('Initial health check failed:', e);
    }

    try {
      const progressData = await fetchProgress();
      setSavedScans(progressData.scans || []);
    } catch (e) {
      console.warn('Initial progress check failed:', e);
    }

    try {
      const routineData = await fetchUserRoutine();
      setUserRoutine(routineData.routine);
    } catch (e) {
      console.warn('Initial routine fetch failed:', e);
    }
  };

  const handleAnalysisComplete = (result: SkinAnalysisResult) => {
    setLatestScan(result);
    setCurrentTab('results');
    // Refresh progress list
    fetchProgress()
      .then((data) => setSavedScans(data.scans || []))
      .catch(() => {});
  };

  const handleNavigate = (tab: string, context?: any) => {
    if (context) {
      setAttachedContext(context);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefreshScans = async () => {
    try {
      const data = await fetchProgress();
      setSavedScans(data.scans || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearHistory = async () => {
    try {
      await deleteProgressHistory();
      setSavedScans([]);
      setLatestScan(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearRoutine = async () => {
    try {
      const res = await fetch('/api/routines', { method: 'DELETE' });
      if (res.ok) {
        setUserRoutine(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#27272A] selection:bg-[#4E6554]/20 selection:text-[#27272A]">
      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleNavigate}
        systemHealth={systemHealth}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Views */}
      <main className="flex-1">
        {currentTab === 'dashboard' && (
          <Dashboard
            onNavigate={handleNavigate}
            latestScan={latestScan}
            savedScans={savedScans}
            userRoutine={userRoutine}
            systemHealth={systemHealth}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {currentTab === 'analysis' && (
          <SkinAnalysis
            onAnalysisComplete={handleAnalysisComplete}
            systemHealth={systemHealth}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {currentTab === 'results' && latestScan && (
          <AnalysisResults
            result={latestScan}
            onNavigate={handleNavigate}
            onNewScan={() => setCurrentTab('analysis')}
          />
        )}

        {currentTab === 'routine' && (
          <RoutineBuilder
            latestScan={latestScan}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'products' && (
          <ProductExplorer onNavigate={handleNavigate} />
        )}

        {currentTab === 'progress' && (
          <ProgressTracker
            onNavigate={handleNavigate}
            savedScans={savedScans}
            onRefreshScans={handleRefreshScans}
          />
        )}

        {currentTab === 'simulation' && (
          <SimulationView
            latestScan={latestScan}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'assistant' && (
          <AiAssistant
            latestScan={latestScan}
            attachedContext={attachedContext}
            systemHealth={systemHealth}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-[#FAF8F5] py-8 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif-heading font-bold text-stone-800 text-sm">Eudermia</span>
            <span>— AI-Powered Skincare Diagnostic Companion</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>YouCam S2S v2.1 Engine</span>
            <span>•</span>
            <span>Gemini 3.8 Flash Skincare Educator</span>
            <span>•</span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-[#4E6554] hover:underline font-semibold"
            >
              System Diagnostics
            </button>
          </div>
        </div>
      </footer>

      {/* Diagnostics / Secrets Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        systemHealth={systemHealth}
        onClearHistory={handleClearHistory}
        onClearRoutine={handleClearRoutine}
      />
    </div>
  );
}
