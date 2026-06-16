import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { replayService } from '../../services/replayService';
import TiltCard from '../ui/TiltCard';

export default function RecentSessions({ rooms }) {
  const navigate = useNavigate();
  const roomId = rooms?.[0]?._id;

  const { data } = useQuery({
    queryKey: ['sessions', roomId],
    queryFn: () => replayService.listSessions(roomId).then((r) => r.data.data.sessions),
    enabled: !!roomId,
  });

  if (!data?.length) return null;

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold mb-5" style={{ color: 'var(--text-primary)' }}>Recent Sessions</h2>
      <div className="space-y-3">
        {data.slice(0, 5).map((session) => (
          <TiltCard key={session._id}>
            <div className="card flex items-center justify-between hover:border-brand-500/30 hover:shadow-[0_0_15px_rgba(20,184,166,0.2)] transition-all h-full">
              <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {new Date(session.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}
                {new Date(session.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <span>{session.totalStrokes || 0} strokes</span>
                <span>·</span>
                <span>{session.participants?.length || 0} participants</span>
                {session.duration && <span>· {Math.round(session.duration / 60000)} min</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${session.status === 'active' ? 'bg-green-500/20 text-green-500 dark:text-green-400' : 'bg-gray-500/20 text-gray-500 dark:text-gray-400'}`}>
                {session.status}
              </span>
              {session.isReplayable && (
                <button
                  id={`replay-session-${session._id}`}
                  onClick={() => navigate(`/replay/${session._id}`)}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Replay
                </button>
              )}
              </div>
            </div>
          </TiltCard>
        ))}
      </div>
    </div>
  );
}
