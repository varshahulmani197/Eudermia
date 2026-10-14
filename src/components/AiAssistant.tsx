import React, { useState } from 'react';
import {
  BotMessageSquare,
  Send,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Paperclip,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { askAssistant } from '../services/api.ts';
import { SkinAnalysisResult, SystemHealthStatus } from '../types/skinAnalysis.ts';

interface AiAssistantProps {
  latestScan: SkinAnalysisResult | null;
  attachedContext?: any;
  systemHealth: SystemHealthStatus | null;
  onOpenSettings: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  suggestedFollowUps?: string[];
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  latestScan,
  attachedContext,
  systemHealth,
  onOpenSettings,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I'm Eudermia's AI Skincare Educator, powered by Gemini 3.8 Flash. I can help you interpret your YouCam skin analysis, design an effective AM/PM routine, and evaluate active ingredient compatibilities. How can I assist your skin health today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedFollowUps: [
        'How should I prioritize my skin concerns?',
        'Can I combine Retinol and Vitamin C?',
        'How do I safely patch test an active serum?',
      ],
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [includeScanContext, setIncludeScanContext] = useState<boolean>(
    Boolean(attachedContext || latestScan)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isGeminiReady = systemHealth?.config?.geminiConfigured ?? false;

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputText('');
    setIsLoading(true);

    try {
      // Build context if user enabled it and scan exists
      let contextPayload: any = undefined;
      if (includeScanContext && (attachedContext || latestScan)) {
        if (attachedContext) {
          contextPayload = attachedContext;
        } else if (latestScan) {
          contextPayload = {
            skinType: latestScan.skinType,
            overallScore: latestScan.overallScore,
            metricsSummary: Object.entries(latestScan.metrics || {})
              .filter(([_, m]) => m.available && m.value !== null)
              .map(([id, m]) => `${m.name}: ${m.value}`)
              .join(', '),
          };
        }
      }

      // Convert conversation history for server
      const chatHistory = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await askAssistant(query, contextPayload, chatHistory);

      const modelMessage: ChatMessage = {
        id: `model_${Date.now()}`,
        role: 'model',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowUps: res.suggestedFollowUps,
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Failed to communicate with AI Skincare Assistant.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#4E6554] text-xs font-semibold mb-2">
          <BotMessageSquare className="w-3.5 h-3.5" />
          <span>Gemini 3.8 Flash Skincare Educator</span>
        </div>
        <h1 className="font-serif-heading text-3xl font-bold text-stone-900 tracking-tight">
          AI Skincare Advisor
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
          Ask questions about your skin biology, ingredient formulations, and routine sequencing. Grounded in your actual scan metrics.
        </p>
      </div>

      {/* Secret Missing Warning */}
      {!isGeminiReady && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-amber-900">GEMINI_API_KEY Required</h4>
            <p className="text-amber-800 mt-0.5 leading-relaxed">
              To chat with the Skincare Advisor, ensure{' '}
              <code className="font-mono bg-amber-200/60 px-1 py-0.5 rounded text-amber-900 font-bold">
                GEMINI_API_KEY
              </code>{' '}
              is configured in Google AI Studio Secrets settings.
            </p>
            <button
              onClick={onOpenSettings}
              className="mt-2 text-xs font-bold text-amber-900 underline hover:text-amber-700"
            >
              Configure in Secrets Panel
            </button>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="skincare-card rounded-3xl bg-white border border-stone-200 shadow-sm flex flex-col h-[580px] overflow-hidden">
        {/* Chat Sub-header with Context Attachment Toggle */}
        <div className="p-4 border-b border-stone-100 bg-[#FAF8F5]/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-stone-800">Eudermia Advisor</span>
            <span className="text-[10px] text-stone-500 bg-stone-200/70 px-1.5 py-0.5 rounded">
              Grounded in Science
            </span>
          </div>

          {(latestScan || attachedContext) && (
            <label className="flex items-center gap-2 cursor-pointer text-stone-700 font-medium">
              <input
                type="checkbox"
                checked={includeScanContext}
                onChange={(e) => setIncludeScanContext(e.target.checked)}
                className="rounded border-stone-300 text-[#4E6554] focus:ring-[#4E6554]"
              />
              <span className="flex items-center gap-1 text-[11px]">
                <Paperclip className="w-3.5 h-3.5 text-stone-500" />
                Attach Latest Scan Context
              </span>
            </label>
          )}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-[#4E6554] text-white rounded-tr-xs shadow-xs'
                      : 'bg-stone-50 text-stone-800 rounded-tl-xs border border-stone-200/80 shadow-2xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                <span className="text-[10px] text-stone-400 px-1">{msg.timestamp}</span>

                {/* Follow-up suggestions */}
                {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 max-w-[85%]">
                    {msg.suggestedFollowUps.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors border border-stone-200 text-left cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-stone-500 py-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#4E6554]" />
              <span>Analyzing question and cross-referencing ingredient safety...</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-stone-100 bg-[#FAF8F5]/60">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask about active ingredients, routine ordering, or patch testing..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
              className="flex-1 text-xs p-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-[#4E6554] shadow-2xs"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="px-5 py-3 rounded-xl bg-[#4E6554] hover:bg-[#3E5244] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Clinical Disclaimer Reminder */}
          <div className="mt-2 text-center">
            <span className="text-[10px] text-stone-500 leading-tight">
              <ShieldCheck className="w-3 h-3 text-emerald-600 inline mr-1" />
              Cosmetic advisory only. Eudermia does not diagnose illnesses or prescribe medication. Consult a dermatologist for persistent skin conditions.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
