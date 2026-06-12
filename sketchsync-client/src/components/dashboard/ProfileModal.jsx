import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

const CURSOR_COLORS = [
  '#6366F1', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4',
  '#84CC16', '#F97316',
];

export default function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    avatarUrl: user?.avatarUrl || '',
    cursorColor: user?.cursorColor || '#6366F1',
  });

  useEffect(() => {
    setForm({
      displayName: user?.displayName || '',
      avatarUrl: user?.avatarUrl || '',
      cursorColor: user?.cursorColor || '#6366F1',
    });
  }, [user]);

  const mutation = useMutation({
    mutationFn: () => authService.updateProfile(form),
    onSuccess: (res) => {
      updateUser(res.data.data.user);
      toast.success('Profile updated!');
      onClose();
    },
    onError: () => toast.error('Failed to update profile'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md card animate-slide-up" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Edit Profile</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Avatar Preview */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-glow-sm mb-3 overflow-hidden"
            style={{ backgroundColor: form.cursorColor }}
          >
            {form.avatarUrl ? (
              <img src={form.avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; }} />
            ) : (
              (form.displayName || user?.username || '?')[0].toUpperCase()
            )}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Avatar preview</p>
        </div>

        <div className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="label">Display Name</label>
            <input
              className="input"
              value={form.displayName}
              onChange={(e) => setForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="Your display name"
              maxLength={40}
            />
          </div>

          {/* Avatar URL */}
          <div>
            <label className="label">Avatar URL <span className="text-xs opacity-60">(optional)</span></label>
            <input
              className="input"
              value={form.avatarUrl}
              onChange={(e) => setForm(f => ({ ...f, avatarUrl: e.target.value }))}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          {/* Cursor Color */}
          <div>
            <label className="label">Cursor & Avatar Color</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CURSOR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, cursorColor: c }))}
                  className="w-8 h-8 rounded-full transition-all duration-150 hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: form.cursorColor === c ? `3px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    boxShadow: form.cursorColor === c ? `0 0 10px ${c}80` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Info row */}
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-input)' }}>
            <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Username: <span className="font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>@{user?.username}</span>
              &nbsp;·&nbsp;Email: <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{user?.email}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.displayName.trim()}
            className="btn-primary flex-1"
          >
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
