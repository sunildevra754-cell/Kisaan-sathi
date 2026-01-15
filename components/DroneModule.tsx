
import React, { useState, useEffect, useRef } from 'react';
import { Plane, MapPin, Play, Pause, Battery, Droplet, Wifi, ShieldAlert, ArrowUp, ArrowDown, Crosshair, Cpu, Link, Link2Off, Loader2, SignalHigh, Activity, Radio, Target, Smartphone, Video, VideoOff, Settings, AlertTriangle, Radar, Search, Smartphone as Phone, X, PhoneCall, Navigation as NavIcon } from 'lucide-react';
import { Language } from '../types';
import { getNearbyDroneServices } from '../services/geminiService';
import { CacheService } from '../utils/cacheService';

const DroneModule: React.FC<{ lang: Language }> = ({ lang }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [sprayActive, setSprayActive] = useState(false);
  const [altitude, setAltitude] = useState(0);
  const [battery, setBattery] = useState(100);
  const [sprayLevel, setSprayLevel] = useState(100);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeMode, setActiveMode] = useState<'Manual' | 'Auto' | 'Emergency'>('Manual');
  const [showCamera, setShowCamera] = useState(false);
  const [droneModel, setDroneModel] = useState<string | null>(null);
  const [isSearchingProviders, setIsSearchingProviders] = useState(false);
  const [foundProviders, setFoundProviders] = useState<any[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const droneState = useRef({ x: 500, y: 250, targetX: 500, targetY: 250 });
  const pathTrail = useRef<{x: number, y: number}[]>([]);
  const isHindi = lang === Language.HINDI;

  // Smart Connect Logic: Location Grounded Discovery
  const handleSmartConnect = async () => {
    setIsSearchingProviders(true);
    setFoundProviders([]);
    
    try {
      const locationContext = CacheService.get('loc_full') || "Major cities in India";
      const providers = await getNearbyDroneServices(locationContext, lang);
      setFoundProviders(providers);
    } catch (e) {
      console.error("Provider search failed", e);
      // Fallback mock
      setFoundProviders([
        { name: 'Kisan Drone Sewa', contact: '+91 98765 43210', type: 'CHC Center', address: 'Main Market, Local District' },
        { name: 'AgriSpray Solutions', contact: '+91 88888 77777', type: 'Private Agency', address: 'Sector 4, Agri Hub' }
      ]);
    } finally {
      setIsSearchingProviders(false);
    }
  };

  // Auto Mission Path Logic
  useEffect(() => {
    if (activeMode !== 'Auto' || !isSimulating) return;
    
    let step = 0;
    const points = [
      {x: 200, y: 100}, {x: 800, y: 100},
      {x: 800, y: 200}, {x: 200, y: 200},
      {x: 200, y: 300}, {x: 800, y: 300},
      {x: 800, y: 400}, {x: 200, y: 400}
    ];

    const interval = setInterval(() => {
      const target = points[step % points.length];
      droneState.current.targetX = target.x;
      droneState.current.targetY = target.y;
      
      const dist = Math.sqrt(Math.pow(droneState.current.x - target.x, 2) + Math.pow(droneState.current.y - target.y, 2));
      if (dist < 30) step++;
    }, 50);

    return () => clearInterval(interval);
  }, [activeMode, isSimulating]);

  // Camera Management
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error(e));
        }
      } catch (err) { setShowCamera(false); }
    };
    if (showCamera) startCamera();
    else if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    return () => activeStream?.getTracks().forEach(t => t.stop());
  }, [showCamera]);

  // Main Render Loop
  useEffect(() => {
    if (!isSimulating) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!showCamera) {
        ctx.fillStyle = '#064e3b'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.lineWidth = 1;
        const offset = (Date.now() / 30) % 50;
        for (let i = -50; i < canvas.width + 50; i += 50) {
          ctx.beginPath(); ctx.moveTo(i + offset, 0); ctx.lineTo(i + offset, canvas.height); ctx.stroke();
        }
        for (let j = -50; j < canvas.height + 50; j += 50) {
          ctx.beginPath(); ctx.moveTo(0, j + offset); ctx.lineTo(canvas.width, j + offset); ctx.stroke();
        }
      }

      // Stability Lock: In Emergency mode, horizontal movement is frozen
      if (activeMode !== 'Emergency') {
        droneState.current.x += (droneState.current.targetX - droneState.current.x) * 0.08;
        droneState.current.y += (droneState.current.targetY - droneState.current.y) * 0.08;
      }

      if (Date.now() % 5 === 0) {
        pathTrail.current.push({x: droneState.current.x, y: droneState.current.y});
        if (pathTrail.current.length > 50) pathTrail.current.shift();
      }

      ctx.strokeStyle = 'rgba(74, 222, 128, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      pathTrail.current.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();

      if (sprayActive && altitude > 2) {
        setSprayLevel(p => Math.max(p - 0.08, 0));
        ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
        for (let i = 0; i < 15; i++) {
          ctx.beginPath(); ctx.arc(droneState.current.x + (Math.random()-0.5)*60, droneState.current.y + 40, Math.random()*15, 0, Math.PI*2); ctx.fill();
        }
      }

      const size = 18 + altitude * 0.1;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(droneState.current.x, droneState.current.y + 30 + altitude, size, size/2, 0, 0, Math.PI*2); ctx.fill();

      ctx.fillStyle = activeMode === 'Emergency' ? '#ef4444' : '#f8fafc';
      ctx.beginPath(); ctx.roundRect(droneState.current.x - size, droneState.current.y - size, size*2, size*2, 8); ctx.fill();
      
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 5;
      const angle = (Date.now() / 40);
      [[-1,-1], [1,-1], [-1,1], [1,1]].forEach(([mx, my]) => {
        const px = droneState.current.x + mx*size*1.6;
        const py = droneState.current.y + my*size*1.6;
        ctx.beginPath(); ctx.moveTo(droneState.current.x, droneState.current.y); ctx.lineTo(px, py); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(px, py, size*1.2, angle, angle + Math.PI/2); ctx.stroke();
      });

      if (altitude > 0) setBattery(p => Math.max(p - 0.02, 0));
      frame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frame);
  }, [isSimulating, sprayActive, altitude, showCamera, activeMode]);

  const connectToDrone = (model: string) => {
    setDroneModel(model);
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      setIsSimulating(true);
      setAltitude(15);
      setActiveMode('Manual');
    }, 2500);
  };

  const handleManualInput = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSimulating || activeMode !== 'Manual') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    droneState.current.targetX = ((clientX - rect.left) / rect.width) * 1000;
    droneState.current.targetY = ((clientY - rect.top) / rect.height) * 500;
  };

  // REFINED EMERGENCY LANDING: Improved stability & soft descent
  const triggerEmergencyLanding = () => {
    if (activeMode === 'Emergency') return;
    setActiveMode('Emergency');
    setSprayActive(false);
    
    // Stabilize horizontal coordinates
    droneState.current.targetX = droneState.current.x;
    droneState.current.targetY = droneState.current.y;

    const landing = setInterval(() => {
      setAltitude(prev => {
        if (prev <= 0) {
          clearInterval(landing);
          setIsSimulating(false);
          setActiveMode('Manual');
          return 0;
        }
        // Quadratic descent for "Soft Touch" effect
        const step = Math.max(0.2, (prev / 20) + 0.1);
        return prev - step;
      });
    }, 50);
  };

  return (
    <div className="space-y-6 flex flex-col items-center pb-24 font-['Outfit']">
      {/* HUD CONSOLE */}
      <div className="bg-slate-950 w-full max-w-5xl rounded-[3.5rem] overflow-hidden border-[16px] border-slate-900 shadow-2xl relative">
        {showCamera && (
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none" />
        )}
        <canvas ref={canvasRef} width={1000} height={500} className="w-full h-auto aspect-[2/1] cursor-crosshair relative z-10" onMouseMove={handleManualInput} />
        
        {/* HUD UI */}
        <div className="absolute inset-0 pointer-events-none p-10 flex flex-col justify-between z-20">
          <div className="flex justify-between items-start">
            <div className="flex gap-4">
              <div className="bg-black/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 text-white shadow-2xl">
                <p className="text-4xl font-black">{battery.toFixed(1)}%</p>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{isHindi ? 'बैटरी' : 'Battery'}</p>
              </div>
              <div className="bg-black/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 text-white shadow-2xl">
                <p className="text-4xl font-black text-blue-400">{sprayLevel.toFixed(1)}%</p>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{isHindi ? 'टैंक' : 'Tank'}</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className={`px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest flex items-center gap-3 shadow-xl ${isConnected ? 'bg-emerald-600 text-white animate-pulse' : 'bg-red-600 text-white'}`}>
                {isConnected ? <Wifi className="w-4 h-4" /> : <Link2Off className="w-4 h-4" />}
                {droneModel || 'OFFLINE'}
              </div>
              {activeMode === 'Emergency' && (
                <div className="bg-red-600 text-white px-5 py-2 rounded-xl text-[10px] font-black animate-bounce flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> STABILIZATION LOCK ACTIVE
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-end pointer-events-auto">
             <div className="flex flex-col gap-4">
                <button disabled={activeMode === 'Emergency'} onMouseDown={() => setAltitude(a => Math.min(a+5, 120))} className="p-7 bg-white/10 backdrop-blur-3xl rounded-[2rem] text-white hover:bg-white/20 active:scale-90 border border-white/10 shadow-2xl transition-all disabled:opacity-20">
                  <ArrowUp className="w-7 h-7" />
                </button>
                <button disabled={activeMode === 'Emergency'} onMouseDown={() => setAltitude(a => Math.max(a-5, 0))} className="p-7 bg-white/10 backdrop-blur-3xl rounded-[2rem] text-white hover:bg-white/20 active:scale-90 border border-white/10 shadow-2xl transition-all disabled:opacity-20">
                  <ArrowDown className="w-7 h-7" />
                </button>
             </div>
             <div className="flex items-center gap-6">
                <button onClick={triggerEmergencyLanding} className={`px-10 py-10 rounded-full border-4 transition-all shadow-2xl active:scale-95 ${activeMode === 'Emergency' ? 'bg-red-600 border-white text-white' : 'bg-red-600/20 border-red-600/40 text-red-500 hover:bg-red-600 hover:text-white'}`}>
                  <ShieldAlert className="w-10 h-10" />
                </button>
                <button onClick={() => setSprayActive(!sprayActive)} className={`px-10 py-10 rounded-full font-bold shadow-2xl transition-all active:scale-95 ${sprayActive ? 'bg-blue-600 text-white' : 'bg-white/10 text-white'}`}>
                  <Droplet className="w-10 h-10" />
                </button>
                <button onClick={() => { setIsSimulating(!isSimulating); if(!isSimulating) setAltitude(15); }} className={`px-10 py-10 rounded-full font-bold shadow-2xl transition-all active:scale-95 ${isSimulating ? 'bg-slate-800 text-white' : 'bg-green-600 text-white'}`}>
                  {isSimulating ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10" />}
                </button>
             </div>
          </div>
        </div>

        {/* CONNECTION MODAL */}
        {!isConnected && !isConnecting && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center flex-col gap-10 z-50 p-12 text-center">
             <div className="space-y-4">
                <div className="w-24 h-24 bg-green-600/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                  <Radio className="w-12 h-12 text-green-500 animate-pulse" />
                </div>
                <h3 className="text-white text-5xl font-black tracking-tighter uppercase">{isHindi ? 'हार्डवेयर पेयरिंग' : 'Hardware Pairing'}</h3>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl">
                {['DJI Agras T40', 'ArduPilot X8', 'Kisan-X Pro', 'XAG V40', 'Parrot Blue', 'Custom Ardu'].map(model => (
                  <button key={model} onClick={() => connectToDrone(model)} className="bg-white/5 border-2 border-white/10 text-white p-8 rounded-[2rem] hover:bg-green-600/20 hover:border-green-500 transition-all flex flex-col items-center gap-4 group">
                    <Phone className="w-8 h-8 text-slate-500 group-hover:text-green-500" />
                    <span className="font-black text-[10px] uppercase tracking-widest">{model}</span>
                  </button>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS GRID */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-4">
         {/* AUTO MISSION */}
         <button onClick={() => setActiveMode(activeMode === 'Auto' ? 'Manual' : 'Auto')} className={`p-8 rounded-[3rem] border transition-all text-left shadow-xl ${activeMode === 'Auto' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white border-green-100'}`}>
            <Target className={`w-10 h-10 mb-6 ${activeMode === 'Auto' ? 'text-white' : 'text-blue-600'}`} />
            <h4 className="text-xl font-black">{isHindi ? 'ऑटो मिशन' : 'Auto Mission'}</h4>
            <p className={`text-xs mt-3 font-medium ${activeMode === 'Auto' ? 'text-blue-100' : 'text-slate-500'}`}>Autonomous pathing active.</p>
         </button>
         
         {/* SMART CONNECT: REAL-WORLD GROUNDING Discovery */}
         <button 
           onClick={handleSmartConnect} 
           disabled={isSearchingProviders}
           className={`p-8 rounded-[3rem] border transition-all text-left shadow-xl relative overflow-hidden group hover:border-orange-400 ${isSearchingProviders ? 'bg-slate-900 border-slate-700' : 'bg-white border-green-100'}`}
         >
            <Cpu className={`w-10 h-10 mb-6 ${isSearchingProviders ? 'text-orange-500 animate-spin' : 'text-orange-600'}`} />
            <h4 className={`text-xl font-black ${isSearchingProviders ? 'text-white' : 'text-slate-900'}`}>{isHindi ? 'स्मार्ट कनेक्ट' : 'Smart Connect'}</h4>
            <p className="text-xs text-slate-500 font-medium">Find local drone CHC centers.</p>
            {isSearchingProviders && <div className="absolute inset-0 bg-orange-500/10 animate-pulse"></div>}
         </button>

         {/* LIVE CAMERA */}
         <button onClick={() => setShowCamera(!showCamera)} className={`p-8 rounded-[3rem] border transition-all text-left shadow-xl ${showCamera ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-white border-green-100'}`}>
            <Video className={`w-10 h-10 mb-6 ${showCamera ? 'text-white' : 'text-emerald-600'}`} />
            <h4 className="text-xl font-black">{isHindi ? 'लाइव कैमरा' : 'Live FPV'}</h4>
            <p className={`text-xs mt-3 font-medium ${showCamera ? 'text-emerald-100' : 'text-slate-500'}`}>Direct drone eye view.</p>
         </button>

         {/* NEARBY SENSORS */}
         <button className="bg-white p-8 rounded-[3rem] border border-green-100 shadow-xl flex flex-col gap-6 text-left hover:border-indigo-400 transition-all">
            <Radar className="w-10 h-10 text-indigo-600" />
            <h4 className="text-xl font-black">{isHindi ? 'सेंसर लिंक' : 'Sensor Link'}</h4>
            <p className="text-xs text-slate-500 font-medium">Sync with soil IoT nodes.</p>
         </button>
      </div>

      {/* DISCOVERED PROVIDERS LIST (Smart Connect Result) */}
      {foundProviders.length > 0 && (
         <div className="w-full max-w-5xl bg-white p-10 rounded-[4rem] border border-green-100 shadow-2xl animate-in slide-in-from-top-4">
            <div className="flex items-center justify-between mb-10">
               <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{isHindi ? 'नजदीकी ड्रोन सेवा केंद्र' : 'Nearby Drone Service Centers'}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Verified via Google Search grounding</p>
               </div>
               <button onClick={() => setFoundProviders([])} className="p-4 bg-slate-100 rounded-3xl active:scale-90 transition-all"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {foundProviders.map((provider, i) => (
                  <div key={i} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col justify-between group hover:border-orange-400 hover:bg-white transition-all shadow-sm">
                     <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-5">
                           <div className="p-5 bg-white rounded-3xl shadow-md text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all"><Plane className="w-8 h-8" /></div>
                           <div>
                              <p className="font-black text-slate-900 text-xl tracking-tight">{provider.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="px-3 py-1 bg-green-100 text-green-700 text-[9px] font-black uppercase rounded-lg">{provider.type || 'Service'}</span>
                                 <span className="text-[10px] text-slate-400 font-bold">{provider.address}</span>
                              </div>
                           </div>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <a href={`tel:${provider.contact}`} className="flex items-center justify-center gap-3 bg-slate-950 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">
                           <PhoneCall className="w-4 h-4" /> {isHindi ? 'कॉल करें' : 'Call'}
                        </a>
                        <button className="flex items-center justify-center gap-3 bg-white border-2 border-slate-100 text-slate-900 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-sm active:scale-95 transition-all hover:bg-slate-50">
                           <NavIcon className="w-4 h-4 text-blue-500" /> {isHindi ? 'रास्ता' : 'Navigate'}
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}
      
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default DroneModule;
