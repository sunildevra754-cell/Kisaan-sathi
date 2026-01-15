
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FarmerProfile, Expense, Language } from '../types';
// Fixed: Added missing Cpu import from lucide-react
import { MapPin, RefreshCw, AlertCircle, CloudRain, Thermometer, Droplets, Wind, Sun, ChevronRight, LocateFixed, Signal, Globe, Radio, ShieldCheck, Volume2, Satellite, Zap, Loader2, Play, Sparkles, Settings, Mic, ShoppingCart, Sprout, Radar, ExternalLink, MessageSquare, Cpu } from 'lucide-react';
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
  const [locationName, setLocationName] = useState<string>(() => CacheService.get('loc_short') || (isHindi ? "खोज रहे हैं..." : "Locating..."));
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(() => CacheService.get('last_pos'));
  
  const [loading, setLoading] = useState(false);
  const [isAiVoiceLoading, setIsAiVoiceLoading] = useState(false);
  
  const isMounted = useRef(true);

  const performParallelSync = async (lat: number, lng: number) => {
    if (!isMounted.current) return;
    const [locPromise, weatherPromise] = [
      resolveLocationName(lat, lng),
      getWeatherData({ lat, lng }, lang)
    ];

    try {
      const locInfo = await locPromise;
      if (locInfo && isMounted.current) {
        setLocationName(locInfo.short);
        CacheService.set('loc_short', locInfo.short, 24);
      }
      const freshWeather = await weatherPromise;
      if (freshWeather && isMounted.current) {
        setWeatherData(freshWeather);
        CacheService.set('live_weather', freshWeather, 1);
      }
    } catch (err) {
      console.warn("Sync failed", err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const startQuickTrack = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({lat: latitude, lng: longitude});
        CacheService.set('last_pos', {lat: latitude, lng: longitude}, 24);
        performParallelSync(latitude, longitude);
      },
      () => setLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [lang]);

  useEffect(() => {
    isMounted.current = true;
    startQuickTrack();
    return () => { isMounted.current = false; };
  }, []);

  return (
    <div className="space-y-8 font-['Outfit'] pb-32 max-w-5xl mx-auto">
      {/* Precision Status Bar */}
      <div className="bg-slate-950 rounded-[3rem] p-6 flex items-center justify-between border-b-[10px] border-green-600 shadow-2xl relative overflow-hidden">
         <div className="flex items-center gap-6 relative z-10">
            <div className={`w-4 h-4 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]'}`}></div>
            <div>
              <p className="text-white font-black text-[9px] uppercase tracking-widest">{isHindi ? 'लाइव फील्ड लोकेशन' : 'LIVE FIELD LOCATION'}</p>
              <h4 className="text-white/60 font-black text-sm font-mono tracking-tighter">
                {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : (isHindi ? 'सर्च...' : 'SYNCING...')}
              </h4>
            </div>
         </div>
         <button onClick={startQuickTrack} className="p-4 bg-green-600 rounded-2xl text-white active:scale-90 transition-all">
           <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
         </button>
      </div>

      {/* Google Live Assistant Prompt Card */}
      <div className="bg-gradient-to-br from-green-700 to-green-900 p-12 rounded-[4rem] shadow-2xl relative overflow-hidden group">
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-6 flex-1 text-center md:text-left">
               <h2 className="text-5xl font-black text-white tracking-tighter leading-tight">
                 {isHindi ? 'Google AI से सीधे बात करें' : 'Talk Directly to Google AI'}
               </h2>
               <p className="text-green-100 text-xl font-medium max-w-lg">
                 {isHindi ? 'खेत की समस्याओं के लिए तुरंत आवाज से सलाह लें।' : 'Get instant farming advice using only your voice.'}
               </p>
               <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <span className="bg-white/10 px-6 py-2 rounded-full text-white font-black text-xs uppercase tracking-widest border border-white/10">Real-time</span>
                  <span className="bg-white/10 px-6 py-2 rounded-full text-white font-black text-xs uppercase tracking-widest border border-white/10">Voice-to-Voice</span>
               </div>
            </div>
            <div className="relative group-hover:scale-110 transition-transform duration-500">
               <div className="absolute inset-0 bg-green-400/20 blur-[60px] animate-pulse rounded-full"></div>
               <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center shadow-2xl relative z-10 border-8 border-green-800">
                  <Mic className="w-20 h-20 text-green-900" />
               </div>
            </div>
         </div>
         <Sparkles className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10" />
      </div>

      {/* Stats and Weather Summary */}
      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-green-50 flex flex-col md:flex-row gap-10">
          <div className="flex-1 space-y-4">
             <div className="flex items-center gap-4">
                <CloudRain className="w-10 h-10 text-blue-500" />
                <h3 className="text-3xl font-black text-slate-900">{locationName}</h3>
             </div>
             <p className="text-xl font-bold text-slate-600 italic">
               {weatherData?.text || (isHindi ? "अपडेट हो रहा है..." : "Updating...")}
             </p>
          </div>
          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center min-w-[180px]">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Temperature</p>
             <p className="text-5xl font-black text-slate-900">{weatherData?.temp || "--"}°</p>
          </div>
      </div>

      {/* Grid of actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
         {[
           { id: 'mandi', label: isHindi ? 'मंडी भाव' : 'Mandi Bhav', icon: <ShoppingCart className="w-8 h-8" />, color: 'bg-amber-600' },
           { id: 'crop-doctor', label: isHindi ? 'फसल डॉक्टर' : 'Crop Doctor', icon: <Sprout className="w-8 h-8" />, color: 'bg-emerald-600' },
           { id: 'iot', label: isHindi ? 'स्मार्ट IoT' : 'Smart IoT', icon: <Cpu className="w-8 h-8" />, color: 'bg-indigo-600' },
           { id: 'weather', label: isHindi ? 'मौसम' : 'Weather', icon: <CloudRain className="w-8 h-8" />, color: 'bg-blue-600' },
         ].map(item => (
            <button key={item.id} onClick={() => onNavigate(item.id)} className="flex flex-col items-center justify-center p-10 bg-white rounded-[3rem] shadow-xl border-b-[8px] border-slate-100 active:scale-95 transition-all group">
               <div className={`p-6 ${item.color} text-white rounded-3xl mb-4 shadow-2xl group-hover:scale-110 transition-transform`}>{item.icon}</div>
               <span className="font-black text-sm text-slate-900 uppercase tracking-tighter">{item.label}</span>
            </button>
         ))}
      </div>
    </div>
  );
};

export default Dashboard;
