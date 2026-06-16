import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { roomService } from '../../services/roomService';
import toast from 'react-hot-toast';

export default function JoinRoomModal({ onClose }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [code, setCode] = useState('');

  const mutation = useMutation({
    mutationFn: () => roomService.join(code.toUpperCase()),
    onSuccess: (res) => {
      qc.invalidateQueries(['rooms']);
      toast.success(`Joined "${res.data.data.room.name}"!`);
      onClose();
      navigate(`/room/${res.data.data.room._id}`);
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Invalid room code'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm card animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Join a Room</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-5">
          <div>
            <label className="label">Room Code</label>
            <input
              id="join-room-code"
              type="text"
              className="input font-mono text-center text-2xl tracking-[0.5em] uppercase"
              placeholder="ABCD12"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              maxLength={6}
              required
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2 text-center">Enter the 6-character code from your teammate</p>
          </div>

          <button
            id="join-room-submit"
            type="submit"
            className="btn-primary w-full py-3"
            disabled={mutation.isPending || code.length < 6}
          >
            {mutation.isPending ? 'Joining...' : 'Join Room'}
          </button>
        </form>
      </div>
    </div>
  );
}
