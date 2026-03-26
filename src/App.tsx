/// <reference types="vite/client" />
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Sparkles, CheckCircle, Send, SkipForward, Lock, LogIn, LogOut, Trash2, Calendar, User as UserIcon, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { auth, db, googleProvider, signInWithPopup, onAuthStateChanged, User, submitNote, fetchSubmissions, Submission } from './lib/firebase';

// --- Types ---
type Phase = 'PRE_START' | 'NAME_ENTRY' | 'PRANK' | 'SUCCESS' | 'FINAL' | 'SECRET_CHALLENGE' | 'MESSI_SUCCESS' | 'ADMIN';

// --- Constants ---
const ANSWER_NAMES = [
  'Eric', 'Jayden', 'Ivan', 
  'Chung Wen Hao', 'Danush', 'Ethan', 'Darrien', 
  'Chiaw Han', 'Ava', 'Alex'
].map(n => n.toLowerCase());

const ADMIN_EMAIL = "kelsonong2009@gmail.com";

export default function App() {
  const [phase, setPhase] = useState<Phase>('PRE_START');
  const [userName, setUserName] = useState('');
  const [isAnswer, setIsAnswer] = useState(false);
  const [buttons, setButtons] = useState<{ id: number; x: number; y: number }[]>([
    { id: 0, x: 50, y: 50 }
  ]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [preStartNote, setPreStartNote] = useState('');
  const [ronaldoPos, setRonaldoPos] = useState({ x: 70, y: 50 });
  const [isMessi, setIsMessi] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  
  // Admin State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => {
    // Check if previously authenticated in this session
    const isAuth = sessionStorage.getItem('isAdminAuth') === 'true';
    const savedPass = sessionStorage.getItem('adminPass');
    if (isAuth && savedPass) {
      setIsAdminAuthenticated(true);
      loadSubmissions();
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phase === 'PRANK' && !isAnswer) {
      timer = setTimeout(() => {
        setShowRetry(true);
      }, 10000); // 10 seconds delay
    } else {
      setShowRetry(false);
    }
    return () => clearTimeout(timer);
  }, [phase, isAnswer]);

  const handleNameSubmit = (name: string) => {
    if (name === "Kelson Ong Ke Sheng") {
      setUserName(name);
      setShowPasswordInput(true);
      return;
    }
    const lowerName = name.toLowerCase();
    const isSpecial = ANSWER_NAMES.some(n => lowerName.includes(n));
    const isMessiUser = lowerName.includes('lionel messi') || lowerName.includes('messi');
    setUserName(name);
    setIsAnswer(isSpecial || isMessiUser);
    setIsMessi(isMessiUser);
    setPhase('PRANK');
  };

  const handleButtonClick = (id: number) => {
    if (isMessi) {
      setPhase('SECRET_CHALLENGE');
      return;
    }
    if (isAnswer) {
      setPhase('SUCCESS');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else {
      // Multiply buttons!
      const newButtons = Array.from({ length: 5 }).map((_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10
      }));
      setButtons(prev => [...prev, ...newButtons]);
    }
  };

  const moveButton = (id: number) => {
    if (isAnswer) return; // Don't move for special users
    
    setButtons(prev => prev.map(b => {
      if (b.id === id) {
        return {
          ...b,
          x: Math.random() * 80 + 10,
          y: Math.random() * 80 + 10
        };
      }
      return b;
    }));
  };

  const handleCoinFlip = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped) {
      confetti({
        particleCount: 50,
        spread: 60,
        colors: ['#FFD700', '#FFA500']
      });
      setTimeout(() => setShowNote(true), 600);
    }
  };

  const handleNoteSubmit = async () => {
    try {
      await submitNote(userName, note, isMessi, preStartNote);
      setPhase('FINAL');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error(err);
      // Fallback to final screen even if save fails
      setPhase('FINAL');
    }
  };

  const moveRonaldo = () => {
    setRonaldoPos({
      x: Math.random() * 60 + 20,
      y: Math.random() * 60 + 20
    });
  };

  const handleMessiWin = () => {
    setPhase('MESSI_SUCCESS');
    confetti({
      particleCount: 200,
      spread: 100,
      colors: ['#75AADB', '#FFFFFF', '#FFD700'] // Argentina colors
    });
  };

  const handleRetry = () => {
    setPhase('NAME_ENTRY');
    setButtons([{ id: 0, x: 50, y: 50 }]);
    setUserName('');
    setIsAnswer(false);
    setIsMessi(false);
    setShowRetry(false);
  };

  const verifyPassword = async () => {
    const trimmedInput = adminPassword.trim();
    const validPasswords = ["Kels0n2026", "kelson2026", "Kelson2026"];
    
    if (validPasswords.includes(trimmedInput)) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('isAdminAuth', 'true');
      sessionStorage.setItem('adminPass', trimmedInput);
      setShowPasswordInput(false);
      setAdminPassword('');
      loadSubmissions();
    } else {
      alert("Incorrect password!");
      setAdminPassword('');
    }
  };

  const loadSubmissions = async () => {
    setLoadingAdmin(true);
    try {
      const pass = sessionStorage.getItem('adminPass') || '';
      const data = await fetchSubmissions(pass);
      setSubmissions(data);
      setPhase('ADMIN');
    } catch (err: any) {
      console.error('Admin Load Error:', err);
      let msg = "Failed to load submissions.";
      try {
        if (err.message && err.message.startsWith('{')) {
          const parsed = JSON.parse(err.message);
          if (parsed.message) msg += `\n\nServer Error: ${parsed.message}`;
          if (parsed.code === 7) msg += "\n\n(Permission Denied: The server doesn't have access to the database. Please check Firebase roles.)";
        } else {
          msg += `\n\nError: ${err.message || String(err)}`;
        }
      } catch (e) {
        msg += `\n\nError: ${err.message || String(err)}`;
      }
      alert(msg);
    } finally {
      setLoadingAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900 overflow-hidden">
      <AnimatePresence>
        {showPasswordInput && (
          <motion.div
            key="password-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-4">Admin Access</h2>
              <p className="text-neutral-500 text-sm mb-6">Please enter your secret password to view submissions.</p>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                placeholder="Enter password..."
                className="w-full px-4 py-3 rounded-xl bg-neutral-100 border-none focus:ring-2 focus:ring-neutral-900 transition-all outline-none mb-6"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={verifyPassword}
                  className="flex-1 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setShowPasswordInput(false);
                    setAdminPassword('');
                  }}
                  className="px-6 py-3 bg-neutral-100 text-neutral-500 rounded-xl font-bold hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">

        {phase === 'PRE_START' && (
          <motion.div
            key="pre-start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen p-6"
          >
            <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-neutral-100 relative">
              <h1 
                className="text-2xl font-bold tracking-tight mb-6 cursor-default select-none relative"
              >
                Before we start...
              </h1>
              <p className="text-neutral-500 mb-6 font-medium">Is there anything you would like to say to me?</p>
              
              <textarea
                value={preStartNote}
                onChange={(e) => setPreStartNote(e.target.value)}
                placeholder="Write something here (optional)..."
                className="w-full h-32 p-4 rounded-2xl bg-neutral-100 border-none focus:ring-2 focus:ring-neutral-900 transition-all outline-none resize-none mb-6"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => setPhase('NAME_ENTRY')}
                  className="flex-1 py-4 bg-neutral-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
                >
                  Continue
                </button>
                <button
                  onClick={() => {
                    setPreStartNote('');
                    setPhase('NAME_ENTRY');
                  }}
                  className="px-6 py-4 bg-neutral-100 text-neutral-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'NAME_ENTRY' && (
          <motion.div
            key="entry"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen p-6"
          >
            <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-neutral-100 relative">
              <h1 
                className="text-3xl font-bold tracking-tight mb-2 cursor-default select-none relative"
              >
                Welcome!
              </h1>
              <p className="text-neutral-500 mb-2">Please enter your name to start the challenge.</p>
              <p className="text-xs text-neutral-400 mb-8 font-medium italic">(Hint: Use your real name or the GOAT name)</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleNameSubmit(formData.get('name') as string);
                }}
                className="space-y-4"
              >
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Your Name"
                  className="w-full px-5 py-4 rounded-2xl bg-neutral-100 border-none focus:ring-2 focus:ring-neutral-900 transition-all outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-semibold hover:bg-neutral-800 transition-colors"
                >
                  Start Challenge
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {phase === 'PRANK' && (
          <motion.div
            key="prank"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full h-screen bg-neutral-100"
          >
            <div className="absolute top-8 left-0 right-0 text-center pointer-events-none">
              <h2 className="text-2xl font-bold text-neutral-400 opacity-50">Just press the button, {userName}...</h2>
            </div>
            
            {buttons.map((btn) => (
              <motion.button
                key={btn.id}
                onMouseEnter={() => moveButton(btn.id)}
                onClick={() => handleButtonClick(btn.id)}
                initial={{ scale: 0 }}
                animate={{ scale: 1, left: `${btn.x}%`, top: `${btn.y}%` }}
                className="absolute px-8 py-4 bg-red-500 text-white font-bold rounded-full shadow-lg hover:bg-red-600 transition-colors whitespace-nowrap"
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                PRESS ME
              </motion.button>
            ))}

            {!isAnswer && buttons.length > 30 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-4xl font-black text-red-500/20 uppercase rotate-12">Impossible!</p>
              </div>
            )}

            {showRetry && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-12 left-0 right-0 flex justify-center"
              >
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-white/80 backdrop-blur-sm text-neutral-600 font-bold rounded-2xl shadow-lg border border-neutral-200 hover:bg-white transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={18} />
                  Retry?
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === 'SUCCESS' && (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-screen p-6 bg-amber-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center max-w-2xl"
            >
              <h1 className="text-4xl font-bold mb-4">You did it, {userName}! 🤣</h1>
              <p className="text-lg text-neutral-600 mb-12">
                Thank you for participating in this thing and here's a gold coin for you as a reward.
              </p>

              {/* Gold Coin */}
              <div className="perspective-1000 mb-12">
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  onClick={handleCoinFlip}
                  className="relative w-48 h-48 cursor-pointer preserve-3d mx-auto"
                >
                  {/* Front */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full border-8 border-amber-600 flex items-center justify-center shadow-2xl backface-hidden">
                    <Coins size={80} className="text-amber-700" />
                  </div>
                  {/* Back */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full border-8 border-amber-700 flex items-center justify-center shadow-2xl backface-hidden rotate-y-180">
                    <Sparkles size={80} className="text-amber-200" />
                  </div>
                </motion.div>
              </div>

              {showNote && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-md mx-auto"
                >
                  <div className="bg-white p-8 rounded-3xl shadow-xl border border-amber-100">
                    <h3 className="text-xl font-bold mb-4 text-amber-800">
                      what do you want me to know? or what do you want to say to me?
                    </h3>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Write your note here..."
                      className="w-full h-32 p-4 rounded-2xl bg-amber-50 border-none focus:ring-2 focus:ring-amber-500 transition-all outline-none resize-none mb-6 text-amber-900"
                    />
                    <div className="flex gap-4">
                      <button
                        onClick={handleNoteSubmit}
                        className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors"
                      >
                        <Send size={20} />
                        Submit
                      </button>
                      <button
                        onClick={() => setPhase('FINAL')}
                        className="px-6 py-4 bg-neutral-100 text-neutral-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
                      >
                        <SkipForward size={20} />
                        Skip
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}

        {phase === 'FINAL' && (
          <motion.div
            key="final"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-screen p-6 bg-neutral-50"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
              className="mb-8 text-green-500"
            >
              <CheckCircle size={120} strokeWidth={1.5} />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-3xl font-bold text-center max-w-md leading-tight"
            >
              Noted, I will notice what you had written down when I have the time 🤣
            </motion.h2>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              onClick={() => window.location.reload()}
              className="mt-12 text-neutral-400 hover:text-neutral-600 transition-colors text-sm font-medium"
            >
              Restart Experience
            </motion.button>
          </motion.div>
        )}

        {phase === 'SECRET_CHALLENGE' && (
          <motion.div
            key="secret"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-screen p-6 bg-blue-900 text-white relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="grid grid-cols-8 gap-4 p-4">
                {Array.from({ length: 64 }).map((_, i) => (
                  <Sparkles key={i} size={40} />
                ))}
              </div>
            </div>

            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white text-blue-900 p-10 rounded-[40px] shadow-2xl text-center max-w-lg z-10"
            >
              <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">Secret Challenge Unlocked!</h2>
              <p className="text-neutral-500 mb-8 font-medium">You've proven your worth. Now answer the ultimate question:</p>
              
              <h1 className="text-4xl font-black mb-12 text-neutral-900">Who is the GOAT?</h1>
              
              <div className="relative h-48 w-full">
                <motion.button
                  onClick={handleMessiWin}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute left-1/4 top-1/2 -translate-x-1/2 -translate-y-1/2 px-10 py-5 bg-blue-500 text-white font-black rounded-2xl shadow-xl hover:bg-blue-600 transition-colors"
                >
                  Messi
                </motion.button>

                <motion.button
                  onMouseEnter={moveRonaldo}
                  animate={{ left: `${ronaldoPos.x}%`, top: `${ronaldoPos.y}%` }}
                  transition={{ type: 'spring', stiffness: 2000, damping: 20 }}
                  className="absolute px-10 py-5 bg-neutral-200 text-neutral-400 font-black rounded-2xl shadow-md cursor-not-allowed whitespace-nowrap"
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                  Cristiano Ronaldo
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {phase === 'MESSI_SUCCESS' && (
          <motion.div
            key="messi-win"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-[#75AADB] to-white text-[#003566]"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="flex justify-center gap-4 mb-8">
                <motion.div animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <Sparkles size={60} className="text-amber-400" />
                </motion.div>
                <motion.div animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}>
                  <Coins size={80} className="text-amber-500" />
                </motion.div>
                <motion.div animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 1 }}>
                  <Sparkles size={60} className="text-amber-400" />
                </motion.div>
              </div>

              <h1 className="text-6xl font-black mb-4 tracking-tighter uppercase italic">The Real GOAT</h1>
              <p className="text-2xl font-bold mb-12 opacity-80">You know ball. 🇦🇷🏆</p>
              
              <div className="bg-white/30 backdrop-blur-md p-8 rounded-3xl border border-white/50 shadow-xl">
                <p className="text-xl font-medium italic">"I start early and I stay late, day after day, year after year. It took me 17 years and 114 days to become an overnight success."</p>
                <p className="mt-4 font-black uppercase tracking-widest text-sm opacity-60">— Lionel Messi</p>
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                onClick={() => window.location.reload()}
                className="mt-16 px-8 py-4 bg-[#003566] text-white rounded-full font-bold hover:bg-[#002855] transition-colors"
              >
                Perhaps another reminder of who is the real GOAT?
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {phase === 'ADMIN' && (
          <motion.div
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-neutral-100 p-8"
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
                  <Lock className="text-neutral-400" />
                  Submission Dashboard
                </h1>
                <div className="flex gap-3">
                  <button 
                    onClick={async () => {
                      await auth.signOut();
                      setIsAdminAuthenticated(false);
                      sessionStorage.removeItem('isAdminAuth');
                      sessionStorage.removeItem('adminPass');
                      setPhase('PRE_START');
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-colors"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                  <button 
                    onClick={() => {
                      setIsAdminAuthenticated(false);
                      sessionStorage.removeItem('isAdminAuth');
                      sessionStorage.removeItem('adminPass');
                      setPhase('PRE_START');
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-colors"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              </div>

              {loadingAdmin ? (
                <div className="flex justify-center py-20">
                  <RefreshCw className="animate-spin text-neutral-400" size={40} />
                </div>
              ) : (
                <div className="grid gap-4">
                  {submissions.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl text-center text-neutral-400 font-medium">
                      No submissions yet.
                    </div>
                  ) : (
                    submissions.map((sub) => (
                      <motion.div 
                        key={sub.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200 flex flex-col md:flex-row gap-6"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <UserIcon size={16} className="text-neutral-400" />
                            <span className="font-black text-lg">{sub.userName}</span>
                            {sub.isMessi && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-black uppercase rounded-full">
                                Messi Flow
                              </span>
                            )}
                          </div>
                          <p className="text-neutral-600 leading-relaxed mb-4">{sub.note || <span className="italic opacity-50">No end note provided.</span>}</p>
                          {sub.preNote && (
                            <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                              <p className="text-[10px] font-black uppercase text-neutral-400 mb-1">Pre-start Note</p>
                              <p className="text-sm text-neutral-600 italic">"{sub.preNote}"</p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end justify-between border-t md:border-t-0 md:border-l border-neutral-100 pt-4 md:pt-0 md:pl-6">
                          <div className="flex items-center gap-1 text-xs text-neutral-400 font-medium">
                            <Calendar size={12} />
                            {sub.timestamp?.toDate().toLocaleString() || 'Just now'}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
