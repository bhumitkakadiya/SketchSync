import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { roomService } from '../../services/roomService';
import toast from 'react-hot-toast';

export default function CreateRoomModal({ onClose }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', isPublic: false, maxMembers: 20 });

  const mutation = useMutation({
    mutationFn: () => roomService.create(form),
    onSuccess: (res) => {
      qc.invalidateQueries(['rooms']);
      toast.success(`Room "${res.data.data.room.name}" created!`);
      onClose();
      navigate(`/room/${res.data.data.room._id}`);
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to create room'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md card animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create New Room</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-5">
          <div>
            <label className="label">Room Name</label>
            <input
              id="create-room-name"
              type="text"
              className="input"
              placeholder="Design Sprint #3"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Max Members</label>
            <select
              id="create-room-max"
              className="input"
              value={form.maxMembers}
              onChange={(e) => setForm({ ...form, maxMembers: +e.target.value })}
            >
              {[5, 10, 20, 30, 50].map(n => <option key={n} value={n}>{n} members</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-200 border border-white/10">
            <input
              id="create-room-public"
              type="checkbox"
              className="w-4 h-4 rounded accent-brand-500"
              checked={form.isPublic}
              onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
            />
            <div>
              <div className="text-sm font-medium text-white">Public Room</div>
              <div className="text-xs text-gray-500">Anyone with the code can join</div>
            </div>
          </div>

          <button
            id="create-room-submit"
            type="submit"
            className="btn-primary w-full py-3"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating...' : 'Create Room'}
          </button>
        </form>
      </div>
    </div>
  );
}
