import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSeriesDetail, joinSeries } from '../api/series';
import type { SeriesDetailResponse, RoundDto, MatchSummaryDto } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { SeriesCountdown } from '../components/SeriesCountdown';

export const SeriesDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { username, isAuthenticated } = useAuth();

  const [series, setSeries] = useState<SeriesDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'bracket' | 'roster'>('bracket');

  const fetchSeries = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getSeriesDetail(Number(id));
      setSeries(data);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to load series details:', err);
      setError('Failed to synchronize series matrix data from the central grid.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSeries();
    // Poll every 10 seconds for live tournament state updates
    const interval = setInterval(fetchSeries, 10000);
    return () => clearInterval(interval);
  }, [fetchSeries]);

  const handleJoin = async () => {
    if (!id) return;
    setJoining(true);
    setError(null);
    try {
      const updated = await joinSeries(Number(id));
      setSeries(updated);
    } catch (err: unknown) {
      console.error('Failed to enlist in series:', err);
      const msg = err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
        ? (err as { response?: { data?: { message?: string } } }).response!.data!.message!
        : 'Failed to enlist in tournament series. Verify registration eligibility.';
      setError(msg);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono text-cyan-400 text-sm tracking-widest uppercase animate-pulse">
          Syncing Tournament Bracket Grid...
        </p>
      </div>
    );
  }

  if (error && !series) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-6 rounded-lg bg-red-950/20 border border-red-500/40 text-red-400">
        <h2 className="font-mono text-lg font-bold mb-2">TELEMETRY ERROR</h2>
        <p className="font-mono text-sm mb-4">{error}</p>
        <Link
          to="/series"
          className="inline-flex items-center gap-2 font-mono text-xs px-4 py-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-400 transition"
        >
          ← RETURN TO SERIES HUB
        </Link>
      </div>
    );
  }

  if (!series) return null;

  const isEnlisted = username ? series.participants.some((p) => p.username === username) : false;
  const isFull = series.participants.length >= series.size;
  const canJoin = isAuthenticated && series.status === 'REGISTRATION_OPEN' && !isEnlisted && !isFull;

  // Derive round titles helper
  const getRoundLabel = (roundNumber: number, totalRounds: number): string => {
    const diff = totalRounds - roundNumber;
    if (diff === 0) return 'GRAND FINALS';
    if (diff === 1) return 'SEMIFINALS';
    if (diff === 2) return 'QUARTERFINALS';
    return `ROUND ${roundNumber}`;
  };

  const totalCalculatedRounds = Math.max(1, Math.round(Math.log2(series.size || 8)));

  // Find champion if tournament completed
  const finalRound = series.rounds?.find((r) => r.roundNumber === totalCalculatedRounds) || series.rounds?.[series.rounds.length - 1];
  const finalMatch = finalRound?.matches?.[0];
  const championUsername = series.status === 'COMPLETED' ? finalMatch?.winnerUsername : null;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/series"
          className="inline-flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded bg-slate-900/80 border border-slate-700/80 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/60 transition"
        >
          <span>←</span>
          <span>RETURN TO SERIES ROSTER</span>
        </Link>
        <button
          onClick={() => {
            setLoading(true);
            fetchSeries();
          }}
          className="font-mono text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition"
        >
          <span>↻</span>
          <span>REFRESH MATRIX</span>
        </button>
      </div>

      {/* Series Hero Panel */}
      <div className="relative overflow-hidden rounded-xl bg-slate-900/60 border border-slate-800 p-6 md:p-8 backdrop-blur shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                #SERIES-{series.id}
              </span>

              {/* Status Badge */}
              <span
                className={`font-mono text-xs font-semibold px-2.5 py-0.5 rounded border ${series.status === 'REGISTRATION_OPEN'
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                  : series.status === 'ONGOING'
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400 animate-pulse'
                    : series.status === 'COMPLETED'
                      ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
              >
                {series.status.replace('_', ' ')}
              </span>

              {/* Kickoff countdown */}
              {series.startsAt && series.status === 'REGISTRATION_OPEN' && (
                <SeriesCountdown startsAt={series.startsAt} />
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white font-mono">
              {series.name}
            </h1>

            <p className="font-mono text-xs text-slate-400 flex items-center gap-2">
              <span className="text-cyan-400">BRACKET ARCHITECTURE:</span> Single Elimination Matrix | Size: {series.size} Operatives
            </p>
          </div>

          {/* Action / Enrollment Box */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-8">
            <div className="space-y-1.5 font-mono text-center sm:text-left">
              <div className="text-xs text-slate-400 uppercase tracking-wider">
                Operative Slots
              </div>
              <div className="text-2xl font-bold text-white flex items-baseline gap-1.5 justify-center sm:justify-start">
                <span className="text-cyan-400">{series.participants.length}</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-400">{series.size}</span>
              </div>
              <div className="w-36 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (series.participants.length / series.size) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-2 sm:pt-0">
              {isEnlisted ? (
                <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-mono text-xs font-semibold bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  ENLISTED & READY
                </div>
              ) : canJoin ? (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-mono text-xs font-bold tracking-wider uppercase bg-cyan-500 text-slate-950 hover:bg-cyan-400 active:scale-95 transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {joining ? 'ENLISTING...' : 'ENLIST IN PROTOCOL'}
                </button>
              ) : isFull && series.status === 'REGISTRATION_OPEN' ? (
                <div className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-mono text-xs bg-slate-800/80 border border-slate-700 text-slate-500">
                  GRID CAPACITY REACHED
                </div>
              ) : !isAuthenticated ? (
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-mono text-xs font-bold bg-slate-800 border border-slate-700 text-cyan-400 hover:border-cyan-500 transition"
                >
                  AUTHENTICATE TO ENLIST
                </Link>
              ) : (
                <div className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-mono text-xs bg-slate-800/80 border border-slate-700 text-slate-500">
                  REGISTRATION CLOSED
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded bg-red-950/40 border border-red-500/40 font-mono text-xs text-red-400">
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Champion Winner Banner (If tournament concluded) */}
      {championUsername && (
        <div className="rounded-xl p-6 bg-gradient-to-r from-amber-950/40 via-cyan-950/30 to-amber-950/40 border border-amber-500/50 shadow-2xl text-center relative overflow-hidden">
          <div className="font-mono text-xs text-amber-400 tracking-widest uppercase mb-1">
            ★ TOURNAMENT VICTOR DECLARED ★
          </div>
          <div className="font-mono text-3xl font-black text-amber-300 flex items-center justify-center gap-3">
            <span>🏆</span>
            <Link to={`/profile/${championUsername}`} className="hover:underline hover:text-white transition">
              {championUsername}
            </Link>
            <span>🏆</span>
          </div>
          <p className="font-mono text-xs text-slate-400 mt-2">
            Victor awarded tournament championship clearance and combat Elo acclaim.
          </p>
        </div>
      )}

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-800 font-mono text-sm">
        <button
          onClick={() => setActiveTab('bracket')}
          className={`px-6 py-3 font-semibold border-b-2 transition ${activeTab === 'bracket'
            ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
            : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
        >
          BRACKET MATRIX
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-6 py-3 font-semibold border-b-2 transition ${activeTab === 'roster'
            ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
            : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
        >
          OPERATIVE ROSTER ({series.participants.length})
        </button>
      </div>

      {/* Tab 1: Bracket Visualizer */}
      {activeTab === 'bracket' && (
        <div className="space-y-6">
          {!series.rounds || series.rounds.length === 0 ? (
            <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-mono text-xl">
                ⚙
              </div>
              <h3 className="font-mono text-base font-bold text-slate-300 mb-1">
                BRACKET COMPILATION PENDING
              </h3>
              <p className="font-mono text-xs text-slate-500 max-w-md mx-auto">
                The single-elimination tournament pairing matrix will materialize automatically as soon as registration closes and the series kicks off.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-6">
              <div className="flex items-start gap-8 min-w-[760px] py-2">
                {series.rounds.map((round: RoundDto) => {
                  const roundLabel = getRoundLabel(round.roundNumber, totalCalculatedRounds);
                  return (
                    <div
                      key={round.roundNumber}
                      className="flex-1 min-w-[280px] max-w-[340px] flex flex-col space-y-4"
                    >
                      {/* Round Header */}
                      <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
                        <div className="font-mono text-xs font-bold text-cyan-400 tracking-wider">
                          {roundLabel}
                        </div>
                        {round.problemTitle && (
                          <div className="font-mono text-[11px] text-slate-400 truncate mt-1">
                            PROBLEM: <span className="text-slate-300">{round.problemTitle}</span>
                          </div>
                        )}
                      </div>

                      {/* Matches in Round */}
                      <div className="space-y-6 flex-1 flex flex-col justify-around">
                        {round.matches.map((match: MatchSummaryDto) => (
                          <MatchCard key={match.id} match={match} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Operative Roster */}
      {activeTab === 'roster' && (
        <div className="rounded-xl bg-slate-900/50 border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold tracking-wider text-slate-300 uppercase">
              CONFIRMED GRID OPERATIVES
            </h3>
            <span className="font-mono text-xs text-cyan-400">
              {series.participants.length} OF {series.size} SLOTS OCCUPIED
            </span>
          </div>

          <div className="divide-y divide-slate-800/60 font-mono text-xs">
            {series.participants.map((p, idx) => (
              <div
                key={p.id}
                className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-bold">
                    #{idx + 1}
                  </span>
                  <Link
                    to={`/profile/${p.username}`}
                    className="font-bold text-slate-200 hover:text-cyan-400 transition"
                  >
                    {p.username}
                  </Link>
                  {p.username === username && (
                    <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-[10px] text-cyan-400">
                      YOU
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-slate-400">
                    ELO <span className="font-bold text-amber-400">{p.rating}</span>
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
              </div>
            ))}

            {/* Empty Slots */}
            {Array.from({ length: Math.max(0, series.size - series.participants.length) }).map(
              (_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="p-4 flex items-center justify-between text-slate-600 bg-slate-950/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-slate-900 text-slate-700 flex items-center justify-center text-[10px]">
                      #{series.participants.length + idx + 1}
                    </span>
                    <span className="italic">[VACANT OPERATIVE SLOT]</span>
                  </div>
                  <span className="text-[11px] text-slate-700">STANDBY FOR ENLISTMENT</span>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Bracket Match Card Component
const MatchCard: React.FC<{ match: MatchSummaryDto }> = ({ match }) => {
  const isOngoing = match.state === 'ONGOING';
  const isCompleted = match.state === 'COMPLETED';

  return (
    <div
      className={`rounded-lg p-3.5 bg-slate-900/90 border transition-all duration-200 ${isOngoing
        ? 'border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
        : isCompleted
          ? 'border-slate-700/60'
          : 'border-slate-800/80 opacity-80'
        }`}
    >
      <div className="flex items-center justify-between text-[10px] font-mono mb-2.5 pb-1.5 border-b border-slate-800">
        <span className="text-slate-500 font-semibold">MATCH #{match.id}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isOngoing
            ? 'bg-cyan-950/80 text-cyan-400 animate-pulse border border-cyan-600/40'
            : isCompleted
              ? 'bg-slate-800 text-emerald-400'
              : 'bg-slate-800 text-slate-500'
            }`}
        >
          {match.state}
        </span>
      </div>

      {/* Player 1 Row */}
      <div
        className={`flex items-center justify-between py-1.5 px-2 rounded mb-1 text-xs font-mono ${match.winnerId === match.player1Id && match.player1Id
          ? 'bg-emerald-950/30 text-emerald-300 font-bold border border-emerald-500/30'
          : match.player1Username
            ? 'text-slate-200'
            : 'text-slate-600 italic'
          }`}
      >
        <span className="truncate max-w-[140px]">
          {match.player1Username || 'TBD'}
        </span>
        {match.winnerId === match.player1Id && match.player1Id ? (
          <span className="text-emerald-400 text-xs">🏆 WINNER</span>
        ) : null}
      </div>

      {/* VS separator */}
      <div className="text-center font-mono text-[9px] text-slate-600 my-0.5">VS</div>

      {/* Player 2 Row */}
      <div
        className={`flex items-center justify-between py-1.5 px-2 rounded text-xs font-mono ${match.winnerId === match.player2Id && match.player2Id
          ? 'bg-emerald-950/30 text-emerald-300 font-bold border border-emerald-500/30'
          : match.player2Username
            ? 'text-slate-200'
            : 'text-slate-600 italic'
          }`}
      >
        <span className="truncate max-w-[140px]">
          {match.player2Username || 'TBD'}
        </span>
        {match.winnerId === match.player2Id && match.player2Id ? (
          <span className="text-emerald-400 text-xs">🏆 WINNER</span>
        ) : null}
      </div>

      {/* Match Actions */}
      <div className="mt-3 pt-2 border-t border-slate-800/80">
        {isOngoing ? (
          <Link
            to={`/match/${match.id}`}
            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded font-mono text-[11px] font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition"
          >
            <span>ENTER ARENA</span>
            <span>→</span>
          </Link>
        ) : isCompleted ? (
          <Link
            to={`/match/${match.id}`}
            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded font-mono text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <span>REVIEW COMBAT</span>
            <span>→</span>
          </Link>
        ) : (
          <div className="w-full py-1 text-center font-mono text-[10px] text-slate-600">
            AWAITING KICKOFF
          </div>
        )}
      </div>
    </div>
  );
};

export default SeriesDetailPage;
