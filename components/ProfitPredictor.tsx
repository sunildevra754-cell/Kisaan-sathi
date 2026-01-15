
import React, { useState } from 'react';
import { TrendingUp, Scale, Landmark, PieChart } from 'lucide-react';
import { Language } from '../types';
import { CROPS } from '../constants';

const ProfitPredictor: React.FC<{ lang: Language }> = ({ lang }) => {
  const [crop, setCrop] = useState('');
  const [area, setArea] = useState('');
  const [budget, setBudget] = useState('');
  const [result, setResult] = useState<any>(null);
  const isHindi = lang === Language.HINDI;

  const calculate = () => {
    const acres = parseFloat(area);
    const bud = parseFloat(budget);
    // Simple mock logic for demonstration
    const yieldPerAcre = crop === 'Wheat' ? 22 : 18; 
    const pricePerQuintal = crop === 'Wheat' ? 2275 : 2183;
    const totalYield = acres * yieldPerAcre;
    const revenue = totalYield * pricePerQuintal;
    const profit = revenue - bud;

    setResult({
      yield: totalYield,
      revenue: Math.round(revenue),
      profit: Math.round(profit),
      roi: Math.round((profit / bud) * 100)
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-green-100">
        <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-green-600" />
          {isHindi ? 'मुनाफा पूर्वानुमान' : 'Profit Prediction'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isHindi ? 'फसल' : 'Crop'}</label>
            <select 
              className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-green-500 outline-none font-bold"
              value={crop}
              onChange={e => setCrop(e.target.value)}
            >
              <option value="">{isHindi ? "चुनें" : "Select"}</option>
              {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isHindi ? 'क्षेत्र (एकड़)' : 'Area (Acres)'}</label>
            <input 
              type="number" 
              className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-green-500 outline-none font-bold"
              placeholder="e.g. 5"
              value={area}
              onChange={e => setArea(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isHindi ? 'कुल बजट (₹)' : 'Total Budget (₹)'}</label>
            <input 
              type="number" 
              className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-green-500 outline-none font-bold"
              placeholder="e.g. 20000"
              value={budget}
              onChange={e => setBudget(e.target.value)}
            />
          </div>
        </div>

        <button 
          onClick={calculate}
          disabled={!crop || !area || !budget}
          className="w-full bg-green-600 text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-green-100 disabled:opacity-50"
        >
          {isHindi ? 'गणना करें' : 'Calculate Profit'}
        </button>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
            <Scale className="w-8 h-8 text-blue-500 mb-2" />
            <p className="text-xs font-bold text-slate-400 uppercase">{isHindi ? 'कुल पैदावार' : 'Total Yield'}</p>
            <p className="text-2xl font-black">{result.yield} Quintals</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
            <Landmark className="w-8 h-8 text-emerald-500 mb-2" />
            <p className="text-xs font-bold text-slate-400 uppercase">{isHindi ? 'कुल राजस्व' : 'Total Revenue'}</p>
            <p className="text-2xl font-black">₹{result.revenue}</p>
          </div>
          <div className={`p-6 rounded-2xl shadow-sm border ${result.profit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <TrendingUp className={`w-8 h-8 mb-2 ${result.profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <p className="text-xs font-bold text-slate-400 uppercase">{isHindi ? 'शुद्ध लाभ' : 'Net Profit'}</p>
            <p className={`text-2xl font-black ${result.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹{result.profit}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
            <PieChart className="w-8 h-8 text-purple-500 mb-2" />
            <p className="text-xs font-bold text-slate-400 uppercase">ROI</p>
            <p className="text-2xl font-black">{result.roi}%</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitPredictor;
