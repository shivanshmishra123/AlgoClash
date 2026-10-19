import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '../auth/AuthContext';
import {
  joinMatchmakingQueue,
  leaveMatchmakingQueue,
  getMatchmakingStatus,
  matchWithBot,
} from '../api/matchmaking';
import type { MatchmakingResponse } from '../api/types';

interface MatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({ isOpen, onClose }) => {
  const { username } = useAuth();
  const navigate = useNavigate();

  const [queueState, setQueueState] = useState<MatchmakingResponse | null>(null);
  const [seconds, setSeconds] = useState<number>(0);
  const [isMatchingBot, setIsMatchingBot] = useState<boolean>(false);
  const [isLeaving, setIsLeaving] = useState<boolean>(false);
  const [matchFound, setMatchFound] = useState<MatchmakingResponse | null>(null);

  const stompClientRef = useRef<Client | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const secondsTimerRef = useRef<number | null>(null);

  // Helper to handle match confirmation and redirect
  const handleMatchFound = (res: MatchmakingResponse) => {
    setMatchFound(res);
    // Cleanup any polling
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
    }
    // Redirect to match arena after 1.5 seconds so user sees opponent
    setTimeout(() => {
      onClose();
      navigate(`/match/${res.matchId}`);
    }, 1500);
  };

  // Join queue when modal opens
  useEffect(() => {
    if (!isOpen || !username) {
      setSeconds(0);
      setMatchFound(null);
      setQueueState(null);
      return;
    }

    let active = true;

    // Start elapsed counter
    setSeconds(0);
    secondsTimerRef.current = window.setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    // Call join queue API
    const enterQueue = async () => {
      try {
        const res = await joinMatchmakingQueue();
        if (!active) return;
        setQueueState(res);

        if (res.status === 'MATCHED' && res.matchId) {
          handleMatchFound(res);
        }
      } catch (err) {
        console.error('Failed to join matchmaking queue:', err);
      }
    };

    enterQueue();

    // Setup STOMP WebSocket subscription for instant notification
    const rawHost = (
      import.meta.env.VITE_WS_BASE_URL ||
      (import.meta.env.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/api$/, '')
        : 'http://localhost:8080')
    )
      .replace(/\/+$/, '')
      .replace(/\/ws-algoclash$/, '');

    const baseWsUrl = `${rawHost}/ws-algoclash`;

    const client = new Client({
      webSocketFactory: () => new SockJS(baseWsUrl),
      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      client.subscribe(`/topic/matchmaking/${username}`, (msg) => {
        try {
          const matchResult: MatchmakingResponse = JSON.parse(msg.body);
          if (matchResult.status === 'MATCHED' && matchResult.matchId) {
            handleMatchFound(matchResult);
          }
        } catch (e) {
          console.error('Failed to parse matchmaking WS payload:', e);
        }
      });
    };

    client.activate();
    stompClientRef.current = client;

    // Setup fallback polling every 2 seconds
    pollTimerRef.current = window.setInterval(async () => {
      try {
        const status = await getMatchmakingStatus();
        if (!active) return;
        if (status.status === 'MATCHED' && status.matchId) {
          handleMatchFound(status);
        }
      } catch (e) {
        console.error('Matchmaking poll error:', e);
      }
    }, 2000);

    return () => {
      active = false;
      if (secondsTimerRef.current) window.clearInterval(secondsTimerRef.current);
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
      if (client.active) {
        client.deactivate();
      }
    };
  }, [isOpen, username]);

  const handleCancel = async () => {
    setIsLeaving(true);
    try {
      await leaveMatchmakingQueue();
    } catch (e) {
      console.error('Failed to leave queue:', e);
    } finally {
      setIsLeaving(false);
      onClose();
    }
  };

  const handleBotDuel = async () => {
    setIsMatchingBot(true);
    try {
      const res = await matchWithBot();
      if (res.status === 'MATCHED' && res.matchId) {
        handleMatchFound(res);
      }
    } catch (e) {
      console.error('Failed to match with bot:', e);
    } finally {
      setIsMatchingBot(false);
    }
  };

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono animate-fadeIn">
      <div className="w-full max-w-md bg-slate-950 border border-cyan-500/50 rounded-xl p-6 shadow-[0_0_50px_rgba(0,255,204,0.15)] relative overflow-hidden">
        {/* Neon scanline accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00ffcc] to-transparent animate-pulse" />

        {matchFound ? (
          /* Match Found State */
          <div className="text-center py-6 space-y-4 animate-scaleUp">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/20 border border-emerald-500/60 shadow-[0_0_20px_#10b981]">
              <span className="text-3xl">⚔️</span>
            </div>

            <div>
              <div className="text-xs text-emerald-400 font-bold tracking-widest uppercase">
                COMBAT TARGET ACQUIRED
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                {matchFound.opponentUsername}
              </h2>
              <div className="text-xs text-slate-400 mt-1">
                Opponent Rating:{' '}
                <span className="text-[#00ffcc] font-bold">
                  {matchFound.opponentRating ?? '1000'} ELO
                </span>
              </div>
            </div>

            <div className="p-3 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300">
              Match <span className="text-[#00ffcc]">#{matchFound.matchId}</span> initialized.
              <br />
              <span className="text-emerald-400 font-bold animate-pulse">
                WARPING TO COMBAT ARENA...
              </span>
            </div>
          </div>
        ) : (
          /* Searching State */
          <div className="text-center space-y-6">
            <div className="space-y-1">
              <div className="text-[10px] text-cyan-400 tracking-widest uppercase flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00ffcc] animate-ping" />
                RANKED 1V1 MATCHMAKING
              </div>
              <h2 className="text-xl font-bold text-white tracking-wider">
                SEARCHING FOR OPPONENT
              </h2>
            </div>

            {/* Radar Animation */}
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-cyan-800/40 animate-ping opacity-25" />
              <div className="absolute inset-4 rounded-full border border-cyan-700/50 animate-pulse" />
              <div className="absolute inset-8 rounded-full border border-cyan-600/60" />
              <div className="w-12 h-12 rounded-full bg-cyan-950/80 border border-cyan-400/80 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,204,0.3)]">
                <span className="text-lg">🎯</span>
              </div>
            </div>

            {/* Telemetry Info */}
            <div className="space-y-2 text-xs">
              <div className="text-2xl font-bold text-[#00ffcc] tracking-widest drop-shadow-[0_0_10px_rgba(0,255,204,0.5)]">
                {formatTimer(seconds)}
              </div>

              <div className="p-3 rounded bg-slate-900/80 border border-slate-800 text-left space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Your Handle:</span>
                  <span className="text-white font-bold">{username}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Your Rating:</span>
                  <span className="text-[#00ffcc] font-bold">
                    {queueState?.userRating ?? 1000} ELO
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Allowed Range:</span>
                  <span className="text-amber-400 font-bold">
                    {queueState?.minRating ?? 900} - {queueState?.maxRating ?? 1100} ELO (±100)
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                Scanning for active operatives in your rating bracket...
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleBotDuel}
                disabled={isMatchingBot}
                className="w-full py-2.5 px-4 rounded bg-gradient-to-r from-amber-500/20 via-amber-600/20 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs tracking-wider transition-all disabled:opacity-50"
              >
                {isMatchingBot ? 'INITIALIZING BOT...' : '⚡ MATCH WITH SPARRING BOT (TEST SOLO)'}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={isLeaving}
                className="w-full py-2 px-4 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs tracking-wider transition-colors disabled:opacity-50"
              >
                {isLeaving ? 'LEAVING...' : 'CANCEL SEARCH'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
