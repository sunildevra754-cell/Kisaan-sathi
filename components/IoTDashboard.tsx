
import React, { useState, useEffect } from 'react';
import { Cpu, Droplets, Thermometer, Wind, RefreshCw, AlertCircle, CheckCircle2, MapPin, Gauge } from 'lucide-react';
import { Language } from '../types';
import { GoogleGenAI } from "@google/genai";

const IoTDashboard: React.FC<{ lang: Language }> = ({ lang }) => {
  const isHindi = lang === Language.HINDI;
  const [sensors, setSensors] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<string>("Detecting field...");
  const [aiAdvice, setAiAdvice] = useState<string>("");

  useEffect(() => {
    connectToSensors();
  }, []);

  const connectToSensors = () => {
    setLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(`Sensor Node @ ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
        
        // Simulate real-time NPK and Soil data
        const simulatedData = {
          soilMoisture: (Math.random() * 20 + 35).toFixed(1), // 35-55%
          soilPH: (Math.random() * 2 + 5.5).toFixed(1),      // 5.5-7.5
          nitrogen: Math.floor(Math.random() * 50 + 100),    // 100-150 ppm
          phosphorus: Math.floor(Math.random() * 30 + 40),   // 40-70 ppm
          potassium: Math.floor(Math.random() * 100 + 150),  // 150-250 ppm
          soilTemp: (Math.random() * 5 + 22).toFixed(1)      // 22-27°C
        };
        setSensors(simulatedData);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `I have a smart IoT sensor in my field at ${latitude}, ${longitude}. 
                     Current readings: Moisture ${simulatedData.soilMoisture}%, pH ${simulatedData.soilPH}, 
                     NPK: ${simulatedData.nitrogen}-${simulatedData.phosphorus}-${simulatedData.potassium}.
                     Interpret these values for a typical Indian farm and provide 2 action points. 
                     Language: ${isHindi ? 'Hindi' : 'English'}.`
        });
        setAiAdvice(response.text);
        setLoading(false);
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white overflow-hidden relative shadow-2xl">
         <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
               <div className="p-3 bg-green-500 rounded-2xl animate-pulse shadow-lg shadow-green-500/50">
                  <Cpu className="w-8 h-8 text-white" />
               </div>
               <div>
                  <h2 className="text-3xl font-black tracking-tighter">{isHindi ? 'स्मार्ट IoT डैशबोर्ड' : 'Smart IoT Dashboard'}</h2>
                  <p className="text-slate-400 font-bold flex items-center gap-2">
                     <MapPin className="w-4 h-4" /> {location}
                  </p>
               </div>
            </div>
            
            <div className="flex items-center gap-2 mt-2">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
               <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Live Connection Active</span>
            </div>
         </div>
         <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
            <Cpu className="w-64 h-64" />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Soil Moisture */}
        <div className="bg-white p-6 rounded-3xl border border-green-100 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Droplets className="w-6 h-6" /></div>
              <span className="text-[10px] font-black uppercase text-slate-400">Moisture</span>
           </div>
           <div>
              <p className="text-4xl font-black text-slate-900">{sensors?.soilMoisture || '--'}%</p>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                 <div className="bg-blue-500 h-full" style={{width: `${sensors?.soilMoisture}%`}}></div>
              </div>
           </div>
           <p className="text-xs font-bold text-green-600 mt-4 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {isHindi ? 'सामान्य स्तर' : 'Optimal Level'}
           </p>
        </div>

        {/* Soil pH */}
        <div className="bg-white p-6 rounded-3xl border border-green-100 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Gauge className="w-6 h-6" /></div>
              <span className="text-[10px] font-black uppercase text-slate-400">Soil pH</span>
           </div>
           <div>
              <p className="text-4xl font-black text-slate-900">{sensors?.soilPH || '--'}</p>
              <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-400">
                 <span>Acidic</span>
                 <span>Neutral</span>
                 <span>Alkaline</span>
              </div>
           </div>
           <p className="text-xs font-bold text-amber-600 mt-4 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {isHindi ? 'हल्का अम्लीय' : 'Slightly Acidic'}
           </p>
        </div>

        {/* Soil Temp */}
        <div className="bg-white p-6 rounded-3xl border border-green-100 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl"><Thermometer className="w-6 h-6" /></div>
              <span className="text-[10px] font-black uppercase text-slate-400">Soil Temp</span>
           </div>
           <div>
              <p className="text-4xl font-black text-slate-900">{sensors?.soilTemp || '--'}°C</p>
              <p className="text-xs text-slate-400 mt-2 font-medium">Root zone temperature</p>
           </div>
           <p className="text-xs font-bold text-green-600 mt-4 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {isHindi ? 'जड़ों के लिए उत्तम' : 'Good for root health'}
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* NPK Values */}
         <div className="bg-white p-8 rounded-[2.5rem] border border-green-100 shadow-sm">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
               <Cpu className="w-5 h-5 text-green-600" />
               {isHindi ? 'NPK पोषक तत्व' : 'NPK Nutrients (PPM)'}
            </h3>
            <div className="space-y-6">
               <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                     <span className="text-slate-600">Nitrogen (N)</span>
                     <span className="text-green-600">{sensors?.nitrogen} ppm</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                     <div className="bg-green-500 h-full" style={{width: '75%'}}></div>
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                     <span className="text-slate-600">Phosphorus (P)</span>
                     <span className="text-blue-600">{sensors?.phosphorus} ppm</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                     <div className="bg-blue-500 h-full" style={{width: '45%'}}></div>
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                     <span className="text-slate-600">Potassium (K)</span>
                     <span className="text-orange-600">{sensors?.potassium} ppm</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                     <div className="bg-orange-500 h-full" style={{width: '85%'}}></div>
                  </div>
               </div>
            </div>
         </div>

         {/* AI Sensor Insight */}
         <div className="bg-green-700 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden flex flex-col justify-center">
            {loading ? (
               <div className="flex flex-col items-center gap-4 py-8">
                  <RefreshCw className="w-10 h-10 animate-spin opacity-50" />
                  <p className="font-bold opacity-60">AI is interpreting sensor data...</p>
               </div>
            ) : (
               <>
                  <h3 className="text-2xl font-black mb-4 flex items-center gap-2">
                     <Cpu className="w-6 h-6 text-green-300" />
                     {isHindi ? 'AI सेंसर अंतर्दृष्टि' : 'AI Sensor Insights'}
                  </h3>
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                     <p className="leading-relaxed font-medium">
                        {aiAdvice}
                     </p>
                  </div>
                  <button 
                     onClick={connectToSensors}
                     className="mt-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-white text-green-800 px-6 py-3 rounded-full w-fit hover:bg-green-50 transition-colors"
                  >
                     <RefreshCw className="w-4 h-4" /> Refresh Sensors
                  </button>
               </>
            )}
         </div>
      </div>
    </div>
  );
};

export default IoTDashboard;
