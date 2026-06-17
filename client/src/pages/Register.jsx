import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import InteractiveBackground from '../components/ui/InteractiveBackground';
import Logo from '../components/ui/Logo';
import ThemeToggle from '../components/ThemeToggle';

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authService.register(form);
      setAuth(data.data.user, data.data.accessToken);
      toast.success(`Welcome to SketchSync, ${data.data.user.displayName}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center px-4 py-12 relative">
      <InteractiveBackground />
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3.5 mb-6 group">
            <Logo className="w-14 h-14 text-brand-500 drop-shadow-[0_0_16px_rgba(34,197,94,0.4)] group-hover:scale-105 transition-transform" />
            <span className="text-4xl font-black gradient-text tracking-tight">SketchSync</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Free forever — no credit card needed</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Display Name</label>
            <input
              id="reg-displayname"
              type="text"
              className="input"
              placeholder="Your name"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Username</label>
            <input
              id="reg-username"
              type="text"
              className="input"
              placeholder="coolartist"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              minLength={3}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              id="reg-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              id="reg-password"
              type="password"
              className="input"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <button
            id="reg-submit"
            type="submit"
            className="btn-primary w-full mt-2"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Creating account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
