
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Language } from '../types';
import { CloudRain, Sun, Cloud, Thermometer, Droplets, Volume2, RefreshCw, MapPin, Loader2, Signal, Satellite, Globe, Clock, ExternalLink, ShieldCheck, Zap, AlertCircle, Sparkles, Mic } from 'lucide-react';
import { getWeatherData, resolveLocationName, generateSpeech } from '../services/geminiService';
import { CacheService } from '../utils/cacheService';
import { decode, decodeAudioData } from '../utils/audio';

const WeatherTracker: React.FC<{ lang: Language }> = ({ lang }) => {
  const isHindi = lang === Language.HINDI;
  const [weather, setWeather] = useState<any>(() => CacheService.get('detailed_weather'));
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(() => CacheService.get('last_pos'));
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [address, setAddress] = useState(() => CacheService.get('loc_full') || "");
  const [error, setError] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isAiVoiceLoading, setIsAiVoiceLoading] = useState(false);
  const isMounted = useRef(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const fetchWeather = useCallback(async (lat?: number, lng?: number, force = false) => {
    if (!isMounted.current) return;
    setLoading(true);
    setError(null);

    try {
      let locParams: any = { lat, lng };
      
      if (lat && lng && force) {
        const info = await resolveLocationName(lat, lng);
        if (info) {
          setAddress(info.full);
          locParams = { text: info.full };
        }
      } else if (address) {
        locParams = { text: address };
      }

      const data = await getWeatherData(locParams, lang);
      if (data && isMounted.current) {
        setWeather(data);
        CacheService.set('detailed_weather', data, 1);
      }
    } catch (e: any) {
      if (isMounted.current) setError(isHindi ? "सर्वर व्यस्त है" : "Service temporarily unavailable");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [lang, isHindi, address]);

  const startTracking = useCallback((force = false) => {
    if (!navigator.geolocation) {
      setError("GPS not supported.");
      return;
    }

    setLoading(true);
    setError(null);

    const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!isMounted.current) return;
        const { latitude, longitude, accuracy: acc } = pos.coords;
        setCoords({lat: latitude, lng: longitude});
        setAccuracy(Math.round(acc));
        CacheService.set('last_pos', {lat: latitude, lng: longitude}, 24);
        await fetchWeather(latitude, longitude, force);
      },
      (err) => {
        if (!isMounted.current) return;
        setError(isHindi ? "जीपीएस एक्सेस आवश्यक है" : "GPS Permission Required");
        setLoading(false);
        if (address) fetchWeather();
      },
      options
    );
  }, [address, fetchWeather, isHindi]);

  useEffect(() => {
    isMounted.current = true;
    startTracking();
    return () => { isMounted.current = false; };
  }, []);

  const playAiVoice = async () => {
    if (!weather?.text || isAiVoiceLoading) return;
    setIsAiVoiceLoading(true);
    setIsBroadcasting(true);

    try {
      const base64Audio = await generateSpeech(weather.text, lang);
      if (!base64Audio) throw new Error("No audio data");

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        audioContextRef.current,
        24000,
        1
      );

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        setIsBroadcasting(false);
        setIsAiVoiceLoading(false);
      };
      source.start();
    } catch (err) {
      console.error("AI Voice failed, falling back to browser TTS", err);
      // Fallback
      const utterance = new SpeechSynthesisUtterance(weather.text);
      utterance.lang = isHindi ? 'hi-IN' : 'en-US';
      utterance.onend = () => {
        setIsBroadcasting(false);
        setIsAiVoiceLoading(false);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-8 font-['Outfit'] pb-32 animate-in fade-in duration-500 max-w-5xl mx-auto">
      
      {/* Precision GPS Bar */}
      <div className="bg-slate-950 rounded-[3rem] p-8 flex flex-wrap items-center justify-between border-b-[12px] border-blue-600 shadow-2xl relative overflow-hidden group">
         <div className="flex items-center gap-8 relative z-10">
            <div className={`w-6 h-6 rounded-full ${error ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]' : loading ? 'bg-amber-500 animate-pulse' : 'bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.8)]'}`}></div>
            <div>
              <p className="text-white font-black text-[12px] uppercase tracking-[0.4em] mb-1">
                 {isHindi ? 'लाइव फील्ड ट्रैकिंग' : 'LIVE FIELD TRACKING'}
              </p>
              <h4 className="text-white/70 font-black text-xl font-mono tracking-tighter">
                {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : (isHindi ? 'सिग्नल खोज रहे हैं...' : 'ACQUIRING GPS...')}
              </h4>
            </div>
         </div>
         
         <div className="flex items-center gap-6 relative z-10">
            {accuracy && (
              <div className="flex items-center gap-4 px-6 py-4 bg-slate-900 rounded-2xl border border-white/10 text-blue-400">
                <Signal className="w-6 h-6" />
                <span className="text-white font-black text-lg uppercase tracking-widest">{accuracy}m</span>
              </div>
            )}
            <button 
              onClick={() => startTracking(true)}
              disabled={loading}
              className="p-6 rounded-3xl bg-blue-600 text-white shadow-2xl active:scale-90 transition-all"
            >
              <RefreshCw className={`w-8 h-8 ${loading ? 'animate-spin' : ''}`} />
            </button>
         </div>
      </div>

      {/* Weather Master Card */}
      <div className="bg-white p-12 md:p-16 rounded-[4.5rem] shadow-2xl border-2 border-blue-50 relative overflow-hidden">
         <div className="flex flex-col md:flex-row justify-between gap-12 relative z-10">
            <div className="flex-1 space-y-8">
               <div className="flex items-center gap-6">
                  <div className="p-8 bg-blue-600 rounded-[2.5rem] text-white shadow-xl">
                    <CloudRain className="w-16 h-16" />
                  </div>
                  <div>
                    <h2 className="text-7xl font-black text-slate-900 tracking-tighter">{weather?.temp ?? "--"}°</h2>
                    <p className="text-2xl font-black text-blue-600 uppercase tracking-widest">{isHindi ? 'लाइव तापमान' : 'LIVE TEMPERATURE'}</p>
                  </div>
               </div>
               
               <div className="flex items-center gap-4 bg-slate-50 px-8 py-5 rounded-[2.5rem] border border-slate-100 w-fit">
                  <MapPin className="w-7 h-7 text-blue-500" />
                  <p className="text-2xl font-bold text-slate-700 truncate max-w-lg">{address || (isHindi ? 'लोकेशन सिंक...' : 'Locating...')}</p>
               </div>

               <div className="bg-blue-50 p-10 rounded-[3.5rem] border border-blue-100 max-h-[450px] overflow-y-auto custom-scrollbar shadow-inner">
                  <p className="text-2xl font-bold text-slate-800 leading-relaxed whitespace-pre-wrap italic">
                    {weather?.text || (isHindi ? "लाइव मौसम और कृषि रिपोर्ट लोड हो रही है..." : "Fetching live agri-weather report...")}
                  </p>
               </div>
            </div>

            <div className="flex flex-col items-center gap-8 shrink-0">
               <button 
                  onClick={playAiVoice}
                  disabled={!weather?.text || isAiVoiceLoading}
                  className={`w-48 h-48 rounded-full flex flex-col items-center justify-center gap-4 shadow-2xl transition-all active:scale-95 border-8 ${isBroadcasting ? 'bg-red-600 border-red-400 animate-pulse' : 'bg-green-600 border-green-500 hover:bg-green-700'}`}
               >
                  {isAiVoiceLoading ? (
                    <Loader2 className="w-20 h-20 text-white animate-spin" />
                  ) : (
                    <Volume2 className="w-20 h-20 text-white" />
                  )}
                  <span className="text-sm font-black text-white uppercase tracking-widest">
                    {isAiVoiceLoading ? (isHindi ? 'तैयार...' : 'LOADING...') : (isHindi ? 'AI आवाज़' : 'AI VOICE')}
                  </span>
               </button>
               
               <div className="space-y-4 w-full">
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Updated</p>
                     <p className="text-xl font-black text-slate-900">{weather?.timestamp || '--:--'}</p>
                  </div>
               </div>
            </div>
         </div>

         {/* Grounding Sources */}
         {weather?.sources?.length > 0 && (
           <div className="mt-16 pt-10 border-t border-slate-100 relative z-10">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                <Globe className="w-5 h-5" /> {isHindi ? 'सत्यापित मौसम स्रोत' : 'VERIFIED GROUNDING SOURCES'}
              </p>
              <div className="flex flex-wrap gap-4">
                 {weather.sources.map((s: any, i: number) => (
                    <a key={i} href={s.uri} target="_blank" className="bg-slate-50 hover:bg-blue-100 px-8 py-4 rounded-[1.5rem] border border-slate-100 flex items-center gap-4 text-sm font-bold transition-all shadow-sm">
                       {s.title} <ExternalLink className="w-5 h-5 text-blue-500" />
                    </a>
                 ))}
              </div>
           </div>
         )}
         <Satellite className="absolute -right-20 -bottom-20 w-80 h-80 text-blue-500/5 opacity-10 animate-pulse" />
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default WeatherTracker;
