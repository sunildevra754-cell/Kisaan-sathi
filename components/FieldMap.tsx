
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Navigation, RefreshCw, Crosshair, Map as MapIcon, Landmark, ShoppingCart, Info, Globe, Loader2, AlertCircle, LocateFixed, Signal, Radio, ExternalLink, Volume2, CloudRain, Thermometer } from 'lucide-react';
import { Language } from '../types';
import { GoogleGenAI } from "@google/genai";
import { resolveLocationName } from '../services/geminiService';
import { CacheService } from '../utils/cacheService';

const FieldMap: React.FC<{ lang: Language }> = ({ lang }) => {
  const isHindi = lang === Language.HINDI;
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [nearbyPoints, setNearbyPoints] = useState<{ title: string; uri: string; type: string; snippet?: string }[]>([]);
  const [isGrounding, setIsGrounding] = useState(false);
  const [locationLabel, setLocationLabel] = useState("");
  const [weatherSnippet, setWeatherSnippet] = useState<any>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  const fetchGroundingInfo = async (lat: number, lng: number) => {
    setIsGrounding(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // googleMaps tool is only supported on gemini-2.5 series
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `I am an Indian farmer at ${lat}, ${lng}. 
                   1. Find APMC Mandis, Seed Centers, Soil Labs nearby.
                   2. Extract full Maps URIs.`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: { latitude: lat, longitude: lng }
            }
          }
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const points = chunks
        .filter((c: any) => c.maps)
        .map((c: any) => ({
          title: c.maps.title || (isHindi ? "नजदीकी केंद्र" : "Nearby Center"),
          uri: c.maps.uri,
          type: isHindi ? "सत्यापित केंद्र" : "Verified Center",
          snippet: c.maps.placeAnswerSources?.[0]?.reviewSnippets?.[0]
        }));

      setNearbyPoints(points);
      
      const locInfo = await resolveLocationName(lat, lng);
      if (locInfo) setLocationLabel(locInfo.full);

      const cachedWeather = CacheService.get('live_weather');
      if (cachedWeather) setWeatherSnippet(cachedWeather);

    } catch (e) {
      console.error("Grounding error:", e);
    } finally {
      setIsGrounding(false);
    }
  };

  const startLiveTracking = useCallback(() => {
    setLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("GPS not supported");
      setLoading(false);
      return;
    }

    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    // Fast initial check
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      setCoords({ lat: latitude, lng: longitude });
      setAccuracy(Math.round(accuracy));
      setLoading(false);
      fetchGroundingInfo(latitude, longitude);
      
      // Then start watch
      watchId.current = navigator.geolocation.watchPosition(
        (wp) => {
          const { latitude, longitude, accuracy } = wp.coords;
          setCoords({ lat: latitude, lng: longitude });
          setAccuracy(Math.round(accuracy));
        },
        (err) => setGpsError(err.message),
        options
      );
    }, (err) => {
      setGpsError(err.code === err.PERMISSION_DENIED ? "PERMISSION_DENIED" : "SIGNAL_ERROR");
      setLoading(false);
    }, options);

  }, [isHindi]);

  useEffect(() => {
    startLiveTracking();
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [startLiveTracking]);

  const speakLocation = () => {
    if (!locationLabel) return;
    const text = isHindi ? `आपकी लोकेशन ${locationLabel} है` : `Your location is ${locationLabel}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = isHindi ? 'hi-IN' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const mapUrl = coords 
    ? `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&t=${mapType === 'satellite' ? 'k' : 'm'}&z=17&output=embed`
    : "";

  return (
    <div className="space-y-6 font-['Outfit'] pb-24">
      {/* Precision GPS Bar */}
      <div className="bg-slate-950 rounded-[3rem] p-6 flex flex-wrap items-center justify-between gap-6 border-b-8 border-green-600 shadow-2xl relative overflow-hidden">
         <div className="flex items-center gap-6 relative z-10">
            <div className={`w-6 h-6 rounded-full ${loading ? 'bg-orange-500 animate-pulse' : gpsError ? 'bg-red-500' : 'bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.8)]'}`}></div>
            <div>
               <p className="text-white font-black text-[11px] uppercase tracking-[0.4em] mb-1">
                 {loading ? (isHindi ? 'कनेक्टिंग...' : 'CONNECTING...') : (isHindi ? 'लाइव ट्रैकिंग' : 'LIVE TRACKING')}
               </p>
               <h2 className="text-white/70 font-black text-xl font-mono tracking-tighter">
                 {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : '--.------, --.------'}
               </h2>
            </div>
         </div>

         <div className="flex items-center gap-4 relative z-10">
            {accuracy && (
              <div className="bg-slate-900 px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-4">
                 <Signal className={`w-5 h-5 ${accuracy < 25 ? 'text-green-400' : 'text-amber-400'}`} />
                 <span className="text-white font-black text-xs uppercase tracking-[0.2em]">{accuracy}m Precision</span>
              </div>
            )}
            <button 
              onClick={startLiveTracking}
              className="p-4 bg-green-600 rounded-2xl text-white hover:bg-green-500 transition-all active:scale-90 shadow-xl"
            >
              <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
            </button>
         </div>
      </div>

      {/* Map Viewport */}
      <div className="relative bg-white rounded-[4rem] shadow-2xl border-8 border-white overflow-hidden aspect-video min-h-[550px]">
        {loading && !coords ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-8">
             <Loader2 className="w-24 h-24 text-green-600 animate-spin" />
             <p className="font-black text-3xl text-slate-800 animate-pulse tracking-tighter">{isHindi ? 'सैटेलाइट से जुड़ रहे हैं...' : 'Acquiring GPS Fix...'}</p>
          </div>
        ) : gpsError === "PERMISSION_DENIED" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 p-10 text-center gap-8">
             <AlertCircle className="w-20 h-20 text-red-500" />
             <div>
                <h3 className="text-4xl font-black tracking-tighter mb-4 text-slate-900 uppercase">{isHindi ? 'लोकेशन ब्लॉक है' : 'GPS BLOCKED'}</h3>
                <p className="text-xl font-bold text-slate-500 max-w-xl">
                  {isHindi ? 'मैप और मंडी भाव के लिए कृपया ब्राउज़र में लोकेशन की अनुमति दें।' : 'Please unblock location in your browser settings to view your farm on the map.'}
                </p>
             </div>
             <button onClick={startLiveTracking} className="px-14 py-6 bg-red-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl active:scale-95">
               RETRY CONNECTION
             </button>
          </div>
        ) : (
          <>
            <iframe
              title="Grounded Farm Map"
              width="100%"
              height="100%"
              src={mapUrl}
              className="border-0 transition-opacity duration-1000"
            ></iframe>
            
            {/* View HUD */}
            <div className="absolute bottom-10 left-10 flex gap-4">
               <button onClick={() => setMapType('roadmap')} className={`px-10 py-5 rounded-[2rem] font-black text-xs uppercase transition-all shadow-2xl ${mapType === 'roadmap' ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>Map</button>
               <button onClick={() => setMapType('satellite')} className={`px-10 py-5 rounded-[2rem] font-black text-xs uppercase transition-all shadow-2xl ${mapType === 'satellite' ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>Satellite</button>
            </div>
          </>
        )}
      </div>

      {/* Locality Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] shadow-2xl border border-green-50">
           <h3 className="text-4xl font-black text-slate-900 flex items-center gap-5 tracking-tighter mb-10">
              <Landmark className="w-12 h-12 text-green-600" />
              {isHindi ? 'नजदीकी प्रमुख केंद्र' : 'Nearest APMC Centers'}
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {nearbyPoints.length > 0 ? nearbyPoints.map((point, idx) => (
                <div key={idx} className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100 flex flex-col justify-between group hover:border-green-400 transition-all">
                  <div className="flex items-start justify-between mb-6">
                    <p className="font-black text-slate-900 text-xl leading-tight">{point.title}</p>
                    <ExternalLink className="w-6 h-6 text-slate-300" />
                  </div>
                  <a href={point.uri} target="_blank" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase text-center">Open Maps</a>
                </div>
              )) : (
                <div className="col-span-full py-24 text-center text-slate-400 font-bold uppercase tracking-widest">{isHindi ? 'स्कैन कर रहे हैं...' : 'Scanning locality...'}</div>
              )}
           </div>
        </div>

        <div className="bg-slate-950 p-12 rounded-[4rem] shadow-2xl flex flex-col justify-between relative overflow-hidden">
           <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <LocateFixed className="w-12 h-12 text-green-400" />
                <button onClick={speakLocation} className="p-5 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all border border-white/10">
                   <Volume2 className="w-7 h-7" />
                </button>
              </div>
              <div className="bg-white/5 p-10 rounded-r-[3rem] border-l-8 border-green-500">
                 <p className="text-white font-black text-2xl leading-snug">
                   {locationLabel || (isHindi ? "जीपीएस सिंक हो रहा है..." : "Syncing Grounding...")}
                 </p>
              </div>
           </div>
           <div className="mt-12 p-8 bg-green-900/30 rounded-[2.5rem] border border-green-700/50">
              <p className="text-green-300 font-black text-[11px] uppercase tracking-widest mb-2">{isHindi ? 'लाइव मौसम' : 'Live Context'}</p>
              <p className="text-white font-bold text-lg">{weatherSnippet ? `${weatherSnippet.temp}°C - ${weatherSnippet.report}` : '...'}</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default FieldMap;
