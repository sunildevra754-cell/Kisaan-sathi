
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FarmerProfile, Expense, Language } from '../types';
import { MapPin, RefreshCw, AlertCircle, CloudRain, Thermometer, Droplets, Wind, Sun, ChevronRight, LocateFixed, Signal, Globe, Radio, ShieldCheck, Volume2, Satellite, Zap, Loader2, Play, Sparkles, Settings, Mic, ShoppingCart, Sprout, Radar, ExternalLink } from 'lucide-react';
import { CacheService } from '../utils/cacheService';
import { getWeatherData, resolveLocationName, generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audio';

interface DashboardProps {
  profile: FarmerProfile;
  expenses: Expense[];
  lang: Language;
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ profile, expenses, lang, onNavigate }) => {
  const isHindi = lang === Language.HINDI;
  const [weatherData, setWeatherData] = useState<any>(() => CacheService.get('live_weather'));
  const [locationName, setLocationName] = useState<string>(() => CacheService.get('loc_short') || (isHindi ? "लोकेशन..." : "Locating..."));
  const [fullAddress, setFullAddress] = useState<string>(() => CacheService.get('loc_full') || "");
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(() => CacheService.get('last_pos'));
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isAiVoiceLoading, setIsAiVoiceLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<'none' | 'gps' | 'quota' | 'general'>('none');
  
  const isMounted = useRef(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const syncWeatherData = async (locParams: { lat?: number; lng?: number; text?: string }, force = false) => {
    if (!isMounted.current) return;
    setLoading(true);
    try {
      const data = await getWeatherData(locParams, lang);
      if (data && isMounted.current) {
        setWeatherData(data);
        CacheService.set('live_weather', data, 1);
      }
    } catch (e: any) {
      if (isMounted.current) setErrorStatus(e.message?.includes('429') ? 'quota' : 'general');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const startLiveTracking = useCallback(async (force = false) => {
    if (!isMounted.current) return;
    setLoading(true);
    setErrorStatus('none');

    if (!navigator.geolocation) {
      setErrorStatus('gps');
      setLoading(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const handleSuccess = async (pos: GeolocationPosition) => {
      if (!isMounted.current) return;
      const { latitude, longitude, accuracy } = pos.coords;
      setCoords({lat: latitude, lng: longitude});
      setGpsAccuracy(Math.round(accuracy));
      
      const lastPos = CacheService.get('last_pos');
      const hasMoved = !lastPos || Math.abs(lastPos.lat - latitude) > 0.005 || Math.abs(lastPos.lng - longitude) > 0.005;

      if (hasMoved || force || !weatherData) {
        try {
          const locInfo = await resolveLocationName(latitude, longitude);
          if (locInfo && isMounted.current) {
            setLocationName(locInfo.short);
            setFullAddress(locInfo.full);
            CacheService.set('last_pos', {lat: latitude, lng: longitude}, 24);
            CacheService.set('loc_short', locInfo.short, 24);
            CacheService.set('loc_full', locInfo.full, 24);
            await syncWeatherData({ text: locInfo.full }, force);
          }
        } catch (e: any) {
          if (isMounted.current) setErrorStatus('general');
        }
      }
      setLoading(false);
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, (err) => {
      setErrorStatus('gps');
      setLoading(false);
    }, options);
  }, [lang, weatherData]);

  useEffect(() => {
    isMounted.current = true;
    startLiveTracking(true);
    return () => { isMounted.current = false; };
  }, []);

  const speakDailyReport = async () => {
    if (!weatherData?.text || isAiVoiceLoading) return;
    setIsAiVoiceLoading(true);
    setIsBroadcasting(true);

    try {
      const base64Audio = await generateSpeech(weatherData.text, lang);
      if (!base64Audio) throw new Error("Audio generation failed");

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
      console.warn("AI Voice failed, using fallback", err);
      const utterance = new SpeechSynthesisUtterance(weatherData.text);
      utterance.lang = isHindi ? 'hi-IN' : 'en-US';
      utterance.onend = () => {
        setIsBroadcasting(false);
        setIsAiVoiceLoading(false);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-8 font-['Outfit'] pb-32 max-w-5xl mx-auto">
      {/* Precision Satellite Bar */}
      <div className="bg-slate-950 rounded-[3rem] p-6 flex items-center justify-between border-b-[12px] border-green-600 shadow-2xl overflow-hidden relative group">
         <div className="flex items-center gap-6 relative z-10">
            <div className={`w-5 h-5 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)]'}`}></div>
            <div>
              <p className="text-white font-black text-[10px] uppercase tracking-widest">{isHindi ? 'लाइव फील्ड ट्रैकिंग' : 'LIVE FIELD TRACKING'}</p>
              <h4 className="text-white/70 font-black text-lg font-mono tracking-tighter">
                {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : (isHindi ? 'खोज रहे हैं...' : 'AQUIRING...')}
              </h4>
            </div>
         </div>
         <button 
           onClick={() => startLiveTracking(true)}
           className="p-5 bg-green-600 rounded-2xl text-white shadow-xl active:scale-90 transition-all"
         >
           <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
         </button>
      </div>

      {/* Weather Bulletin Card */}
      <div className="bg-white p-10 md:p-14 rounded-[4.5rem] shadow-2xl border-2 border-green-50 relative overflow-hidden">
         <div className="flex flex-col md:flex-row justify-between gap-10 relative z-10">
            <div className="space-y-6 flex-1">
               <div className="flex items-center gap-4 bg-green-600 text-white px-8 py-4 rounded-full w-fit shadow-lg">
                  <CloudRain className="w-8 h-8" />
                  <span className="text-4xl font-black">{weatherData?.temp ?? "--"}°</span>
               </div>
               <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-tight">
                 {locationName}
               </h2>
               <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                  <p className="text-xl font-bold text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                    {weatherData?.text || (isHindi ? "लाइव रिपोर्ट आ रही है..." : "Fetching live report...")}
                  </p>
               </div>
            </div>

            <div className="flex flex-col justify-between items-center gap-8">
               <button 
                  onClick={speakDailyReport}
                  disabled={!weatherData?.text || isAiVoiceLoading}
                  className={`w-40 h-40 rounded-full flex flex-col items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 border-4 ${isBroadcasting ? 'bg-red-600 border-red-400 animate-pulse' : 'bg-green-600 border-green-500 hover:bg-green-700'}`}
               >
                  {isAiVoiceLoading ? (
                    <Loader2 className="w-16 h-16 text-white animate-spin" />
                  ) : (
                    <Volume2 className="w-16 h-16 text-white" />
                  )}
                  <span className="text-xs font-black text-white uppercase tracking-widest">
                    {isAiVoiceLoading ? (isHindi ? 'तैयार...' : 'AI LOAD') : (isHindi ? 'सुनें' : 'LISTEN')}
                  </span>
               </button>
            </div>
         </div>

         {/* Sources Grounding */}
         {weatherData?.sources?.length > 0 && (
           <div className="mt-12 pt-8 border-t border-slate-100 relative z-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4" /> {isHindi ? 'सत्यापित स्रोत' : 'GROUNDING SOURCES'}
              </p>
              <div className="flex flex-wrap gap-3">
                 {weatherData.sources.map((s: any, i: number) => (
                    <a key={i} href={s.uri} target="_blank" className="bg-slate-50 hover:bg-green-100 px-6 py-3 rounded-2xl border border-slate-100 flex items-center gap-3 text-xs font-bold transition-all">
                       {s.title} <ExternalLink className="w-4 h-4 text-blue-500" />
                    </a>
                 ))}
              </div>
           </div>
         )}
      </div>

      {/* Navigation Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
         {[
           { id: 'mandi', label: isHindi ? 'मंडी भाव' : 'Mandi Prices', icon: <ShoppingCart className="w-8 h-8" />, color: 'bg-amber-600' },
           { id: 'crop-doctor', label: isHindi ? 'फसल डॉक्टर' : 'Crop Doctor', icon: <Sprout className="w-8 h-8" />, color: 'bg-emerald-600' },
           { id: 'assistant', label: isHindi ? 'किसान साथी' : 'AI Help', icon: <Mic className="w-8 h-8" />, color: 'bg-indigo-600' },
           { id: 'map', label: isHindi ? 'खेत मैप' : 'Farm Map', icon: <Satellite className="w-8 h-8" />, color: 'bg-slate-800' },
         ].map(item => (
            <button 
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center justify-center p-10 bg-white rounded-[3.5rem] shadow-xl border-b-8 border-slate-100 hover:border-green-600 transition-all active:scale-90 group"
            >
               <div className={`p-6 ${item.color} text-white rounded-[2rem] mb-6 shadow-2xl group-hover:scale-110 transition-transform`}>
                  {item.icon}
               </div>
               <span className="font-black text-lg text-slate-900 uppercase tracking-tighter">{item.label}</span>
            </button>
         ))}
      </div>
    </div>
  );
};

export default Dashboard;
