import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { MatchmakingModal } from './MatchmakingModal';

export const Layout: React.FC = () => {
  const { isAuthenticated, isAdmin, username, logout } = useAuth();
  const navigate = useNavigate();
  const [matchmakingOpen, setMatchmakingOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkStyle = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded text-xs font-mono tracking-wider transition-all duration-150 ${
      isActive
        ? 'bg-cyan-950/80 text-[#00ffcc] border border-cyan-500/50 shadow-[0_0_10px_rgba(0,255,204,0.2)]'
        : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60'
    }`;

  return (
    <div className="min-h-screen bg-black text-slate-200 flex flex-col font-mono selection:bg-cyan-500 selection:text-black">
      {/* Top HUD Navigation Bar */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur border-b border-cyan-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="w-3 h-3 bg-[#00ffcc] rounded-sm group-hover:rotate-45 transition-transform duration-300 shadow-[0_0_12px_#00ffcc]" />
              <span className="font-bold text-lg tracking-widest text-[#00ffcc] drop-shadow-[0_0_10px_rgba(0,255,204,0.5)]">
                ALGOCLASH
              </span>
              <span className="hidden md:inline-block px-1.5 py-0.5 text-[10px] uppercase bg-cyan-950/60 text-cyan-400 border border-cyan-800 rounded">
                v1.0
              </span>
            </Link>

            {/* Main Navigation */}
            <nav className="hidden md:flex items-center gap-1.5">
              {isAuthenticated ? (
                <>
                  <NavLink to="/dashboard" className={navLinkStyle}>
                    DASHBOARD
                  </NavLink>
                  <NavLink to="/series" className={navLinkStyle}>
                    TOURNAMENTS
                  </NavLink>
                  <NavLink to="/problems" className={navLinkStyle}>
                    PROBLEMS
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/series" className={navLinkStyle}>
                    TOURNAMENTS
                  </NavLink>
                  <NavLink to="/problems" className={navLinkStyle}>
                    PROBLEMS
                  </NavLink>
                </>
              )}

              {/* Admin Links */}
              {isAdmin && (
                <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-cyan-900/40">
                  <NavLink to="/admin/problems" className={navLinkStyle}>
                    [ADM] PROBLEMS
                  </NavLink>
                  <NavLink to="/admin/series/create" className={navLinkStyle}>
                    + NEW SERIES
                  </NavLink>
                </div>
              )}
            </nav>
          </div>

            {/* Right HUD Controls & User State */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMatchmakingOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gradient-to-r from-cyan-400 via-[#00ffcc] to-emerald-400 text-black font-extrabold text-xs tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,204,0.4)] animate-pulse"
                >
                  <span>⚔️</span>
                  <span>1V1 BATTLE</span>
                </button>

                <Link
                  to={`/profile/${username}`}
                  className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700/80 hover:border-cyan-500/60 transition-colors group"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
                  <span className="text-xs text-slate-300 group-hover:text-cyan-300 font-medium">
                    {username}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isAdmin
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                    }`}
                  >
                    {isAdmin ? 'ADMIN' : 'OPERATIVE'}
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="text-xs px-2.5 py-1 rounded border border-rose-900/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 hover:text-rose-100 transition-colors"
                >
                  LOGOUT
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors"
                >
                  LOGIN
                </Link>
                <Link
                  to="/register"
                  className="text-xs px-3 py-1.5 rounded bg-[#00ffcc] text-black font-semibold hover:bg-cyan-300 transition-all shadow-[0_0_12px_rgba(0,255,204,0.4)]"
                >
                  REGISTER
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Matchmaking Queue Modal */}
      <MatchmakingModal
        isOpen={matchmakingOpen}
        onClose={() => setMatchmakingOpen(false)}
      />

      {/* Terminal Telemetry Footer */}
      <footer className="border-t border-slate-900 bg-black/80 py-3 text-[11px] text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              SYSTEM NOMINAL
            </span>
            <span className="text-slate-700">•</span>
            <span>JUDGE0 SANDBOX ACTIVE</span>
            <span className="text-slate-700">•</span>
            <span>WEBSOCKET BROKER CONNECTED</span>
          </div>
          <div>ALGOCLASH © 2026 // ALL DUELS RECORDED</div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
