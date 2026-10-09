import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RotateCcw,
  ShieldCheck,
  ArrowLeft,
  Crown,
  Target,
  History
} from 'lucide-react';
import { sound } from '../services/sound';

export default function GameOverView({
  room,
  playerId,
  onResetGame,
  onLeaveRoom,
  onOpenCareerStats
}) {
  const isHost = room?.hostId === playerId;
  const players = Object.values(room?.players || {});
  const runners = players.filter((p) => p.role === 'runner');
  const hunters = players.filter((p) => p.role === 'hunter');
  const caughtRunners = runners.filter((p) => p.isCaught);
  const survivedRunners = runners.filter((p) => !p.isCaught);

  const serverWinner = room?.gameState?.winner;
  const wasEndedByHost = serverWinner === 'ended_by_host';
  const didRunnersWin = serverWinner === 'runners_escaped' || (!wasEndedByHost && survivedRunners.length > 0 && serverWinner !== 'hunters_win');
  const didHuntersWin = serverWinner === 'hunters_win' || (!wasEndedByHost && survivedRunners.length === 0);

  const startedAt = room?.gameState?.startedAt || Date.now();
  const endedAt = room?.gameState?.endedAt || Date.now();
  const totalMatchSecs = Math.max(0, Math.round((endedAt - startedAt) / 1000));

  const formatSecs = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  // Compute Runner Survival Times
  const runnerStats = runners.map((r) => {
    const survivalSecs = r.isCaught && r.caughtAt
      ? Math.max(0, Math.round((r.caughtAt - startedAt) / 1000))
      : totalMatchSecs;
    return {
      ...r,
      survivalSecs
    };
  });
  runnerStats.sort((a, b) => b.survivalSecs - a.survivalSecs);
  const topEscapeArtist = runnerStats[0];

  // Compute Hunter Catch Leaderboard
  const hunterStats = hunters.map((h) => {
    const tagsCount = caughtRunners.filter((c) => c.caughtBy === h.name).length;
    return {
      ...h,
      tagsCount
    };
  });
  hunterStats.sort((a, b) => b.tagsCount - a.tagsCount);
  const topHunter = hunterStats[0];

  useEffect(() => {
    try {
      sound.playVictory();
    } catch (e) {}
    try {
      if (typeof window !== 'undefined') {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 }
        });
      }
    } catch (e) {
      console.warn('Confetti effect note:', e);
    }
  }, []);

  return (
    <div className="w-full h-full touch-scroll overflow-y-auto overscroll-contain bg-slate-950 text-slate-100">
      <div className="w-full max-w-lg mx-auto flex flex-col gap-4 p-4 sm:p-6 pb-36 animate-fadeIn">
        {/* Top Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit to Menu</span>
          </button>

          {onOpenCareerStats && (
            <button
              onClick={onOpenCareerStats}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-slate-700 text-xs font-semibold transition active:scale-95"
            >
              <History className="w-4 h-4" />
              <span>Season Stats</span>
            </button>
          )}
        </div>

        {/* Victory Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500/20 to-cyan-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
            <Trophy className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-serif font-black text-white mt-3">
            {wasEndedByHost
              ? 'HUNT ENDED BY HOST'
              : didRunnersWin
              ? 'RUNNERS EVADED & WON!'
              : 'HUNTERS DOMINATED!'}
          </h2>

          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {wasEndedByHost
              ? `The host ended the hunt early. ${survivedRunners.length} runner(s) remained uncaught.`
              : didRunnersWin
              ? `${survivedRunners.length} runner(s) remained free when time expired!`
              : 'Every runner was tracked down and captured!'}
          </p>

          {/* Key Match Numbers */}
          <div className="grid grid-cols-3 gap-2 mt-5 text-center">
            <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Survivors</div>
              <div className="text-lg font-mono font-black text-emerald-400">
                {survivedRunners.length} / {runners.length}
              </div>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Match Time</div>
              <div className="text-lg font-mono font-black text-cyan-400">
                {formatSecs(totalMatchSecs)}
              </div>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Tags Made</div>
              <div className="text-lg font-mono font-black text-rose-400">
                {caughtRunners.length}
              </div>
            </div>
          </div>
        </div>

        {/* MVP Highlights */}
        {(topEscapeArtist || (topHunter && topHunter.tagsCount > 0)) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {topEscapeArtist && (
              <div className="p-3.5 bg-slate-900 border border-amber-500/30 rounded-2xl flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase text-amber-400">
                    TOP ESCAPE ARTIST
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{topEscapeArtist.name}</span>
                    <span className="text-xs font-mono text-slate-400">
                      ({formatSecs(topEscapeArtist.survivalSecs)})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {topHunter && topHunter.tagsCount > 0 && (
              <div className="p-3.5 bg-slate-900 border border-rose-500/30 rounded-2xl flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase text-rose-400">
                    DEADLIEST HUNTER
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{topHunter.name}</span>
                    <span className="text-xs font-mono text-slate-400">
                      ({topHunter.tagsCount} tag{topHunter.tagsCount > 1 ? 's' : ''})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Runner Scoreboard with Exact Timings */}
        <div className="flex flex-col gap-2 p-4 bg-slate-900 rounded-2xl border border-slate-800">
          <div className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Runner Survival Leaderboard</span>
            </span>
            <span className="text-[10px] text-slate-500 font-normal">Survival Time</span>
          </div>

          <div className="flex flex-col gap-1.5 mt-1">
            {runnerStats.map((r, idx) => (
              <div
                key={r.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-slate-500 w-4">#{idx + 1}</span>
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: r.color || '#10B981' }}
                  />
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{r.name}</span>
                      {!r.isCaught && <span className="text-xs">👑</span>}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {r.isCaught ? (
                        <span>Caught by <strong className="text-slate-200">{r.caughtBy || 'Hunter'}</strong></span>
                      ) : (
                        <span className="text-emerald-400">Evaded All Hunters</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <span className="font-mono font-bold text-sm text-cyan-400">
                    {formatSecs(r.survivalSecs)}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded mt-0.5 ${
                      r.isCaught
                        ? 'bg-rose-950 text-rose-300 border border-rose-800/40'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                    }`}
                  >
                    {r.isCaught ? 'CAPTURED' : 'SURVIVED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rematch Button */}
        {isHost ? (
          <button
            onClick={onResetGame}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REMATCH IN LOBBY</span>
          </button>
        ) : (
          <div className="text-center text-xs text-slate-500 p-2">
            Awaiting host to initiate rematch...
          </div>
        )}
      </div>
    </div>
  );
}

