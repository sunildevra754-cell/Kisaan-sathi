
import React, { useState, useMemo } from 'react';
import { Trophy, Medal, Star, ChevronUp, ChevronDown, User } from 'lucide-react';
import { Language } from '../types';

const Leaderboard: React.FC<{ lang: Language }> = ({ lang }) => {
  const isHindi = lang === Language.HINDI;
  const [view, setView] = useState<'weekly' | 'monthly'>('monthly');

  const rankData = useMemo(() => {
    const base = [
      { name: "Suresh Punjab", points: 4850, change: 2, rank: 1, state: "Punjab" },
      { name: "Rahul Patil", points: 4200, change: -1, rank: 2, state: "Maharashtra" },
      { name: "Amit Yadav", points: 3900, change: 5, rank: 3, state: "UP" },
      { name: "Vikram Singh", points: 3500, change: 0, rank: 4, state: "Rajasthan" },
      { name: "Anita Devi", points: 3100, change: -2, rank: 5, state: "Haryana" },
      { name: "Deepak Rawat", points: 2800, change: 1, rank: 6, state: "UK" },
      { name: "Prashant G.", points: 2400, change: 3, rank: 7, state: "Karnataka" },
      { name: "Mohan Lal", points: 2100, change: -1, rank: 8, state: "Gujarat" },
    ];
    
    return view === 'weekly' 
      ? base.map(p => ({ ...p, points: Math.floor(p.points / 4) }))
      : base;
  }, [view]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Header Info */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-orange-200 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-10 h-10 drop-shadow-lg" />
            <h2 className="text-4xl font-black tracking-tighter">{isHindi ? 'किसान लीडरबोर्ड' : 'Kisan Leaderboard'}</h2>
          </div>
          <p className="text-orange-100 font-medium max-w-sm leading-relaxed">
            {isHindi ? 'बेहतरीन सलाह और जानकारी शेयर करें और नंबर 1 किसान बनें!' : 'Share top farming tips and info to become the No. 1 Farmer!'}
          </p>
        </div>
        <Medal className="absolute -right-12 -bottom-12 w-64 h-64 text-white/10 -rotate-12" />
      </div>

      {/* View Switcher */}
      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-green-100 max-w-[300px] mx-auto">
        <button 
          onClick={() => setView('weekly')}
          className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${view === 'weekly' ? 'bg-green-600 text-white shadow-md' : 'text-slate-400'}`}
        >
          {isHindi ? 'साप्ताहिक' : 'Weekly'}
        </button>
        <button 
          onClick={() => setView('monthly')}
          className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${view === 'monthly' ? 'bg-green-600 text-white shadow-md' : 'text-slate-400'}`}
        >
          {isHindi ? 'मासिक' : 'Monthly'}
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-[2.5rem] border border-green-100 shadow-xl shadow-green-900/5 overflow-hidden">
        <div className="divide-y divide-slate-50">
          {rankData.map((user, idx) => (
            <div key={user.name} className={`p-6 flex items-center justify-between hover:bg-slate-50 transition-all ${idx < 3 ? 'bg-amber-50/30' : ''}`}>
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${
                  idx === 0 ? 'bg-amber-100 text-amber-700' : 
                  idx === 1 ? 'bg-slate-100 text-slate-700' : 
                  idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400'
                }`}>
                  {user.rank}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-slate-900 text-lg">{user.name}</p>
                    {idx === 0 && <Star className="w-4 h-4 text-amber-500 fill-current" />}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{user.state} Farmer</p>
                </div>
              </div>

              <div className="text-right flex items-center gap-6">
                <div>
                  <p className="text-xl font-black text-slate-900 tracking-tighter">{user.points.toLocaleString()}</p>
                  <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Points</p>
                </div>
                <div className={`flex flex-col items-center ${user.change > 0 ? 'text-green-500' : user.change < 0 ? 'text-red-500' : 'text-slate-300'}`}>
                  {user.change > 0 ? <ChevronUp className="w-4 h-4" /> : user.change < 0 ? <ChevronDown className="w-4 h-4" /> : null}
                  <span className="text-[10px] font-black">{user.change !== 0 ? Math.abs(user.change) : '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
