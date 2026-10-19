import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSeriesList, joinSeries } from '../api/series';
import { useAuth } from '../auth/AuthContext';
import type { SeriesSummaryResponse } from '../api/types';
import SeriesCountdown from '../components/SeriesCountdown';

export const SeriesListPage: React.FC = () => {
  const [seriesList, setSeriesList] = useState<SeriesSummaryResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  const fetchSeries = async (pageNum: number) => {
    try {
      setLoading(true);
      const data = await getSeriesList(pageNum, 10);
      setSeriesList(data.content || []);
      setTotalPages(data.totalPages || 1);
      setPage(data.number || 0);
    } catch (err) {
      console.error('Failed to fetch series list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeries(page);
  }, [page]);

  const handleJoin = async (id: number) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setActionError(null);
    setJoiningId(id);
    try {
      await joinSeries(id);
      navigate(`/series/${id}`);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to join tournament series.');
    } finally {
      setJoiningId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTRATION_OPEN':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            REGISTRATION OPEN
          </span>
        );
      case 'REGISTRATION_CLOSED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800">
            REGISTRATION CLOSED
          </span>
        );
      case 'ONGOING':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950/80 text-[#00ffcc] border border-cyan-800 animate-pulse shadow-[0_0_10px_rgba(0,255,204,0.3)]">
            LIVE COMBAT
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-slate-400 border border-slate-700">
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-widest text-white flex items-center gap-2">
            <span className="w-2 h-4 bg-[#00ffcc]" />
            TOURNAMENT SERIES LOBBY
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Single-elimination competitive ladders. Enlist before rosters lock.
          </p>
        </div>

        {isAdmin && (
          <Link
            to="/admin/series/create"
            className="px-4 py-2 rounded bg-[#00ffcc] text-black font-bold text-xs tracking-wider hover:bg-cyan-300 transition-all shadow-[0_0_12px_rgba(0,255,204,0.3)] text-center"
          >
            + CREATE NEW SERIES
          </Link>
        )}
      </div>

      {actionError && (
        <div className="p-3 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-cyan-400 text-sm">
          <span className="w-3 h-3 rounded-full bg-[#00ffcc] animate-ping mr-2 inline-block" />
          POLLING TOURNAMENT REGISTRY...
        </div>
      ) : seriesList.length === 0 ? (
        <div className="py-16 text-center text-slate-500 border border-slate-900 rounded-lg bg-slate-950">
          No tournament series currently active.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {seriesList.map((series) => {
            const fillPercent = Math.min(100, Math.round((series.joinedCount / series.size) * 100));
            const isOpen = series.status === 'REGISTRATION_OPEN';

            return (
              <div
                key={series.id}
                className="p-5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between gap-4 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Link
                      to={`/series/${series.id}`}
                      className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors"
                    >
                      {series.name}
                    </Link>
                    {getStatusBadge(series.status)}
                  </div>

                  <div className="text-xs text-slate-400 mb-3">
                    Tournament Size: <span className="text-slate-200 font-semibold">{series.size} Competitors</span> // Active Round: <span className="text-slate-200 font-semibold">{series.currentRound}</span>
                  </div>

                  {/* Slot Fill Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>ROSTER FILL:</span>
                      <span className="font-semibold text-slate-200">
                        {series.joinedCount} / {series.size} ({fillPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-[#00ffcc] transition-all duration-500 shadow-[0_0_8px_#00ffcc]"
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-900 flex items-center justify-between gap-3">
                  {series.startsAt ? (
                    <SeriesCountdown startsAt={series.startsAt} />
                  ) : (
                    <span className="text-[11px] text-slate-500">START: TBD</span>
                  )}

                  <div className="flex items-center gap-2">
                    {isOpen && (
                      <button
                        onClick={() => handleJoin(series.id)}
                        disabled={joiningId === series.id}
                        className="px-3 py-1.5 rounded bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] disabled:opacity-50"
                      >
                        {joiningId === series.id ? 'JOINING...' : 'ENLIST'}
                      </button>
                    )}

                    <Link
                      to={`/series/${series.id}`}
                      className="px-3 py-1.5 rounded border border-slate-700 bg-slate-900/60 text-slate-300 hover:text-cyan-300 hover:border-cyan-500 text-xs transition-colors"
                    >
                      BRACKET →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-6">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-1.5 rounded border border-slate-700 text-xs text-slate-300 hover:text-white disabled:opacity-30"
          >
            ← PREVIOUS
          </button>
          <span className="text-xs text-slate-500">
            PAGE {page + 1} OF {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-1.5 rounded border border-slate-700 text-xs text-slate-300 hover:text-white disabled:opacity-30"
          >
            NEXT →
          </button>
        </div>
      )}
    </div>
  );
};

export default SeriesListPage;
