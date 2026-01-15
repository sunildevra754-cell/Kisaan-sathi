
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Language } from '../types';
import { CloudRain, Volume2, RefreshCw, MapPin, Loader2, Signal, Satellite, ExternalLink, Sparkles, VolumeX, Radio, Wind, Droplets, ShieldCheck, Globe } from 'lucide-react';
import { getWeatherData, resolveLocationName, generateSpeech } from '../services/geminiService';
import { CacheService } from '../utils/cacheService';
import { decode, decodeAudioData } from '../utils/audio';

const WeatherTracker: React.FC<{ lang: Language }> = ({ lang }) => {
  const isHindi = lang === Language.HINDI;
  const [weather, setWeather] = useState<any>(() => CacheService.get('detailed_weather'));
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(() => CacheService.get('last_pos'));
  const [address, setAddress] = useState(() => CacheService.get('loc_full') || "");
  const [error, setError] = useState<string | null>(null);
  
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isAiVoiceLoading, setIsAiVoiceLoading] = useState(false);
  
  const isMounted = useRef(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioDataCache = useRef<string | null>(null);

  const fetchWeatherAndPreloadVoice = useCallback(async (lat?: number, lng?: number, force = false) => {
    if (!isMounted.current) return;
    setLoading(true);
    setError(null);
    audioDataCache.current = null;

    try {
      let locParams: any = { lat, lng };
      
      // Always prioritize exact GPS coordinates for Google Search to ensure accuracy
      if (lat && lng) {
        const info = await resolveLocationName(lat, lng);
        if (info) {
          setAddress(info.full);
          locParams = { text: info.full };
        }
      }

      const data = await getWeatherData(locParams, lang);
      if (data && isMounted.current) {
        setWeather(data);
        CacheService.set('detailed_weather', data, 0.5); // Cache for 30 mins for freshness
        
        generateSpeech(data.text, lang).then(audio => {
           audioDataCache.current = audio;
        });
      }
    } catch (e: any) {
      if (isMounted.current) setError(isHindi ? "सर्वर व्यस्त है" : "Service temporarily unavailable");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [lang, isHindi, address]);

  const startTracking = useCallback((force = false) => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!isMounted.current) return;
        const { latitude, longitude } = pos.coords;
        setCoords({lat: latitude, lng: longitude});
        CacheService.set('last_pos', {lat: latitude, lng: longitude}, 24);
        await fetchWeatherAndPreloadVoice(latitude, longitude, force);
      },
      () => setLoading(false),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [fetchWeatherAndPreloadVoice]);

  useEffect(() => {
    isMounted.current = true;
    startTracking();
    return () => { isMounted.current = false; };
  }, []);

  const toggleAiVoice = async () => {
    if (isBroadcasting) {
      audioSourceRef.current?.stop();
      setIsBroadcasting(false);
      return;
    }

    if (!weather?.text || isAiVoiceLoading) return;

    try {
      let base64Audio = audioDataCache.current;
      if (!base64Audio) {
        setIsAiVoiceLoading(true);
        base64Audio = await generateSpeech(weather.text, lang);
        setIsAiVoiceLoading(false);
      }

      if (!base64Audio) throw new Error("Audio fail");
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => { setIsBroadcasting(false); };
      
      audioSourceRef.current = source;
      setIsBroadcasting(true);
      source.start();
    } catch (err) {
      setIsBroadcasting(false);
      setIsAiVoiceLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-['Outfit'] pb-32 animate-in fade-in duration-500 max-w-5xl mx-auto px-4">
      {/* Precision HUD Bar */}
      <div className="bg-slate-950 rounded-[3rem] p-6 flex items-center justify-between border-b-[8px] border-green-600 shadow-xl relative overflow-hidden">
         <div className="flex items-center gap-6 relative z-10">
            <div className={`w-4 h-4 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]'}`}></div>
            <div>
              <p className="text-white font-black text-[9px] uppercase tracking-widest opacity-60">GOOGLE LIVE GEOSYNC</p>
              <h4 className="text-white font-black text-lg font-mono tracking-tighter">
                {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'SCANNING...'}
              </h4>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <span className="hidden md:flex bg-green-600/20 text-green-400 text-[9px] font-black uppercase px-4 py-2 rounded-full border border-green-600/30 gap-2 items-center">
               <ShieldCheck className="w-3 h-3" /> Precision Active
            </span>
            <button onClick={() => startTracking(true)} className="p-4 rounded-2xl bg-green-600 text-white shadow-lg active:scale-90 transition-all">
               <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
            </button>
         </div>
      </div>

      {/* Main Weather Intelligence Card */}
      <div className="bg-white rounded-[4rem] shadow-2xl border-2 border-green-50 overflow-hidden relative p-8 md:p-14">
         <div className="flex flex-col lg:flex-row justify-between gap-12">
            <div className="flex-1 space-y-8">
               <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-green-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-xl relative">
                     <CloudRain className="w-12 h-12" />
                     <div className="absolute -top-2 -right-2 bg-blue-500 p-1.5 rounded-full border-2 border-white shadow-md">
                        <Globe className="w-4 h-4" />
                     </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                       <span className="bg-green-600 text-white text-[8px] font-black uppercase px-3 py-1 rounded-full">Google Real-time</span>
                       <span className="text-slate-400 text-[8px] font-bold uppercase">{weather?.timestamp}</span>
                    </div>
                    <h2 className="text-7xl font-black text-slate-900 tracking-tighter">{weather?.temp ?? "--"}°</h2>
                  </div>
               </div>
               
               <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                  <p className="text-3xl font-black text-slate-800 leading-tight">{address || 'Locating...'}</p>
                  <MapPin className="w-10 h-10 text-green-200" />
               </div>

               <div className="bg-slate-900 p-10 rounded-[3rem] shadow-xl relative border-l-[12px] border-green-600">
                  <p className="text-white text-2xl font-bold leading-relaxed whitespace-pre-wrap italic">
                    {weather?.text || (isHindi ? "गूगल AI आपके खेत की सटीक रिपोर्ट तैयार कर रहा है..." : "Google AI is generating a precise report for your field...")}
                  </p>
                  <div className="absolute -top-4 -right-4 bg-white p-3 rounded-full shadow-lg">
                    <Sparkles className="w-8 h-8 text-green-600" />
                  </div>
               </div>

               {/* Precision Stats */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 flex items-center justify-between group">
                     <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{isHindi ? 'आर्द्रता' : 'Humidity'}</p>
                        <p className="text-3xl font-black text-slate-900">{weather?.humidity || "--"}%</p>
                     </div>
                     <Droplets className="w-10 h-10 text-blue-300 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 flex items-center justify-between group">
                     <div>
                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">{isHindi ? 'हवा' : 'Wind'}</p>
                        <p className="text-3xl font-black text-slate-900">{weather?.wind || "--"} km/h</p>
                     </div>
                     <Wind className="w-10 h-10 text-amber-300 group-hover:scale-110 transition-transform" />
                  </div>
               </div>
            </div>

            <div className="w-full lg:w-64 flex flex-col items-center gap-8">
               <button 
                  onClick={toggleAiVoice}
                  disabled={!weather?.text || isAiVoiceLoading}
                  className={`w-48 h-48 rounded-full flex flex-col items-center justify-center gap-2 shadow-2xl transition-all active:scale-95 border-8 ${
                    isBroadcasting ? 'bg-red-600 border-red-400' : 'bg-slate-950 border-slate-900'
                  }`}
               >
                  {isAiVoiceLoading ? <Loader2 className="w-16 h-16 text-white animate-spin" /> : 
                   isBroadcasting ? <VolumeX className="w-16 h-16 text-white" /> : <Volume2 className="w-16 h-16 text-white" />}
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{isAiVoiceLoading ? 'SYNCING' : 'LISTEN'}</span>
               </button>

               <div className="w-full h-10 flex items-center justify-center gap-1">
                  {[...Array(10)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1 bg-green-500 rounded-full transition-all duration-300 ${isBroadcasting ? 'h-full' : 'h-2 bg-slate-200'}`}
                      style={{ animation: isBroadcasting ? `bounce 0.6s infinite ${i * 0.1}s` : 'none' }}
                    />
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* Grounding Source Verification */}
      {weather?.sources?.length > 0 && (
        <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
           <div className="flex items-center gap-4 mb-6">
              <Radio className="w-6 h-6 text-green-600 animate-pulse" />
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
                 {isHindi ? 'सत्यापित गूगल स्रोत' : 'VERIFIED GOOGLE SOURCES'}
              </h4>
           </div>
           <div className="flex flex-wrap gap-3">
              {weather.sources.map((s: any, i: number) => (
                 <a key={i} href={s.uri} target="_blank" className="bg-white hover:bg-green-50 px-6 py-3 rounded-2xl border border-slate-200 flex items-center gap-3 text-xs font-black transition-all shadow-sm">
                    {s.title} <ExternalLink className="w-4 h-4 text-blue-500" />
                 </a>
              ))}
           </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { height: 10%; }
          50% { height: 80%; }
        }
      `}</style>
    </div>
  );
};

export default WeatherTracker;
