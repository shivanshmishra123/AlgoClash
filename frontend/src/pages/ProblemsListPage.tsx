import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProblems } from '../api/problems';
import type { ProblemResponse, Difficulty } from '../api/types';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { useAuth } from '../auth/AuthContext';

export const ProblemsListPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [problems, setProblems] = useState<ProblemResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'ALL'>('ALL');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    getProblems()
      .then((data) => setProblems(data))
      .catch((err) => console.error('Failed to load challenges:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = problems.filter((p) => {
    const matchesDiff = filterDifficulty === 'ALL' || p.difficulty === filterDifficulty;
    const matchesSearch =
      search.trim() === '' ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchesDiff && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-16 font-mono">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl bg-slate-900/60 border border-slate-800 p-6 md:p-8 backdrop-blur shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-500"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] px-2.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 font-bold uppercase">
              SECTOR CHALLENGE VAULT
            </span>

            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              ALGORITHMIC CHALLENGES
            </h1>

            <p className="text-xs text-slate-400 max-w-xl">
              Inspect problem specifications, resource constraints, and algorithmic scenarios evaluated in the Judge0 sandbox.
            </p>
          </div>

          {isAdmin && (
            <Link
              to="/admin/problems"
              className="px-5 py-2.5 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              + AUTHOR NEW CHALLENGE
            </Link>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter challenges by title or keyword..."
            className="flex-1 px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition"
          />

          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            {(['ALL', 'EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setFilterDifficulty(diff)}
                className={`px-3 py-2 text-[11px] font-bold transition ${
                  filterDifficulty === diff
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Problem Cards Grid */}
      <div className="rounded-xl bg-slate-900/50 border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            RETRIEVING CHALLENGE SPECIFICATIONS...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            NO CHALLENGES MATCH YOUR SEARCH QUERY.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-slate-950/40 text-slate-500 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">IDENTIFIER</th>
                  <th className="py-3.5 px-4">CHALLENGE</th>
                  <th className="py-3.5 px-4">DIFFICULTY</th>
                  <th className="py-3.5 px-4">CONSTRAINTS</th>
                  <th className="py-3.5 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 text-slate-500 font-bold">
                      #PROB-{p.id}
                    </td>

                    <td className="py-3.5 px-4">
                      <Link
                        to={`/problems/${p.id}`}
                        className="font-bold text-slate-200 hover:text-cyan-400 transition"
                      >
                        {p.title}
                      </Link>
                      <div className="text-[11px] text-slate-500 truncate max-w-md mt-0.5">
                        {p.description}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <DifficultyBadge difficulty={p.difficulty} />
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {p.timeLimitMillis} ms | {p.memoryLimitMb} MB
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/problems/${p.id}`}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-cyan-400 hover:text-cyan-300 transition"
                      >
                        <span>VIEW SPEC</span>
                        <span>→</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemsListPage;
