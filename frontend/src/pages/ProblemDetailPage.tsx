import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProblemById } from '../api/problems';
import type { ProblemResponse } from '../api/types';
import { DifficultyBadge } from '../components/DifficultyBadge';

export const ProblemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [problem, setProblem] = useState<ProblemResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'input' | 'output' | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getProblemById(Number(id))
      .then((data) => {
        setProblem(data);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to load challenge:', err);
        setError('Failed to retrieve algorithmic challenge specifications.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const copyToClipboard = (text: string, type: 'input' | 'output') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono text-cyan-400 text-sm tracking-widest uppercase animate-pulse">
          Decoding Problem Specification...
        </p>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 rounded-lg bg-red-950/20 border border-red-500/40 text-red-400 font-mono">
        <h2 className="text-lg font-bold mb-2">CHALLENGE NOT FOUND</h2>
        <p className="text-sm mb-4">{error || 'Could not locate requested problem.'}</p>
        <Link
          to="/dashboard"
          className="text-xs px-4 py-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-400 transition"
        >
          ← RETURN TO DASHBOARD
        </Link>
      </div>
    );
  }

  let testCaseCount = 0;
  try {
    const parsed = JSON.parse(problem.testcasesJson);
    if (Array.isArray(parsed)) testCaseCount = parsed.length;
  } catch {
    testCaseCount = 0;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 font-mono">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition"
        >
          ← RETURN TO DASHBOARD
        </Link>

        <span className="text-xs text-slate-500">
          CHALLENGE IDENTIFIER: #{problem.id}
        </span>
      </div>

      {/* Main Problem Header HUD */}
      <div className="relative overflow-hidden rounded-xl bg-slate-900/60 border border-slate-800 p-6 md:p-8 backdrop-blur shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                #PROB-{problem.id}
              </span>
              <DifficultyBadge difficulty={problem.difficulty} />
              {problem.createdByUsername && (
                <span className="text-[11px] text-slate-500">
                  BY: <span className="text-slate-300 font-bold">{problem.createdByUsername}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {problem.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              LAUNCH 1V1 DUEL →
            </Link>
          </div>
        </div>

        {/* Execution Constraints Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-slate-500 text-[10px] uppercase">TIME LIMIT</div>
            <div className="text-cyan-400 font-bold text-sm mt-0.5">
              {problem.timeLimitMillis} ms
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-slate-500 text-[10px] uppercase">MEMORY LIMIT</div>
            <div className="text-emerald-400 font-bold text-sm mt-0.5">
              {problem.memoryLimitMb} MB
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 col-span-2 sm:col-span-1">
            <div className="text-slate-500 text-[10px] uppercase">VERIFICATION SUITE</div>
            <div className="text-amber-400 font-bold text-sm mt-0.5">
              {testCaseCount} Hidden Test Vectors
            </div>
          </div>
        </div>
      </div>

      {/* Problem Statement Body */}
      <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-6 md:p-8 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          PROBLEM STATEMENT & SPECIFICATION
        </h2>
        <div className="p-5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
          {problem.description}
        </div>
      </div>

      {/* Sample Input & Sample Output */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sample Input */}
        <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-400 uppercase">SAMPLE INPUT</span>
            {problem.sampleInput && (
              <button
                onClick={() => copyToClipboard(problem.sampleInput || '', 'input')}
                className="text-[10px] text-cyan-400 hover:underline"
              >
                {copied === 'input' ? 'COPIED ✓' : 'COPY INPUT'}
              </button>
            )}
          </div>
          <pre className="p-4 rounded-lg bg-black/60 border border-slate-800 text-cyan-300 text-xs overflow-x-auto min-h-[90px]">
            {problem.sampleInput || '(No sample input specified)'}
          </pre>
        </div>

        {/* Sample Output */}
        <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-400 uppercase">EXPECTED OUTPUT</span>
            {problem.sampleOutput && (
              <button
                onClick={() => copyToClipboard(problem.sampleOutput || '', 'output')}
                className="text-[10px] text-emerald-400 hover:underline"
              >
                {copied === 'output' ? 'COPIED ✓' : 'COPY OUTPUT'}
              </button>
            )}
          </div>
          <pre className="p-4 rounded-lg bg-black/60 border border-slate-800 text-emerald-300 text-xs overflow-x-auto min-h-[90px]">
            {problem.sampleOutput || '(No sample output specified)'}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ProblemDetailPage;
