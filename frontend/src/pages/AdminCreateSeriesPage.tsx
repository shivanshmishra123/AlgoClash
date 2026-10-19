import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getProblems } from '../api/problems';
import { createSeries } from '../api/series';
import type { ProblemResponse, CreateSeriesRequest } from '../api/types';
import { DifficultyBadge } from '../components/DifficultyBadge';

export const AdminCreateSeriesPage: React.FC = () => {
  const navigate = useNavigate();

  const [problems, setProblems] = useState<ProblemResponse[]>([]);
  const [loadingProblems, setLoadingProblems] = useState<boolean>(true);

  // Form State
  const [name, setName] = useState<string>('');
  const [size, setSize] = useState<number>(8);
  const [startsAtLocal, setStartsAtLocal] = useState<string>('');
  const [roundProblems, setRoundProblems] = useState<Record<number, number>>({});

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Default kickoff time 30 mins from now formatted for datetime-local
  useEffect(() => {
    const future = new Date(Date.now() + 30 * 60 * 1000);
    // Format YYYY-MM-DDTHH:mm
    const year = future.getFullYear();
    const month = String(future.getMonth() + 1).padStart(2, '0');
    const day = String(future.getDate()).padStart(2, '0');
    const hours = String(future.getHours()).padStart(2, '0');
    const minutes = String(future.getMinutes()).padStart(2, '0');
    setStartsAtLocal(`${year}-${month}-${day}T${hours}:${minutes}`);
  }, []);

  // Fetch problem library
  useEffect(() => {
    getProblems()
      .then((data) => {
        setProblems(data);
        // Pre-select first problems for rounds if available
        if (data.length > 0) {
          const initialMap: Record<number, number> = {};
          const numRounds = Math.round(Math.log2(8));
          for (let r = 1; r <= numRounds; r++) {
            // Assign problem by index, cycling if fewer problems than rounds
            initialMap[r] = data[(r - 1) % data.length].id;
          }
          setRoundProblems(initialMap);
        }
      })
      .catch((err) => {
        console.error('Failed to load problems:', err);
        setError('Failed to load problem library. Ensure backend is running.');
      })
      .finally(() => setLoadingProblems(false));
  }, []);

  // When size changes (8 or 16), update round problems mapping
  const handleSizeChange = (newSize: number) => {
    setSize(newSize);
    const numRounds = Math.round(Math.log2(newSize));
    setRoundProblems((prev) => {
      const updated: Record<number, number> = { ...prev };
      for (let r = 1; r <= numRounds; r++) {
        if (!updated[r] && problems.length > 0) {
          updated[r] = problems[(r - 1) % problems.length].id;
        }
      }
      return updated;
    });
  };

  const handleQuickTime = (minutesAhead: number) => {
    const target = new Date(Date.now() + minutesAhead * 60 * 1000);
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    const hours = String(target.getHours()).padStart(2, '0');
    const minutes = String(target.getMinutes()).padStart(2, '0');
    setStartsAtLocal(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const handleProblemSelect = (roundNumber: number, problemId: number) => {
    setRoundProblems((prev) => ({
      ...prev,
      [roundNumber]: problemId,
    }));
  };

  const totalRounds = Math.max(1, Math.round(Math.log2(size)));

  const getRoundLabel = (roundNumber: number, total: number) => {
    const diff = total - roundNumber;
    if (diff === 0) return 'GRAND FINALS (1 MATCH)';
    if (diff === 1) return 'SEMIFINALS (2 MATCHES)';
    if (diff === 2) return 'QUARTERFINALS (4 MATCHES)';
    if (diff === 3) return 'ROUND OF 16 (8 MATCHES)';
    return `ROUND ${roundNumber}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Tournament series codename is required.');
      return;
    }

    if (!startsAtLocal) {
      setError('Scheduled kickoff datetime is required.');
      return;
    }

    const kickoffDate = new Date(startsAtLocal);
    if (kickoffDate.getTime() <= Date.now()) {
      setError('Kickoff time must be scheduled in the future.');
      return;
    }

    // Verify all rounds have problems mapped
    for (let r = 1; r <= totalRounds; r++) {
      if (!roundProblems[r]) {
        setError(`Please assign a problem for Round ${r}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: CreateSeriesRequest = {
        name: name.trim(),
        size,
        startsAt: kickoffDate.toISOString(),
        roundProblems,
      };

      const created = await createSeries(payload);
      navigate(`/series/${created.id}`);
    } catch (err: unknown) {
      console.error('Failed to create series:', err);
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response?: { data?: { message?: string } } }).response!.data!.message!
          : 'Failed to deploy tournament series. Verify administrative authorization.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 font-mono">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/series"
          className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-400 hover:text-cyan-400 transition"
        >
          ← RETURN TO SERIES HUB
        </Link>
        <span className="text-xs text-amber-400 font-bold">
          ADMIN CLEARANCE: TOURNAMENT ARCHITECT
        </span>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl bg-slate-900/60 border border-slate-800 p-6 md:p-8 backdrop-blur shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-500"></div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-400 font-bold uppercase">
              TOURNAMENT PROTOCOL
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            DEPLOY NEW TOURNAMENT SERIES
          </h1>

          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Configure single-elimination tournament parameters, operative capacity slots, kickoff countdown, and per-round algorithmic challenges.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 text-xs">
          ⚠ {error}
        </div>
      )}

      {/* Main Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-6 space-y-6">
          <h2 className="text-xs font-bold tracking-wider text-slate-300 uppercase border-b border-slate-800 pb-3">
            1. SERIES IDENTIFICATION & SCALE
          </h2>

          {/* Tournament Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Series Codename *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cyber Genesis Invitational 2026"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Scale / Size Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Operative Capacity (Power of 2 Single Elimination) *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleSizeChange(8)}
                className={`p-4 rounded-xl border text-left transition ${
                  size === 8
                    ? 'bg-cyan-950/40 border-cyan-500 text-white ring-1 ring-cyan-500/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-lg font-black text-cyan-400">8 OPERATIVES</div>
                <div className="text-xs text-slate-400 mt-1">
                  3 Total Rounds (Quarterfinals, Semifinals, Grand Final)
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSizeChange(16)}
                className={`p-4 rounded-xl border text-left transition ${
                  size === 16
                    ? 'bg-cyan-950/40 border-cyan-500 text-white ring-1 ring-cyan-500/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-lg font-black text-cyan-400">16 OPERATIVES</div>
                <div className="text-xs text-slate-400 mt-1">
                  4 Total Rounds (Round of 16 through Grand Final)
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Kickoff Scheduling */}
        <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-6 space-y-5">
          <h2 className="text-xs font-bold tracking-wider text-slate-300 uppercase border-b border-slate-800 pb-3">
            2. KICKOFF SCHEDULE (COUNTDOWN)
          </h2>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Registration Deadline & Series Kickoff Time *
              </label>

              {/* Quick Set Buttons */}
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-500">QUICK SET:</span>
                <button
                  type="button"
                  onClick={() => handleQuickTime(15)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  +15M
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTime(60)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  +1H
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTime(1440)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  +24H
                </button>
              </div>
            </div>

            <input
              type="datetime-local"
              required
              value={startsAtLocal}
              onChange={(e) => setStartsAtLocal(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
            />
            <p className="text-[11px] text-slate-500">
              When this timestamp arrives, the automated scheduler closes registration, assigns bracket pairings, and launches Round 1.
            </p>
          </div>
        </div>

        {/* Round Problem Mapping */}
        <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
              3. ROUND PROBLEM ASSIGNMENTS ({totalRounds} ROUNDS)
            </h2>
            <Link
              to="/admin/problems"
              className="text-[11px] text-cyan-400 hover:underline"
            >
              + AUTHOR NEW CHALLENGE
            </Link>
          </div>

          {loadingProblems ? (
            <div className="text-xs text-slate-500 py-4">LOADING CHALLENGE REPOSITORY...</div>
          ) : problems.length === 0 ? (
            <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs">
              ⚠ No challenges registered in database. Please visit the Problem Studio to compose challenges before deploying a tournament.
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from({ length: totalRounds }, (_, i) => i + 1).map((roundNum) => {
                const assignedProblemId = roundProblems[roundNum];
                const selectedProblem = problems.find((p) => p.id === assignedProblemId);

                return (
                  <div
                    key={roundNum}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-xs font-bold text-cyan-400">
                        ROUND {roundNum}: {getRoundLabel(roundNum, totalRounds)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Assigned Challenge: {selectedProblem ? selectedProblem.title : 'Unassigned'}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {selectedProblem && (
                        <DifficultyBadge difficulty={selectedProblem.difficulty} />
                      )}

                      <select
                        value={assignedProblemId || ''}
                        onChange={(e) => handleProblemSelect(roundNum, Number(e.target.value))}
                        className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition min-w-[220px]"
                      >
                        {problems.map((p) => (
                          <option key={p.id} value={p.id}>
                            #{p.id} - {p.title} ({p.difficulty})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Submit Bar */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <Link
            to="/series"
            className="px-5 py-2.5 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition"
          >
            CANCEL
          </Link>

          <button
            type="submit"
            disabled={submitting || problems.length === 0}
            className="px-8 py-2.5 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
          >
            {submitting ? 'DEPLOYING TOURNAMENT SERIES...' : 'INITIALIZE SERIES PROTOCOL →'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminCreateSeriesPage;
