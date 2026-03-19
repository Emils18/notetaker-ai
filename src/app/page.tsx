'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from './components/Logo'
import { Sparkles, Camera, Loader2, Users, ClipboardCheck, Copy, BrainCircuit, Zap, RefreshCcw } from 'lucide-react'
import Tesseract from 'tesseract.js'

const TEAM = [
  { name: "Rodlie Fuentes", role: "Lead Developer", img: "https://i.pravatar.cc/150?u=1" },
  { name: "John Benedict", role: "UI/UX Designer", img: "https://i.pravatar.cc/150?u=2" },
  { name: "Earl Brian", role: "AI Engineer", img: "https://i.pravatar.cc/150?u=3" },
  { name: "Emelio Mondares", role: "DB Architect", img: "https://i.pravatar.cc/150?u=4" }
];

export default function Home() {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [activeMode, setActiveMode] = useState<'summary' | 'quiz' | 'flashcards'>('summary');

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setLoading(true);
    try {
      const { data: { text } } = await Tesseract.recognize(e.target.files[0], 'eng');
      setNotes(text);
    } catch (err) {
      alert("OCR Failed to read image!");
    } finally {
      setLoading(false);
    }
  };

  const processNotes = async () => {
    if (cooldown > 0) return;
    if (!notes.trim()) { alert("Paste notes first!"); return; }
    
    setLoading(true);
    setResult(""); // Clear previous result for animation effect
    try {
      const res = await fetch('/api/process-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notesText: notes, mode: activeMode }) 
      });

      const data = await res.json();

      if (res.status === 429) {
        setCooldown(60);
        setResult("⚠️ GOOGLE LIMIT REACHED: nah AHAK NA DI MA SILBI! Wait sa tag kadiyot.");
      } else {
        setResult(data.summary);
      }
    } catch (err) { 
      setResult("❌ connection error. Please try again."); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFBF7] p-4 md:p-8 text-black selection:bg-yellow-400 overflow-x-hidden">
      {/* Header / Nav */}
      <nav className="flex flex-col md:flex-row justify-between items-center mb-10 md:mb-20 max-w-6xl mx-auto border-b-4 border-black pb-6 gap-4">
        <motion.div 
          initial={{ x: -20, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-3"
        >
          <Logo />
          <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter">NoteTaker.AI</h2>
        </motion.div>
        
        <div className="flex -space-x-2">
          {TEAM.map((member, i) => (
            <motion.img 
              key={i}
              whileHover={{ y: -5, scale: 1.1 }}
              src={member.img} 
              className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-black bg-white shadow-sm"
              title={`${member.name} - ${member.role}`}
            />
          ))}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 mb-16 items-center">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl md:text-7xl font-black mb-6 uppercase leading-[0.9] tracking-tight">
            Stop <br className="hidden md:block" /> 
            <span className="text-yellow-500 underline decoration-black underline-offset-4">Scattered</span> <br /> 
            Thoughts.
          </h1>
          <p className="text-lg font-bold mb-8 text-neutral-600 max-w-md">
            Transform your chaotic notes into clean summaries and quizzes using UC's finest AI tools.
          </p>
          
          <div className="flex flex-wrap gap-2">
            {['summary', 'quiz', 'flashcards'].map((m) => (
              <button 
                key={m} 
                onClick={() => setActiveMode(m as any)} 
                className={`px-4 py-2 border-2 border-black font-black rounded-md uppercase text-xs transition-all active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${activeMode === m ? 'bg-yellow-400' : 'bg-white hover:bg-neutral-50'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Input Box */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white border-4 border-black p-5 md:p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-[2.5rem] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BrainCircuit size={80} />
          </div>
          
          <textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            className="w-full h-48 md:h-56 bg-neutral-50 border-2 border-black p-4 rounded-2xl mb-6 text-sm md:text-base font-medium focus:outline-none focus:ring-4 ring-yellow-400 transition-all resize-none" 
            placeholder="Paste your UC lecture notes or chaotic scribbles here..." 
          />
          
          <div className="flex flex-col sm:flex-row gap-4">
            <label className="cursor-pointer bg-white border-2 border-black px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Camera size={22} />
              <span className="uppercase text-sm">Scan Note</span>
              <input type="file" className="hidden" onChange={handleImage} accept="image/*" />
            </label>
            
            <button 
              onClick={processNotes} 
              disabled={loading || cooldown > 0}
              className={`flex-1 font-black rounded-2xl flex items-center justify-center gap-2 transition-all border-2 border-black py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none ${
                cooldown > 0 
                ? 'bg-neutral-200 cursor-not-allowed text-neutral-400' 
                : 'bg-black text-white hover:bg-yellow-400 hover:text-black'
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : cooldown > 0 ? (
                <span className="flex items-center gap-2"><RefreshCcw size={18} className="animate-spin-slow" /> COOLDOWN {cooldown}s</span>
              ) : (
                <><Sparkles size={20} /> GENERATE {activeMode.toUpperCase()}</>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Result Section */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div 
            key="result-box"
            initial={{ opacity: 0, y: 30, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-4xl mx-auto mb-20 bg-yellow-400 border-4 border-black p-6 md:p-10 rounded-[3rem] shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <h2 className="text-2xl md:text-4xl font-black uppercase italic flex items-center gap-3">
                <Zap className="fill-black" /> {activeMode} Results
              </h2>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(result);
                  const btn = document.getElementById('copy-btn');
                  if (btn) btn.innerHTML = "Copied!";
                  setTimeout(() => { if (btn) btn.innerHTML = "Copy"; }, 2000);
                }}
                className="w-full sm:w-auto bg-white border-2 border-black px-4 py-2 rounded-xl font-black hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2 text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1"
              >
                <Copy size={18} /> <span id="copy-btn uppercase">Copy to Clipboard</span>
              </button>
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-base md:text-xl font-bold whitespace-pre-wrap leading-relaxed text-black/90 selection:bg-black selection:text-white"
            >
              {result}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="max-w-6xl mx-auto text-center font-black uppercase italic text-xs md:text-sm text-neutral-400 py-10">
        UC - College of Computer Studies • Group Software Project 2026
      </footer>
    </main>
  )
}