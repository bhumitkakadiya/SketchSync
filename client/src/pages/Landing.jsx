import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import TiltCard from '../components/ui/TiltCard';
import InteractiveBackground from '../components/ui/InteractiveBackground';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/ui/Logo';

export default function Landing() {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error(e);
    } finally {
      clearAuth();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col relative overflow-hidden">
      <InteractiveBackground />
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full bg-white/40 dark:bg-black/40 backdrop-blur-md border-b border-surface-200 dark:border-white/[0.06]">
        <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5 group">
          <Logo className="w-8 h-8 text-brand-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)] group-hover:scale-105 transition-transform" />
          <span className="text-xl font-bold tracking-tight gradient-text">SketchSync</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-transparent hover:ring-1 hover:ring-brand-500/40 transition-all cursor-pointer">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                  style={{ backgroundColor: user?.cursorColor || '#6366f1' }}
                >
                  {user?.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : user?.displayName?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--text-primary)' }}>{user?.displayName}</span>
              </Link>
              <button onClick={handleLogout} className="p-2 text-surface-400 hover:text-red-400 transition-colors" title="Sign out">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Sign In</Link>
              <Link to="/register" className="btn-primary">Get Started Free</Link>
            </>
          )}
        </div>
      </div>
    </nav>
      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-32 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-brand-500/30 text-brand-700 dark:text-brand-400 text-sm font-medium mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 animate-pulse" />
          Real-time collaboration — up to 50 users per room
        </div>

        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight leading-none mb-6 animate-slide-up">
          Draw Together,
          <br />
          <span className="gradient-text text-glow">Think Together</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          SketchSync is a real-time collaborative whiteboard with a stroke-accurate replay engine.
          Watch every drawing session unfold like a video — scrub, pause, and rewind.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Link to={isAuthenticated ? "/dashboard" : "/register"} className="uiverse-btn">
            {isAuthenticated ? "Go to Dashboard" : "Start Drawing Free"}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          {!isAuthenticated && (
            <Link to="/login" className="btn-secondary text-base px-8 py-3.5">
              Sign In
            </Link>
          )}
        </div>

        {/* 3D Isometric Hero Mockup */}
        <div className="mt-20 w-full max-w-4xl mx-auto perspective-1000 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div 
            className="w-full aspect-[16/9] rounded-2xl shadow-[0_0_100px_rgba(20,184,166,0.2)] glass-dark border border-brand-500/30 overflow-hidden relative preserve-3d"
            style={{ transform: 'rotateX(20deg) rotateY(-10deg) rotateZ(5deg) scale3d(0.95, 0.95, 0.95)', transition: 'transform 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
          >
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-500/20 blur-[80px] rounded-full" />
             <div className="absolute top-4 left-4 right-4 h-12 glass border-b border-white/10 rounded-xl flex items-center px-4 gap-2 z-10">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <div className="ml-4 h-4 w-32 bg-white/10 rounded-full" />
             </div>
             {/* Abstract floating 3D strokes */}
             <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M10,50 Q30,20 50,50 T90,50" stroke="#14b8a6" strokeWidth="2" fill="none" style={{ filter: 'drop-shadow(0 0 8px rgba(20,184,166,0.6))' }} className="animate-pulse-soft" />
                <path d="M20,70 Q40,40 60,70 T100,70" stroke="#06b6d4" strokeWidth="1.5" fill="none" opacity="0.6" style={{ filter: 'drop-shadow(0 0 5px rgba(6,182,212,0.5))' }} />
             </svg>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
          {[
            {
              title: 'Sub-100ms Real-Time',
              desc: 'Socket.IO powered sync with optimistic UI. Draw and see teammates\' strokes instantly — zero perceived lag.',
            },
            {
              title: 'Replay Engine',
              desc: 'Every stroke is recorded. Replay the entire creation process with play/pause, speed control and a scrubable timeline.',
            },
            {
              title: 'Infinite Canvas',
              desc: 'A truly boundless workspace with pan, zoom, and spatial context tracking for large architecture diagrams.',
            },
          ].map((feat, i) => (
            <div key={feat.title} className="animate-slide-up h-full" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
              <TiltCard className="h-full">
                <div className="glass p-6 rounded-2xl h-full flex flex-col border border-white/5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feat.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{feat.desc}</p>
                </div>
              </TiltCard>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {[
            { val: '50', label: 'users per room' },
            { val: '<100ms', label: 'sync latency' },
            { val: '∞', label: 'canvas size' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-black gradient-text">{stat.val}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-gray-600 dark:text-gray-500 text-sm border-t border-surface-200 dark:border-white/5">
        Built with MERN + Socket.IO · SketchSync © 2026
      </footer>
    </div>
  );
}
