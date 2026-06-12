import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { replayService } from '../../services/replayService';

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
          <div key={session._id} className="card flex items-center justify-between hover:border-brand-500/20 transition-colors">
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
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  ▶ Replay
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
