
import React, { useState, useEffect } from 'react';
import { FarmerProfile, Language } from '../types';
import { STATES, CROPS } from '../constants';
import { User, MapPin, LandPlot, Save, CheckCircle, Navigation, RefreshCw, AlertCircle, Map as MapIcon, LocateFixed, Smartphone, Download, ShieldCheck } from 'lucide-react';
import { resolveLocationName } from '../services/geminiService';
import { CacheService } from '../utils/cacheService';

interface ProfileProps {
  profile: FarmerProfile;
  onUpdate: (updated: FarmerProfile) => void;
  lang: Language;
}

const Profile: React.FC<ProfileProps> = ({ profile, onUpdate, lang }) => {
  const [form, setForm] = useState<FarmerProfile>(profile);
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const isHindi = lang === Language.HINDI;

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(form);
    
    // Update caches for Dashboard
    CacheService.clear('live_weather');
    CacheService.set('loc_short', form.district, 2);
    CacheService.set('loc_full', `${form.district}, ${form.state}`, 2);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const detectLocation = () => {
    setLocating(true);
    setError(null);
    
    if (!("geolocation" in navigator)) {
      setError(isHindi ? "जीपीएस उपलब्ध नहीं है।" : "GPS not available.");
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const data = await resolveLocationName(latitude, longitude);
      
      if (data) {
        setForm(prev => ({
          ...prev,
          state: data.full.split(',')[1]?.trim() || prev.state,
          district: data.short || prev.district
        }));
      } else {
        setError(isHindi ? "लोकेशन नहीं मिल सकी। कृपया मैन्युअल रूप से चुनें।" : "Failed to detect location. Please select manually.");
      }
      setLocating(false);
    }, (err) => {
      setLocating(false);
      setError(isHindi ? "जीपीएस एक्सेस की अनुमति नहीं मिली।" : "GPS permission denied.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  return (
    <div className="max-w-2xl mx-auto pb-32 font-['Outfit'] space-y-6">
      {/* PWA Install Banner */}
      {installPrompt && (
        <div className="bg-green-600 p-8 rounded-[3rem] text-white shadow-2xl flex items-center justify-between gap-6 border-b-8 border-green-800 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-6">
             <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Smartphone className="w-10 h-10" />
             </div>
             <div>
                <h3 className="text-xl font-black">{isHindi ? 'ऐप इंस्टॉल करें' : 'Install KisanAI'}</h3>
                <p className="text-sm font-bold opacity-80">{isHindi ? 'सीधे होम स्क्रीन से चलाएं' : 'Run directly from your home screen'}</p>
             </div>
          </div>
          <button 
            onClick={handleInstall}
            className="px-8 py-4 bg-white text-green-600 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-xl active:scale-95"
          >
            <Download className="w-4 h-4" />
            {isHindi ? 'अभी जोड़ें' : 'Add Now'}
          </button>
        </div>
      )}

      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-green-100">
        <div className="flex items-center gap-8 mb-12">
          <div className="w-20 h-20 bg-green-600 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-green-100">
            {form.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{isHindi ? 'मेरी जानकारी' : 'My Information'}</h2>
            <div className="flex items-center gap-2 mt-1">
               <ShieldCheck className="w-4 h-4 text-green-600" />
               <p className="text-slate-400 text-sm font-black uppercase tracking-widest">{form.mobile}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-6 bg-red-50 text-red-600 rounded-3xl text-sm font-black flex items-center gap-3 border border-red-100">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Farmer Name</label>
              <input 
                type="text" 
                className="w-full px-8 py-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent focus:border-green-500 focus:bg-white outline-none font-bold text-lg transition-all"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Land Size (Acres)</label>
              <input 
                type="number" 
                className="w-full px-8 py-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent focus:border-green-500 focus:bg-white outline-none font-bold text-lg transition-all"
                value={form.landSize}
                onChange={e => setForm({...form, landSize: e.target.value})}
              />
            </div>

            <div className="space-y-3 md:col-span-2">
              <div className="flex justify-between items-center px-2 mb-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Location Controls</label>
                <button 
                  type="button" 
                  onClick={detectLocation}
                  disabled={locating}
                  className="bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-green-100 active:scale-95 transition-all"
                >
                  {locating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
                  {isHindi ? 'गूगल लोकेशन उपयोग करें' : 'Use Google GPS'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <select 
                    className="w-full px-8 py-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent focus:border-green-500 focus:bg-white outline-none font-bold text-lg appearance-none transition-all"
                    value={form.state}
                    onChange={e => setForm({...form, state: e.target.value})}
                 >
                    <option value="">{isHindi ? 'राज्य चुनें' : 'Select State'}</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
                 <input 
                    type="text" 
                    placeholder={isHindi ? 'अपना जिला यहाँ लिखें...' : 'Type District Name...'}
                    className="w-full px-8 py-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent focus:border-green-500 focus:bg-white outline-none font-bold text-lg transition-all"
                    value={form.district}
                    onChange={e => setForm({...form, district: e.target.value})}
                 />
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-50">
            <button 
              type="submit"
              className="w-full bg-slate-950 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all hover:bg-black"
            >
              {saved ? <CheckCircle className="w-8 h-8 text-green-400" /> : <Save className="w-8 h-8" />}
              {saved ? (isHindi ? 'जानकारी सुरक्षित हो गई!' : 'Information Saved!') : (isHindi ? 'प्रोफाइल सुरक्षित करें' : 'Save Profile & Update Weather')}
            </button>
            <p className="text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-6">
              {isHindi ? 'परिवर्तन के बाद मौसम रिपोर्ट अपडेट होगी' : 'Dashboard weather refreshes after saving'}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
