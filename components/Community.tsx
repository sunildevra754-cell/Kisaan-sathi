
import React, { useState, useEffect, useMemo } from 'react';
import { Language } from '../types';
import { MessageCircle, Heart, Share2, PlusSquare, MoreHorizontal, Bookmark, Send } from 'lucide-react';
import { CacheService } from '../utils/cacheService';

const Community: React.FC<{ lang: Language }> = ({ lang }) => {
  const isHindi = lang === Language.HINDI;
  const [posts, setPosts] = useState(() => CacheService.get('community_posts') || [
    { 
      id: 1,
      user: "Suresh Kumar", 
      avatar: "SK",
      location: "Amritsar, Punjab", 
      text: isHindi ? "मेरी गेहूं की फसल इस बार बहुत अच्छी हुई है! जैविक खाद का कमाल।" : "My wheat crop is looking fantastic this year! Organic manure really works.",
      img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
      likes: 124, comments: 12, isLiked: false, isBookmarked: false, time: "2h ago"
    },
    { 
      id: 2,
      user: "Rahul Patil", 
      avatar: "RP",
      location: "Nashik, Maharashtra", 
      text: isHindi ? "टमाटर की खेती में ड्रिप इरिगेशन सबसे बेहतर है।" : "Drip irrigation is a game changer for tomatoes.",
      img: "https://images.unsplash.com/photo-1592919016382-7969c6934898?auto=format&fit=crop&w=800&q=80",
      likes: 88, comments: 5, isLiked: true, isBookmarked: false, time: "5h ago"
    }
  ]);

  useEffect(() => {
    CacheService.set('community_posts', posts);
  }, [posts]);

  const toggleLike = (id: number) => {
    setPosts(posts.map(p => p.id === id ? { 
      ...p, 
      likes: p.isLiked ? p.likes - 1 : p.likes + 1, 
      isLiked: !p.isLiked 
    } : p));
  };

  const toggleBookmark = (id: number) => {
    setPosts(posts.map(p => p.id === id ? { ...p, isBookmarked: !p.isBookmarked } : p));
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-24">
      <div className="flex items-center justify-between sticky top-0 bg-[#f0fdf4]/90 backdrop-blur-xl py-4 z-20 border-b border-green-100/50 mb-2">
        <h2 className="text-2xl font-black tracking-tighter text-slate-900">{isHindi ? 'किसान फीड' : 'Kisan Feed'}</h2>
        <button className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-2xl font-bold shadow-xl shadow-green-200 active:scale-95 transition-all">
          <PlusSquare className="w-5 h-5" />
          {isHindi ? 'पोस्ट' : 'Post'}
        </button>
      </div>

      <div className="space-y-6">
        {posts.map((post) => (
          <article key={post.id} className="bg-white rounded-[2.5rem] shadow-xl shadow-green-900/5 border border-green-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* User Header */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-tr from-green-600 to-emerald-400 rounded-full flex items-center justify-center font-black text-white text-sm shadow-md border-2 border-white">
                  {post.avatar}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{post.user}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{post.location} • {post.time}</p>
                </div>
              </div>
              <button className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><MoreHorizontal /></button>
            </div>

            {/* Content Text */}
            <div className="px-6 pb-4">
              <p className="text-slate-800 text-[15px] leading-relaxed font-medium">{post.text}</p>
            </div>

            {/* Image (Lazy Loaded) */}
            <div className="relative aspect-square bg-slate-100 overflow-hidden" onDoubleClick={() => toggleLike(post.id)}>
               <img 
                 src={post.img} 
                 alt="Farmer Post" 
                 loading="lazy"
                 className="w-full h-full object-cover select-none transition-transform duration-700 hover:scale-105" 
               />
            </div>

            {/* Interaction Footer */}
            <div className="p-5">
               <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-5">
                    <button 
                      onClick={() => toggleLike(post.id)}
                      className={`active:scale-150 transition-transform ${post.isLiked ? 'text-red-500' : 'text-slate-700'}`}
                    >
                      <Heart className={`w-7 h-7 ${post.isLiked ? 'fill-current' : ''}`} />
                    </button>
                    <button className="text-slate-700 hover:text-blue-500 active:scale-125 transition-transform">
                      <MessageCircle className="w-7 h-7" />
                    </button>
                    <button className="text-slate-700 hover:text-green-500 active:scale-125 transition-transform">
                      <Send className="w-7 h-7" />
                    </button>
                  </div>
                  <button 
                    onClick={() => toggleBookmark(post.id)}
                    className={`active:scale-125 transition-transform ${post.isBookmarked ? 'text-green-600' : 'text-slate-700'}`}
                  >
                    <Bookmark className={`w-7 h-7 ${post.isBookmarked ? 'fill-current' : ''}`} />
                  </button>
               </div>
               
               <div className="space-y-1">
                  <p className="font-black text-sm text-slate-900">{post.likes.toLocaleString()} {isHindi ? 'लाइक' : 'likes'}</p>
                  <button className="text-slate-400 text-xs font-bold hover:underline">
                    View all {post.comments} comments
                  </button>
               </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Community;
