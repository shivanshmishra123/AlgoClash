import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getProblems, createProblem } from '../api/problems';
import type { ProblemResponse, CreateProblemRequest, Difficulty } from '../api/types';
import { DifficultyBadge } from '../components/DifficultyBadge';

const SAMPLE_TESTCASE_JSON = JSON.stringify(
  [
    { input: "5 7\n", expectedOutput: "12\n" },
    { input: "100 250\n", expectedOutput: "350\n" },
    { input: "-10 15\n", expectedOutput: "5\n" }
  ],
  null,
  2
);

export const AdminProblemsPage: React.FC = () => {
  const [problems, setProblems] = useState<ProblemResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');
  const [description, setDescription] = useState<string>('');
  const [timeLimitMillis, setTimeLimitMillis] = useState<number>(2000);
  const [memoryLimitMb, setMemoryLimitMb] = useState<number>(256);
  const [sampleInput, setSampleInput] = useState<string>('');
  const [sampleOutput, setSampleOutput] = useState<string>('');
  const [testcasesJson, setTestcasesJson] = useState<string>(SAMPLE_TESTCASE_JSON);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  const loadProblems = useCallback(async () => {
    try {
      const data = await getProblems();
      setProblems(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load problem library:', err);
      setError('Failed to retrieve challenges from central database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProblems();
  }, [loadProblems]);

  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    // Validate inputs
    if (!title.trim() || !description.trim()) {
      setFormError('Title and description are required.');
      return;
    }

    // Validate Testcases JSON
    try {
      const parsed = JSON.parse(testcasesJson);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setFormError('Testcases JSON must be a non-empty array of objects with "input" and "expectedOutput".');
        return;
      }
      for (const tc of parsed) {
        if (typeof tc.input !== 'string' || typeof tc.expectedOutput !== 'string') {
          setFormError('Each test case must specify "input" (string) and "expectedOutput" (string).');
          return;
        }
      }
    } catch (jsonErr) {
      setFormError('Invalid JSON format in test cases editor: ' + (jsonErr as Error).message);
      return;
    }

    setSubmitting(true);
    try {
      const req: CreateProblemRequest = {
        title: title.trim(),
        difficulty,
        description: description.trim(),
        timeLimitMillis: Number(timeLimitMillis),
        memoryLimitMb: Number(memoryLimitMb),
        sampleInput: sampleInput.trim() || undefined,
        sampleOutput: sampleOutput.trim() || undefined,
        testcasesJson: testcasesJson.trim(),
      };

      const created = await createProblem(req);
      setFormSuccess(`Challenge #${created.id} "${created.title}" successfully encoded into grid!`);
      
      // Reset form
      setTitle('');
      setDescription('');
      setSampleInput('');
      setSampleOutput('');
      setTestcasesJson(SAMPLE_TESTCASE_JSON);
      setShowCreateModal(false);

      // Refresh list
      loadProblems();
    } catch (err: unknown) {
      console.error('Failed to publish challenge:', err);
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response?: { data?: { message?: string } } }).response!.data!.message!
          : 'Failed to create problem. Verify administrative clearance.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Studio HUD */}
      <div className="relative overflow-hidden rounded-xl bg-slate-900/60 border border-slate-800 p-6 md:p-8 backdrop-blur shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-500"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-400 font-bold uppercase">
                ADMIN CLEARANCE ONLY
              </span>
              <span className="font-mono text-xs text-slate-500">
                TOTAL: {problems.length} CHALLENGES
              </span>
            </div>

            <h1 className="text-3xl font-black text-white font-mono tracking-tight">
              PROBLEM AUTHORING STUDIO
            </h1>

            <p className="font-mono text-xs text-slate-400 max-w-xl">
              Create algorithmic test challenges with strict execution limits, sample test vectors, and hidden verification suites for Judge0 execution.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 rounded-lg font-mono text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              + COMPOSE NEW CHALLENGE
            </button>
          </div>
        </div>

        {formSuccess && (
          <div className="mt-4 p-3 rounded bg-emerald-950/60 border border-emerald-500/40 font-mono text-xs text-emerald-400">
            ✓ {formSuccess}
          </div>
        )}
      </div>

      {/* Problem Repository List */}
      <div className="rounded-xl bg-slate-900/50 border border-slate-800 overflow-hidden font-mono">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
            REGISTERED ALGORITHMIC CHALLENGES
          </h2>
          <button
            onClick={loadProblems}
            className="text-xs text-slate-500 hover:text-cyan-400 transition"
          >
            ↻ REFRESH LIST
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            RETRIEVING CHALLENGE REPOSITORY...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 text-xs">
            {error}
          </div>
        ) : problems.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            NO CHALLENGES FOUND. USE THE COMPOSE BUTTON ABOVE TO SEED ONE.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-950/40 text-slate-500 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">CHALLENGE TITLE</th>
                  <th className="py-3 px-4">TIER</th>
                  <th className="py-3 px-4">EXECUTION LIMITS</th>
                  <th className="py-3 px-4">AUTHOR</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {problems.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 text-slate-500 font-bold">
                      #{p.id}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-200">
                      <Link
                        to={`/problems/${p.id}`}
                        className="hover:text-cyan-400 transition"
                      >
                        {p.title}
                      </Link>
                    </td>

                    <td className="py-3 px-4">
                      <DifficultyBadge difficulty={p.difficulty} />
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {p.timeLimitMillis} ms | {p.memoryLimitMb} MB
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {p.createdByUsername || 'SYSTEM'}
                    </td>

                    <td className="py-3 px-4 text-right">
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

      {/* Create Problem Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-3xl w-full rounded-2xl bg-slate-900 border border-slate-700 p-6 md:p-8 font-mono shadow-2xl space-y-6 my-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight">
                  COMPOSE ALGORITHMIC CHALLENGE
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Specify mission objective, constraints, and test suite matrix.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded bg-red-950/60 border border-red-500/50 text-red-400 text-xs">
                ⚠ {formError}
              </div>
            )}

            <form onSubmit={handleCreateProblem} className="space-y-5 text-xs">
              {/* Title & Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    Challenge Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Invert Quantum Tree"
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    Difficulty *
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    Time Limit (Millis) *
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    max={10000}
                    value={timeLimitMillis}
                    onChange={(e) => setTimeLimitMillis(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    Memory Limit (MB) *
                  </label>
                  <input
                    type="number"
                    required
                    min={16}
                    max={1024}
                    value={memoryLimitMb}
                    onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  Problem Description (Task / Constraints) *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe problem inputs, outputs, and constraints clearly..."
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 transition leading-relaxed"
                />
              </div>

              {/* Sample I/O */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    Sample Input
                  </label>
                  <textarea
                    rows={3}
                    value={sampleInput}
                    onChange={(e) => setSampleInput(e.target.value)}
                    placeholder="e.g. 5 7"
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-cyan-400 focus:outline-none focus:border-cyan-500 transition font-mono text-[11px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    Sample Output
                  </label>
                  <textarea
                    rows={3}
                    value={sampleOutput}
                    onChange={(e) => setSampleOutput(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-emerald-400 focus:outline-none focus:border-cyan-500 transition font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Hidden Testcases JSON */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    Hidden Test Suite JSON (Array of &#123;input, expectedOutput&#125;) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setTestcasesJson(SAMPLE_TESTCASE_JSON)}
                    className="text-[10px] text-cyan-400 hover:underline"
                  >
                    RESET DEFAULT JSON
                  </button>
                </div>
                <textarea
                  required
                  rows={6}
                  value={testcasesJson}
                  onChange={(e) => setTestcasesJson(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-amber-300 focus:outline-none focus:border-cyan-500 transition font-mono text-[11px]"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {submitting ? 'ENCODING TO DATABASE...' : 'PUBLISH CHALLENGE →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProblemsPage;
