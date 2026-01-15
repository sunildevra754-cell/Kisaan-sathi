
import React, { useState } from 'react';
import { Expense, Language } from '../types';
import { parseVoiceExpense } from '../services/geminiService';
import { Wallet, Mic, Plus, Trash2, Calendar, IndianRupee, MicOff, Loader2 } from 'lucide-react';

interface ExpenseTrackerProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  lang: Language;
}

const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ expenses, setExpenses, lang }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const isHindi = lang === Language.HINDI;

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = isHindi ? 'hi-IN' : 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setIsProcessing(true);
      try {
        const result = await parseVoiceExpense(text, lang);
        const newExpense: Expense = {
          id: Math.random().toString(36).substr(2, 9),
          amount: result.amount,
          category: result.category as any,
          description: result.description,
          date: new Date().toISOString().split('T')[0]
        };
        setExpenses(prev => [newExpense, ...prev]);
      } catch (e) {
        console.error(e);
      } finally {
        setIsProcessing(false);
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const removeExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-green-600" />
            {isHindi ? 'खर्च और मुनाफा ट्रैकर' : 'Expense & Profit Tracker'}
          </h2>
          <p className="text-slate-500">{isHindi ? 'बोलकर अपना खर्च जोड़ें' : 'Add expenses just by speaking'}</p>
        </div>
        <button 
          onClick={handleVoiceInput}
          disabled={isProcessing}
          className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold transition-all shadow-lg ${
            isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
          }`}
        >
          {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : (isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />)}
          {isHindi ? (isListening ? 'सुन रहा हूँ...' : 'खर्च बोलें') : (isListening ? 'Listening...' : 'Record Expense')}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold">{isHindi ? 'हाल के खर्च' : 'Recent Expenses'}</h3>
          <p className="text-sm font-bold text-slate-500">
            Total: ₹{expenses.reduce((s, e) => s + e.amount, 0)}
          </p>
        </div>
        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
          {expenses.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <IndianRupee className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>{isHindi ? 'कोई खर्च नहीं मिला' : 'No expenses recorded yet'}</p>
            </div>
          ) : (
            expenses.map(exp => (
              <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 text-green-700 rounded-xl">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{exp.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{exp.category}</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {exp.date}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xl font-black text-slate-900">₹{exp.amount}</p>
                  <button onClick={() => removeExpense(exp.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseTracker;
