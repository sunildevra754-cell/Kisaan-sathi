
import React, { useState, useEffect, useCallback } from 'react';
import { Language, FarmerProfile, Expense } from './types';
import { CATEGORIES, UI_STRINGS } from './constants';
import Dashboard from './components/Dashboard';
import Assistant from './components/Assistant';
import IoTDashboard from './components/IoTDashboard';
import CropDoctor from './components/CropDoctor';
import MandiPrices from './components/MandiPrices';
import ExpenseTracker from './components/ExpenseTracker';
import DroneModule from './components/DroneModule';
import Community from './components/Community';
import Leaderboard from './components/Leaderboard';
import ProfitPredictor from './components/ProfitPredictor';
import YojnaPortal from './components/YojnaPortal';
import Profile from './components/Profile';
import CropCalendar from './components/CropCalendar';
import FieldMap from './components/FieldMap';
import WeatherTracker from './components/WeatherTracker';
import Auth from './components/Auth';
import { Menu, X, Languages, Landmark, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('kisan_auth') === 'true';
  });

  const [profile, setProfile] = useState<FarmerProfile>(() => {
    const saved = localStorage.getItem('kisan_profile');
    return saved ? JSON.parse(saved) : {
      name: 'Kisan Bhai',
      mobile: '',
      state: '',
      district: '',
      landSize: '0',
      cropPreference: []
    };
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('kisan_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState<Language>(Language.HINDI); // Default HINDI
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('kisan_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('kisan_expenses', JSON.stringify(expenses));
  }, [expenses]);

  const handleLogin = (userMobile: string) => {
    setIsAuthenticated(true);
    localStorage.setItem('kisan_auth', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('kisan_auth');
    setActiveTab('dashboard');
  };

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === Language.HINDI ? Language.ENGLISH : Language.HINDI);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard profile={profile} expenses={expenses} lang={language} onNavigate={setActiveTab} />;
      case 'weather': return <WeatherTracker lang={language} />;
      case 'map': return <FieldMap lang={language} />;
      case 'iot': return <IoTDashboard lang={language} />;
      case 'assistant': return <Assistant profile={profile} lang={language} />;
      case 'crop-doctor': return <CropDoctor lang={language} />;
      case 'mandi': return <MandiPrices lang={language} />;
      case 'expenses': return <ExpenseTracker expenses={expenses} setExpenses={setExpenses} lang={language} />;
      case 'drone': return <DroneModule lang={language} />;
      case 'community': return <Community lang={language} />;
      case 'leaderboard': return <Leaderboard lang={language} />;
      case 'profit': return <ProfitPredictor lang={language} />;
      case 'yojna': return <YojnaPortal lang={language} />;
      case 'profile': return <Profile profile={profile} onUpdate={setProfile} lang={language} />;
      case 'calendar': return <CropCalendar lang={language} />;
      default: return <Dashboard profile={profile} expenses={expenses} lang={language} onNavigate={setActiveTab} />;
    }
  };

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} lang={language} onToggleLang={toggleLanguage} />;
  }

  const strings = UI_STRINGS[language] || UI_STRINGS.en;
  const localizedTitle = language === Language.HINDI ? 'योजना पोर्टल' : 'Yojna Portal';

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row text-slate-800 bg-[#f0fdf4] font-['Outfit'] overflow-hidden">
      {/* Mobile Top Header - Large touch area */}
      <header className="md:hidden bg-green-800 text-white p-5 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 active:scale-90 transition-transform"
            aria-label="Menu"
          >
            <Menu className="w-10 h-10" />
          </button>
          <h1 className="text-2xl font-black tracking-tighter uppercase">KisanAI</h1>
        </div>
        <button 
          onClick={toggleLanguage} 
          className="bg-white/20 px-6 py-2.5 rounded-full text-xs font-black uppercase active:scale-95"
        >
          {language === Language.HINDI ? 'English' : 'हिन्दी'}
        </button>
      </header>

      {/* Navigation Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[60] w-80 bg-green-900 text-white transform transition-transform duration-300 ease-in-out shadow-2xl
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:flex md:flex-col md:shadow-none
      `}>
        <div className="p-8 flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tighter">KisanAI</h1>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2">
            <X className="w-10 h-10" />
          </button>
        </div>

        <nav className="flex-1 px-4 pb-6 space-y-2 overflow-y-auto custom-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveTab(cat.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-6 p-5 rounded-[2rem] transition-all text-left ${
                activeTab === cat.id ? 'bg-white text-green-900 shadow-2xl font-black scale-[1.02]' : 'hover:bg-green-800/50 opacity-80 active:scale-95'
              }`}
            >
              <div className={activeTab === cat.id ? 'text-green-600' : 'text-white/60'}>
                {cat.icon}
              </div>
              <span className="text-lg">{strings[cat.id] || cat.label}</span>
            </button>
          ))}
          <button
            onClick={() => { setActiveTab('yojna'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-6 p-5 rounded-[2rem] transition-all text-left ${
              activeTab === 'yojna' ? 'bg-white text-green-900 shadow-2xl font-black' : 'hover:bg-green-800/50 opacity-80 active:scale-95'
            }`}
          >
            <Landmark className={activeTab === 'yojna' ? 'text-green-600' : 'text-white/60'} />
            <span className="text-lg">{localizedTitle}</span>
          </button>
        </nav>

        <div className="p-6 border-t border-green-800/50 bg-green-950/20">
          <div className="flex items-center gap-4 p-5 bg-green-800/30 rounded-[2rem] mb-4 border border-white/5">
            <div className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center font-black shadow-lg text-xl">
              {profile.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate text-lg">{profile.name}</p>
              <p className="text-xs font-black text-green-400 uppercase tracking-widest">{profile.district || 'Verified'}</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="p-3 text-red-400 hover:text-red-300 active:scale-90 transition-transform"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
          <button 
            onClick={toggleLanguage} 
            className="w-full flex items-center justify-center gap-3 p-5 rounded-[2rem] bg-white/10 text-white hover:bg-white/20 transition-all font-black text-sm uppercase tracking-widest active:scale-95"
          >
            <Languages className="w-6 h-6" /> {language === Language.HINDI ? 'English' : 'हिन्दी'}
          </button>
        </div>
      </aside>

      {/* Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main App Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10 page-transition bg-[#f0fdf4]">
        <div className="max-w-7xl mx-auto">{renderContent()}</div>
      </main>
    </div>
  );
};

export default App;