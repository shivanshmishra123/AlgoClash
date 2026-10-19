import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile } from '../api/users';
import { getSeriesList } from '../api/series';
import { getProblems } from '../api/problems';
import type { UserProfileResponse, SeriesSummaryResponse, ProblemResponse } from '../api/types';
import DifficultyBadge from '../components/DifficultyBadge';
import SeriesCountdown from '../components/SeriesCountdown';
import { MatchmakingModal } from '../components/MatchmakingModal';

export const DashboardPage: React.FC = () => {
  const { username } = useAuth();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [activeSeries, setActiveSeries] = useState<SeriesSummaryResponse[]>([]);
  const [problems, setProblems] = useState<ProblemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchmakingOpen, setMatchmakingOpen] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        if (username) {
          const profileData = await getUserProfile(username);
          setProfile(profileData);
        }
        const seriesPage = await getSeriesList(0, 3);
        setActiveSeries(seriesPage.content || []);

        const problemList = await getProblems();
        setProblems(problemList.slice(0, 5));
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] font-mono text-cyan-400">
        <span className="w-3 h-3 rounded-full bg-[#00ffcc] animate-ping mr-3" />
        LOADING MISSION CONTROL TELEMETRY...
      </div>
    );
  }

  return (
    <div className="space-y-8 font-mono">
      {/* Top HUD Operative Banner */}
      <div className="p-6 rounded-lg bg-slate-950 border border-cyan-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">
              MISSION CONTROL // OPERATIVE STATUS
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <span>{profile?.username || username}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                CLEARANCE ACTIVE
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Registered identity: {profile?.email || 'Encrypted uplink'}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">ELO RATING</div>
              <div className="text-xl font-bold text-[#00ffcc] drop-shadow-[0_0_8px_rgba(0,255,204,0.4)]">
                {profile?.rating ?? 1000}
              </div>
            </div>
            <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">VICTORIES</div>
              <div className="text-xl font-bold text-emerald-400">
                {profile?.wins ?? 0}
              </div>
            </div>
            <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">DEFEATS</div>
              <div className="text-xl font-bold text-rose-400">
                {profile?.losses ?? 0}
              </div>
            </div>
            <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">WIN RATE</div>
              <div className="text-xl font-bold text-amber-400">
                {profile?.winRate ?? 0}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launch CTA Bar */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-950/40 via-slate-950 to-slate-950 border border-cyan-700/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00ffcc] animate-pulse" />
            RANKED 1V1 MATCHMAKING
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Queue up to duel another active operative matched within ±100 of your current rating ({profile?.rating ?? 1000} Elo).
          </div>
        </div>
        <button
          onClick={() => setMatchmakingOpen(true)}
          className="whitespace-nowrap px-5 py-2.5 rounded bg-gradient-to-r from-cyan-400 via-[#00ffcc] to-emerald-400 text-black font-extrabold text-xs tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,204,0.4)]"
        >
          ⚔️ FIND 1V1 MATCH
        </button>
      </div>

      {/* Grid: Tournaments & Problems */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Tournaments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[#00ffcc]" />
              ACTIVE TOURNAMENT SERIES
            </h2>
            <Link to="/series" className="text-xs text-[#00ffcc] hover:underline">
              VIEW ALL →
            </Link>
          </div>

          <div className="space-y-3">
            {activeSeries.length === 0 ? (
              <div className="p-6 rounded bg-slate-950/60 border border-slate-900 text-center text-xs text-slate-500">
                No active tournament series. Create one from the admin console.
              </div>
            ) : (
              activeSeries.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded bg-slate-950 border border-slate-800/80 hover:border-cyan-500/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <Link
                      to={`/series/${s.id}`}
                      className="text-sm font-bold text-white hover:text-cyan-300 transition-colors"
                    >
                      {s.name}
                    </Link>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span>ROSTER: {s.joinedCount} / {s.size}</span>
                      <span>•</span>
                      <span>ROUND: {s.currentRound}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {s.startsAt && <SeriesCountdown startsAt={s.startsAt} />}
                    <Link
                      to={`/series/${s.id}`}
                      className="text-xs px-3 py-1.5 rounded border border-cyan-800 text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 transition-colors"
                    >
                      DETAILS
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Problem Repository */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[#00ffcc]" />
              FEATURED ALGORITHMS
            </h2>
            <Link to="/problems" className="text-xs text-[#00ffcc] hover:underline">
              BROWSE CATALOG →
            </Link>
          </div>

          <div className="space-y-3">
            {problems.length === 0 ? (
              <div className="p-6 rounded bg-slate-950/60 border border-slate-900 text-center text-xs text-slate-500">
                No problems authored yet.
              </div>
            ) : (
              problems.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/problems/${p.id}`}
                      className="text-xs sm:text-sm font-bold text-white hover:text-cyan-300 truncate block transition-colors"
                    >
                      {p.title}
                    </Link>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Limit: {p.timeLimitMillis}ms // {p.memoryLimitMb}MB
                    </div>
                  </div>
                  <DifficultyBadge difficulty={p.difficulty} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Matches Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-3 bg-[#00ffcc]" />
          RECENT COMBAT ENGAGEMENTS
        </h2>

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-normal">MATCH ID</th>
                <th className="py-3 px-4 font-normal">SERIES</th>
                <th className="py-3 px-4 font-normal">ROUND</th>
                <th className="py-3 px-4 font-normal">OPPONENT</th>
                <th className="py-3 px-4 font-normal">RESULT</th>
                <th className="py-3 px-4 font-normal text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {profile?.recentMatches && profile.recentMatches.length > 0 ? (
                profile.recentMatches.map((m) => (
                  <tr key={m.matchId} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-cyan-400">#{m.matchId}</td>
                    <td className="py-3 px-4 text-slate-200">{m.seriesName || 'Standard Duel'}</td>
                    <td className="py-3 px-4 text-slate-400">Round {m.round}</td>
                    <td className="py-3 px-4 text-slate-300 font-semibold">{m.opponentUsername}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.result === 'WIN'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : m.result === 'LOSS'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {m.result}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/match/${m.matchId}`}
                        className="text-xs px-2.5 py-1 rounded border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500"
                      >
                        ENTER ARENA
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No recent combat engagements recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MatchmakingModal
        isOpen={matchmakingOpen}
        onClose={() => setMatchmakingOpen(false)}
      />
    </div>
  );
};

export default DashboardPage;

