import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-mono">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800 text-cyan-300 text-xs mb-8 shadow-[0_0_15px_rgba(0,255,204,0.15)] animate-pulse">
        <span className="w-2 h-2 rounded-full bg-[#00ffcc]" />
        <span>COMPETITIVE CODING REDEFINED</span>
      </div>

      {/* Main Title */}
      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-center tracking-wider mb-6 text-white">
        ENTER THE <span className="text-[#00ffcc] drop-shadow-[0_0_25px_rgba(0,255,204,0.6)]">COMBAT</span> ARENA
      </h1>

      <p className="max-w-2xl text-center text-slate-400 text-base sm:text-lg mb-10 leading-relaxed">
        Real-time head-to-head (1v1) competitive coding duels, automated single-elimination tournament orchestration,
        sub-second verdict streaming, and persistent Elo rating progression.
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
        <Link
          to={isAuthenticated ? '/dashboard' : '/register'}
          className="px-8 py-3.5 rounded bg-[#00ffcc] text-black font-bold tracking-wider hover:bg-cyan-300 transition-all shadow-[0_0_20px_rgba(0,255,204,0.5)] transform hover:-translate-y-0.5"
        >
          {isAuthenticated ? 'OPEN MISSION CONTROL' : 'ENLIST NOW — OPERATIVE'}
        </Link>
        <Link
          to="/series"
          className="px-8 py-3.5 rounded border border-slate-700 bg-slate-900/60 text-slate-200 hover:text-cyan-300 hover:border-cyan-500/60 transition-all"
        >
          VIEW TOURNAMENTS
        </Link>
      </div>

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        <div className="p-6 rounded-lg bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/50 transition-all group">
          <div className="w-10 h-10 rounded bg-cyan-950/80 border border-cyan-800 text-[#00ffcc] flex items-center justify-center font-bold mb-4 group-hover:shadow-[0_0_12px_rgba(0,255,204,0.4)]">
            01
          </div>
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300">
            1v1 Head-to-Head Duels
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Duel rival coders in a live Monaco environment. First to pass all test cases takes the round win with instant pessimistic settlement.
          </p>
        </div>

        <div className="p-6 rounded-lg bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/50 transition-all group">
          <div className="w-10 h-10 rounded bg-cyan-950/80 border border-cyan-800 text-[#00ffcc] flex items-center justify-center font-bold mb-4 group-hover:shadow-[0_0_12px_rgba(0,255,204,0.4)]">
            02
          </div>
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300">
            Automated Brackets
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Single-elimination brackets dynamically advance round winners until the tournament champion emerges.
          </p>
        </div>

        <div className="p-6 rounded-lg bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/50 transition-all group">
          <div className="w-10 h-10 rounded bg-cyan-950/80 border border-cyan-800 text-[#00ffcc] flex items-center justify-center font-bold mb-4 group-hover:shadow-[0_0_12px_rgba(0,255,204,0.4)]">
            03
          </div>
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300">
            Judge0 Remote Sandbox
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Isolated execution cluster evaluating Java &amp; C++ against strict time and memory limits with real-time STOMP push.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
