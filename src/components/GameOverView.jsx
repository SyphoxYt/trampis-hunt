import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Footprints, Car, RotateCcw, ShieldCheck, ArrowLeft } from 'lucide-react';
import { sound } from '../services/sound';

export default function GameOverView({ room, playerId, onResetGame, onLeaveRoom }) {
  const isHost = room?.hostId === playerId;
  const players = Object.values(room?.players || {});
  const runners = players.filter((p) => p.role === 'runner');
  const caughtRunners = runners.filter((p) => p.isCaught);
  const survivedRunners = runners.filter((p) => !p.isCaught);

  const didRunnersWin = survivedRunners.length > 0;

  useEffect(() => {
    try {
      sound.playVictory();
    } catch (e) {}
    try {
      if (typeof window !== 'undefined') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (e) {
      console.warn('Confetti effect note:', e);
    }
  }, []);

  return (
    <div className="w-full h-full touch-scroll overflow-y-auto overscroll-contain">
      <div className="w-full max-w-lg mx-auto flex flex-col gap-4 p-4 sm:p-6 pb-36 animate-fadeIn">
      {/* Top Back Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={onLeaveRoom}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Menu</span>
        </button>
      </div>

      {/* Trophy Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500/20 to-cyan-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
          <Trophy className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-serif font-black text-white mt-3">
          {didRunnersWin ? 'RUNNERS EVADED & WON!' : 'HUNTERS DOMINATED!'}
        </h2>

        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          {didRunnersWin
            ? `${survivedRunners.length} runner(s) remained free when time expired!`
            : 'Every runner was tracked down and captured!'}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mt-5 text-center">
          <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Survivors</div>
            <div className="text-lg font-mono font-black text-emerald-400">
              {survivedRunners.length} / {runners.length}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Pins Dropped</div>
            <div className="text-lg font-mono font-black text-cyan-400">
              {room.gameState?.pinHistory?.length || 0}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Tags</div>
            <div className="text-lg font-mono font-black text-rose-400">
              {caughtRunners.length}
            </div>
          </div>
        </div>
      </div>

      {/* Runner Debrief List */}
      <div className="flex flex-col gap-2 p-4 bg-slate-900 rounded-2xl border border-slate-800">
        <div className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Runner Debrief</span>
        </div>

        <div className="flex flex-col gap-1.5 mt-1">
          {runners.map((r) => (
            <div
              key={r.id}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <Footprints className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-200">{r.name}</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  r.isCaught
                    ? 'bg-rose-950 text-rose-300 border border-rose-800/40'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                }`}
              >
                {r.isCaught ? `Tagged by ${r.caughtBy || 'Hunter'}` : 'SURVIVED'}
              </span>
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
        <div className="text-center text-xs text-slate-500">
          Awaiting host to initiate rematch...
        </div>
      )}
      </div>
    </div>
  );
}
