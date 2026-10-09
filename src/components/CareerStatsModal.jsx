import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Award,
  History,
  Trash2,
  X,
  Shield,
  Target,
  Clock,
  User,
  Palette,
  Check
} from 'lucide-react';

export const AVATAR_OPTIONS = ['🥷', '🏃', '🦊', '⚡', '🐆', '🦅', '🎯', '🕵️', '🐺', '👻', '🔥', '💀'];

export const COLOR_OPTIONS = [
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Crimson', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Lime', hex: '#84CC16' }
];

export default function CareerStatsModal({
  isOpen,
  onClose,
  playerName,
  playerColor,
  playerAvatar,
  onUpdateColor,
  onUpdateAvatar
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
    if (window.confirm('Clear all local hunt history and season records?')) {
      localStorage.removeItem('trampis_hunt_history');
      setHistory([]);
    }
  };

  // Compute Career / Season Stats
  const totalHunts = history.length;
  const runnerHunts = history.filter((h) => h.myRole === 'runner');
  const runnerEscapes = runnerHunts.filter((h) => !h.myCaught && h.winner === 'runners_escaped');
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
    if (h.myRole === 'runner' && h.winner === 'runners_escaped') return true;
    if (h.myRole === 'hunter' && h.winner === 'hunters_win') return true;
    return false;
  }).length;

  const winRate = totalHunts > 0 ? Math.round((wins / totalHunts) * 100) : 0;

  const formatSecs = (secs) => {
    if (!secs) return '0m';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Operative Dossier & Season Record</span>
              </h3>
              <p className="text-xs text-slate-400">Personal stats, bragging rights & recent matches</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 touch-scroll overflow-y-auto overscroll-contain flex flex-col gap-5">
          {/* Custom Identity / Marker Avatar & Color Picker */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tactical Marker Identity</span>
              </span>
              <span className="text-slate-500 font-normal">Shows on live map</span>
            </div>

            {/* Avatar Row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  key={av}
                  onClick={() => onUpdateAvatar(av)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition flex-shrink-0 active:scale-90 ${
                    playerAvatar === av
                      ? 'bg-slate-800 border-2 border-cyan-400 scale-105 shadow-md'
                      : 'bg-slate-900 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>

            {/* Color Swatches */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1">
              {COLOR_OPTIONS.map((col) => (
                <button
                  key={col.hex}
                  onClick={() => onUpdateColor(col.hex)}
                  style={{ backgroundColor: col.hex }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition active:scale-90 ${
                    playerColor === col.hex ? 'ring-3 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={col.name}
                >
                  {playerColor === col.hex && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Season Stats Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Total Hunts</div>
              <div className="text-xl font-mono font-black text-white mt-0.5">{totalHunts}</div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Win Rate</div>
              <div className="text-xl font-mono font-black text-emerald-400 mt-0.5">{winRate}%</div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Best Escape</div>
              <div className="text-sm font-mono font-bold text-cyan-400 mt-1.5">{formatSecs(bestSurvivalSecs)}</div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Total Tags</div>
              <div className="text-xl font-mono font-black text-rose-400 mt-0.5">{totalCatchesMade}</div>
            </div>
          </div>

          {/* Recent Match Log / Hunt History */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-400 px-1">
              <span className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span>Recent Hunts ({history.length})</span>
              </span>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                No completed hunts logged yet. Play a match to record your escape and capture history!
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {history.map((entry) => {
                  const didIWin =
                    (entry.myRole === 'runner' && entry.winner === 'runners_escaped') ||
                    (entry.myRole === 'hunter' && entry.winner === 'hunters_win');

                  return (
                    <div
                      key={entry.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                              didIWin
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {didIWin ? 'VICTORY' : 'DEFEAT'}
                          </span>
                          <span className="font-bold text-white">
                            {entry.winner === 'runners_escaped' ? 'Runners Escaped' : 'Hunters Dominated'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {entry.date} • {entry.time}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono pt-0.5 border-t border-slate-900">
                        <span>
                          Role: <strong className="text-white uppercase">{entry.myRole}</strong>
                          {entry.myRole === 'runner' && ` (Survived: ${formatSecs(entry.mySurvivalSeconds)})`}
                        </span>
                        <span>Duration: {formatSecs(entry.durationSeconds)}</span>
                      </div>

                      {/* Debrief tags */}
                      {entry.runners && entry.runners.length > 0 && (
                        <div className="text-[10px] text-slate-400 flex flex-wrap gap-1.5 pt-1">
                          {entry.runners.map((r, i) => (
                            <span
                              key={i}
                              className={`px-1.5 py-0.5 rounded font-mono ${
                                r.isCaught ? 'bg-rose-950/60 text-rose-300' : 'bg-emerald-950/60 text-emerald-300'
                              }`}
                            >
                              {r.name}: {r.isCaught ? `Caught by ${r.caughtBy || 'Hunter'}` : 'Escaped!'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-95"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
