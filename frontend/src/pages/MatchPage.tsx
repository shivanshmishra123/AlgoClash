import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getMatchById, submitSolution } from '../api/matches';
import type {
  MatchResponse,
  SubmissionLanguage,
  SubmissionVerdict,
  SubmissionUpdateMessage,
} from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { DifficultyBadge } from '../components/DifficultyBadge';

const JAVA_TEMPLATE = `import java.io.*;
import java.util.*;

public class Solution {
    public static void main(String[] args) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        String line = reader.readLine();
        if (line != null) {
            // Write your solution here
            System.out.println(line);
        }
    }
}
`;

const CPP_TEMPLATE = `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Read input from cin
    // Output solution to cout
    
    return 0;
}
`;

export const MatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { username } = useAuth();

  const [match, setMatch] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [language, setLanguage] = useState<SubmissionLanguage>('JAVA');
  const [code, setCode] = useState<string>(JAVA_TEMPLATE);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [latestVerdict, setLatestVerdict] = useState<SubmissionVerdict | string | null>(null);

  // Live STOMP log
  const [stompConnected, setStompConnected] = useState<boolean>(false);
  const [activityFeed, setActivityFeed] = useState<SubmissionUpdateMessage[]>([]);

  // Layout states
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);

  const stompClientRef = useRef<Client | null>(null);

  // Fetch match details
  const fetchMatch = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getMatchById(Number(id));
      setMatch(data);

      if (data.latestSubmissionCode) {
        setCode(data.latestSubmissionCode);
      }
      if (data.latestSubmissionLanguage) {
        setLanguage(data.latestSubmissionLanguage as SubmissionLanguage);
      }
      if (data.latestSubmissionVerdict) {
        setLatestVerdict(data.latestSubmissionVerdict);
      }
      if (data.state === 'COMPLETED' && data.winnerUsername) {
        setShowVictoryModal(true);
      }
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to load match arena:', err);
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response?: { data?: { message?: string } } }).response!.data!.message!
          : 'Failed to access live match arena. Match might be pending or unassigned.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  // Handle template change when language changes (if default template is still in editor)
  const handleLanguageChange = (newLang: SubmissionLanguage) => {
    setLanguage(newLang);
    if (newLang === 'JAVA' && (code === CPP_TEMPLATE || code.trim() === '')) {
      setCode(JAVA_TEMPLATE);
    } else if (newLang === 'CPP' && (code === JAVA_TEMPLATE || code.trim() === '')) {
      setCode(CPP_TEMPLATE);
    }
  };

  const handleResetTemplate = () => {
    if (window.confirm('Reset editor to default starter template? Current unsubmitted edits will be lost.')) {
      setCode(language === 'JAVA' ? JAVA_TEMPLATE : CPP_TEMPLATE);
    }
  };

  // Continuous Telemetry Polling: Updates both users' UI if WebSocket drops or while awaiting verdict
  useEffect(() => {
    if (!id) return;

    let active = true;
    const pollInterval = window.setInterval(async () => {
      try {
        const data = await getMatchById(Number(id));
        if (!active || !data) return;

        setMatch(data);

        // Update latest verdict and release submit button if current user submitted
        if (data.latestSubmissionVerdict) {
          setLatestVerdict(data.latestSubmissionVerdict);
          if (data.latestSubmissionVerdict !== 'PENDING') {
            setSubmitting(false);
          }
        }

        // If match reached COMPLETED status, announce winner on both screens
        if (data.state === 'COMPLETED') {
          setSubmitting(false);
          if (data.winnerUsername) {
            setShowVictoryModal(true);
          }
        }
      } catch (err) {
        console.error('Match telemetry polling error:', err);
      }
    }, 1500);

    return () => {
      active = false;
      window.clearInterval(pollInterval);
    };
  }, [id]);

  // STOMP WebSocket subscriber
  useEffect(() => {
    if (!id) return;

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
      debug: (msg) => {
        if (import.meta.env.DEV) {
          console.debug('[STOMP Match]', msg);
        }
      },
    });

    client.onConnect = () => {
      setStompConnected(true);
      console.log(`[STOMP] Subscribing to /topic/match/${id}`);
      client.subscribe(`/topic/match/${id}`, (message) => {
        try {
          const update: SubmissionUpdateMessage = JSON.parse(message.body);
          console.log('[STOMP Update]', update);

          setActivityFeed((prev) => [update, ...prev.slice(0, 19)]);

          // If the update is from the current user, update their verdict badge and unlock submit button
          if (!update.username || update.username === username) {
            setLatestVerdict(update.verdict);
            if (update.verdict !== 'PENDING') {
              setSubmitting(false);
            }
          }

          if (update.verdict === 'ACCEPTED') {
            setShowVictoryModal(true);
            setSubmitting(false);
            fetchMatch();
          }
        } catch (parseError) {
          console.error('[STOMP Parse Error]', parseError);
        }
      });
    };

    client.onDisconnect = () => {
      setStompConnected(false);
    };

    client.onStompError = (frame) => {
      console.error('[STOMP Error]', frame);
      setStompConnected(false);
    };

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (client.active) {
        client.deactivate();
      }
    };
  }, [id, username, fetchMatch]);

  // Submit solution to Judge0
  const handleSubmit = async () => {
    if (!id || submitting || match?.state !== 'ONGOING') return;
    setSubmitting(true);
    setLatestVerdict('PENDING');

    try {
      const resp = await submitSolution(Number(id), {
        language,
        code,
      });

      setLatestVerdict(resp.verdict);
      if (resp.verdict === 'ACCEPTED') {
        setShowVictoryModal(true);
        fetchMatch();
      }
    } catch (err: unknown) {
      console.error('Failed to submit solution:', err);
      setSubmitting(false);
      setLatestVerdict('INTERNAL_ERROR');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono text-cyan-400 text-sm tracking-widest uppercase animate-pulse">
          Initializing Combat Arena & Telemetry Grid...
        </p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 rounded-lg bg-red-950/20 border border-red-500/40 text-red-400 font-mono">
        <h2 className="text-lg font-bold mb-2">ARENA ACCESS RESTRICTED</h2>
        <p className="text-sm mb-4">{error || 'Unable to establish link with combat match.'}</p>
        <div className="flex gap-4">
          <Link
            to="/series"
            className="text-xs px-4 py-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-400 transition"
          >
            ← TOURNAMENT LOBBY
          </Link>
          <Link
            to="/dashboard"
            className="text-xs px-4 py-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-400 transition"
          >
            DASHBOARD
          </Link>
        </div>
      </div>
    );
  }

  const isPlayer1 = username === match.player1Username;
  const isPlayer2 = username === match.player2Username;
  const isCompetitor = isPlayer1 || isPlayer2;
  const isMatchOngoing = match.state === 'ONGOING';

  return (
    <div className="space-y-4 pb-12">
      {/* Top Arena HUD Bar */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 backdrop-blur shadow-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Match & Sector Metadata */}
          <div className="flex items-center gap-3">
            <Link
              to={match.seriesId ? `/series/${match.seriesId}` : '/dashboard'}
              className="font-mono text-xs px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400 transition"
            >
              ← {match.seriesId ? 'SERIES MATRIX' : 'DASHBOARD'}
            </Link>

            <span className="font-mono text-xs font-bold text-slate-300">
              MATCH #{match.id}
            </span>

            {match.seriesName && (
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 hidden sm:inline-block">
                {match.seriesName} (ROUND {match.round})
              </span>
            )}

            {/* Match State Badge */}
            <span
              className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${
                match.state === 'ONGOING'
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-400 animate-pulse'
                  : match.state === 'COMPLETED'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {match.state}
            </span>
          </div>

          {/* Real-time VS Competitors Display */}
          <div className="flex items-center gap-4 font-mono text-xs">
            {/* Player 1 */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                match.winnerUsername === match.player1Username
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold'
                  : isPlayer1
                  ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 font-bold'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
              }`}
            >
              <span>{match.player1Username || 'OPERATIVE 1'}</span>
              {match.winnerUsername === match.player1Username && <span>🏆</span>}
            </div>

            <span className="text-[10px] text-cyan-400 font-black animate-pulse">VS</span>

            {/* Player 2 */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                match.winnerUsername === match.player2Username
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold'
                  : isPlayer2
                  ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 font-bold'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
              }`}
            >
              <span>{match.player2Username || 'OPERATIVE 2'}</span>
              {match.winnerUsername === match.player2Username && <span>🏆</span>}
            </div>
          </div>

          {/* STOMP Telemetry Indicator */}
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                stompConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            ></span>
            <span className="text-slate-400">
              {stompConnected ? 'TELEMETRY ONLINE' : 'CONNECTING...'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Combat Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Panel: Problem Dossier Drawer */}
        <div
          className={`${
            drawerOpen ? 'lg:col-span-5' : 'lg:col-span-1'
          } transition-all duration-300 flex flex-col`}
        >
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 flex-1 flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between font-mono bg-slate-950/30">
              {drawerOpen && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span className="text-xs font-bold text-slate-300 tracking-wider">
                    PROBLEM SPECIFICATION
                  </span>
                </div>
              )}
              <button
                onClick={() => setDrawerOpen(!drawerOpen)}
                className="text-xs text-slate-400 hover:text-cyan-400 transition flex items-center gap-1"
                title={drawerOpen ? 'Collapse Problem Dossier' : 'Expand Problem Dossier'}
              >
                <span>{drawerOpen ? '⮜ COLLAPSE' : 'EXPAND ⮞'}</span>
              </button>
            </div>

            {/* Drawer Body */}
            {drawerOpen && match.problem && (
              <div className="p-5 space-y-6 overflow-y-auto max-h-[700px] font-mono text-slate-300 text-xs">
                {/* Title & Metadata */}
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {match.problem.title}
                    </h2>
                    <DifficultyBadge difficulty={match.problem.difficulty} />
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500">
                    <span>TIME LIMIT: {match.problem.timeLimitMillis} ms</span>
                    <span>•</span>
                    <span>MEMORY: {match.problem.memoryLimitMb} MB</span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    MISSION OBJECTIVE
                  </div>
                  <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/80 leading-relaxed whitespace-pre-wrap text-slate-300">
                    {match.problem.description}
                  </div>
                </div>

                {/* Sample I/O */}
                {match.problem.sampleInput && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      SAMPLE TELEMETRY INPUT
                    </div>
                    <pre className="p-3 rounded-lg bg-black/60 border border-slate-800 text-cyan-300 overflow-x-auto">
                      {match.problem.sampleInput}
                    </pre>
                  </div>
                )}

                {match.problem.sampleOutput && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      EXPECTED OUTPUT
                    </div>
                    <pre className="p-3 rounded-lg bg-black/60 border border-slate-800 text-emerald-300 overflow-x-auto">
                      {match.problem.sampleOutput}
                    </pre>
                  </div>
                )}

                {/* Testcases Notice */}
                <div className="p-3 rounded bg-cyan-950/20 border border-cyan-800/30 text-[11px] text-cyan-400/80">
                  ℹ Submissions are compiled & evaluated in sandboxed Judge0 workers against all hidden suite verification vectors.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Monaco Code Editor & Real-time Console */}
        <div
          className={`${
            drawerOpen ? 'lg:col-span-7' : 'lg:col-span-11'
          } transition-all duration-300 flex flex-col space-y-4`}
        >
          {/* Editor HUD Bar */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <div className="flex rounded-lg overflow-hidden border border-slate-700">
                <button
                  onClick={() => handleLanguageChange('JAVA')}
                  className={`px-3 py-1 text-xs font-bold transition ${
                    language === 'JAVA'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  JAVA
                </button>
                <button
                  onClick={() => handleLanguageChange('CPP')}
                  className={`px-3 py-1 text-xs font-bold transition ${
                    language === 'CPP'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  C++
                </button>
              </div>

              {/* Reset Template */}
              <button
                onClick={handleResetTemplate}
                className="text-[11px] text-slate-500 hover:text-slate-300 transition"
              >
                RESTORE BOILERPLATE
              </button>
            </div>

            {/* Verdict Chip */}
            {latestVerdict && (
              <div
                className={`font-mono text-xs px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                  latestVerdict === 'ACCEPTED'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 animate-bounce'
                    : latestVerdict === 'PENDING'
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 animate-pulse'
                    : 'bg-rose-950/80 border-rose-500 text-rose-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>VERDICT: {latestVerdict}</span>
              </div>
            )}
          </div>

          {/* Monaco Editor Container */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl relative min-h-[500px]">
            <Editor
              height="520px"
              theme="vs-dark"
              language={language === 'JAVA' ? 'java' : 'cpp'}
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                fontFamily: 'Fira Code, Consolas, Monaco, monospace',
                fontSize: 13,
                tabSize: 4,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                cursorBlinking: 'smooth',
                renderWhitespace: 'none',
                lineNumbers: 'on',
              }}
            />
          </div>

          {/* Execution & Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 font-mono">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>
                {isMatchOngoing
                  ? isCompetitor
                    ? 'LIVE COMBAT ACTIVE: TRANSMIT SOLUTION TO CLAIM VICTORY'
                    : 'OBSERVER CLEARANCE: LIVE TELEMETRY STREAMING'
                  : 'ARENA ENGAGEMENT CONCLUDED'}
              </span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !isMatchOngoing}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-mono text-xs font-bold tracking-wider uppercase transition shadow-lg ${
                submitting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : !isMatchOngoing
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 active:scale-95 shadow-cyan-500/20'
              }`}
            >
              {submitting ? 'TRANSMITTING TO JUDGE0 GRID...' : 'TRANSMIT SOLUTION →'}
            </button>
          </div>

          {/* Real-time Activity Feed */}
          {activityFeed.length > 0 && (
            <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-4 font-mono text-xs">
              <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-2">
                LIVE ARENA SUBMISSION STREAM
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {activityFeed.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="p-2 rounded bg-slate-950/60 border border-slate-800/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">{item.username}</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-400">{item.language}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.verdict === 'ACCEPTED'
                          ? 'bg-emerald-950/60 text-emerald-400'
                          : item.verdict === 'PENDING'
                          ? 'bg-cyan-950/60 text-cyan-400'
                          : 'bg-rose-950/60 text-rose-400'
                      }`}
                    >
                      {item.verdict}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Victory Modal */}
      {showVictoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border-2 border-cyan-500/60 p-6 md:p-8 font-mono text-center shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-400"></div>

            <div className="w-16 h-16 mx-auto rounded-full bg-amber-400/10 border-2 border-amber-400/50 flex items-center justify-center text-3xl">
              🏆
            </div>

            <div>
              <div className="text-xs text-amber-400 uppercase tracking-widest font-bold mb-1">
                COMBAT FINALIZED
              </div>
              <h2 className="text-2xl font-black text-white">
                {match.winnerUsername ? `${match.winnerUsername} WINS` : 'ACCEPTED SOLUTION'}
              </h2>
              <p className="text-xs text-slate-400 mt-2">
                Solution validated through Judge0 grid. Elo rating calibration and bracket progression executed.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs flex justify-around">
              <div>
                <div className="text-slate-500 text-[10px]">WINNER RATING</div>
                <div className="text-emerald-400 font-bold">+10 ELO</div>
              </div>
              <div className="border-r border-slate-800"></div>
              <div>
                <div className="text-slate-500 text-[10px]">RIVAL RATING</div>
                <div className="text-rose-400 font-bold">-5 ELO</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {match.seriesId && (
                <Link
                  to={`/series/${match.seriesId}`}
                  className="flex-1 px-4 py-2.5 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition"
                >
                  VIEW BRACKET MATRIX →
                </Link>
              )}
              <button
                onClick={() => setShowVictoryModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
              >
                INSPECT CODE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchPage;
