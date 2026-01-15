
import React, { useState, useEffect } from 'react';
import { Landmark, Search, ChevronRight, ExternalLink, CheckCircle, Info, Filter, ShieldCheck, Sparkles, Loader2, Globe } from 'lucide-react';
import { Language, FarmerProfile } from '../types';
import { getSchemeAdvice } from '../services/geminiService';

const YojnaPortal: React.FC<{ lang: Language }> = ({ lang }) => {
  const isHindi = lang === Language.HINDI;
  const [filter, setFilter] = useState('All');
  const [aiAdvice, setAiAdvice] = useState<string>('');
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
      const advice = await getSchemeAdvice(profile, lang);
      setAiAdvice(advice);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAdvice(false);
    }
  };

  const schemes = [
    {
      category: 'Central',
      name: isHindi ? "PM किसान सम्मान निधि" : "PM Kisan Samman Nidhi",
      desc: isHindi ? "सालाना ₹6000 की वित्तीय सहायता सीधे बैंक खाते में।" : "Direct financial aid of ₹6000 per year for all landholding farmers.",
      link: "https://pmkisan.gov.in/",
      official: "pmkisan.gov.in"
    },
    {
      category: 'Central',
      name: isHindi ? "प्रधानमंत्री फसल बीमा योजना" : "PM Fasal Bima Yojana",
      desc: isHindi ? "फसल नुकसान पर बीमा सुरक्षा।" : "Insurance coverage and financial support to farmers in event of failure of crops.",
      link: "https://pmfby.gov.in/",
      official: "pmfby.gov.in"
    },
    {
      category: 'State',
      name: isHindi ? "मृदा स्वास्थ्य कार्ड" : "Soil Health Card",
      desc: isHindi ? "मिट्टी की जांच और उर्वरक प्रबंधन।" : "Promote soil testing and balanced use of fertilizers.",
      link: "https://soilhealth.dac.gov.in/",
      official: "soilhealth.dac.gov.in"
    }
  ];

  return (
    <div className="space-y-8 pb-32 font-['Outfit']">
      <div className="bg-gradient-to-br from-green-900 to-green-700 p-10 md:p-14 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl">
         <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
               <ShieldCheck className="w-8 h-8 text-green-300" />
               <h2 className="text-4xl font-black tracking-tighter">{isHindi ? 'सरकारी योजना पोर्टल' : 'Govt Scheme Portal'}</h2>
            </div>
            <p className="opacity-80 text-lg max-w-2xl font-medium">
               {isHindi ? 'भारत सरकार की सभी महत्वपूर्ण कृषि योजनाओं की जानकारी प्राप्त करें।' : 'Official gateway for Indian government agricultural subsidies and aid.'}
            </p>
         </div>
         <Landmark className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 -rotate-12" />
      </div>

      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-green-100 flex flex-col md:flex-row items-center gap-8 group">
         <div className="p-6 bg-green-600 rounded-[2rem] text-white shadow-xl shadow-green-100 group-hover:rotate-6 transition-transform">
            <Sparkles className="w-12 h-12" />
         </div>
         <div className="flex-1">
            <h3 className="text-2xl font-black text-slate-900 mb-2">{isHindi ? 'मेरी योजना सलाह' : 'AI Scheme Eligibility'}</h3>
            <p className="text-slate-500 font-medium">{isHindi ? 'अपनी प्रोफाइल के अनुसार सरकारी लाभ देखें' : 'Get tailored advice based on your land size and state.'}</p>
            {aiAdvice && (
               <div className="mt-6 p-6 bg-slate-50 rounded-2xl border-l-4 border-green-600 text-slate-800 font-medium animate-in fade-in slide-in-from-top-2">
                  {aiAdvice}
               </div>
            )}
         </div>
         <button 
            onClick={fetchAdvice}
            disabled={loadingAdvice}
            className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-3"
         >
            {loadingAdvice ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isHindi ? 'चेक करें' : 'Analyze'}
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {schemes.map((scheme, i) => (
          <div key={i} className="bg-white p-10 rounded-[3rem] border border-green-50 shadow-xl flex flex-col justify-between hover:border-green-300 transition-all group">
            <div>
              <div className="flex items-center justify-between mb-8">
                 <div className="p-6 bg-slate-50 rounded-[1.8rem] text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all"><Landmark className="w-10 h-10" /></div>
                 <span className="px-5 py-2 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-full">{scheme.category}</span>
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4">{scheme.name}</h3>
              <p className="text-slate-500 mb-10 leading-relaxed font-medium text-lg">{scheme.desc}</p>
            </div>
            <a 
              href={scheme.link} 
              target="_blank" 
              className="w-full bg-slate-950 text-white py-6 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-green-700 transition-all shadow-xl"
            >
              {isHindi ? 'आवेदन करें' : 'Apply Now'} <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default YojnaPortal;
