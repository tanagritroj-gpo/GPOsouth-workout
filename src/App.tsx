import React, { useState, useEffect } from 'react';
import { User, Workout, WorkoutStats, LeaderboardEntry } from './types';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import WorkoutForm from './components/WorkoutForm';
import Leaderboard from './components/Leaderboard';
import WorkoutList from './components/WorkoutList';
import ReportPage from './components/ReportPage';
import ActivityFeed from './components/ActivityFeed';
import GpoLogo from './components/GpoLogo';
import Avatar from './components/Avatar';
import ProfileModal from './components/ProfileModal';
import { Heart, Trophy, BarChart3, PlusCircle, LogOut, Calendar, Footprints, Flame, Layers, Sparkles, Activity, X, Camera, FileText, Users, HeartHandshake } from 'lucide-react';
import { dbGetWorkouts, dbGetSummary, dbDeleteWorkout, seedInitialDataIfEmpty, dbGetUsers } from './firebase-client';
import { handleDriveRedirectResult } from './google-drive';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'feed' | 'leaderboard' | 'form' | 'history' | 'report'>('dashboard');
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [summaryData, setSummaryData] = useState<{ stats: WorkoutStats; leaderboard: LeaderboardEntry[] }>({
    stats: { totalSteps: 0, totalCalories: 0, totalWorkouts: 0, byActivity: {} },
    leaderboard: [],
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [isLineApp, setIsLineApp] = useState<boolean>(false);

  // Detect LINE In-App Browser & handle auto-open in external browser
  useEffect(() => {
    const userAgent = navigator.userAgent || '';
    const isLine = /Line|LINE/i.test(userAgent);
    if (isLine) {
      setIsLineApp(true);
      if (!window.location.search.includes('openExternalBrowser=1')) {
        const separator = window.location.search ? '&' : '?';
        window.location.href = window.location.href + separator + 'openExternalBrowser=1';
      }
    }
  }, []);

  // Seed the database if it is empty (client-side backup for static hosting platforms like Vercel)
  useEffect(() => {
    seedInitialDataIfEmpty().then(() => {
      fetchData();
    });

    handleDriveRedirectResult().then((token) => {
      if (token && window.location.hash.includes('access_token')) {
        setActiveTab('form');
      }
    });
  }, []);

  // Load active user session from localStorage if present
  useEffect(() => {
    const storedUser = localStorage.getItem('gpo_south_user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error loading stored user:', e);
      }
    }
  }, []);

  // Trigger welcome when currentUser is first populated
  useEffect(() => {
    if (currentUser) {
      setShowWelcome(true);
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 6000); // Display for 6 seconds, then fade out
      return () => clearTimeout(timer);
    }
  }, [currentUser?.id]);

  const getThaiDateString = () => {
    return new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Fetch workflows & summary on login/update
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get recent workouts
      const [workoutsData, usersData] = await Promise.all([
        dbGetWorkouts(),
        dbGetUsers()
      ]);
      setWorkouts(workoutsData);
      setAllUsers(usersData);

      // 2. Get summaries
      const summary = await dbGetSummary();
      setSummaryData(summary);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('gpo_south_user', JSON.stringify(user));
  };

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('gpo_south_user', JSON.stringify(updatedUser));
    fetchData(); // Refresh stats/leaderboard with updated photo
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('gpo_south_user');
  };

  const handleWorkoutAdded = async () => {
    await fetchData();
    setActiveTab('dashboard'); // Switch back to dashboard to see updated stats
  };

  const handleDeleteWorkout = async (id: string) => {
    try {
      const success = await dbDeleteWorkout(id);
      if (success) {
        await fetchData();
      } else {
        throw new Error('ไม่สามารถลบข้อมูลได้');
      }
    } catch (err) {
      console.error('Error deleting workout:', err);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f7f4ed] flex flex-col justify-center items-center p-4 relative overflow-hidden">
        {/* Soft atmospheric gradient wash behind */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-orange-200/40 blur-[130px] animate-float-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-rose-200/40 blur-[150px] animate-float-slower"></div>
        </div>
        <div className="relative z-10 w-full flex flex-col items-center">
          <AuthScreen onLoginSuccess={handleLogin} />
          <footer className="text-[11px] text-[#5f5f5d] mt-8 text-center uppercase tracking-wider font-semibold">
            GPO South Health in motion © 2026-2027 • Happy Workplace
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4ed] pb-24 md:pb-8 flex flex-col font-sans relative">
      {/* Soft warm atmospheric wash */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-35">
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] rounded-full bg-orange-100/30 blur-[120px] animate-float-slow"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[50%] h-[50%] rounded-full bg-blue-100/30 blur-[130px] animate-float-slower"></div>
      </div>

      {/* LINE App Warning Banner */}
      {isLineApp && (
        <div className="bg-amber-500 text-white px-4 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2 z-50 shadow-sm">
          <span>⚠️ เปิดใช้งานผ่านแอป LINE: กรุณากดปุ่ม <b>"..." (มุมขวาบน)</b> แล้วเลือก <b>"เปิดในเบราว์เซอร์อื่น"</b> (Chrome/Safari) เพื่อให้อัปโหลดรูปเข้า Google Drive ได้ตามปกติ</span>
        </div>
      )}

      {/* 1. Header Navigation Bar */}
      <header className="bg-[#f7f4ed]/80 backdrop-blur-md border-b border-[#eceae4] sticky top-0 z-30 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo and title */}
            <div className="flex items-center gap-3">
              <GpoLogo className="h-9 w-auto drop-shadow-sm" />
              <div>
                <span className="text-base sm:text-lg font-bold text-[#1c1c1c] font-display tracking-tight block leading-tight">
                  GPO South
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#5f5f5d] font-bold block tracking-wide uppercase">
                  Health Tracker
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 p-1 rounded-xl border border-[#eceae4] bg-white/50 shadow-xs">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-xs'
                    : 'text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-black/5'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Dash</span>
              </button>
              <button
                onClick={() => setActiveTab('feed')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'feed'
                    ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-xs'
                    : 'text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-black/5'
                }`}
              >
                <Users className="w-4 h-4 text-sb-gold" />
                <span>Feed</span>
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'leaderboard'
                    ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-xs'
                    : 'text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-black/5'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Leader</span>
              </button>
              <button
                onClick={() => setActiveTab('form')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'form'
                    ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-xs'
                    : 'text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-black/5'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Log</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'history'
                    ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-xs'
                    : 'text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-black/5'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>History</span>
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'report'
                    ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-xs'
                    : 'text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-black/5'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Report</span>
              </button>
            </nav>

            {/* User Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="bg-white/80 hover:bg-white rounded-full p-1 sm:p-1.5 pl-2 pr-2.5 sm:pr-3 border border-[#eceae4] flex items-center gap-2 transition-all shadow-xs hover:shadow-sm active:scale-95 group text-left"
                title="คลิกเพื่อเปลี่ยนรูปโปรไฟล์"
              >
                <div className="relative">
                  <Avatar
                    photoUrl={currentUser.photoUrl}
                    name={currentUser.name}
                    className="w-7 h-7 sm:w-8 sm:h-8"
                    textClassName="text-xs font-bold"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 bg-sb-accent text-white p-0.5 rounded-full border border-white group-hover:scale-110 transition-transform">
                    <Camera className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                  </div>
                </div>
                <div className="text-left hidden lg:block max-w-[120px]">
                  <span className="text-xs font-bold text-[#1c1c1c] block leading-tight truncate group-hover:text-sb-accent transition-colors">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-[#5f5f5d] font-bold block uppercase tracking-wider truncate">
                    {currentUser.department}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="py-2 px-3 lovable-btn-ghost text-xs font-semibold"
                title="ออกจากระบบ"
              >
                Logout
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* 2. Main Content Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-[#1c1c1c] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold text-[#5f5f5d] uppercase tracking-widest">Updating data sync...</span>
            </div>
          </div>
        )}

        <div className={loading ? 'hidden' : 'block animate-fade-in'}>
          {activeTab === 'dashboard' && (
            <Dashboard stats={summaryData.stats} workouts={workouts} />
          )}

          {activeTab === 'feed' && (
            <ActivityFeed workouts={workouts} users={allUsers} currentUser={currentUser} />
          )}

          {activeTab === 'leaderboard' && (
            <Leaderboard entries={summaryData.leaderboard} currentUser={currentUser} />
          )}

          {activeTab === 'form' && (
            <WorkoutForm currentUser={currentUser} onSuccess={handleWorkoutAdded} />
          )}

          {activeTab === 'history' && (
            <WorkoutList
              workouts={workouts}
              currentUser={currentUser}
              allUsers={allUsers}
              onDeleteWorkout={handleDeleteWorkout}
            />
          )}

          {activeTab === 'report' && (
            <ReportPage workouts={workouts} currentUser={currentUser} />
          )}
        </div>
      </main>

      {/* 3. Sticky Mobile Bottom Navigation Bar (Convenient for Smartphones) */}
      <nav id="mobile-nav-bar" className="md:hidden fixed bottom-0 left-0 right-0 bg-[#f7f4ed]/95 backdrop-blur-md border-t border-[#eceae4] px-1 py-1.5 flex justify-between items-center z-40 shadow-lg">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex flex-col items-center gap-0.5 p-1 transition-all ${
            activeTab === 'dashboard' ? 'text-[#1c1c1c] font-bold scale-105' : 'text-[#5f5f5d]'
          }`}
        >
          <BarChart3 className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-[#1c1c1c]' : 'text-[#5f5f5d]'}`} />
          <span className="text-[8px] sm:text-[9px] font-bold">Dash</span>
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 flex flex-col items-center gap-0.5 p-1 transition-all ${
            activeTab === 'feed' ? 'text-[#1c1c1c] font-bold scale-105' : 'text-[#5f5f5d]'
          }`}
        >
          <Users className={`w-4 h-4 ${activeTab === 'feed' ? 'text-sb-gold' : 'text-[#5f5f5d]'}`} />
          <span className="text-[8px] sm:text-[9px] font-bold">Feed</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex flex-col items-center gap-0.5 p-1 transition-all ${
            activeTab === 'history' ? 'text-[#1c1c1c] font-bold scale-105' : 'text-[#5f5f5d]'
          }`}
        >
          <Calendar className={`w-4 h-4 ${activeTab === 'history' ? 'text-[#1c1c1c]' : 'text-[#5f5f5d]'}`} />
          <span className="text-[8px] sm:text-[9px] font-bold">History</span>
        </button>

        {/* Central Plus Button for Quick Exercise Entry */}
        <button
          onClick={() => setActiveTab('form')}
          className="w-10 h-10 bg-[#1c1c1c] text-[#fcfbf8] rounded-full flex items-center justify-center transform -translate-y-2 border-2 border-[#eceae4] transition-all active:scale-95 hover:scale-105 shadow-md shrink-0 mx-0.5"
          title="ส่งผลออกกำลังกาย"
        >
          <PlusCircle className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 flex flex-col items-center gap-0.5 p-1 transition-all ${
            activeTab === 'leaderboard' ? 'text-[#1c1c1c] font-bold scale-105' : 'text-[#5f5f5d]'
          }`}
        >
          <Trophy className={`w-4 h-4 ${activeTab === 'leaderboard' ? 'text-[#1c1c1c]' : 'text-[#5f5f5d]'}`} />
          <span className="text-[8px] sm:text-[9px] font-bold">Leader</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`flex-1 flex flex-col items-center gap-0.5 p-1 transition-all ${
            activeTab === 'report' ? 'text-[#1c1c1c] font-bold scale-105' : 'text-[#5f5f5d]'
          }`}
        >
          <FileText className={`w-4 h-4 ${activeTab === 'report' ? 'text-[#1c1c1c]' : 'text-[#5f5f5d]'}`} />
          <span className="text-[8px] sm:text-[9px] font-bold">Report</span>
        </button>
      </nav>

      {/* 4. Elegant Welcome Notification */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-24 left-4 right-4 md:bottom-8 md:right-8 md:left-auto md:w-[380px] bg-[#1c1c1c] text-[#fcfbf8] rounded-2xl p-5 shadow-2xl border border-white/10 z-50 overflow-hidden"
          >
            {/* Ambient glowing radial light inside */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex gap-4 relative z-10">
              {/* Left icon badge */}
              <div className="w-12 h-12 rounded-xl bg-orange-400/20 text-orange-300 flex items-center justify-center shrink-0 border border-orange-500/20">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>

              {/* Text content */}
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-[#5f5f5d]">SYSTEM NOTIFICATION</h4>
                    <h3 className="text-sm font-bold text-white mt-0.5">สวัสดี คุณ {currentUser.name}</h3>
                  </div>
                  <button
                    onClick={() => setShowWelcome(false)}
                    className="p-1 rounded-md text-[#5f5f5d] hover:text-[#fcfbf8] hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-xs text-slate-300 font-medium leading-relaxed mt-2">
                  ยินดีต้อนรับเข้าระบบ วันที่ <span className="text-orange-300 font-bold">{getThaiDateString()}</span> วันนี้คุณออกกำลังกายหรือเดินสะสมก้าวแล้วหรือยังครับ? 🏃‍♂️✨
                </p>

                <div className="mt-3.5 flex gap-2">
                  <button
                    onClick={() => {
                      setActiveTab('form');
                      setShowWelcome(false);
                    }}
                    className="px-3.5 py-1.5 bg-[#fcfbf8] text-[#1c1c1c] text-[11px] font-bold rounded-lg shadow-sm hover:bg-[#eceae4] active:scale-95 transition-all uppercase tracking-wider"
                  >
                    บันทึกกิจกรรมเลย!
                  </button>
                  <button
                    onClick={() => setShowWelcome(false)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-[11px] font-semibold rounded-lg active:scale-95 transition-all"
                  >
                    ไว้ทีหลัง
                  </button>
                </div>
              </div>
            </div>

            {/* Micro progress line indicating automatic fading */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 6, ease: 'linear' }}
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-orange-400 to-amber-300"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Profile Edit Modal */}
      {showProfileModal && currentUser && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfileModal(false)}
          onUpdateSuccess={handleUserUpdate}
        />
      )}
    </div>
  );
}
