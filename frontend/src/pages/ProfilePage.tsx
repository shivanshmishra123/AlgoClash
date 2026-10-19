import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserProfile } from '../api/users';
import type { UserProfileResponse } from '../api/types';
import { useAuth } from '../auth/AuthContext';

export const ProfilePage: React.FC = () => {
  const { username: paramUsername } = useParams<{ username: string }>();
  const { username: currentAuthUsername } = useAuth();

  const targetUsername = paramUsername || currentAuthUsername;

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetUsername) {
      setError('No operative specified or currently authenticated.');
      setLoading(false);
      return;
    }

    setLoading(true);
    getUserProfile(targetUsername)
      .then((data) => {
        setProfile(data);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to load operative profile:', err);
        setError(`Failed to locate operative records for "${targetUsername}".`);
      })
      .finally(() => setLoading(false));
  }, [targetUsername]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono text-cyan-400 text-sm tracking-widest uppercase animate-pulse">
          Retrieving Operative Dossier...
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 rounded-lg bg-red-950/20 border border-red-500/40 text-red-400 font-mono">
        <h2 className="text-lg font-bold mb-2">OPERATIVE NOT FOUND</h2>
        <p className="text-sm mb-4">{error || 'Could not retrieve profile telemetry.'}</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-400 transition"
        >
          ← RETURN TO DASHBOARD
        </Link>
      </div>
    );
  }

  const isSelf = currentAuthUsername === profile.username;
  const totalMatches = profile.wins + profile.losses;

  // Determine Operative Rank Tier
  const getRankTier = (rating: number) => {
    if (rating >= 1500) return { title: 'CYBER TITAN', color: 'text-amber-400 border-amber-500/50 bg-amber-950/40' };
    if (rating >= 1300) return { title: 'SENTINEL', color: 'text-purple-400 border-purple-500/50 bg-purple-950/40' };
    if (rating >= 1100) return { title: 'OPERATIVE', color: 'text-cyan-400 border-cyan-500/50 bg-cyan-950/40' };
    return { title: 'INITIATE', color: 'text-slate-400 border-slate-700 bg-slate-900/60' };
  };

  const rank = getRankTier(profile.rating);

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner / Hero Card */}
      <div className="relative overflow-hidden rounded-xl bg-slate-900/60 border border-slate-800 p-6 md:p-8 backdrop-blur shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-500"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar Crest */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-600/20 border-2 border-cyan-500/40 flex items-center justify-center font-mono text-3xl font-black text-cyan-300 shadow-lg shadow-cyan-950/50">
                {profile.username.substring(0, 2).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-slate-900 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-slate-950"></span>
              </div>
            </div>

            {/* Operative Info */}
            <div className="space-y-1.5 font-mono">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  {profile.username}
                </h1>
                {isSelf && (
                  <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-[10px] text-cyan-400 font-bold">
                    SELF
                  </span>
                )}
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 font-bold uppercase">
                  {profile.role || 'USER'}
                </span>
              </div>

              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                <span>OPERATIVE ID: #{profile.id.toString().padStart(4, '0')}</span>
                <span>•</span>
                <span>
                  ENLISTED:{' '}
                  {profile.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'RECORD CLASSIFIED'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            {isSelf ? (
              <Link
                to="/series"
                className="px-4 py-2 rounded-lg font-mono text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/20"
              >
                JOIN TOURNAMENT →
              </Link>
            ) : (
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-lg font-mono text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/20"
              >
                CHALLENGE TO DUEL
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Dossier Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* Rating Card */}
        <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>COMBAT RATING</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${rank.color}`}>
              {rank.title}
            </span>
          </div>
          <div className="text-3xl font-black text-amber-400 tracking-tight">
            {profile.rating}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Base rating 1000 • Dynamic Elo calibration
          </div>
        </div>

        {/* Victories Card */}
        <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition">
          <div className="text-xs text-slate-400 mb-2">VICTORIES</div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight">
            {profile.wins}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Outscored rival operatives in live combat
          </div>
        </div>

        {/* Casualties / Losses Card */}
        <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition">
          <div className="text-xs text-slate-400 mb-2">CASUALTIES / LOSSES</div>
          <div className="text-3xl font-black text-rose-400 tracking-tight">
            {profile.losses}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Defeats logged in grid arena
          </div>
        </div>

        {/* Win Rate Card */}
        <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>EFFECTIVENESS</span>
            <span className="text-[10px] text-slate-500">{totalMatches} MATCHES</span>
          </div>
          <div className="text-3xl font-black text-cyan-400 tracking-tight">
            {profile.winRate.toFixed(1)}%
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, profile.winRate))}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Combat History Log (Recent 10 Matches) */}
      <div className="rounded-xl bg-slate-900/50 border border-slate-800 overflow-hidden font-mono">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase">
              RECENT COMBAT TELEMETRY (LAST 10 ENGAGEMENTS)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {profile.recentMatches?.length || 0} RECORDS STORED
          </span>
        </div>

        {!profile.recentMatches || profile.recentMatches.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm mb-2">NO COMBAT RECORDS FOUND IN DOSSIER</p>
            <p className="text-xs text-slate-600">
              Operative has not engaged in any tournament or duel matches yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-slate-950/40 text-slate-500 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">OUTCOME</th>
                  <th className="py-3 px-4">OPPONENT</th>
                  <th className="py-3 px-4">ARENA SECTOR</th>
                  <th className="py-3 px-4">TIMESTAMP</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {profile.recentMatches.map((m) => {
                  const isWin = m.result === 'WIN';
                  const isLoss = m.result === 'LOSS';

                  return (
                    <tr key={m.matchId} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                            isWin
                              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                              : isLoss
                              ? 'bg-rose-950/60 border-rose-500/50 text-rose-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {m.result}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-200">
                        {m.opponentUsername && m.opponentUsername !== 'Unknown' ? (
                          <Link
                            to={`/profile/${m.opponentUsername}`}
                            className="hover:text-cyan-400 transition"
                          >
                            {m.opponentUsername}
                          </Link>
                        ) : (
                          <span className="text-slate-500 italic">UNKNOWN OPERATIVE</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        {m.seriesName ? (
                          <span>
                            {m.seriesName} <span className="text-slate-500">(R{m.round})</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">STANDALONE 1V1 DUEL</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {m.endedAt || m.createdAt
                          ? new Date(m.endedAt || m.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/match/${m.matchId}`}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-cyan-400 hover:text-cyan-300 transition"
                        >
                          <span>VIEW ARENA</span>
                          <span>→</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
