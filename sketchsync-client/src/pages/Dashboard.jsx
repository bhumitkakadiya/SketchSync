import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { roomService } from '../services/roomService';
import { authService } from '../services/authService';
import CreateRoomModal from '../components/room/CreateRoomModal';
import JoinRoomModal from '../components/room/JoinRoomModal';
import RecentSessions from '../components/dashboard/RecentSessions';
import ProfileModal from '../components/dashboard/ProfileModal';
import ThemeToggle from '../components/ThemeToggle';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, clearAuth } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomService.list().then((r) => r.data.data.rooms),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => roomService.delete(id),
    onSuccess: () => { qc.invalidateQueries(['rooms']); toast.success('Room deleted'); },
    onError: () => toast.error('Failed to delete room'),
  });

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    clearAuth();
    navigate('/');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Background */}
      <div className="fixed top-0 right-0 w-[500px] h-[400px] bg-brand-600/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-20 glass-dark border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="SketchSync" className="w-8 h-8 rounded-xl shadow-glow-brand object-cover" />
            <span className="text-lg font-bold gradient-text">SketchSync</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              id="profile-btn"
              onClick={() => setShowProfile(true)}
              title="Edit Profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass hover:ring-1 hover:ring-brand-500/40 transition-all cursor-pointer"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                style={{ backgroundColor: user?.cursorColor || '#6366f1' }}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; }} />
                ) : (
                  (user?.displayName || user?.username || '?')[0].toUpperCase()
                )}
              </div>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.displayName || user?.username}</span>
              <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13h6m-3-3v6M3 21l18-18" />
              </svg>
            </button>
            <button id="logout-btn" onClick={handleLogout} className="btn-ghost hover:text-red-400" title="Logout">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-10 animate-fade-in">
          <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Good {getTimeGreeting()}, <span className="gradient-text">{user?.displayName || user?.username}</span> 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Your collaborative workspaces are ready.</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-10 flex-wrap animate-slide-up">
          <button id="create-room-btn" onClick={() => setShowCreate(true)} className="btn-primary gap-2.5 px-6 py-3">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Room
          </button>
          <button id="join-room-btn" onClick={() => setShowJoin(true)} className="btn-secondary gap-2.5 px-6 py-3">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7h3a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l4 4 4-4M12 3v13" />
            </svg>
            Join by Code
          </button>
        </div>

        {/* Rooms grid */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>My Rooms</h2>
            <span className="badge bg-brand-500/20 text-brand-500 dark:text-brand-400">{roomsData?.length || 0} rooms</span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card h-40 animate-pulse bg-surface-100" />
              ))}
            </div>
          ) : roomsData?.length === 0 ? (
            <div className="card text-center py-16 animate-fade-in">
              <div className="text-5xl mb-4">🎨</div>
              <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>No rooms yet. Create one to get started!</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
                Create Your First Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roomsData?.map((room) => (
                <RoomCard
                  key={room._id}
                  room={room}
                  userId={user?._id}
                  onOpen={() => navigate(`/room/${room._id}`)}
                  onDelete={() => {
                    if (confirm('Delete this room and all its data?')) deleteMutation.mutate(room._id);
                  }}
                  onReplay={() => navigate(`/room/${room._id}?tab=replay`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Recent sessions */}
        {roomsData?.length > 0 && (
          <section className="mt-12">
            <RecentSessions rooms={roomsData} />
          </section>
        )}
      </div>

      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinRoomModal onClose={() => setShowJoin(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}

function RoomCard({ room, userId, onOpen, onDelete, onReplay }) {
  const isOwner = room.owner?._id === userId || room.owner === userId;
  const memberCount = room.members?.length || 0;

  return (
    <div className="card group hover:border-brand-500/30 hover:shadow-glow-sm transition-all duration-300 cursor-pointer flex flex-col gap-4 animate-slide-up">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>{room.name}</h3>
            {isOwner && <span className="badge bg-brand-500/20 text-brand-500 dark:text-brand-400 text-[10px]">Owner</span>}
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg-hover)' }}>{room.code}</span>
            <span>{memberCount}/{room.maxMembers} members</span>
          </div>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${room.isActive ? 'bg-green-400' : 'bg-gray-500'}`} />
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <button id={`open-room-${room._id}`} onClick={onOpen} className="btn-primary flex-1 py-2 text-sm">
          Open Room
        </button>
        <button id={`replay-room-${room._id}`} onClick={onReplay} className="btn-secondary px-3 py-2" title="View Replays">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        {isOwner && (
          <button id={`delete-room-${room._id}`} onClick={onDelete} className="btn-danger px-3 py-2" title="Delete Room">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
