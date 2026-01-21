import React, { useState, useEffect } from 'react';
import { Landmark, Search, ChevronRight, ExternalLink, ShieldCheck, Sparkles, Loader2, Globe, MessageSquare, ArrowRight, Gavel, CheckCircle2 } from 'lucide-react';
import { Language, FarmerProfile } from '../types';
import { getSchemeAdvice } from '../services/geminiService';

const YojnaPortal: React.FC<{ lang: Language }> = ({ lang }) => {
  const isHindi = lang === Language.HINDI;
  const [aiReport, setAiReport] = useState<{text: string, sources: any[]}>({ text: '', sources: [] });
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('kisan_profile');
    if (saved) setProfile(JSON.parse(saved));
  }, []);

  const fetchAdvice = async () => {
    if (!profile) return;
    setLoadingAdvice(true);
    try {
      const report = await getSchemeAdvice(profile, lang);
      setAiReport(report);
    } catch (e) {
      console.error(e);
      setAiReport({ 
        text: isHindi ? "क्षमा करें, योजना जानकारी लोड करने में समस्या हुई। कृपया पुनः प्रयास करें।" : "Sorry, we had trouble loading scheme info. Please try again.", 
        sources: [] 
      });
    } finally {
      setLoadingAdvice(false);
    }
  };

  const officialPortals = [
    {
      name: isHindi ? "PM-किसान पोर्टल" : "PM-Kisan Portal",
      desc: isHindi ? "सम्मान निधि ₹6000 हेतु पंजीयन" : "Registration for ₹6000 annual aid",
      link: "https://pmkisan.gov.in/",
      color: "bg-orange-600"
    },
    {
      name: isHindi ? "फसल बीमा (PMFBY)" : "Crop Insurance (PMFBY)",
      desc: isHindi ? "फसल नुकसान बीमा क्लेम" : "Apply for crop damage insurance",
      link: "https://pmfby.gov.in/",
      color: "bg-blue-600"
    },
    {
      name: isHindi ? "ई-नाम (Digital Mandi)" : "e-NAM (Digital Mandi)",
      desc: isHindi ? "फसल ऑनलाइन बेचने हेतु" : "Sell your crops online nationally",
      link: "https://www.enam.gov.in/",
      color: "bg-emerald-600"
    },
    {
      name: isHindi ? "सॉयल हेल्थ कार्ड" : "Soil Health Card",
      desc: isHindi ? "मिट्टी जांच रिपोर्ट पोर्टल" : "Official soil testing reports",
      link: "https://soilhealth.dac.gov.in/",
      color: "bg-indigo-600"
    }
  ];

  return (
    <div className="space-y-8 pb-32 font-['Outfit']">
      {/* Dynamic Header */}
      <div className="bg-gradient-to-br from-blue-900 to-indigo-800 p-10 md:p-14 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl">
         <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
               <ShieldCheck className="w-8 h-8 text-blue-300" />
               <h2 className="text-4xl font-black tracking-tighter uppercase">{isHindi ? 'सरकारी योजना पोर्टल' : 'Govt Scheme Portal'}</h2>
            </div>
            <p className="opacity-90 text-xl max-w-2xl font-medium leading-relaxed">
               {isHindi 
                 ? `भारत सरकार और ${profile?.state || 'राज्य'} की कृषि योजनाओं की सीधी जानकारी और लिंक।` 
                 : `Direct links and information for agri schemes from Govt of India and ${profile?.state || 'State'}.`}
            </p>
         </div>
         <Landmark className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 -rotate-12" />
      </div>

      {/* Official Direct Links Section */}
      <div className="space-y-6">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 px-4">
          <Globe className="w-4 h-4 text-blue-500" /> {isHindi ? 'आधिकारिक सरकारी लिंक' : 'OFFICIAL GOVT LINKS'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {officialPortals.map((portal, i) => (
            <a 
              key={i} 
              href={portal.link} 
              target="_blank" 
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg hover:shadow-2xl transition-all group relative overflow-hidden active:scale-95"
            >
              <div className={`w-14 h-14 ${portal.color} rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                 <ExternalLink className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-black text-slate-900 mb-2 leading-tight">{portal.name}</h4>
              <p className="text-slate-500 text-sm font-bold leading-snug">{portal.desc}</p>
              <ArrowRight className="absolute bottom-8 right-8 w-6 h-6 text-slate-200 group-hover:text-green-600 transition-colors" />
            </a>
          ))}
        </div>
      </div>

      {/* AI Search Section */}
      <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-xl border border-green-50 relative overflow-hidden">
         <div className="flex flex-col lg:flex-row items-center gap-10">
            <div className="w-24 h-24 bg-green-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl">
               <Sparkles className="w-12 h-12" />
            </div>
            <div className="flex-1 text-center lg:text-left">
               <h3 className="text-3xl font-black text-slate-900 mb-2">{isHindi ? 'पर्सनलाइज्ड योजना खोज' : 'Personalized Scheme Search'}</h3>
               <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                  {isHindi ? 'AI आपकी प्रोफाइल और राज्य के आधार पर ताज़ा योजनाएं खोजेगा' : 'AI finds latest schemes based on your profile and state'}
               </p>
            </div>
            <button 
               onClick={fetchAdvice}
               disabled={loadingAdvice || !profile}
               className="min-h-[70px] px-12 py-4 bg-slate-950 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-green-700 transition-all shadow-2xl flex items-center gap-4 active:scale-95 disabled:opacity-50"
            >
               {loadingAdvice ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
               {isHindi ? 'योजनाएं खोजें' : 'Find Schemes'}
            </button>
         </div>

         {loadingAdvice && (
            <div className="mt-10 py-20 flex flex-col items-center justify-center gap-6 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
               <Globe className="w-16 h-16 text-green-600 animate-spin opacity-20" />
               <p className="font-black text-slate-400 uppercase tracking-widest text-sm animate-pulse">Searching Official Databases...</p>
            </div>
         )}

         {aiReport.text && !loadingAdvice && (
            <div className="mt-10 space-y-8 animate-in slide-in-from-bottom-6">
               <div className="p-8 md:p-12 bg-green-50 rounded-[3rem] border border-green-100 relative shadow-inner">
                  <div className="flex items-center gap-2 mb-6 text-green-700">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">AI AI RECOMMENDED SCHEMES</span>
                  </div>
                  <div className="prose prose-lg max-w-none text-green-900 font-bold leading-relaxed whitespace-pre-wrap">
                     {aiReport.text}
                  </div>
               </div>

               {aiReport.sources.length > 0 && (
                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-4">
                        <Globe className="w-4 h-4 text-blue-500" /> {isHindi ? 'सत्यापित पोर्टल लिंक' : 'VERIFIED PORTAL LINKS'}
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {aiReport.sources.map((s, i) => (
                           <a 
                              key={i} 
                              href={s.uri} 
                              target="_blank" 
                              className="p-6 bg-white border-2 border-slate-50 rounded-[1.5rem] flex items-center justify-between group hover:border-green-500 hover:bg-green-50 transition-all shadow-sm"
                           >
                              <div className="flex items-center gap-4">
                                 <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white text-blue-600"><ExternalLink className="w-5 h-5" /></div>
                                 <p className="font-black text-slate-800 text-sm truncate max-w-[180px] md:max-w-xs">{s.title}</p>
                              </div>
                              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-green-600" />
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

export default YojnaPortal;