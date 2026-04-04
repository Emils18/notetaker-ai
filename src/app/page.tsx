'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Camera, Loader2, Zap, BrainCircuit, Trophy, BookOpen, LogOut, X, Users, Activity, Share2, Sparkles, CheckCircle2, Eye, EyeOff, Bookmark, Info, CheckCircle, Lightbulb, HelpCircle, Circle, ArrowLeft, Printer, Target, SendHorizonal, Layers, ChevronLeft, ChevronRight } from 'lucide-react'
import Tesseract from 'tesseract.js'
import ReactMarkdown from 'react-markdown'
import { supabase } from './supabase'

// ================= TEAM DATA =================
const TEAM = [
  { name: "Rodlie Fuentes", role: "Lead Developer", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rodlie", color: "hover:bg-yellow-400" },
  { name: "John Benedict", role: "UI/UX Designer", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=John", color: "hover:bg-blue-400" },
  { name: "Earl Brian", role: "AI Engineer", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Earl", color: "hover:bg-green-400" },
  { name: "Emelio Mondares", role: "DB Architect", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emelio", color: "hover:bg-red-400" }
]

type Mode = 'summary' | 'quiz' | 'flashcards'
type QuizType = 'mcq' | 'id' | 'tf' | 'fc'

const hoverBtn = { scale: 1.05, y: -4, shadow: "12px 12px 0px 0px rgba(0,0,0,1)" }

export default function Home() {
  const [view, setView] = useState<'input' | 'study'>('input')
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({ visits: 0, members: 0, active: 1 })
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [activeMode, setActiveMode] = useState<Mode>('summary')
  const [quizType, setQuizType] = useState<QuizType>('mcq')
  const [copied, setCopied] = useState(false)

  // Game States
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})
  const [idInputs, setIdInputs] = useState<Record<number, string>>({})
  const [sessionScore, setSessionScore] = useState(0)
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})
  const [isFlipped, setIsFlipped] = useState(false)
  const [currentCard, setCurrentCard] = useState(0)

  // =============== LOGIC: RETRY SESSION ===============
  const resetSession = () => {
    setQuizAnswers({});
    setIdInputs({});
    setSessionScore(0);
    setCheckedItems({});
    setCurrentCard(0);
    setIsFlipped(false);
  };

  // =============== PARSER: ROBUST PIPE PARSER ===============
    const parseQuiz = (text: string) => {
    const lines = text.split('\n').filter(l => l.includes('|'));
    return lines.map(l => {
      const p = l.split('|').map(item => item.trim());
      return {
        q: p[0]?.replace(/^Q:|^S:|^Front:|^[0-9].\s+/i, '') || "Content",
        o: p.filter(item => /^[A-D][\).:]/i.test(item)),
        correct: p.find(item => item.toLowerCase().includes('correct:'))?.split(':')[1]?.trim().toUpperCase() || "",
        a: p.find(item => item.toLowerCase().includes('answer:'))?.split(/answer:/i)[1]?.trim() || p.find(item => item.toLowerCase().includes('back:'))?.split(/back:/i)[1]?.trim() || p[1] || "",
        e: p.find(item => item.toLowerCase().includes('e:'))?.split(/e:/i)[1]?.trim() || ""
      };
    });
  }

  // =============== DATABASE: HEARTBEAT & SYNC ===============
 // =============== 1. THE LIVE HEARTBEAT ===============
  useEffect(() => {
    const initLive = async () => {
      // Create a unique ID for this browser tab
      if (!sessionStorage.getItem('notetaker_tab_id')) {
        sessionStorage.setItem('notetaker_tab_id', 'tab_' + Math.random().toString(36).substr(2, 9));
      }
      const tid = sessionStorage.getItem('notetaker_tab_id');

      // Tell database "I am here"
      await supabase.from('live_status').upsert([{ id: tid, last_ping: new Date() }]);
      refreshStats();
    };

    initLive();

    // Heartbeat: Update ping every 20 seconds
    const hb = setInterval(async () => {
      const tid = sessionStorage.getItem('notetaker_tab_id');
      await supabase.from('live_status').update({ last_ping: new Date() }).eq('id', tid);
      refreshStats();
    }, 20000);

    return () => clearInterval(hb);
  }, [user]);

  const refreshStats = async () => {
    const { count: v } = await supabase.from('visits').select('*', { count: 'exact', head: true })
    const { count: m } = await supabase.from('users').select('*', { count: 'exact', head: true })
    const now = new Date(Date.now() - 60000).toISOString();
    
    // CHANGE 'online_users' TO 'live_status' BELOW:
    const { count: a } = await supabase.from('live_status')
      .select('*', { count: 'exact', head: true })
      .gt('last_ping', now);
    
    setStats({ visits: v || 0, members: m || 0, active: a || 1 });

    const { data: lb } = await supabase.from('users').select('*').order('score', { ascending: false }).limit(5)
    if (lb) setLeaderboard(lb)
  }

  const fetchHistory = async (id: string) => {
    // No changes needed here, this logic is correct!
    const { data } = await supabase.from('notes').select('*').eq('user_id', id).order('created_at', { ascending: false })
    if (data) setHistory(data)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: ex } = await supabase.from('users').select('*').eq('username', usernameInput.trim()).single()
    let fUser = ex;
    if (ex) { if (ex.password !== passwordInput.trim()) return alert("Wrong key!"); }
    else {
      const { data: n } = await supabase.from('users').insert([{ username: usernameInput.trim(), password: passwordInput.trim(), last_active: new Date() }]).select().single()
      fUser = n;
    }
    localStorage.setItem('notetaker_user_id', fUser.id);
    setUser(fUser); fetchHistory(fUser.id); setShowAuthModal(false); 
    refreshStats(); // Immediately update leaderboard
  }

  const processNotes = async () => {
    if (!notes.trim()) return alert("Enter notes!");
    setLoading(true); resetSession();
    try {
      const res = await fetch('/api/process-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notesText: notes, mode: activeMode, quizType: activeMode === 'quiz' ? quizType : null })
      })
      const data = await res.json()
      setResult(data.summary)
      if (user) {
        const ns = user.score + 1
        await supabase.from('users').update({ score: ns, last_active: new Date() }).eq('id', user.id)
        await supabase.from('notes').insert([{ user_id: user.id, content: notes.slice(0, 100), result: data.summary, mode: activeMode }])
        setUser({ ...user, score: ns }); fetchHistory(user.id); refreshStats();
      }
      setView('study')
    } catch { alert("AI Error") } finally { setLoading(false) }
  }

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    setLoading(true)
    try {
      const { data: { text } } = await Tesseract.recognize(e.target.files[0], 'eng')
      setNotes(text.trim())
    } catch { alert("Scan Fail") } finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-black font-sans selection:bg-yellow-200 overflow-x-hidden">
      
      {/* 3D ENGINE STYLES */}
      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />

      <div className="fixed inset-0 -z-10 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
      <motion.div animate={{ x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 20, repeat: Infinity }} className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-200/30 blur-[120px] rounded-full -z-10" />

      {/* NAVBAR */}
      <nav className="p-6 md:p-10 flex flex-wrap justify-between items-center max-w-7xl mx-auto z-[100] relative gap-6">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('input')}>
          <div className="bg-black text-yellow-400 p-2.5 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:rotate-12 transition-transform"><BrainCircuit size={32} /></div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">NoteTaker.AI</h2>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4 border-4 border-black p-2 pr-4 rounded-2xl bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="bg-yellow-400 border-2 border-black w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl">{user.username[0].toUpperCase()}</div>
              <div className="flex flex-col text-left text-[10px] leading-tight"><span className="font-black uppercase">{user.username}</span><span className="font-bold text-gray-400">Pts: {user.score}</span></div>
              <button onClick={() => setShowLeaderboard(true)} className="ml-1 hover:scale-125 transition-transform"><Trophy size={18} /></button>
              <button onClick={() => { localStorage.removeItem('notetaker_user_id'); setUser(null); }} className="text-red-500 ml-2 hover:scale-125 transition-transform"><LogOut size={18}/></button>
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="bg-black text-white px-6 py-2 rounded-2xl font-black uppercase border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 hover:text-black transition-all">Join</button>
          )}
          {user && <button onClick={() => setShowHistory(true)} className="p-3 border-4 border-black rounded-2xl bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-green-400 transition-all"><BookOpen size={20}/></button>}
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {view === 'input' ? (
          <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-7xl mx-auto px-6 mt-12 relative z-10 pb-40">
            <div className="grid lg:grid-cols-2 gap-16 items-center text-center lg:text-left">
              <div>
                <h1 className="text-7xl sm:text-9xl font-black mb-8 leading-[0.8] tracking-tighter uppercase italic">Study<br/><span className="text-yellow-500 underline decoration-black underline-offset-8 text-balance">Fast.</span></h1>
                <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-12">
                   <button onClick={() => setActiveMode('summary')} className={`px-8 py-4 border-4 border-black font-black uppercase text-xs transition-all rounded-xl ${activeMode === 'summary' ? 'bg-yellow-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'}`}>Summary</button>
                   <button onClick={() => setActiveMode('quiz')} className={`px-8 py-4 border-4 border-black font-black uppercase text-xs transition-all rounded-xl ${activeMode === 'quiz' ? 'bg-yellow-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'}`}>Quiz Studio</button>
                </div>
                {activeMode === 'quiz' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-center lg:justify-start gap-3 mt-6">
                    <button onClick={() => setQuizType('mcq')} className={`px-4 py-2 border-2 border-black font-bold text-[10px] rounded-lg transition-all ${quizType === 'mcq' ? 'bg-black text-white' : 'bg-white'}`}>MCQ</button>
                    <button onClick={() => setQuizType('id')} className={`px-4 py-2 border-2 border-black font-bold text-[10px] rounded-lg transition-all ${quizType === 'id' ? 'bg-black text-white' : 'bg-white'}`}>ID</button>
                    <button onClick={() => setQuizType('tf')} className={`px-4 py-2 border-2 border-black font-bold text-[10px] rounded-lg transition-all ${quizType === 'tf' ? 'bg-black text-white' : 'bg-white'}`}>T/F</button>
                    <button onClick={() => { setActiveMode('quiz'); setQuizType('fc'); }} className={`px-4 py-2 border-2 border-black font-bold text-[10px] rounded-lg transition-all ${quizType === 'fc' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'}`}>FC</button>
                  </motion.div>
                )}
              </div>
              <div className="bg-white border-[6px] border-black p-8 shadow-[24px_24px_0px_0px_rgba(0,0,0,1)] rounded-[3rem]">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full h-64 bg-[#FDFBF7] border-4 border-black p-6 rounded-3xl mb-6 focus:outline-none text-xl font-bold" placeholder="Paste sloppy notes or scan an image..." />
                <div className="flex gap-4">
                  <motion.label whileHover={hoverBtn} className="cursor-pointer bg-white border-4 border-black w-24 h-24 rounded-3xl flex items-center justify-center hover:bg-yellow-400 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"><Camera size={36}/><input type="file" accept="image/*" className="hidden" onChange={handleImage} /></motion.label>
                  <button onClick={processNotes} disabled={loading} className="flex-1 bg-black text-white font-black rounded-3xl border-4 border-black text-3xl uppercase italic shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all">{loading ? <Loader2 className="animate-spin mx-auto" size={40}/> : "Generate"}</button>
                </div>
              </div>
            </div>
            {/* TEAM DATA SECTION */}
            <section className="mt-40 text-center pb-20"><h3 className="font-black uppercase mb-20 text-4xl italic underline decoration-yellow-400 underline-offset-8">The Minds Behind</h3><div className="grid grid-cols-2 lg:grid-cols-4 gap-8">{TEAM.map((m, i) => (<motion.div key={i} whileHover={{ y: -10, rotate: i % 2 === 0 ? 2 : -2 }} className={`bg-white border-4 border-black p-8 rounded-[2.5rem] shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] ${m.color} transition-all`}><img src={m.img} className="w-24 h-24 mx-auto rounded-full border-4 border-black mb-4 bg-gray-100 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" alt={m.name} /><p className="font-black text-xl leading-none">{m.name}</p><p className="text-[10px] font-black opacity-40 uppercase tracking-widest mt-2">{m.role}</p></motion.div>))}</div></section>
          </motion.div>
        ) : (
          <motion.div key="study" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="max-w-4xl mx-auto px-6 mt-12 pb-40 relative z-50">
            <div className="flex justify-between items-center mb-10 gap-4">
              <button onClick={() => setView('input')} className="border-4 border-black px-8 py-2 rounded-xl font-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-red-400 hover:text-white transition-all uppercase text-xs leading-none">← Quit</button>
              <div className="flex gap-4">
                <button onClick={resetSession} className="p-3 bg-white border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 transition-all"><X size={20}/></button>
                {activeMode !== 'summary' && quizType !== 'fc' && <div className="bg-black text-yellow-400 px-6 py-2 rounded-xl font-black flex items-center gap-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(234,179,8,1)]"><Target size={18}/> <span>Score: {sessionScore}</span></div>}
              </div>
            </div>

            <div className="bg-white border-[6px] border-black p-10 rounded-[4rem] shadow-[25px_25px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-4xl font-black uppercase italic mb-10 border-b-4 border-black pb-4 text-gray-800 text-center">{activeMode === 'quiz' && quizType === 'fc' ? 'Memory Deck' : 'Output Result'} <Sparkles className="inline text-yellow-500" /></h2>

              {/* [LOCATION: SUMMARY OUTPUT] */}
              {activeMode === 'summary' ? (
                <div className="prose prose-xl max-none text-gray-800 font-medium leading-relaxed">
                  <ReactMarkdown components={{
                    h2: ({children}) => <h2 className="text-2xl font-black bg-yellow-100 border-l-8 border-black pl-4 py-2 mb-6 mt-10 uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">{children}</h2>,
                    li: ({children}) => <li className="flex items-start gap-4 mb-4"><Bookmark className="mt-1 text-yellow-500 shrink-0" size={24}/> {children}</li>,
                    strong: ({children}) => <span className="bg-yellow-50 border-b-2 border-yellow-300 font-bold px-1">{children}</span>
                  }}>{result}</ReactMarkdown>
                </div>
              ) : quizType === 'fc' ? (
                /* [LOCATION: FLASHCARDS OUTPUT] */
                <div className="flex flex-col items-center py-10">
                  <div className="w-full max-w-md h-[400px] relative cursor-pointer perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
                    <motion.div animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }} className="w-full h-full relative preserve-3d shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] rounded-[3rem] border-[8px] border-black">
                      <div className="absolute inset-0 backface-hidden bg-yellow-400 flex flex-col items-center justify-center p-12 text-center"><span className="bg-black text-white px-4 py-1 rounded-full font-black text-xs uppercase mb-10">Concept</span><h3 className="text-3xl font-black uppercase italic leading-tight">{parseQuiz(result)[currentCard]?.q}</h3><p className="mt-20 text-[10px] font-black opacity-30 animate-pulse uppercase tracking-widest">Tap Card to Flip</p></div>
                      <div className="absolute inset-0 backface-hidden bg-white flex flex-col items-center justify-center p-12 text-center rotate-y-180 overflow-y-auto"><span className="border-4 border-black px-4 py-1 rounded-full font-black text-xs uppercase mb-10 text-black">Definition</span><h3 className="text-2xl font-bold uppercase text-green-700 italic">{parseQuiz(result)[currentCard]?.a}</h3></div>
                    </motion.div>
                  </div>
                  <div className="flex items-center gap-12 mt-16 scale-125">
                    <button onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setCurrentCard(p => Math.max(0, p - 1))}} className="p-4 bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-yellow-400"><ChevronLeft size={32}/></button>
                    <span className="font-black text-2xl italic">{currentCard + 1} / {parseQuiz(result).length}</span>
                    <button onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setCurrentCard(p => Math.min(parseQuiz(result).length - 1, p + 1))}} className="p-4 bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-yellow-400"><ChevronRight size={32}/></button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-10">
                  {parseQuiz(result).map((q, i) => (
                    <div key={i} className="border-4 border-black p-8 rounded-[3rem] bg-gray-50 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-2xl font-black uppercase mb-8 border-l-8 border-yellow-400 pl-6">{i+1}. {q.q}</p>
                      
                      {/* [LOCATION: MCQ OUTPUT] */}
                      {quizType === 'mcq' && (
                        <div className="grid sm:grid-cols-2 gap-4">
                          {q.o.map((opt, oi) => {
                            const letter = opt[0]?.toUpperCase();
                            const isSel = quizAnswers[i] === letter;
                            const isCorrect = letter === q.correct;
                            return (
                              <button key={oi} onClick={() => { if(checkedItems[i]) return; setQuizAnswers(p => ({...p, [i]: letter})); setCheckedItems(p => ({...p, [i]: true})); if(isCorrect) setSessionScore(s=>s+1); }} className={`text-left p-5 border-4 border-black rounded-2xl font-bold uppercase text-sm flex items-center gap-4 transition-all ${isSel ? (isCorrect ? 'bg-green-400 shadow-none' : 'bg-red-400 text-white shadow-none') : 'bg-white hover:bg-yellow-50'}`}><div className={`w-8 h-8 rounded-full border-4 border-black flex items-center justify-center font-black shrink-0 ${isSel ? 'bg-white text-black' : 'bg-yellow-400'}`}>{letter}</div><span>{opt.slice(2).trim()}</span></button>
                            );
                          })}
                        </div>
                      )}

                      {/* [LOCATION: IDENTIFICATION OUTPUT] */}
                      {quizType === 'id' && (
                        <div className="flex flex-col gap-4">
                           <div className="flex gap-2">
                             <input placeholder="Type answer..." value={idInputs[i] || ""} onChange={(e) => setIdInputs(p => ({...p, [i]: e.target.value}))} className="flex-1 border-4 border-black p-4 rounded-xl font-black uppercase text-sm focus:bg-yellow-50 outline-none" />
                             <button onClick={() => { if(checkedItems[i]) return; const isCor = idInputs[i]?.toLowerCase().trim() === q.a.toLowerCase().trim(); setCheckedItems(p => ({...p, [i]: true})); if(isCor) setSessionScore(s => s + 1); }} className="bg-black text-white p-4 rounded-xl border-4 border-black hover:bg-yellow-400 transition-all"><SendHorizonal/></button>
                           </div>
                           {checkedItems[i] && <div className={`p-4 rounded-xl border-4 border-black text-center font-black uppercase ${idInputs[i]?.toLowerCase().trim() === q.a.toLowerCase().trim() ? 'bg-green-400' : 'bg-red-400 text-white'}`}>Answer: {q.a}</div>}
                        </div>
                      )}

                      {/* [LOCATION: TRUE/FALSE OUTPUT] */}
                      {quizType === 'tf' && (
                        <div className="flex flex-col gap-4">
                           <div className="flex gap-4">
                             {['TRUE', 'FALSE'].map(choice => (
                               <button key={choice} onClick={() => { if(checkedItems[i]) return; setQuizAnswers(p => ({...p, [i]: choice})); setCheckedItems(p => ({...p, [i]: true})); if(q.a.toUpperCase().includes(choice)) setSessionScore(s => s + 1); }}
                                 className={`flex-1 py-5 border-4 border-black rounded-2xl font-black transition-all ${quizAnswers[i] === choice ? (q.a.toUpperCase().includes(choice) ? 'bg-green-400 shadow-none' : 'bg-red-400 shadow-none') : 'bg-white hover:bg-yellow-400'}`}>{choice}</button>
                             ))}
                           </div>
                           {checkedItems[i] && <div className="p-4 bg-gray-100 border-l-8 border-black font-bold italic text-sm">{q.e}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[95%] sm:w-auto"><div className="flex items-center justify-center gap-10 bg-black text-white px-10 py-5 rounded-full border-4 border-yellow-400 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] font-black uppercase text-[10px] tracking-widest whitespace-nowrap"><div className="flex items-center gap-2"><Activity size={18} className="text-green-400 animate-pulse" /><span>Live: {stats.active}</span></div><div className="flex items-center gap-2"><Users size={18} className="text-blue-400" /><span>Users: {stats.members}</span></div><div className="flex items-center gap-2 text-yellow-400"><Zap size={18} fill="currentColor" /><span>Visits: {stats.visits}</span></div></div></div>

      <AnimatePresence>
        {showAuthModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative w-full max-w-sm bg-white border-[6px] border-black p-12 rounded-[3.5rem] shadow-[30px_30px_0px_0px_rgba(0,0,0,1)]">
               <div className="flex justify-between items-center mb-10 font-black text-3xl italic uppercase tracking-tighter"><h3>Join System</h3><button onClick={() => setShowAuthModal(false)} className="bg-black text-white p-2 rounded-full hover:bg-red-500 transition-colors"><X/></button></div>
               <form onSubmit={handleAuth} className="flex flex-col gap-5"><input placeholder="ALIAS" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} className="border-4 border-black p-4 rounded-2xl font-black text-xl focus:outline-none focus:ring-4 focus:ring-yellow-400 transition-all" /><input placeholder="KEYCODE" type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="border-4 border-black p-4 rounded-2xl font-black text-xl focus:outline-none focus:ring-4 focus:ring-yellow-400 transition-all" /><button className="bg-black text-white py-5 rounded-2xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] uppercase text-xl transition-all hover:bg-yellow-400 hover:text-black">Enter Session</button></form>
            </motion.div>
          </motion.div>
        )}

        {showLeaderboard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLeaderboard(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] overflow-hidden">
            <motion.div drag="x" dragConstraints={{ left: 0, right: 100 }} onDragEnd={(e, info) => info.offset.x > 100 && setShowLeaderboard(false)} initial={{ x: 500 }} animate={{ x: 0 }} exit={{ x: 500 }} transition={{ type: "spring", damping: 25 }} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white border-l-[8px] border-black p-8 overflow-y-auto shadow-[-20px_0px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between items-center mb-12 border-b-8 border-black pb-4"><h3 className="text-4xl font-black uppercase italic">🏆 Legends</h3><button onClick={() => setShowLeaderboard(false)} className="p-2 bg-black text-white rounded-full"><X/></button></div>
              {leaderboard.map((u, i) => (<div key={i} className={`flex justify-between items-center p-6 rounded-3xl border-4 border-black font-black text-xl mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${u.id === user?.id ? 'bg-yellow-400' : 'bg-gray-50'}`}><span className="flex items-center gap-4"><span className="opacity-30 text-2xl italic">#{i+1}</span> {u.username}</span><span>{u.score} <span className="text-xs uppercase opacity-40">pts</span></span></div>))}
              <p className="text-center text-[10px] font-black opacity-30 mt-10 uppercase">Swipe Right to Close →</p>
            </motion.div>
          </motion.div>
        )}

        {showHistory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistory(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] overflow-hidden">
            <motion.div drag="x" dragConstraints={{ left: -100, right: 0 }} onDragEnd={(e, info) => info.offset.x < -100 && setShowHistory(false)} initial={{ x: -500 }} animate={{ x: 0 }} exit={{ x: -500 }} transition={{ type: "spring", damping: 25 }} onClick={(e) => e.stopPropagation()} className="absolute left-0 top-0 bottom-0 w-full max-w-md bg-white border-r-[8px] border-black p-8 overflow-y-auto shadow-[20px_0px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between items-center mb-12 border-b-8 border-black pb-4"><h3 className="text-4xl font-black uppercase italic text-green-500">📚 Library</h3><button onClick={() => setShowHistory(false)} className="p-2 bg-black text-white rounded-full"><X/></button></div>
              {history.map((h, i) => (<div key={i} onClick={() => { try { setResult(h.result); setActiveMode(h.mode as any); setView('study'); setShowHistory(false); } catch { console.error('fail'); } }} className="p-6 rounded-3xl border-4 border-black font-black cursor-pointer hover:bg-yellow-400 bg-gray-50 mb-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all"><p className="uppercase text-[10px] opacity-40 mb-1 tracking-widest">{h.mode}</p><p className="truncate text-xl uppercase italic tracking-tighter">{h.content}</p></div>))}
              <p className="text-center text-[10px] font-black opacity-30 mt-10 uppercase">← Swipe Left to Close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}