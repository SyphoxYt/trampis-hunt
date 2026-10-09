import React, { useState, useEffect } from 'react';
import {
  Trophy,
  History,
  Trash2,
  X,
  Target,
  Shield,
  Clock,
  Award,
  Calendar,
  Flame
} from 'lucide-react';

export default function MatchHistoryModal({
  isOpen,
  onClose,
  playerName
}) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('trampis_hunt_history');
        if (stored) {
          setHistory(JSON.parse(stored));
        } else {
          setHistory([]);
        }
      } catch (e) {
        setHistory([]);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearHistory = () => {
    if (window.confirm('Clear all local hunt history and season records? This cannot be undone.')) {
      localStorage.removeItem('trampis_hunt_history');
      setHistory([]);
    }
  };

  // Compute Career / Season Stats
  const totalHunts = history.length;
  const runnerHunts = history.filter((h) => h.myRole === 'runner');
  const runnerEscapes = runnerHunts.filter(
    (h) => !h.myCaught && (h.winner === 'runners_escaped' || h.winner === 'runners_evaded')
  );
  const bestSurvivalSecs = history.reduce((max, h) => Math.max(max, h.mySurvivalSeconds || 0), 0);

  const hunterHunts = history.filter((h) => h.myRole === 'hunter');
  const totalCatchesMade = history.reduce((acc, h) => {
    if (h.runners) {
      const catchesByMe = h.runners.filter((r) => r.caughtBy === playerName).length;
      return acc + catchesByMe;
    }
    return acc;
  }, 0);

  const wins = history.filter((h) => {
    if (h.myRole === 'runner' && (h.winner === 'runners_escaped' || h.winner === 'runners_evaded')) return true;
    if (h.myRole === 'hunter' && h.winner === 'hunters_win') return true;
    return false;
  }).length;

  const winRate = totalHunts > 0 ? Math.round((wins / totalHunts) * 100) : 0;

  const formatSecs = (secs) => {
    if (!secs) return '0m';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Match History & Season Record</span>
              </h3>
              <p className="text-xs text-slate-400">Past hunt records, survival times & stats</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 touch-scroll overflow-y-auto overscroll-contain flex flex-col gap-5">
          {/* Season Stats Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center flex flex-col justify-center">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Total Hunts</div>
              <div className="text-xl font-mono font-black text-white mt-0.5">{totalHunts}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">{winRate}% Win Rate</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center flex flex-col justify-center">
              <div className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Escapes</div>
              <div className="text-xl font-mono font-black text-emerald-400 mt-0.5">
                {runnerEscapes.length} / {runnerHunts.length}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">As Runner</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center flex flex-col justify-center">
              <div className="text-[10px] font-mono text-rose-400 uppercase font-bold">Tags Made</div>
              <div className="text-xl font-mono font-black text-rose-400 mt-0.5">{totalCatchesMade}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">As Hunter</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center flex flex-col justify-center">
              <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Best Survival</div>
              <div className="text-xl font-mono font-black text-cyan-400 mt-0.5">
                {formatSecs(bestSurvivalSecs)}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">Personal Record</div>
            </div>
          </div>

          {/* Recent Match Log Section */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Recent Hunts ({history.length})</span>
              </span>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-mono transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center flex flex-col items-center justify-center gap-1.5">
                <History className="w-8 h-8 text-slate-700" />
                <div className="text-xs font-bold text-slate-400 mt-1">No hunt records yet</div>
                <div className="text-[11px] text-slate-500">
                  Complete your first tactical hunt to record your stats!
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {history.map((match, idx) => {
                  const isRunner = match.myRole === 'runner';
                  const matchWon =
                    (isRunner && (match.winner === 'runners_escaped' || match.winner === 'runners_evaded')) ||
                    (!isRunner && match.winner === 'hunters_win');
                  const matchDate = new Date(match.timestamp || Date.now()).toLocaleDateString(
                    undefined,
                    { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                  );

                  return (
                    <div
                      key={match.id || idx}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            matchWon
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : match.winner === 'ended_by_host'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {matchWon ? 'WIN' : match.winner === 'ended_by_host' ? 'END' : 'LOSS'}
                        </div>

                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{isRunner ? '🏃 Runner' : '🚔 Hunter'}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                              {match.roomCode || 'MATCH'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {matchDate} • Duration: {formatSecs(match.matchDurationSeconds || 0)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {isRunner ? (
                          <div
                            className={`text-xs font-mono font-bold ${
                              match.myCaught ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {match.myCaught ? 'CAUGHT' : 'SURVIVED'}
                          </div>
                        ) : (
                          <div className="text-xs font-mono font-bold text-cyan-400">
                            {match.huntersCaughtCount || 0} TAG(S)
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 font-mono">
                          {match.survivorsCount !== undefined
                            ? `${match.survivorsCount} survived`
                            : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition active:scale-95 cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
