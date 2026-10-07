import React from 'react';
import {
  BookOpen,
  Footprints,
  Car,
  Radio,
  Shield,
  Zap,
  Plane,
  Radar,
  Trophy,
  X,
  Target
} from 'lucide-react';

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fadeIn select-none">
      <div className="bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-black text-white">
                Trampis Hunt — Field Manual
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Real-world GPS pursuit protocol
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 flex flex-col gap-4 text-xs text-slate-300 leading-relaxed">
          {/* Quick Overview Banner */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 flex items-start gap-3">
            <Trophy className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Core Objective:</strong>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Runners must survive the countdown on foot. Hunters must track, intercept, and tag every runner before the timer expires.
              </p>
            </div>
          </div>

          {/* Section 1: Runners */}
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-900/50 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Footprints className="w-4 h-4" />
              <span>RUNNER PROTOCOL (On Foot)</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
              <li><strong className="text-white">Foot travel only:</strong> No cars, electric scooters, or public transit.</li>
              <li><strong className="text-white">10-Minute Ping:</strong> Your GPS location broadcasts to all hunters every 10 minutes.</li>
              <li><strong className="text-white">30s Warning Alert:</strong> An alarm rings 30 seconds before every ping so you can scatter!</li>
              <li><strong className="text-emerald-400">👻 Decoy Pin:</strong> Drop a fake location pin anywhere on the map to fool hunters.</li>
              <li><strong className="text-cyan-400">⚡ Radar Jammer:</strong> Scrambles the hunters' radar to delay your next ping by +3 minutes.</li>
            </ul>
          </div>

          {/* Section 2: Hunters */}
          <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-900/50 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Car className="w-4 h-4" />
              <span>HUNTER PROTOCOL (Pursuers)</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
              <li><strong className="text-white">Mobility:</strong> May pursue in cars, bikes, or on foot.</li>
              <li><strong className="text-white">Dynamic Radar:</strong> Map displays runner pins with growing uncertainty circles showing where they could have fled.</li>
              <li><strong className="text-white">Teammate Coordination:</strong> Hunters see each other's live markers to set up road blocks.</li>
              <li><strong className="text-cyan-400">🛰️ Drone Recon Scan:</strong> Call in an overhead drone sweep to reveal instant runner positions!</li>
              <li><strong className="text-blue-400">📡 Perimeter Tripwires:</strong> Place motion sensors on intersections that alert you if a runner passes within 50m!</li>
            </ul>
          </div>

          {/* Section 3: Tagging */}
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/50 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <Target className="w-4 h-4" />
              <span>TAGGING & VERIFICATION</span>
            </div>
            <p className="text-[11px] text-slate-300">
              When a hunter corners a runner, they can confirm the capture by:
            </p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
                <strong className="text-rose-400">1. Proximity Tag</strong>
                <p className="text-slate-400 mt-0.5">Within 25 meters, the "TAG RUNNER" button unlocks.</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
                <strong className="text-cyan-400">2. 4-Digit Passcode</strong>
                <p className="text-slate-400 mt-0.5">Type the runner's unique code shown on their screen.</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 font-black text-xs transition active:scale-98 shadow-lg cursor-pointer"
        >
          READY FOR THE HUNT
        </button>
      </div>
    </div>
  );
}
