
import React, { useState, useRef, useEffect } from 'react';
import { FarmerProfile, Language, ChatMessage } from '../types';
import { getFarmingAdvice } from '../services/geminiService';
import { Send, Mic, MicOff, Volume2, User, Bot, Loader2 } from 'lucide-react';

interface AssistantProps {
  profile: FarmerProfile | null;
  lang: Language;
}

const Assistant: React.FC<AssistantProps> = ({ profile, lang }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const strings = {
    en: { placeholder: "Ask anything about farming...", title: "AI Agriculture Assistant" },
    hi: { placeholder: "खेती के बारे में कुछ भी पूछें...", title: "AI खेती सहायक" }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const userMessage: ChatMessage = { role: 'user', text: messageText, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getFarmingAdvice(messageText, profile, lang);
      const botMessage: ChatMessage = { role: 'model', text: response, timestamp: Date.now() };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      setIsListening(false);
      // @ts-ignore
      window.recognition?.stop();
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition not supported in this browser.");
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.lang = lang === Language.HINDI ? 'hi-IN' : 'en-US';
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        handleSend(text);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
      setIsListening(true);
      (window as any).recognition = recognition;
    }
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === Language.HINDI ? 'hi-IN' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
      {/* Header */}
      <div className="bg-green-50 p-4 border-b border-green-100 flex items-center justify-between">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Bot className="w-5 h-5 text-green-600" />
          {strings[lang].title}
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
              <Bot className="w-8 h-8" />
            </div>
            <p className="text-center max-w-[200px]">
              {lang === Language.HINDI ? 'खेती, मौसम या फसलों के बारे में सवाल पूछें।' : 'Ask about seeds, weather, or crop management.'}
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl flex flex-col gap-2 ${
              m.role === 'user' ? 'bg-green-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
            }`}>
              <div className="flex items-center gap-2 text-xs opacity-60 font-bold uppercase tracking-wider">
                {m.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                {m.role === 'user' ? 'Farmer' : 'Assistant'}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
              {m.role === 'model' && (
                <button onClick={() => speak(m.text)} className="self-end p-1 hover:bg-black/5 rounded">
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-green-600" />
              <span className="text-slate-500 text-sm">AI is thinking...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <button 
            onClick={toggleVoice}
            className={`p-4 rounded-full transition-colors ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={strings[lang].placeholder}
            className="flex-1 p-4 bg-slate-100 rounded-full outline-none focus:ring-2 focus:ring-green-500 transition-all text-lg"
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="p-4 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors shadow-lg shadow-green-200"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Assistant;
