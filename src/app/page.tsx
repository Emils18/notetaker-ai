'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Camera, Loader2, Zap, BrainCircuit, Copy, CheckCircle, Sparkles, Trash2, Rocket } from 'lucide-react'
import Tesseract from 'tesseract.js'
import ReactMarkdown from 'react-markdown'

const TEAM = [
  { name: "Rodlie Fuentes", role: "Lead Developer", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rodlie", color: "hover:bg-yellow-400" },
  { name: "John Benedict", role: "UI/UX Designer", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=John", color: "hover:bg-blue-400" },
  { name: "Earl Brian", role: "AI Engineer", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Earl", color: "hover:bg-green-400" },
  { name: "Emelio Mondares", role: "DB Architect", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emelio", color: "hover:bg-red-400" }
];

const MODES = ['summary', 'quiz', 'flashcards'] as const;
type Mode = typeof MODES[number];

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function Home() {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Initializing Brain...');
  const [result, setResult] = useState('');
  const [activeMode, setActiveMode] = useState<Mode>('summary');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (loading) {
      const msgs = ["Consulting AI...", "Sharpening pencils...", "Reading your notes...", "Bribing the AI...", "Thinking really hard...", "Almost there..."];
      let i = 0;
      const interval = setInterval(() => {
        setLoadingMsg(msgs[i % msgs.length]);
        i++;
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {   //RODLIE ANGEL D. FUENTES
    if (!e.target.files?.[0]) return;
    setLoading(true);
    setLoadingMsg('Scanning Image...');
    try {
      const { data: { text } } = await Tesseract.recognize(e.target.files[0], 'eng');
      setNotes(text);
    } catch (error) {
      alert("Failed to read image text.");
    } finally {
      setLoading(false);
    }
  };

  const processNotes = async () => {
    if (!notes.trim()) return alert("Paste notes first!");
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/process-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notesText: notes, mode: activeMode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server Error");
      setResult(data.summary);
      window.scrollTo({ top: 800, behavior: 'smooth' });
    } catch (error: any) {
      alert("AI ERROR: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-black selection:bg-yellow-400 relative pb-20 overflow-x-hidden font-sans">
      
      {/* 1. BACKGROUND */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <motion.div animate={{ x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 20, repeat: Infinity }} className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-200/30 blur-[120px] rounded-full" />
      </div>

      {/* 2. NAVBAR */}
      <nav className="p-6 md:p-10 flex justify-between items-center max-w-7xl mx-auto relative z-10">
        <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-3 cursor-pointer group">
          <div className="bg-black text-yellow-400 p-2.5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-none group-hover:translate-x-1 group-hover:translate-y-1 transition-all">
            <BrainCircuit size={32} className="group-hover:rotate-12 transition-transform" />
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">NoteTaker.AI</h2>
        </motion.div>
      </nav>

      {/* 3. HERO & INPUT */}
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center mt-12 mb-32 relative z-10">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black mb-8 leading-[0.8] tracking-tighter">STUDY <br/><span className="text-yellow-500">SMART.</span></h1>
          <p className="text-xl font-bold opacity-60 mb-10 italic">"AI handles the hard work, you handle the grades."</p>
          <div className="flex flex-wrap gap-4">
            {MODES.map((m) => (
              <button key={m} onClick={() => setActiveMode(m)} className={`px-8 py-4 border-4 border-black font-black uppercase text-xs transition-all ${activeMode === m ? 'bg-yellow-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -translate-y-1' : 'bg-white hover:bg-neutral-50'}`}>{m}</button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border-4 border-black p-4 sm:p-8 shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] rounded-[2.5rem] relative">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full h-56 bg-[#FDFBF7] border-2 border-black p-6 rounded-2xl mb-6 focus:outline-none focus:ring-8 focus:ring-yellow-400/20 transition-all text-lg font-medium resize-none" placeholder="Paste your notes here..." />
          <div className="flex gap-4">
            <label className="cursor-pointer bg-white border-4 border-black w-20 h-20 rounded-2xl flex items-center justify-center hover:bg-yellow-400 transition-all active:translate-y-1"><Camera size={32}/><input type="file" accept="image/*" className="hidden" onChange={handleImage} /></label>
            <button onClick={processNotes} disabled={loading} className="flex-1 bg-black text-white font-black rounded-2xl hover:bg-yellow-400 hover:text-black transition-all flex items-center justify-center disabled:opacity-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-xl border-4 border-black">
              {loading ? <div className="flex flex-col items-center"><Loader2 className="animate-spin mb-1" size={24} /><span className="text-[10px] uppercase">{loadingMsg}</span></div> : <span className="flex items-center gap-3">GENERATE <Zap fill="currentColor" size={20}/></span>}
            </button>
          </div>
        </motion.div>
      </div>

      {/* 5. AMAZING RESULTS DISPLAY */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto px-6 mb-32">
            <div className="bg-white border-[6px] border-black p-8 md:p-16 rounded-[4rem] shadow-[30px_30px_0px_0px_rgba(234,179,8,1)] relative overflow-hidden">
              <div className="flex justify-between items-center mb-12 border-b-4 border-black pb-6">
                <h2 className="text-4xl font-black italic flex items-center gap-4 uppercase tracking-tighter"><Sparkles className="text-yellow-500" /> {activeMode}</h2>
                <button onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-yellow-400 hover:text-black transition-all">
                  {copied ? <CheckCircle size={20} /> : <Copy size={20} />} {copied ? "COPIED" : "COPY"}
                </button>
              </div>
              
              {/* STYLED MARKDOWN OUTPUT */}
              <div className="prose prose-2xl max-w-none text-black selection:bg-yellow-200">
                <ReactMarkdown
                  components={{
                    h1: ({children}) => <h1 className="text-5xl font-black mb-8 border-b-8 border-black pb-2 uppercase tracking-tight">{children}</h1>,
                    h2: ({children}) => <h2 className="text-3xl font-black mt-12 mb-6 bg-yellow-400 inline-block px-4 border-2 border-black transform -rotate-1">{children}</h2>,
                    h3: ({children}) => <h3 className="text-2xl font-black mt-8 mb-4 flex items-center gap-2"> <Zap size={24} className="text-yellow-500" fill="currentColor" /> {children}</h3>,
                    hr: () => <hr className="border-t-4 border-black my-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />,
                    blockquote: ({children}) => <div className="bg-gray-50 border-4 border-black p-8 my-4 rounded-3xl shadow-inner font-bold italic text-2xl relative overflow-hidden"><div className="absolute top-0 right-4 opacity-10 text-6xl select-none">INFO</div>{children}</div>,
                    li: ({children}) => <li className="flex items-start gap-4 mb-4 text-xl font-bold"><div className="mt-2 h-3 w-3 bg-yellow-400 border-2 border-black rotate-45 flex-shrink-0" />{children}</li>,
                    ul: ({children}) => <ul className="list-none p-0 m-0">{children}</ul>,
                  }}
                >
                  {result}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. TEAM */}
      <section className="max-w-7xl mx-auto px-6 mb-20">
        <h3 className="text-center font-black uppercase tracking-[0.3em] mb-20 text-4xl italic underline decoration-yellow-400 underline-offset-8">The Minds Behind</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {TEAM.map((member, i) => (
            <motion.div key={i} whileHover={{ y: -15, rotate: i % 2 === 0 ? 2 : -2 }} className={`bg-white border-4 border-black p-8 rounded-[2.5rem] text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all ${member.color}`}>
              <div className="w-28 h-28 mx-auto rounded-full border-4 border-black mb-6 overflow-hidden bg-gray-100"><img src={member.img} alt={member.name} className="w-full h-full object-cover" /></div>
              <p className="font-black text-2xl leading-none mb-2">{member.name}</p>
              <p className="text-xs font-black opacity-50 uppercase tracking-widest">{member.role}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  )
}