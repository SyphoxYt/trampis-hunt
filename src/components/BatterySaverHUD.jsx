import React from 'react';
import { BatteryCharging, Eye, Clock, ShieldAlert, Target, Zap, Sparkles, Plane, Radar } from 'lucide-react';

export default function BatterySaverHUD({
  userRole,
  player,
  timeLeftFormatted,
  gameTimeFormatted,
  activeRunnersCount,
  nearestDistanceFormatted,
  onExit,
  onUsePowerup,
  isWarningActive
}) {
  return (
    <div className="fixed inset-0 z-[1500] bg-black text-white flex flex-col justify-between p-6 select-none animate-fadeIn">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <BatteryCharging className="w-5 h-5 text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-emerald-400">
            AMOLED STEALTH / BATTERY SAVER
          </span>
        </div>
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono font-bold text-cyan-400 active:scale-95"
        >
          <Eye className="w-4 h-4" />
          <span>Show Map</span>
        </button>
      </div>

      {/* Warning banner if active */}
      {isWarningActive && (
        <div className="p-3 bg-rose-950 border border-rose-600 rounded-2xl text-center text-rose-300 font-mono font-black text-sm animate-pulse">
          ⚠️ 30-SECOND PIN WARNING: FIND COVER!
        </div>
      )}

      {/* Large Clocks */}
      <div className="flex flex-col gap-6 text-center my-auto">
        <div>
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            NEXT PIN REVEAL
          </div>
          <div className="text-6xl font-mono font-black tracking-tight text-emerald-400 mt-1">
            {timeLeftFormatted}
          </div>
        </div>

        <div>
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            HUNT REMAINING
          </div>
          <div className="text-4xl font-mono font-bold text-zinc-300 mt-1">
            {gameTimeFormatted}
          </div>
        </div>

        {nearestDistanceFormatted && (
          <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center gap-2 text-cyan-400 font-mono text-lg font-black">
            <Target className="w-5 h-5" />
            <span>Target Distance: {nearestDistanceFormatted}</span>
          </div>
        )}
      </div>

      {/* Bottom Gear Triggers */}
      <div className="pt-4 border-t border-zinc-800 flex items-center justify-around text-xs font-mono">
        <span className="text-zinc-500">Audio & GPS Live</span>
        <button
          onClick={onExit}
          className="px-6 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-white font-bold"
        >
          Resume Full Map View
        </button>
      </div>
    </div>
  );
}
