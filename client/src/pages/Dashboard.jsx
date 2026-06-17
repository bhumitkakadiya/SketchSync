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
import DashboardBackground from '../components/dashboard/DashboardBackground';
import ThemeToggle from '../components/ThemeToggle';
import TiltCard from '../components/ui/TiltCard';
import Logo from '../components/ui/Logo';
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
    <div className="min-h-screen bg-transparent relative overflow-hidden">
      <DashboardBackground />
      {/* Header */}
      <header className="fixed top-0 z-50 w-full bg-white/40 dark:bg-black/40 backdrop-blur-md border-b border-surface-200 dark:border-white/[0.06] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <Logo className="w-8 h-8 text-brand-500 drop-shadow-[0_0_12px_rgba(34,197,94,0.3)] group-hover:scale-105 transition-transform" />
            <span className="text-lg font-bold gradient-text">SketchSync</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              id="profile-btn"
              onClick={() => setShowProfile(true)}
              title="Edit Profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-transparent hover:ring-1 hover:ring-brand-500/40 transition-all cursor-pointer"
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

      <main className="max-w-7xl mx-auto px-6 pt-28 pb-8 relative z-10">
        {/* Welcome */}
        <div className="mb-10 animate-fade-in">
          <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Good {getTimeGreeting()}, <span className="gradient-text">{user?.displayName || user?.username}</span>
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
            <div className="card text-center py-16 animate-fade-in border border-surface-200 border-dashed">
              <svg className="w-16 h-16 mx-auto mb-4 text-surface-300 dark:text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>No rooms yet. Create one to get started!</p>
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
      </main>

      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinRoomModal onClose={() => setShowJoin(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}

function RoomCard({ room, userId, onOpen, onDelete, onReplay }) {
  const isOwner = room.owner?._id?.toString() === userId?.toString() || room.owner?.toString() === userId?.toString();
  const memberCount = room.members?.length || 0;

  return (
    <TiltCard className="h-full">
      <div className="card group hover:border-brand-500/30 hover:shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all duration-300 cursor-pointer flex flex-col gap-4 animate-slide-up p-0 overflow-hidden h-full">
      
      {/* Thumbnail */}
      <div className="w-full h-32 bg-surface-100 relative overflow-hidden flex-shrink-0" onClick={onOpen}>
        <AnimatedRoomBackground room={room} />
        <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full z-20 ${room.isActive ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-gray-500'}`} title={room.isActive ? 'Active session' : 'Offline'} />
      </div>

      <div className="flex flex-col flex-1 px-5 pb-5 pt-1 gap-4">
        <div className="flex items-start justify-between" onClick={onOpen}>
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
        </div>
      </div>

      <div className="flex items-center gap-2 mt-auto px-5 pb-5">
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
    </TiltCard>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

const STUDY_ICONS = [
  // Pencil
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
  // Ruler
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.17 3.22a2.41 2.41 0 00-3.41 0L3.22 17.76a2.41 2.41 0 000 3.41 2.41 2.41 0 003.41 0L21.17 6.63a2.41 2.41 0 000-3.41zM18.8 8.4l-1.4-1.4M15.4 11.8l-1.4-1.4M12 15.2l-1.4-1.4"/></svg>,
  // Compass
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 7l4 12M12 7L8 19M5 16c0 0 3 3 7 3s7-3 7-3"/></svg>,
  // Notebook
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12l-4 4H4V4z"/><path d="M16 16v4"/><path d="M4 8h16"/><path d="M4 12h10"/></svg>,
  // Folder
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  // Palette
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
];

function AnimatedRoomBackground({ room }) {
  // Generate deterministic hash from roomId and name
  const hashStr = String(room?._id || '') + String(room?.name || '');
  const hash = hashStr.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 60) % 360;
  
  const type = Math.abs(hash % 3);
  
  const color1 = `hsla(${hue1}, 80%, 50%, 0.4)`;
  const color2 = `hsla(${hue2}, 80%, 50%, 0.3)`;

  const Icon1 = STUDY_ICONS[Math.abs(hash) % STUDY_ICONS.length];
  const Icon2 = STUDY_ICONS[Math.abs(hash + 1) % STUDY_ICONS.length];
  const Icon3 = STUDY_ICONS[Math.abs(hash + 2) % STUDY_ICONS.length];

  const renderIcons = () => (
    <>
      <div className="absolute -top-4 -right-4 w-20 h-20 text-white/20 dark:text-white/10 rotate-12">{Icon1}</div>
      <div className="absolute -bottom-6 -left-2 w-24 h-24 text-white/20 dark:text-white/10 -rotate-45">{Icon2}</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-white/20 dark:text-white/10 rotate-[30deg]">{Icon3}</div>
    </>
  );

  if (type === 0) {
    return (
      <div className="w-full h-full relative overflow-hidden bg-surface-200">
        <div className="absolute w-[200%] h-[200%] -top-[50%] -left-[50%]" style={{ background: `radial-gradient(circle, ${color1} 0%, transparent 60%)`, animation: `spin ${10 + (Math.abs(hash) % 15)}s linear infinite` }} />
        <div className="absolute w-[150%] h-[150%] -bottom-[25%] -right-[25%]" style={{ background: `radial-gradient(circle, ${color2} 0%, transparent 60%)`, animation: `spin ${15 + (Math.abs(hash) % 10)}s reverse linear infinite` }} />
        <div className="absolute inset-0 backdrop-blur-[30px]" />
        {renderIcons()}
      </div>
    );
  } else if (type === 1) {
    return (
      <div className="w-full h-full relative overflow-hidden bg-surface-200" style={{ background: `linear-gradient(${Math.abs(hash) % 360}deg, ${color1}, ${color2})` }}>
        <div className="absolute inset-0 bg-pattern-dots opacity-40 mix-blend-overlay" style={{ animation: `pulse ${3 + (Math.abs(hash) % 4)}s cubic-bezier(0.4, 0, 0.6, 1) infinite` }} />
        {renderIcons()}
      </div>
    );
  } else {
    return (
      <div className="w-full h-full relative overflow-hidden bg-surface-200">
        <div className="absolute inset-[-100%]" style={{ backgroundImage: `repeating-conic-gradient(${color1} 0deg 10deg, ${color2} 10deg 20deg)`, animation: `spin ${20 + (Math.abs(hash) % 20)}s linear infinite` }} />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        {renderIcons()}
      </div>
    );
  }
}
