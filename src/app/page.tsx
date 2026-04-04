'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Camera, Loader2, Zap, BrainCircuit, Trophy, BookOpen, LogOut, X, Users, Activity, Share2, Sparkles, CheckCircle2, Eye, EyeOff, Bookmark, Info, CheckCircle, Lightbulb, HelpCircle, Circle } from 'lucide-react'
import Tesseract from 'tesseract.js'
import ReactMarkdown from 'react-markdown'
import { supabase } from './supabase'

// ================= TEAM DATA =================
const TEAM = [
  { name: "Rodlie Fuentes", role: "Lead Developer", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rodlie" },
  { name: "John Benedict", role: "UI/UX Designer", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=John" },
  { name: "Earl Brian", role: "AI Engineer", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Earl" },
  { name: "Emelio Mondares", role: "DB Architect", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emelio" }
]

type Mode = 'summary' | 'quiz'
type QuizType = 'mcq' | 'id' | 'tf'

const hoverBtn = { scale: 1.05, y: -4, shadow: "10px 10px 0px 0px rgba(0,0,0,1)" }

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

  // Interactive States
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})
  const [revealId, setRevealId] = useState<Record<number, boolean>>({})
  const [tfAnswers, setTfAnswers] = useState<Record<number, string>>({})

  // =============== PARSER (THE HANDSHAKE) ===============
  const parseQuiz = (text: string) => {
    const lines = text.split('\n').filter(l => l.includes('|'));
    return lines.map(l => {
      const p = l.split('|').map(item => item.trim());
      return {
        q: p[0]?.replace(/^Q:|^S:|^[0-9].\s+/i, '') || "Content",
        o: p.filter(item => /^[A-D][\).:]/i.test(item)),
        correct: p.find(item => item.toLowerCase().includes('correct:'))?.split(':')[1]?.trim().toUpperCase() || "",
        a: p.find(item => item.toLowerCase().includes('a:'))?.split(':')[1]?.trim() || p[1] || "",
        e: p.find(item => item.toLowerCase().includes('e:'))?.split(':')[1]?.trim() || ""
      };
    });
  }

  // =============== OCR & DB LOGIC ===============
  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    setLoading(true)
    try {
      const { data: { text } } = await Tesseract.recognize(e.target.files[0], 'eng')
      setNotes(text.trim())
    } catch { alert("Scan Failed") } finally { setLoading(false) }
  }

  useEffect(() => {
    const initApp = async () => {
      if (!sessionStorage.getItem('v')) {
        await supabase.from('visits').insert([{ visitor_name: 'Guest' }])
        sessionStorage.setItem('v', '1')
      }
      const saved = localStorage.getItem('notetaker_user_id');
      if (saved) {
        const { data } = await supabase.from('users').select('*').eq('id', saved).single()
        if (data) { setUser(data); fetchHistory(data.id); }
      }
      refreshStats();
    };
    initApp();
  }, []);

  const refreshStats = async () => {
    const { count: v } = await supabase.from('visits').select('*', { count: 'exact', head: true })
    const { count: m } = await supabase.from('users').select('*', { count: 'exact', head: true })
    setStats({ visits: v || 0, members: m || 0, active: 1 })
    const { data } = await supabase.from('users').select('*').order('score', { ascending: false }).limit(5)
    if (data) setLeaderboard(data)
  }

  const fetchHistory = async (id: string) => {
    const { data } = await supabase.from('notes').select('*').eq('user_id', id).order('created_at', { ascending: false })
    if (data) setHistory(data)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: ex } = await supabase.from('users').select('*').eq('username', usernameInput.trim()).single()
    let fUser = ex
    if (ex) { if (ex.password !== passwordInput.trim()) return alert("Wrong key!") }
    else {
      const { data: n } = await supabase.from('users').insert([{ username: usernameInput.trim(), password: passwordInput.trim() }]).select().single()
      fUser = n
    }
    localStorage.setItem('notetaker_user_id', fUser.id);
    setUser(fUser); setShowAuthModal(false); refreshStats()
  }

  const processNotes = async () => {
    if (!notes.trim()) return alert("Enter notes!");
    setLoading(true); setQuizAnswers({}); setRevealId({}); setTfAnswers({});
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
        await supabase.from('notes').insert([{ user_id: user.id, content: notes, result: data.summary, mode: activeMode }])
        setUser({ ...user, score: ns }); fetchHistory(user.id)
      }
      setView('study')
    } catch { alert("AI Error") } finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-black font-sans selection:bg-yellow-200 overflow-x-hidden">
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* NAVBAR */}
      <nav className="p-6 md:p-10 flex flex-wrap justify-between items-center max-w-7xl mx-auto z-[100] relative gap-6">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('input')}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="bg-black text-yellow-400 p-2.5 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <BrainCircuit size={32} />
          </motion.div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">NoteTaker.AI</h2>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4 border-4 border-black p-2 pr-4 rounded-2xl bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="bg-yellow-400 border-2 border-black w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl">{user.username[0].toUpperCase()}</div>
              <div className="flex flex-col text-left text-[10px] leading-tight"><span className="font-black uppercase">{user.username}</span><span className="font-bold text-gray-400">Pts: {user.score}</span></div>
              <button onClick={() => setShowLeaderboard(true)} className="ml-1 hover:text-yellow-500"><Trophy size={18} /></button>
              <button onClick={() => { localStorage.removeItem('notetaker_user_id'); setUser(null); }} className="text-red-500 ml-2 hover:scale-110 transition-transform"><LogOut size={18}/></button>
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="bg-black text-white px-6 py-2 rounded-2xl font-black uppercase border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 hover:text-black transition-all">Join</button>
          )}
          {user && <button onClick={() => setShowHistory(true)} className="p-3 border-4 border-black rounded-2xl bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-green-400 transition-all"><BookOpen size={20}/></button>}
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {view === 'input' ? (
          <motion.div key="v1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-7xl mx-auto px-6 mt-12 relative z-10 pb-40 text-center lg:text-left">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h1 className="text-7xl sm:text-9xl font-black mb-8 leading-[0.8] tracking-tighter uppercase italic">Study<br/><span className="text-yellow-500 underline decoration-black underline-offset-8">Smart.</span></h1>
                <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-12">
                  <button onClick={() => setActiveMode('summary')} className={`px-8 py-4 border-4 border-black font-black uppercase text-xs transition-all rounded-xl ${activeMode === 'summary' ? 'bg-yellow-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'}`}>Summary</button>
                  <button onClick={() => setActiveMode('quiz')} className={`px-8 py-4 border-4 border-black font-black uppercase text-xs transition-all rounded-xl ${activeMode === 'quiz' ? 'bg-yellow-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'}`}>Quiz Studio</button>
                </div>
                {activeMode === 'quiz' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center lg:justify-start gap-3 mt-6">
                    <button onClick={() => setQuizType('mcq')} className={`px-4 py-2 border-2 border-black font-bold text-[10px] rounded-lg ${quizType === 'mcq' ? 'bg-black text-white' : 'bg-white'}`}>MCQ</button>
                    <button onClick={() => setQuizType('id')} className={`px-4 py-2 border-2 border-black font-bold text-[10px] rounded-lg ${quizType === 'id' ? 'bg-black text-white' : 'bg-white'}`}>Identification</button>
                    <button onClick={() => setQuizType('tf')} className={`px-4 py-2 border-2 border-black font-bold text-[10px] rounded-lg ${quizType === 'tf' ? 'bg-black text-white' : 'bg-white'}`}>True/False</button>
                  </motion.div>
                )}
              </div>

              <div className="bg-white border-4 border-black p-8 shadow-[24px_24px_0px_0px_rgba(0,0,0,1)] rounded-[3rem]">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full h-64 bg-[#FDFBF7] border-4 border-black p-6 rounded-3xl mb-6 focus:outline-none text-xl font-bold" placeholder="Paste messy notes or scan an image..." />
                <div className="flex gap-4">
                  <motion.label whileHover={hoverBtn} className="cursor-pointer bg-white border-4 border-black w-24 h-24 rounded-3xl flex items-center justify-center hover:bg-yellow-400 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                    <Camera size={36}/><input type="file" accept="image/*" className="hidden" onChange={handleImage} />
                  </motion.label>
                  <button onClick={processNotes} disabled={loading} className="flex-1 bg-black text-white font-black rounded-3xl border-4 border-black text-3xl uppercase italic shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all">
                    {loading ? <Loader2 className="animate-spin mx-auto" size={40}/> : "Generate"}
                  </button>
                </div>
              </div>
            </div>

            {/* TEAM SECTION - PERMANENT */}
            <section className="mt-40 text-center">
              <h3 className="font-black uppercase mb-12 text-3xl italic opacity-30 tracking-widest">Team Developers</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {TEAM.map((m, i) => (
                  <motion.div key={i} whileHover={{ y: -10 }} className="bg-white border-4 border-black p-6 rounded-[2rem] shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all">
                    <img src={m.img} className="w-16 h-16 mx-auto rounded-full border-2 border-black mb-2" alt={m.name} />
                    <p className="font-black text-sm uppercase">{m.name}</p>
                    <p className="text-[10px] font-black opacity-40 uppercase">{m.role}</p>
                  </motion.div>
                ))}
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div key="study" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="max-w-4xl mx-auto px-6 mt-12 pb-40 relative z-50">
            <div className="flex justify-between items-center mb-10">
              <button onClick={() => setView('input')} className="border-4 border-black px-8 py-2 rounded-xl font-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 transition-all uppercase text-xs">← Back</button>
              <button onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="bg-black text-white px-8 py-2 rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {copied ? <CheckCircle2 size={16}/> : <Share2 size={16}/>} {copied ? "Copied" : "Share"}
              </button>
            </div>

            <div className="bg-white border-[6px] border-black p-10 rounded-[4rem] shadow-[25px_25px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-4xl font-black uppercase italic mb-10 border-b-4 border-black pb-4 text-gray-800 text-center">Output Result <Sparkles className="inline text-yellow-500" /></h2>

              {activeMode === 'summary' ? (
                <div className="prose prose-xl max-w-none text-gray-800 font-medium">
                  <ReactMarkdown components={{
                    h2: ({children}) => <h2 className="text-2xl font-black bg-yellow-100 border-l-8 border-black pl-4 py-2 mb-6 mt-10 uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">{children}</h2>,
                    li: ({children}) => <li className="flex items-start gap-4 mb-4"><Bookmark className="mt-1 text-yellow-500 shrink-0" size={20}/> {children}</li>,
                    strong: ({children}) => <span className="bg-yellow-50 border-b-2 border-yellow-300 font-bold px-1">{children}</span>
                  }}>{result}</ReactMarkdown>
                </div>
              ) : (
                <div className="grid gap-10">
                  {parseQuiz(result).map((q, i) => (
                    <div key={i} className="border-4 border-black p-8 rounded-[3rem] bg-gray-50 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-2xl font-black uppercase mb-8 border-l-8 border-yellow-400 pl-6">{i+1}. {q.q}</p>
                      
                      {quizType === 'mcq' && (
                        <div className="grid sm:grid-cols-2 gap-4">
                          {q.o.map((opt, oi) => {
                            const letter = opt[0]?.toUpperCase();
                            const isSel = quizAnswers[i] === letter;
                            return (
                              <button key={oi} onClick={() => setQuizAnswers(p => ({...p, [i]: letter}))}
                                className={`text-left p-4 border-4 border-black rounded-2xl font-black uppercase text-xs flex items-center gap-3 transition-all ${isSel ? (letter === q.correct ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500') : 'bg-white hover:bg-yellow-100'}`}>
                                <div className={`w-8 h-8 rounded-full border-4 border-black flex items-center justify-center ${isSel ? 'bg-black text-white' : 'bg-yellow-400'}`}>{letter}</div> {opt.slice(2)}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {quizType === 'id' && (
                        <div className="flex flex-col gap-4">
                          <button onClick={() => setRevealId(p => ({...p, [i]: !p[i]}))} className="bg-black text-white py-4 rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 hover:bg-yellow-400">
                             {revealId[i] ? <EyeOff size={18}/> : <Eye size={18}/>} {revealId[i] ? "Hide Answer" : "Reveal Answer"}
                          </button>
                          {revealId[i] && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-yellow-100 border-4 border-black rounded-xl text-center font-black text-3xl uppercase italic">{q.a}</motion.div>}
                        </div>
                      )}

                      {quizType === 'tf' && (
                        <div className="flex flex-col gap-4">
                           <div className="flex gap-4">
                             <button onClick={() => setTfAnswers(p => ({...p, [i]: 'TRUE'}))} className={`flex-1 py-4 border-4 border-black rounded-xl font-black ${tfAnswers[i] === 'TRUE' ? (q.a.toUpperCase().includes('TRUE') ? 'bg-green-400' : 'bg-red-400') : 'bg-white'}`}>TRUE</button>
                             <button onClick={() => setTfAnswers(p => ({...p, [i]: 'FALSE'}))} className={`flex-1 py-4 border-4 border-black rounded-xl font-black ${tfAnswers[i] === 'FALSE' ? (q.a.toUpperCase().includes('FALSE') ? 'bg-green-400' : 'bg-red-400') : 'bg-white'}`}>FALSE</button>
                           </div>
                           {tfAnswers[i] && <div className="mt-4 p-4 bg-yellow-50 border-4 border-black border-dotted rounded-xl italic font-bold">Note: {q.e}</div>}
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

      {/* STATS BAR - FULLY RESTORED */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[95%] sm:w-auto">
        <div className="flex items-center justify-center gap-10 bg-black text-white px-10 py-5 rounded-full border-4 border-yellow-400 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] font-black uppercase text-[10px] tracking-widest whitespace-nowrap">
          <div className="flex items-center gap-2"><Activity size={18} className="text-green-400 animate-pulse" /><span>Live: {stats.active}</span></div>
          <div className="flex items-center gap-2"><Users size={18} className="text-blue-400" /><span>Users: {stats.members}</span></div>
          <div className="flex items-center gap-2 text-yellow-400"><Zap size={18} fill="currentColor" /><span>Visits: {stats.visits}</span></div>
        </div>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative w-full max-w-sm bg-white border-[6px] border-black p-10 rounded-[3rem] shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]">
               <div className="flex justify-between items-center mb-10 font-black text-3xl italic uppercase"><h3>Identity</h3><button onClick={() => setShowAuthModal(false)}><X/></button></div>
               <form onSubmit={handleAuth} className="flex flex-col gap-4">
                  <input placeholder="ALIAS" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} className="border-4 border-black p-4 rounded-2xl font-black text-xl focus:outline-none" />
                  <input placeholder="KEYCODE" type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="border-4 border-black p-4 rounded-2xl font-black text-xl focus:outline-none" />
                  <button className="bg-black text-white py-5 rounded-2xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] uppercase text-xl transition-all hover:bg-yellow-400">Enter</button>
               </form>
            </motion.div>
          </motion.div>
        )}
        {showLeaderboard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowLeaderboard(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]">
            <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white border-l-[6px] border-black p-8 overflow-y-auto">
              <h3 className="text-4xl font-black uppercase mb-12 italic border-b-8 border-black pb-4 text-center">🏆 Top Legends</h3>
              {leaderboard.map((u, i) => (
                <div key={i} className={`flex justify-between items-center p-6 rounded-2xl border-4 border-black font-black text-xl mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${u.id === user?.id ? 'bg-yellow-400' : 'bg-gray-50'}`}>
                  <span>#{i+1} {u.username}</span><span>{u.score} pts</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
        {showHistory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowHistory(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]">
            <motion.div initial={{ x: -400 }} animate={{ x: 0 }} exit={{ x: -400 }} className="absolute left-0 top-0 bottom-0 w-full max-w-md bg-white border-r-[6px] border-black p-8 overflow-y-auto shadow-[20px_0px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-4xl font-black uppercase mb-12 italic text-green-500 border-b-8 border-black pb-4 text-center">📚 Library</h3>
              {history.map((h, i) => (
                <div key={i} onClick={() => { setResult(h.result); setActiveMode(h.mode as any); setView('study'); setShowHistory(false); }} className="p-6 rounded-2xl border-4 border-black font-black cursor-pointer hover:bg-yellow-400 bg-gray-50 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                  <p className="uppercase text-[10px] opacity-50 mb-1">{h.mode}</p><p className="truncate text-xl uppercase italic tracking-tighter">{h.content}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}