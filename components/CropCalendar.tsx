
import React, { useState, useEffect } from 'react';
import { CropTask, Language } from '../types';
import { Calendar, CheckCircle, Clock, AlertTriangle, Plus, Trash2, X, Loader2, Sparkles } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

const CropCalendar: React.FC<{ lang: Language }> = ({ lang }) => {
  const isHindi = lang === Language.HINDI;
  const [tasks, setTasks] = useState<CropTask[]>(() => {
    const saved = localStorage.getItem('kisan_tasks');
    return saved ? JSON.parse(saved) : [
      { id: '1', crop: 'Wheat', task: isHindi ? 'उर्वरक प्रयोग' : 'Fertilizer Application', dueDate: '2024-05-28', isCompleted: false, priority: 'High' },
    ];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTask, setNewTask] = useState({ task: '', crop: '', date: '', priority: 'Medium' });

  useEffect(() => {
    localStorage.setItem('kisan_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const addTask = () => {
    if (!newTask.task || !newTask.crop || !newTask.date) return;
    const task: CropTask = {
      id: Date.now().toString(),
      task: newTask.task,
      crop: newTask.crop,
      dueDate: newTask.date,
      priority: newTask.priority as any,
      isCompleted: false
    };
    setTasks([task, ...tasks]);
    setNewTask({ task: '', crop: '', date: '', priority: 'Medium' });
    setIsModalOpen(false);
  };

  const generateAiSchedule = async () => {
    const savedProfile = localStorage.getItem('kisan_profile');
    if (!savedProfile) return;
    const profile = JSON.parse(savedProfile);
    
    setIsGenerating(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Today is ${new Date().toISOString().split('T')[0]}. 
                   Farmer is growing ${profile.cropPreference.join(', ')} in ${profile.district}, ${profile.state}. 
                   Generate 5 immediate agricultural tasks for the next 7 days.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                task: { type: Type.STRING },
                crop: { type: Type.STRING },
                date: { type: Type.STRING, description: "YYYY-MM-DD" },
                priority: { type: Type.STRING, description: "High, Medium, or Low" }
              },
              required: ["task", "crop", "date", "priority"]
            }
          }
        }
      });

      const text = response.text;
      if (text) {
        const aiTasks = JSON.parse(text.trim());
        const formatted = aiTasks.map((t: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          crop: t.crop,
          task: t.task,
          dueDate: t.date,
          priority: t.priority,
          isCompleted: false
        }));
        setTasks(prev => [...formatted, ...prev]);
      }
    } catch (e) {
      console.error("AI Calendar Error:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 font-['Outfit']">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-green-100 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-green-50 rounded-2xl text-green-600">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{isHindi ? 'फसल कैलेंडर' : 'Crop Calendar'}</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">{isHindi ? 'कार्यों का प्रबंधन' : 'Manage Daily Tasks'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={generateAiSchedule}
            disabled={isGenerating}
            className="h-14 px-6 bg-slate-900 text-white rounded-full flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-amber-400" />}
            <span className="text-xs font-black uppercase tracking-widest">{isHindi ? 'AI शेड्यूल' : 'AI Schedule'}</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center text-white shadow-xl active:scale-90 transition-all"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tasks.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(task => (
          <div 
            key={task.id} 
            className={`bg-white p-6 rounded-3xl border transition-all flex items-center justify-between group ${
              task.isCompleted ? 'opacity-50 border-slate-100' : 'border-green-50 shadow-sm hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-5">
              <button 
                onClick={() => toggleTask(task.id)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all ${
                  task.isCompleted ? 'bg-green-600 border-green-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-300'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`font-black text-lg ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.task}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    task.priority === 'High' ? 'bg-red-50 text-red-500' : 
                    task.priority === 'Medium' ? 'bg-blue-50 text-blue-500' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {task.priority}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">{task.crop}</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-bold">
                    <Clock className="w-3 h-3" /> {task.dueDate}
                  </span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => removeTask(task.id)}
              className="p-3 text-slate-200 hover:text-red-500 group-hover:scale-110 transition-all"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
          <AlertTriangle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">{isHindi ? 'कोई कार्य नहीं' : 'No pending tasks'}</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600"><X /></button>
            <h3 className="text-2xl font-black text-slate-900">{isHindi ? 'नया कार्य' : 'New Task'}</h3>
            
            <div className="space-y-4">
              <input 
                placeholder={isHindi ? "कार्य का नाम" : "Task Name"}
                className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-green-500 outline-none font-bold"
                value={newTask.task}
                onChange={e => setNewTask({...newTask, task: e.target.value})}
              />
              <input 
                placeholder={isHindi ? "फसल" : "Crop"}
                className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-green-500 outline-none font-bold"
                value={newTask.crop}
                onChange={e => setNewTask({...newTask, crop: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="date"
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-green-500 outline-none font-bold"
                  value={newTask.date}
                  onChange={e => setNewTask({...newTask, date: e.target.value})}
                />
                <select 
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-green-500 outline-none font-bold"
                  value={newTask.priority}
                  onChange={e => setNewTask({...newTask, priority: e.target.value})}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <button 
              onClick={addTask}
              className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-green-700 active:scale-95 transition-all"
            >
              {isHindi ? 'कार्य जोड़ें' : 'Save Task'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CropCalendar;
