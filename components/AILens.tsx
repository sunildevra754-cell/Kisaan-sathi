
import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, X, Zap, RotateCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { Language } from '../types';
import { GoogleGenAI } from "@google/genai";

interface AILensProps {
  lang: Language;
  onBack: () => void;
}

const AILens: React.FC<AILensProps> = ({ lang, onBack }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const isHindi = lang === Language.HINDI;

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    stopTracks();
    setCameraError(null);

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = newStream;
      setStream(newStream);
      setCameraPermission('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        // Wait for metadata to load then play
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Play error:", e));
        };
      }
    } catch (err: any) {
      console.error("Camera initialization error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraPermission('denied');
      } else {
        setCameraError(isHindi ? "कैमरा शुरू करने में समस्या आई।" : "Error starting camera.");
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopTracks();
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) {
      console.warn("Camera/Video not ready for capture");
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);
    
    try {
      const context = canvasRef.current.getContext('2d');
      if (!context) throw new Error("Canvas context missing");

      // Set canvas to actual video stream dimensions
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      // Get base64 data for Gemini
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: imageData, mimeType: 'image/jpeg' } },
            { text: `You are an expert Indian Agronomist. 
              1. Identify the crop in this image. 
              2. Diagnose any visible pests, diseases, or deficiencies. 
              3. Provide a clear, short recommendation (organic and chemical).
              Keep it under 50 words. Respond only in ${isHindi ? "Hindi" : "English"}.` 
            }
          ]
        }
      });

      const resultText = response.text;
      setAnalysis(resultText || (isHindi ? "कोई परिणाम नहीं मिला।" : "No results found."));
    } catch (e) {
      console.error("AI Analysis Error:", e);
      setAnalysis(isHindi ? "विश्लेषण विफल रहा। कृपया फिर से कोशिश करें।" : "Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col font-['Outfit'] overflow-hidden">
      {/* Top Navigation */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-30">
        <button 
          onClick={onBack} 
          className="p-4 bg-black/40 backdrop-blur-xl rounded-2xl text-white active:scale-90 transition-transform border border-white/10"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="px-5 py-2 bg-green-600/90 backdrop-blur-xl rounded-full text-white font-black text-xs flex items-center gap-2 border border-green-400 shadow-xl shadow-green-900/40">
          <Zap className="w-4 h-4 text-yellow-300 fill-current" /> 
          {isHindi ? "AI लेंस सक्रिय" : "AI LENS ACTIVE"}
        </div>

        <button 
          onClick={toggleCamera} 
          className="p-4 bg-black/40 backdrop-blur-xl rounded-2xl text-white active:scale-90 transition-transform border border-white/10"
          title="Switch Camera"
        >
          <RotateCw className="w-6 h-6" />
        </button>
      </div>

      {/* Main Viewport */}
      <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
        {cameraPermission === 'denied' ? (
          <div className="p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/50">
              <ShieldCheck className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-white text-xl font-black">{isHindi ? "कैमरा अनुमति आवश्यक है" : "Camera Permission Required"}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {isHindi ? "फसलों को स्कैन करने के लिए कृपया अपने ब्राउज़र सेटिंग्स में कैमरा एक्सेस सक्षम करें।" : "Please enable camera access in your browser settings to scan your crops."}
              </p>
            </div>
            <button 
              onClick={startCamera} 
              className="bg-white text-black px-8 py-3 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl"
            >
              {isHindi ? "पुन: प्रयास करें" : "Try Again"}
            </button>
          </div>
        ) : cameraError ? (
          <div className="p-10 text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <p className="text-white font-bold">{cameraError}</p>
            <button onClick={startCamera} className="bg-white text-black px-6 py-2 rounded-xl font-bold">Retry</button>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover" 
          />
        )}

        {/* HUD UI Elements */}
        {cameraPermission === 'granted' && !cameraError && (
          <div className="absolute inset-0 pointer-events-none border-[30px] border-black/10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border-2 border-white/20 rounded-[3rem]">
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-green-500 rounded-tl-3xl"></div>
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-green-500 rounded-tr-3xl"></div>
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-green-500 rounded-bl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-green-500 rounded-br-3xl"></div>
            </div>
          </div>
        )}

        {/* Scanning Line Animation */}
        {analyzing && (
           <div className="absolute inset-0 z-10 pointer-events-none">
              <div className="w-full h-1.5 bg-green-400 absolute animate-[scan_1.5s_infinite] shadow-[0_0_20px_rgba(74,222,128,1)]"></div>
              <style>{`
                @keyframes scan {
                  0% { top: 15%; }
                  50% { top: 85%; }
                  100% { top: 15%; }
                }
              `}</style>
           </div>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />

      {/* Analysis Results Display */}
      {analysis && (
        <div className="absolute bottom-40 left-6 right-6 bg-white/95 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border border-green-200 animate-in fade-in slide-in-from-bottom-10 z-40">
          <div className="flex items-center gap-2 mb-3">
             <div className="p-1.5 bg-green-100 rounded-lg text-green-600"><Zap className="w-4 h-4" /></div>
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600">
               {isHindi ? 'AI विश्लेषण परिणाम' : 'AI Analysis Result'}
             </h4>
          </div>
          <p className="text-slate-900 leading-relaxed font-bold text-lg mb-6">{analysis}</p>
          <button 
            onClick={() => setAnalysis(null)} 
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
          >
            {isHindi ? 'नया स्कैन' : 'New Scan'}
          </button>
        </div>
      )}

      {/* Trigger Button Section */}
      <div className="h-40 bg-slate-950 flex items-center justify-center border-t border-white/5">
        <button 
          onClick={captureAndAnalyze}
          disabled={analyzing || cameraPermission !== 'granted'}
          className="relative group disabled:opacity-50"
        >
          <div className="absolute -inset-4 bg-green-500/20 rounded-full blur-2xl group-active:scale-150 transition-all duration-500"></div>
          <div className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center shadow-2xl relative active:scale-90 transition-transform">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${analyzing ? 'bg-slate-800' : 'bg-green-600 hover:bg-green-500'}`}>
              {analyzing ? (
                <RefreshCw className="w-10 h-10 text-white animate-spin" />
              ) : (
                <Camera className="w-10 h-10 text-white" />
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default AILens;
