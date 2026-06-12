import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';

export default function Landing() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
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
    <div className="min-h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-brand-600/20 blur-[120px] animate-pulse-soft" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-purple-600/15 blur-[100px] animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 left-1/2 w-[300px] h-[300px] rounded-full bg-pink-600/10 blur-[80px] animate-pulse-soft" style={{ animationDelay: '2s' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="SketchSync" className="w-8 h-8 rounded-xl shadow-glow-brand object-cover" />
          <span className="text-xl font-bold tracking-tight gradient-text">SketchSync</span>
        </Link>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <button onClick={handleLogout} className="btn-ghost">Sign Out</button>
              <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Sign In</Link>
              <Link to="/register" className="btn-primary">Get Started Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-brand-500/30 text-brand-400 text-sm font-medium mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Real-time collaboration — up to 50 users per room
        </div>

        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight leading-none mb-6 animate-slide-up">
          Draw Together,
          <br />
          <span className="gradient-text text-glow">Think Together</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          SketchSync is a real-time collaborative whiteboard with a stroke-accurate replay engine.
          Watch every drawing session unfold like a video — scrub, pause, and rewind.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Link to={isAuthenticated ? "/dashboard" : "/register"} className="btn-primary text-base px-8 py-3.5 shadow-glow-brand">
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

        {/* Feature cards */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
          {[
            {
              icon: '⚡',
              title: 'Sub-100ms Real-Time',
              desc: 'Socket.IO powered sync with optimistic UI. Draw and see teammates\' strokes instantly — zero perceived lag.',
              color: 'from-yellow-500/20 to-orange-500/10',
              border: 'border-yellow-500/20',
            },
            {
              icon: '🎬',
              title: 'Replay Engine',
              desc: 'Every stroke is recorded. Replay the entire creation process with play/pause, speed control and a scrubable timeline.',
              color: 'from-brand-500/20 to-purple-500/10',
              border: 'border-brand-500/20',
            },
            {
              icon: '🔒',
              title: 'Secure Rooms',
              desc: 'JWT authentication with refresh token rotation. Private rooms with 6-character codes and owner controls.',
              color: 'from-green-500/20 to-emerald-500/10',
              border: 'border-green-500/20',
            },
          ].map((feat, i) => (
            <div
              key={feat.title}
              className={`card bg-gradient-to-br ${feat.color} border ${feat.border} hover:scale-[1.02] transition-transform duration-300 animate-slide-up`}
              style={{ animationDelay: `${0.3 + i * 0.1}s` }}
            >
              <div className="text-3xl mb-3">{feat.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
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
      <footer className="relative z-10 text-center py-8 text-gray-600 text-sm border-t border-white/5">
        Built with MERN + Socket.IO · SketchSync © 2026
      </footer>
    </div>
  );
}
