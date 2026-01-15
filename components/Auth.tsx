
import React, { useState, useEffect } from 'react';
import { Language, FarmerProfile } from '../types';
import { STATES } from '../constants';
// Added AlertCircle to imports to fix the error on line 307
import { Smartphone, Lock, Sprout, ArrowRight, Loader2, User, MapPin, LandPlot, Languages, Mail, ShieldCheck, Globe, CheckCircle2, MoreVertical, X, Info, BellRing, MessageSquareText, Zap, MousePointer2, AlertCircle } from 'lucide-react';

interface AuthProps {
  onLogin: (userMobile: string) => void;
  lang: Language;
  onToggleLang: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin, lang, onToggleLang }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'verify' | 'choose-account'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{msg: string, code: string, type: 'sms' | 'email'} | null>(null);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [detectedAccounts, setDetectedAccounts] = useState<any[]>([]);
  const isHindi = lang === Language.HINDI;

  // Form States
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [landSize, setLandSize] = useState('');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    // Simulated "Device Account Discovery"
    const users = JSON.parse(localStorage.getItem('kisan_users') || '[]');
    const simulatedDeviceAccounts = [
      { name: 'Suresh Kumar', email: 'suresh.farmer@gmail.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Suresh' },
      { name: 'Kishan Sathi', email: 'support.kisan@gmail.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kishan' }
    ];
    setDetectedAccounts([...simulatedDeviceAccounts]);
  }, []);

  // AUTO-READER LOGIC: Automatically verify when OTP reaches 6 digits
  useEffect(() => {
    if (otp.length === 6 && otp === generatedOtp) {
      handleVerify(new Event('submit') as any);
    }
  }, [otp, generatedOtp]);

  const simulateDelivery = (target: string, type: 'sms' | 'email') => {
    setIsSending(true);
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setIsSending(false);
      setMode('verify');
      
      setNotification({
        msg: type === 'sms' 
          ? (isHindi ? `किशान साथी: आपका OTP है ${code}` : `KisanAI: Your login OTP is ${code}`)
          : (isHindi ? `Google: आपका लॉगिन कोड ${code} है` : `Google Account: Your code is ${code}`),
        code: code,
        type
      });

      // Simulated notification disappears after 10 seconds
      setTimeout(() => setNotification(null), 10000);
    }, 1500);
  };

  const handleAutoFill = () => {
    if (notification?.code) {
      setOtp(notification.code);
      setNotification(null);
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const users = JSON.parse(localStorage.getItem('kisan_users') || '[]');

    setTimeout(() => {
      if (mode === 'login') {
        const found = users.find((u: any) => (u.mobile === mobile || u.email === email) && u.password === password);
        if (found) {
          setIsLoading(false);
          simulateDelivery(mobile || email, mobile ? 'sms' : 'email');
        } else {
          setError(isHindi ? 'विवरण गलत हैं' : 'Invalid credentials');
          setIsLoading(false);
        }
      } else if (mode === 'register') {
        if (users.some((u: any) => u.mobile === mobile)) {
          setError(isHindi ? 'यह नंबर पहले से मौजूद है' : 'Number already registered');
          setIsLoading(false);
        } else {
          const newUser: FarmerProfile = { name, mobile, state, district, landSize, cropPreference: [] };
          users.push({ ...newUser, password, email });
          localStorage.setItem('kisan_users', JSON.stringify(users));
          setIsLoading(false);
          simulateDelivery(email || mobile, email ? 'email' : 'sms');
        }
      }
    }, 1200);
  };

  const handleVerify = (e: React.FormEvent) => {
    if (e.preventDefault) e.preventDefault();
    if (otp !== generatedOtp) {
      setError(isHindi ? 'गलत ओटीपी! कृपया फिर से प्रयास करें' : 'Incorrect OTP! Please try again');
      return;
    }
    
    setIsLoading(true);
    setTimeout(() => {
      onLogin(mobile || email);
    }, 800);
  };

  const handleGoogleClick = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setMode('choose-account');
    }, 800);
  };

  const selectAccount = (account: any) => {
    setIsLoading(true);
    setTimeout(() => {
      onLogin(account.email);
    }, 1500);
  };

  const strings: any = {
    login: isHindi ? 'लॉगिन' : 'Login',
    register: isHindi ? 'नया पंजीकरण' : 'Register',
    verify: isHindi ? 'सत्यापन' : 'Verification',
    mobile: isHindi ? 'मोबाइल नंबर' : 'Mobile Number',
    email: isHindi ? 'ईमेल आईडी' : 'Email Address',
    password: isHindi ? 'पासवर्ड' : 'Password',
    name: isHindi ? 'किसान का नाम' : 'Farmer Name',
    state: isHindi ? 'राज्य' : 'State',
    district: isHindi ? 'जिला' : 'District',
    land: isHindi ? 'जमीन (एकड़)' : 'Land (Acres)',
    google: isHindi ? 'गूगल से जुड़ें' : 'Continue with Google',
    otp: isHindi ? 'ओटीपी दर्ज करें' : 'Enter OTP',
    confirm: isHindi ? 'पुष्टि करें' : 'Confirm & Enter',
    choose: isHindi ? 'एक खाता चुनें' : 'Choose an account',
    useAnother: isHindi ? 'दूसरे खाते का उपयोग करें' : 'Use another account',
    chooseInstruction: isHindi ? 'KisanAI पर जाने के लिए अपनी आईडी चुनें' : 'Select an ID to continue to KisanAI',
    incoming: isHindi ? 'नया संदेश' : 'Incoming Message',
    autofill: isHindi ? 'ऑटो-फिल कोड' : 'Tap to Auto-fill',
    sending: isHindi ? 'कोड भेज रहे हैं...' : 'Sending Secure Code...'
  };

  return (
    <div className="min-h-screen bg-[#f0fdf4] flex items-center justify-center p-4 font-['Outfit'] relative overflow-hidden">
      
      {/* SIMULATED SYSTEM NOTIFICATION (Mocks actual SMS delivery) */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] p-6 shadow-2xl border-l-[12px] border-green-500 z-[100] animate-in slide-in-from-top-32 duration-700 ring-1 ring-white/10">
          <div className="flex items-start gap-5">
             <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white shrink-0">
                {notification.type === 'sms' ? <MessageSquareText className="w-8 h-8" /> : <Mail className="w-8 h-8" />}
             </div>
             <div className="flex-1">
                <div className="flex justify-between items-center mb-1.5">
                   <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">{strings.incoming}</p>
                   <button onClick={() => setNotification(null)} className="p-1"><X className="w-4 h-4 text-white/30" /></button>
                </div>
                <p className="text-white font-bold text-base leading-tight mb-4">{notification.msg}</p>
                
                <button 
                  onClick={handleAutoFill}
                  className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl group"
                >
                  <MousePointer2 className="w-4 h-4" />
                  {strings.autofill}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Dynamic Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-green-200/20 rounded-full blur-[140px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-200/20 rounded-full blur-[140px] animate-pulse"></div>

      <div className={`w-full ${mode === 'register' ? 'max-w-xl' : 'max-w-md'} bg-white/90 backdrop-blur-3xl p-8 md:p-12 rounded-[4rem] shadow-[0_32px_120px_rgba(0,0,0,0.08)] border border-white relative z-10 transition-all duration-500`}>
        
        {/* Brand Header */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-green-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl rotate-6">
              <Sprout className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">KisanAI</h1>
              <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mt-1">{isHindi ? 'भारत का किसान' : 'Farmer of India'}</p>
            </div>
          </div>
          <button onClick={onToggleLang} className="flex items-center gap-2 text-slate-900 font-black bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 hover:bg-green-50 transition-all text-[10px] uppercase tracking-widest">
            <Languages className="w-4 h-4 text-green-600" />
            {isHindi ? 'English' : 'हिन्दी'}
          </button>
        </div>

        {/* --- GOOGLE ACCOUNT PICKER VIEW --- */}
        {mode === 'choose-account' ? (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center">
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Logo.svg" className="h-10 mx-auto mb-6" alt="Google" />
              <h2 className="text-2xl font-black text-slate-900 leading-tight">{strings.choose}</h2>
              <p className="text-slate-500 text-sm font-bold mt-2">{strings.chooseInstruction}</p>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2 py-2">
              {detectedAccounts.map((acc, i) => (
                <button 
                  key={i}
                  disabled={isLoading}
                  onClick={() => selectAccount(acc)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 active:bg-slate-100 rounded-[2rem] border border-slate-50 hover:border-slate-200 transition-all text-left group"
                >
                  <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                    <img src={acc.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-slate-900 text-[15px]">{acc.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{acc.email}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-200 group-hover:text-green-500" />
                </button>
              ))}
              <div className="h-px bg-slate-100 my-4"></div>
              <button 
                onClick={() => setMode('login')}
                className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 rounded-[2rem] text-blue-600 font-bold text-sm"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-slate-100">
                   <User className="w-6 h-6" />
                </div>
                {strings.useAnother}
              </button>
            </div>
            
            <button onClick={() => setMode('login')} className="w-full py-4 text-slate-400 font-black text-xs uppercase tracking-widest">Cancel</button>
          </div>
        ) : mode === 'verify' || isSending ? (
          <div className="space-y-10 animate-in zoom-in-95 duration-300">
             <div className="text-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                  {isSending ? <Loader2 className="w-12 h-12 animate-spin" /> : <ShieldCheck className="w-12 h-12" />}
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-2">{isSending ? strings.sending : strings.verify}</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                  {isSending ? (isHindi ? 'नेटवर्क कनेक्ट कर रहे हैं' : 'Connecting to gateway...') : (isHindi ? 'ऊपर आए संदेश पर "Auto-fill" दबाएं' : 'Tap "Auto-fill" on the notification above')}
                </p>
             </div>

             {!isSending && (
               <>
                 <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-8 h-8" />
                  <input 
                    required
                    type="text" 
                    maxLength={6}
                    placeholder="000000" 
                    className={`w-full pl-16 pr-8 py-8 bg-slate-50 rounded-[2.5rem] border-2 outline-none transition-all font-black text-4xl tracking-[0.5em] text-center shadow-inner ${otp.length === 6 ? 'border-green-500 bg-green-50' : 'border-transparent focus:border-green-500 focus:bg-white'}`}
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                  />
                </div>
                <button 
                  disabled={isLoading || otp.length < 6}
                  onClick={handleVerify}
                  className="w-full bg-green-600 text-white py-8 rounded-[3rem] font-black text-2xl shadow-2xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : strings.confirm}
                </button>
                <div className="text-center">
                  <button 
                    type="button" 
                    onClick={() => simulateDelivery(mobile || email, mobile ? 'sms' : 'email')}
                    className="text-green-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                  >
                    {isHindi ? 'ओटीपी फिर से भेजें' : 'Resend OTP'}
                  </button>
                </div>
               </>
             )}
          </div>
        ) : (
          <>
            <div className="flex bg-slate-100 p-2 rounded-[2.5rem] mb-10 border border-slate-200/50 shadow-inner">
              <button onClick={() => setMode('login')} className={`flex-1 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-white text-green-600 shadow-xl' : 'text-slate-400'}`}>{strings.login}</button>
              <button onClick={() => setMode('register')} className={`flex-1 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-white text-green-600 shadow-xl' : 'text-slate-400'}`}>{strings.register}</button>
            </div>

            {error && (
              <div className="mb-6 p-5 bg-red-50 text-red-600 rounded-[2rem] text-[10px] font-black text-center border border-red-100 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-6">
              {mode === 'register' && (
                <div className="relative group">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-green-500 transition-colors" />
                  <input required type="text" placeholder={strings.name} className="w-full pl-16 pr-8 py-6 bg-slate-50 rounded-[2rem] border-2 border-transparent focus:border-green-500 focus:bg-white outline-none transition-all font-bold text-lg" value={name} onChange={e => setName(e.target.value)} />
                </div>
              )}

              <div className="relative group">
                {mode === 'login' ? (
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-green-500 transition-colors" />
                ) : (
                  <Smartphone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-green-500 transition-colors" />
                )}
                <input required type="text" placeholder={mode === 'login' ? `${strings.email} / ${strings.mobile}` : strings.mobile} className="w-full pl-16 pr-8 py-6 bg-slate-50 rounded-[2rem] border-2 border-transparent focus:border-green-500 focus:bg-white outline-none transition-all font-bold text-lg" value={mode === 'login' ? (email || mobile) : mobile} onChange={e => mode === 'login' ? setEmail(e.target.value) : setMobile(e.target.value)} />
              </div>

              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-green-500 transition-colors" />
                <input required type="password" placeholder={strings.password} className="w-full pl-16 pr-8 py-6 bg-slate-50 rounded-[2rem] border-2 border-transparent focus:border-green-500 focus:bg-white outline-none transition-all font-bold text-lg" value={password} onChange={e => setPassword(e.target.value)} />
              </div>

              {mode === 'register' && (
                <div className="grid grid-cols-2 gap-4">
                  <select required className="w-full px-8 py-6 bg-slate-50 rounded-[2rem] border-2 border-transparent focus:border-green-500 focus:bg-white outline-none font-bold appearance-none text-lg" value={state} onChange={e => setState(e.target.value)}>
                    <option value="">{strings.state}</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input required type="number" placeholder={strings.land} className="w-full px-8 py-6 bg-slate-50 rounded-[2rem] border-2 border-transparent focus:border-green-500 focus:bg-white outline-none font-bold text-lg" value={landSize} onChange={e => setLandSize(e.target.value)} />
                </div>
              )}

              <button disabled={isLoading} className="w-full bg-slate-950 text-white py-7 rounded-[3rem] font-black text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 mt-4">
                {isLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : (mode === 'login' ? strings.login : strings.register)}
                <ArrowRight className="w-7 h-7 text-green-400" />
              </button>

              <div className="relative my-10">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-slate-100"></div></div>
                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]"><span className="bg-white px-6 text-slate-300">Fast Connect</span></div>
              </div>

              <button type="button" onClick={handleGoogleClick} disabled={isLoading} className="w-full bg-white border-2 border-slate-100 text-slate-900 py-6 rounded-[3rem] font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-5 hover:bg-slate-50 transition-all shadow-lg group">
                <img src="https://www.google.com/favicon.ico" className="w-6 h-6 group-hover:scale-110 transition-transform" alt="Google" />
                {strings.google}
              </button>
            </form>

            <div className="mt-12 text-center">
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                <Globe className="w-4 h-4 text-green-600" /> Verified by Indian Agri-Shield
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;
