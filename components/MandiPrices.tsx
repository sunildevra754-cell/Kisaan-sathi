
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, Search, TrendingUp, MapPin, RefreshCw, Loader2, Globe, Clock, Sparkles, AlertCircle, LocateFixed, Signal, Radio, Navigation, ChevronRight, ExternalLink } from 'lucide-react';
import { Language, MandiPrice } from '../types';
import { CacheService } from '../utils/cacheService';
import { getMandiPrices, resolveLocationName } from '../services/geminiService';

const MandiPrices: React.FC<{ lang: Language }> = ({ lang }) => {
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [mandiReport, setMandiReport] = useState<string>(() => CacheService.get('mandi_report_text') || "");
  const [sources, setSources] = useState<{title: string, uri: string}[]>(() => CacheService.get('mandi_sources') || []);
  const [lastUpdated, setLastUpdated] = useState<string>(() => CacheService.get('mandi_updated') || "");
  const [activeLocation, setActiveLocation] = useState<string>(() => CacheService.get('loc_short') || "");
  
  const isHindi = lang === Language.HINDI;
  const isMounted = useRef(true);

  const fetchLiveMandiPrices = useCallback(async (queryOverride?: string) => {
    if (!isMounted.current) return;
    
    if (queryOverride) setIsSearching(true);
    else setIsRefreshing(true);

    try {
      const groundedLoc = CacheService.get('loc_full');
      const groundedShort = CacheService.get('loc_short');
      const locDisplay = queryOverride ? queryOverride : (groundedShort || (isHindi ? "प्रमुख मंडियां" : "Major Markets"));
      setActiveLocation(locDisplay);

      const locationContext = queryOverride || (groundedLoc ? `Mandi rates in ${groundedLoc}` : "Major agricultural markets in India");
      const result = await getMandiPrices(locationContext, lang);

      if (isMounted.current) {
        setMandiReport(result.text);
        setSources(result.sources);
        const time = new Date().toLocaleTimeString();
        setLastUpdated(time);
        CacheService.set('mandi_report_text', result.text, 4);
        CacheService.set('mandi_sources', result.sources, 4);
        CacheService.set('mandi_updated', time, 4);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (isMounted.current) {
        setIsRefreshing(false);
        setIsSearching(false);
      }
    }
  }, [lang, isHindi]);

  useEffect(() => {
    isMounted.current = true;
    fetchLiveMandiPrices();
    return () => { isMounted.current = false; };
  }, [fetchLiveMandiPrices]);

  return (
    <div className="space-y-6 pb-24 font-['Outfit']">
      {/* Grounding Status */}
      <div className="bg-slate-950 rounded-[2.5rem] p-6 flex items-center justify-between border-b-[10px] border-green-600 shadow-2xl">
         <div className="flex items-center gap-4">
            <Radio className="w-8 h-8 text-green-500 animate-pulse" />
            <div>
               <p className="text-white font-black text-[10px] uppercase tracking-widest">{isHindi ? 'मार्केट ग्राउंडिंग सक्रिय' : 'MARKET GROUNDING ACTIVE'}</p>
               <h4 className="text-white font-bold text-lg">{activeLocation || 'Scanning...'}</h4>
            </div>
         </div>
         <button 
           onClick={() => fetchLiveMandiPrices()} 
           className="p-4 bg-green-600 text-white rounded-2xl active:scale-90 transition-all"
         >
           <RefreshCw className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} />
         </button>
      </div>

      {/* Main Report Card */}
      <div className="bg-white p-10 md:p-14 rounded-[4.5rem] shadow-2xl border border-green-50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-12">
          <div>
            <h2 className="text-5xl font-black text-slate-900 flex items-center gap-6 tracking-tighter">
              <ShoppingCart className="w-14 h-14 text-green-600" />
              {isHindi ? 'मंडी भाव बुलेटिन' : 'Mandi Bhav Bulletin'}
            </h2>
            <p className="text-slate-400 font-bold mt-4 flex items-center gap-3">
              <Clock className="w-5 h-5" /> {isHindi ? `अपडेटेड: ${lastUpdated || 'अभी'}` : `Updated: ${lastUpdated || 'Just now'}`}
            </p>
          </div>
          
          <form onSubmit={(e) => {e.preventDefault(); fetchLiveMandiPrices(search);}} className="flex-1 max-w-2xl relative group">
            <input 
              type="text" 
              placeholder={isHindi ? "फसल या शहर खोजें..." : "Search crop or city..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-40 py-8 bg-slate-50 rounded-[2.5rem] border-2 border-transparent focus:border-green-500 outline-none font-black text-xl shadow-inner transition-all"
            />
            <button className="absolute right-3 top-3 bottom-3 px-10 bg-slate-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-green-600 transition-all flex items-center gap-3">
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {isHindi ? "खोजें" : "FIND"}
            </button>
          </form>
        </div>

        {isSearching || (isRefreshing && !mandiReport) ? (
          <div className="py-32 flex flex-col items-center justify-center gap-10">
             <Loader2 className="w-32 h-32 animate-spin text-green-600 opacity-20" />
             <p className="font-black text-3xl text-slate-800 animate-pulse text-center">
               {isHindi ? `मार्केट डाटा ला रहे हैं...` : `Fetching market data...`}
             </p>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="bg-slate-50 p-12 rounded-[4rem] border border-slate-100 shadow-inner">
               <div className="prose prose-xl max-w-none text-slate-800 font-bold leading-relaxed whitespace-pre-wrap italic">
                  {mandiReport || (isHindi ? "डाटा उपलब्ध नहीं है" : "No report available")}
               </div>
            </div>

            {/* Sources section */}
            {sources.length > 0 && (
              <div className="pt-10 border-t border-slate-100">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3"><Globe className="w-5 h-5" /> VERIFIED MARKET SOURCES</h4>
                 <div className="flex flex-wrap gap-4">
                    {sources.map((s, i) => (
                      <a key={i} href={s.uri} target="_blank" className="flex items-center gap-3 bg-white hover:bg-green-50 px-8 py-4 rounded-[1.5rem] border border-slate-100 font-black text-xs transition-all shadow-sm">
                        {s.title} <ExternalLink className="w-4 h-4 text-blue-500" />
                      </a>
                    ))}
                 </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MandiPrices;
