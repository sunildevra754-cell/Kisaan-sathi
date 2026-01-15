
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Mic, MicOff, X, Volume2, Radio, Loader2, History } from 'lucide-react';
import { Language, FarmerProfile } from '../types';
import { decode, decodeAudioData, encode } from '../utils/audio';

interface LiveAssistantProps {
  lang: Language;
  profile: FarmerProfile;
  onClose: () => void;
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ lang, profile, onClose }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [currentOutput, setCurrentOutput] = useState("");
  const [status, setStatus] = useState<'connecting' | 'listening' | 'speaking' | 'idle'>('connecting');

  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<any>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isHindi = lang === Language.HINDI;

  const createPCMBuffer = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  };

  const startSession = useCallback(async () => {
    try {
      // START MIC IMMEDIATELY
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('idle');
            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(2048, 1, 1); // Smaller buffer for speed
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return;
              const pcmBlob = createPCMBuffer(e.inputBuffer.getChannelData(0));
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current!.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.inputTranscription) {
              setCurrentInput(msg.serverContent.inputTranscription.text);
              setStatus('listening');
            }
            if (msg.serverContent?.outputTranscription) {
              setCurrentOutput(msg.serverContent.outputTranscription.text);
              setStatus('speaking');
            }
            if (msg.serverContent?.turnComplete) {
              setCurrentInput("");
              setCurrentOutput("");
              setStatus('idle');
            }

            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextOutRef.current) {
              const ctx = audioContextOutRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => activeSourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              activeSourcesRef.current.add(source);
            }

            if (msg.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => onClose(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: isHindi ? 'Kore' : 'Zephyr' } } },
          systemInstruction: `Be extremely fast and concise. You are a speed-optimized agri-bot.`,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      onClose();
    }
  }, [lang, profile, isHindi, isMuted, onClose]);

  useEffect(() => {
    startSession();
    return () => {
      sessionPromiseRef.current?.then((s: any) => s.close());
      audioContextInRef.current?.close();
      audioContextOutRef.current?.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-3xl flex flex-col animate-in fade-in duration-300">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="relative w-64 h-64 flex items-center justify-center mb-12">
          <div className={`absolute inset-0 rounded-full blur-[60px] transition-all duration-300 ${
            status === 'speaking' ? 'bg-green-500/40' : status === 'listening' ? 'bg-blue-500/40 animate-pulse' : 'bg-slate-500/20'
          }`}></div>
          <div className="w-40 h-40 rounded-full border-4 bg-slate-900 border-slate-800 flex items-center justify-center">
             {status === 'connecting' ? <Loader2 className="w-12 h-12 text-white animate-spin" /> : <Radio className="w-12 h-12 text-white" />}
          </div>
        </div>

        <div className="w-full max-w-lg space-y-4">
           {currentInput && <div className="p-5 bg-blue-600/20 rounded-2xl text-blue-200 font-bold animate-in slide-in-from-right-2">{currentInput}</div>}
           {currentOutput && <div className="p-5 bg-green-600/20 rounded-2xl text-green-200 font-bold animate-in slide-in-from-left-2">{currentOutput}</div>}
        </div>
      </div>

      <div className="p-10 border-t border-white/5 bg-black/50 backdrop-blur-3xl flex items-center justify-between">
        <button onClick={onClose} className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white"><X /></button>
        <button onClick={() => setIsMuted(!isMuted)} className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl ${isMuted ? 'bg-red-600' : 'bg-green-600'}`}>
           {isMuted ? <MicOff className="text-white" /> : <Mic className="text-white" />}
        </button>
        <button className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white/30"><History /></button>
      </div>
    </div>
  );
};

export default LiveAssistant;
