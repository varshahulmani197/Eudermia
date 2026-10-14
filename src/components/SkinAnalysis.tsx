import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Info,
  X,
  RotateCcw,
  Smartphone,
  SwitchCamera,
  ExternalLink,
  KeyRound,
} from 'lucide-react';
import { startSkinAnalysis, pollAnalysisTask } from '../services/api.ts';
import { SkinAnalysisResult, SystemHealthStatus } from '../types/skinAnalysis.ts';

interface SkinAnalysisProps {
  onAnalysisComplete: (result: SkinAnalysisResult) => void;
  systemHealth: SystemHealthStatus | null;
  onOpenSettings: () => void;
}

export const SkinAnalysis: React.FC<SkinAnalysisProps> = ({
  onAnalysisComplete,
  systemHealth,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const isYouCamConfigured = systemHealth?.config?.youcamConfigured ?? false;

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async (mode: 'user' | 'environment' = facingMode) => {
    setCameraPermissionError(null);
    setIsStartingCamera(true);

    // Stop previous stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam / video streaming is not supported by your browser in this context.');
      }

      let stream: MediaStream | null = null;

      // Tier 1: Optimal portrait resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
          audio: false,
        });
      } catch (err1) {
        // Tier 2: Basic facing mode without strict resolution
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: false,
          });
        } catch (err2) {
          // Tier 3: Any available video device
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!stream) {
        throw new Error('Unable to access camera.');
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      // Attach to video element if already rendered
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Autoplay waiting for user gesture or metadata', playErr);
        }
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let message = 'Unable to access your camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission was denied. Please allow camera permissions in your browser bar, or use the Native Camera / Upload option below.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera found on this device. Please upload a photo or use a mobile device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Camera is currently locked by another application. Please close other video tools and try again.';
      } else if (err.message) {
        message = err.message;
      }
      setCameraPermissionError(message);
      setIsCameraActive(false);
    } finally {
      setIsStartingCamera(false);
    }
  }, [facingMode]);

  // Callback ref for the video element to guarantee stream is attached whenever element mounts
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch((e) => console.warn('Video play warning:', e));
    }
  }, []);

  // When switching to camera tab, start stream; when leaving, stop stream
  useEffect(() => {
    if (activeTab === 'camera' && !imagePreview) {
      startCamera();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [activeTab, imagePreview, startCamera, stopCameraStream]);

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Use video actual dimensions
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 960;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera (user), mirror horizontally for natural selfie orientation
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'eudermia_selfie.jpg', { type: 'image/jpeg' });
          setImageFile(file);
          setImagePreview(URL.createObjectURL(blob));
          stopCameraStream();
        }
      },
      'image/jpeg',
      0.95
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      setErrorMsg('Unsupported format. Please select a JPEG, PNG, or WebP photo.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('File exceeds 15MB limit. Please select a smaller photo.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    stopCameraStream();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      setErrorMsg('Unsupported format. Please drop a JPEG, PNG, or WebP photo.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    stopCameraStream();
  };

  const handleResetImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setErrorMsg(null);
    setTaskId(null);
    setIsSubmitting(false);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  // Sample clinical portrait selector for quick hackathon verification
  const loadSamplePortrait = async (sampleNum: number) => {
    setErrorMsg(null);
    const sampleUrls = [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    ];
    const url = sampleUrls[sampleNum] || sampleUrls[0];
    try {
      setCurrentStep('Loading test portrait...');
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `sample_face_${sampleNum + 1}.jpg`, { type: 'image/jpeg' });
      setImageFile(file);
      setImagePreview(URL.createObjectURL(blob));
      stopCameraStream();
    } catch {
      setErrorMsg('Could not fetch sample portrait. Please upload your own image.');
    }
  };

  const handleSubmitAnalysis = async () => {
    if (!imageFile) {
      setErrorMsg('Please select or capture a face photo before starting.');
      return;
    }

    if (!consentAccepted) {
      setErrorMsg('Please confirm user consent to process your image with the YouCam Skin Analysis API.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    setStepIndex(1);
    setCurrentStep('Preparing and validating image...');

    try {
      // Step 1: Upload to server and initialize YouCam v2.1 task
      setStepIndex(2);
      setCurrentStep('Uploading photo securely to YouCam File API (v2.0)...');

      const formData = new FormData();
      formData.append('image', imageFile);

      const initResponse = await startSkinAnalysis(formData);
      const createdTaskId = initResponse.taskId;
      setTaskId(createdTaskId);

      // Step 2: Poll YouCam S2S v2.1
      setStepIndex(3);
      setCurrentStep('YouCam v2.1 Task created. Evaluating 16 facial indicators...');

      const result = await pollAnalysisTask(createdTaskId, (status, attempt) => {
        if (status === 'running') {
          setStepIndex(4);
          setCurrentStep(`Analyzing skin metrics (polling cycle ${attempt})...`);
        } else {
          setCurrentStep(`Status: ${status} (cycle ${attempt})...`);
        }
      });

      setStepIndex(5);
      setCurrentStep('Normalizing results and finalizing skin report...');

      // Notify parent component
      onAnalysisComplete(result);
    } catch (err: any) {
      console.error('Skin Analysis failed:', err);
      setErrorMsg(
        err.message || 'An unexpected error occurred while communicating with the YouCam Skin Analysis API.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressSteps = [
    'Image Validation',
    'YouCam S2S Upload',
    'Task Initialization (v2.1)',
    '16-Indicator Diagnostic',
    'Report Normalization',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Hidden native camera capture input for 100% reliable device camera launch */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Hidden standard file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Hidden canvas for capturing video frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Title & Introduction */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[#4E6554] text-xs font-semibold mb-3 border border-emerald-100">
          <Sparkles className="w-3.5 h-3.5" />
          <span>YouCam AI Skin Analysis API v2.1</span>
        </div>
        <h1 className="font-serif-heading text-3xl font-bold text-stone-900 tracking-tight">
          Facial Skin Diagnostic Analysis
        </h1>
        <p className="mt-2 text-stone-600 text-sm leading-relaxed">
          Capture a selfie or upload a front-facing photo to evaluate 16 dermatological concerns including acne, hydration, sebum balance, erythema, and wrinkle depth.
        </p>
      </div>

      {/* API Key Missing Warning */}
      {!isYouCamConfigured && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 text-sm">YOUCAM_API_KEY Required for Live API Calls</h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Eudermia integrates real YouCam S2S API endpoints. To execute live analysis, add{' '}
                <code className="font-mono bg-amber-200/60 px-1 py-0.5 rounded text-amber-900 font-bold">
                  YOUCAM_API_KEY
                </code>{' '}
                in Google AI Studio Secrets settings (Settings &gt; Secrets).
              </p>
              <button
                onClick={onOpenSettings}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Open Secrets Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Method Tabs: Image Upload vs Live Camera */}
      {!imagePreview && (
        <div className="flex justify-center">
          <div className="inline-flex rounded-xl bg-stone-200/80 p-1 shadow-inner">
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Camera className="w-4 h-4 text-[#4E6554]" />
              Live Camera
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Upload className="w-4 h-4 text-stone-500" />
              Upload Image
            </button>
          </div>
        </div>
      )}

      {/* Input Area: Upload / Camera / Preview */}
      <div className="skincare-card rounded-3xl p-6 sm:p-8 bg-white border border-stone-200 shadow-sm">
        {/* State A: Selected/Captured Image Preview */}
        {imagePreview ? (
          <div className="space-y-6">
            <div className="relative max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-emerald-600/30 shadow-md aspect-3/4 bg-stone-900">
              <img
                src={imagePreview}
                alt="Face to be analyzed"
                className="w-full h-full object-cover"
              />
              {/* Face Guide Overlay */}
              <div className="absolute inset-0 border-2 border-white/40 rounded-full m-8 pointer-events-none flex items-center justify-center">
                <span className="text-[10px] text-white/80 font-medium px-2 py-0.5 bg-black/40 rounded-full backdrop-blur-xs">
                  Centered Framing
                </span>
              </div>
              <button
                onClick={handleResetImage}
                disabled={isSubmitting}
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer disabled:opacity-50"
                title="Choose different photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Verification Checklist */}
            <div className="bg-stone-50 rounded-xl p-4 max-w-lg mx-auto text-xs text-stone-600 space-y-1.5 border border-stone-200/70">
              <p className="font-semibold text-stone-800 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Framing Verification for YouCam v2.1
              </p>
              <ul className="list-disc pl-5 space-y-0.5 text-stone-600">
                <li>Front-facing angle with face occupying &gt; 60% of the frame</li>
                <li>Even, balanced lighting without heavy directional shadows</li>
                <li>Neutral expression; eyeglasses removed for ocular accuracy</li>
              </ul>
            </div>

            {/* Privacy & Consent Agreement */}
            <div className="max-w-lg mx-auto pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 h-4 w-4 rounded border-stone-300 text-[#4E6554] focus:ring-[#4E6554]"
                />
                <span className="text-xs text-stone-600 leading-relaxed">
                  I consent to transmit this image to the YouCam AI Skin Analysis S2S API for facial diagnostic processing. The photo is processed ephemerally and is not permanently stored or shared with unapproved third parties.
                </span>
              </label>
            </div>

            {/* Multi-Step Real Progress Stepper during processing */}
            {isSubmitting && (
              <div className="max-w-lg mx-auto p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-[#4E6554] animate-spin shrink-0" />
                  <div>
                    <h4 className="font-semibold text-stone-900 text-sm">
                      {currentStep || 'Processing skin analysis...'}
                    </h4>
                    {taskId && (
                      <p className="text-[11px] font-mono text-stone-500">
                        YouCam Task ID: {taskId}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#4E6554] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(stepIndex / progressSteps.length) * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-5 gap-1 text-[10px] text-stone-500 text-center font-medium">
                  {progressSteps.map((step, idx) => (
                    <div
                      key={step}
                      className={idx + 1 <= stepIndex ? 'text-[#4E6554] font-bold' : 'opacity-40'}
                    >
                      Step {idx + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message Display */}
            {errorMsg && (
              <div className="max-w-lg mx-auto p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-rose-900">
                      {errorMsg.includes('401') || errorMsg.includes('InvalidApiKey')
                        ? 'YouCam API Authentication Failed (HTTP 401)'
                        : 'Analysis Request Failed'}
                    </p>
                    <p className="mt-1 leading-relaxed">{errorMsg}</p>
                  </div>
                </div>

                {(errorMsg.includes('401') || errorMsg.includes('InvalidApiKey')) && (
                  <div className="mt-3 p-3 bg-white/80 rounded-lg border border-rose-200 text-stone-700 space-y-2">
                    <p className="font-bold text-stone-900 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                      How to Fix This:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] text-stone-600">
                      <li>
                        Go to the official YouCam API Console:{' '}
                        <a
                          href="https://yce.makeupar.com/api-console/en/api-keys/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-[#4E6554] underline inline-flex items-center gap-0.5"
                        >
                          yce.makeupar.com/api-console/en/api-keys/
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                      <li>
                        Click <strong>&ldquo;+ Create Key&rdquo;</strong> (or copy your existing active alphanumeric API Key).
                      </li>
                      <li>
                        <em>Note:</em> Make sure you copy the <strong>API Key</strong> itself, and not your 18-digit Account or App ID!
                      </li>
                      <li>
                        Open AI Studio <strong>Settings &gt; Secrets</strong>, update{' '}
                        <code className="font-mono bg-stone-100 px-1 py-0.5 rounded font-bold text-stone-900">
                          YOUCAM_API_KEY
                        </code>
                        , and run the scan again.
                      </li>
                    </ol>

                    <button
                      type="button"
                      onClick={onOpenSettings}
                      className="mt-2 w-full py-1.5 bg-[#4E6554] hover:bg-[#3E5244] text-white rounded-lg text-xs font-semibold transition-colors text-center cursor-pointer"
                    >
                      View AI Studio Secrets Guide
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetImage}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Change Photo
              </button>

              <button
                type="button"
                onClick={handleSubmitAnalysis}
                disabled={isSubmitting || !consentAccepted}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#4E6554] hover:bg-[#3E5244] text-white text-xs font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Skin...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>Run YouCam Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : activeTab === 'camera' ? (
          /* State B: Live Camera Capture */
          <div className="space-y-6">
            {cameraPermissionError ? (
              <div className="p-6 text-center rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900 text-base">Camera Access Restricted</h3>
                  <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto leading-relaxed">
                    {cameraPermissionError}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 max-w-md mx-auto text-left space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" /> Fast Alternatives:
                  </p>
                  <p>1. Tap <strong>Open Native Camera App</strong> below to take a photo directly.</p>
                  <p>2. Or choose an existing photo via <strong>Upload Image</strong>.</p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4E6554] text-white rounded-xl text-xs font-bold hover:bg-[#3E5244] transition-all shadow-xs cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    Open Native Camera App
                  </button>

                  <button
                    onClick={() => startCamera()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-stone-300 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry Web Camera
                  </button>

                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold hover:bg-stone-200 transition-colors cursor-pointer"
                  >
                    Switch to Upload
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative max-w-sm mx-auto rounded-2xl overflow-hidden aspect-3/4 bg-stone-900 shadow-md">
                  {/* Live Video Stream */}
                  <video
                    ref={setVideoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={() => {
                      videoRef.current?.play().catch((e) => console.warn('Play error:', e));
                    }}
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
                  />

                  {/* Loading indicator while acquiring hardware stream */}
                  {isStartingCamera && (
                    <div className="absolute inset-0 bg-stone-900/80 flex flex-col items-center justify-center text-white text-xs gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                      <span>Initializing camera hardware...</span>
                    </div>
                  )}

                  {/* Facial Oval Guide */}
                  <div className="absolute inset-x-8 inset-y-10 border-2 border-dashed border-emerald-400/70 rounded-[48%] pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] text-emerald-200 font-semibold px-2 py-0.5 bg-black/50 rounded-full">
                      Align Face in Oval
                    </span>
                  </div>

                  {/* Camera flip toggle (front/back) */}
                  <button
                    onClick={toggleFacingMode}
                    className="absolute top-3 right-3 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors cursor-pointer"
                    title="Flip camera"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    onClick={capturePhoto}
                    disabled={!isCameraActive || isStartingCamera}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#4E6554] hover:bg-[#3E5244] text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    Capture Photo
                  </button>

                  <button
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
                    title="Use native operating system camera app"
                  >
                    <Smartphone className="w-4 h-4 text-stone-500" />
                    Native Camera App
                  </button>

                  <button
                    onClick={() => {
                      stopCameraStream();
                      setActiveTab('upload');
                    }}
                    className="px-4 py-3 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* State C: Upload Dropzone */
          <div className="space-y-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-stone-300 hover:border-[#4E6554] rounded-2xl p-10 text-center cursor-pointer transition-colors bg-[#FAF8F5]/50 hover:bg-stone-50"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#4E6554] flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="font-serif-heading text-lg font-bold text-stone-800">
                Choose a Portrait Photo to Analyze
              </h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Drag and drop your front-facing selfie here, or click to browse. Supports JPEG, PNG, and WebP (up to 15MB).
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-stone-200 text-xs font-semibold text-stone-700 shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-stone-500" />
                  Select File from Device
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    nativeCameraInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-100"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  Take with Device Camera
                </button>
              </div>
            </div>

            {/* Quick Test Samples for Hackathon Judges */}
            <div className="pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between text-xs text-stone-500 mb-2.5">
                <span className="font-semibold uppercase tracking-wider text-[11px] text-stone-600">
                  Quick Evaluation Portraits
                </span>
                <span>Click to load verified test face</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => loadSamplePortrait(num)}
                    className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-all group cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-stone-800 group-hover:text-[#4E6554]">
                      Test Portrait {num + 1}
                    </p>
                    <p className="text-[11px] text-stone-500">Clean frontal framing</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scientific Notice */}
      <div className="text-center">
        <p className="text-xs text-stone-500 max-w-xl mx-auto leading-relaxed">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
          Eudermia delivers cosmetic facial diagnostics via the official YouCam AI Skin Analysis API v2.1. This is not a clinical medical diagnosis.
        </p>
      </div>
    </div>
  );
};
