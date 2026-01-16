
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Language } from '../types';
import { CloudRain, Volume2, RefreshCw, MapPin, Loader2, Signal, Satellite, ExternalLink, Sparkles, VolumeX, Radio, Wind, Droplets, ShieldCheck, Globe, CheckCircle } from 'lucide-react';
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

  const fetchWeatherAndPreloadVoice = useCallback(async (lat?: number, lng?: number) => {
    if (!isMounted.current) return;
    setLoading(true);
    setError(null);

    try {
      let locParams: any = { lat, lng };
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
        CacheService.set('detailed_weather', data, 0.5);
        generateSpeech(data.text, lang).then(audio => { audioDataCache.current = audio; });
      }
    } catch (e: any) {
      if (isMounted.current) setError(isHindi ? "सर्च विफल रहा" : "Search failed");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [lang, isHindi]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({lat: latitude, lng: longitude});
        CacheService.set('last_pos', {lat: latitude, lng: longitude}, 24);
        await fetchWeatherAndPreloadVoice(latitude, longitude);
      },
      () => setLoading(false),
      { enableHighAccuracy: true }
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
      if (!base64Audio) return;
      if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const buffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsBroadcasting(false);
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
      <div className="bg-slate-950 rounded-[2.5rem] p-6 flex items-center justify-between border-b-8 border-green-600 shadow-xl relative overflow-hidden">
         <div className="flex items-center gap-6 relative z-10">
            <div className={`w-4 h-4 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]'}`}></div>
            <div>
              <p className="text-white font-black text-[9px] uppercase tracking-widest opacity-60">GOOGLE WEATHER SYNC</p>
              <h4 className="text-white font-black text-lg font-mono tracking-tighter">
                {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'SCANNING...'}
              </h4>
            </div>
         </div>
         <button onClick={startTracking} className="p-4 rounded-2xl bg-green-600 text-white shadow-lg active:scale-90 transition-all">
            <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
         </button>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-[3.5rem] shadow-2xl border-2 border-green-50 overflow-hidden p-8 md:p-12 relative">
         <div className="absolute top-8 right-8 flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-100">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-[10px] font-black text-green-800 uppercase tracking-widest">Grounded Accuracy</span>
         </div>

         <div className="flex flex-col lg:flex-row justify-between gap-12">
            <div className="flex-1 space-y-8">
               <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-green-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl">
                     <CloudRain className="w-12 h-12" />
                  </div>
                  <div>
                    <h2 className="text-7xl font-black text-slate-900 tracking-tighter">{weather?.temp ?? "--"}°</h2>
                    <p className="text-slate-400 font-bold uppercase text-xs">{isHindi ? 'वर्तमान तापमान' : 'Current Temp'}</p>
                  </div>
               </div>
               
               <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                  <p className="text-3xl font-black text-slate-800">{address || 'Locating...'}</p>
                  <MapPin className="w-8 h-8 text-green-200" />
               </div>

               <div className="bg-slate-900 p-10 rounded-[3rem] shadow-xl relative border-l-8 border-green-500">
                  <p className="text-white text-2xl font-bold leading-relaxed whitespace-pre-wrap italic">
                    {weather?.text || (isHindi ? "गूगल से रिपोर्ट लोड हो रही है..." : "Syncing with Google Weather...")}
                  </p>
                  <Sparkles className="absolute -top-4 -right-4 w-10 h-10 text-green-500" />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex items-center justify-between">
                     <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase mb-1">{isHindi ? 'आर्द्रता' : 'Humidity'}</p>
                        <p className="text-3xl font-black text-slate-900">{weather?.humidity || "--"}%</p>
                     </div>
                     <Droplets className="w-8 h-8 text-blue-300" />
                  </div>
                  <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-center justify-between">
                     <div>
                        <p className="text-[10px] font-black text-amber-400 uppercase mb-1">{isHindi ? 'हवा' : 'Wind'}</p>
                        <p className="text-3xl font-black text-slate-900">{weather?.wind || "--"} km/h</p>
                     </div>
                     <Wind className="w-8 h-8 text-amber-300" />
                  </div>
               </div>
            </div>

            <div className="w-full lg:w-64 flex flex-col items-center gap-6">
               <button 
                  onClick={toggleAiVoice}
                  disabled={!weather?.text || isAiVoiceLoading}
                  className={`w-44 h-44 rounded-full flex flex-col items-center justify-center gap-2 shadow-2xl transition-all active:scale-95 border-8 ${
                    isBroadcasting ? 'bg-red-600 border-red-400' : 'bg-slate-950 border-slate-900'
                  }`}
               >
                  {isAiVoiceLoading ? <Loader2 className="w-12 h-12 text-white animate-spin" /> : 
                   isBroadcasting ? <VolumeX className="w-12 h-12 text-white" /> : <Volume2 className="w-12 h-12 text-white" />}
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{isBroadcasting ? 'STOP' : 'LISTEN'}</span>
               </button>
            </div>
         </div>
      </div>

      {weather?.sources?.length > 0 && (
        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
           <div className="flex items-center gap-3 mb-4">
              <Globe className="w-5 h-5 text-green-600" />
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Verified Google Sources</h4>
           </div>
           <div className="flex flex-wrap gap-2">
              {weather.sources.map((s: any, i: number) => (
                 <a key={i} href={s.uri} target="_blank" className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-bold flex items-center gap-2 hover:bg-green-50 transition-all">
                    {s.title} <ExternalLink className="w-3 h-3 text-blue-400" />
                 </a>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default WeatherTracker;
