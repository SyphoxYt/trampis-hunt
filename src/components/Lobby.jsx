import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Users,
  Shuffle,
  Play,
  Copy,
  Check,
  Settings,
  Footprints,
  Car,
  ArrowLeft,
  BookOpen,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  UserCheck,
  UserX,
  Palette,
  Trophy
} from 'lucide-react';
import { sound } from '../services/sound';

export default function Lobby({
  room,
  playerId,
  onSetRole,
  onRandomizeTeams,
  onUpdateSettings,
  onStartGame,
  onLeaveRoom,
  onOpenRules,
  onKickPlayer,
  onAutoSplitUnassigned,
  onOpenCareerStats,
  serverIp
}) {
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [shuffleMode, setShuffleMode] = useState('balanced');

  const isHost = room.hostId === playerId;
  const players = Object.values(room.players || {});
  const runners = players.filter((p) => p.role === 'runner');
  const hunters = players.filter((p) => p.role === 'hunter');
  const unassigned = players.filter((p) => p.role !== 'runner' && p.role !== 'hunter');

  const durationMinutes = room.settings?.gameDurationMinutes || 60;
  const pinIntervalMinutes = room.settings?.pinIntervalMinutes || 10;

  // Always use production URL for QR codes & share links so they work cross-play
  // (on APK, window.location.origin is "capacitor://localhost" which is useless)
  const PRODUCTION_URL = 'https://trampis-hunt.onrender.com';
  const isLocalDev = typeof window !== 'undefined'
    && window.location.hostname === 'localhost'
    && window.location.port;
  const baseUrl = isLocalDev ? window.location.origin : PRODUCTION_URL;
  const joinUrl = `${baseUrl}?join=${room.code}`;

  const copyCode = () => {
    navigator.clipboard?.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getValidationWarning = () => {
    if (players.length < 2) {
      return `Waiting for friend group (${players.length}/2+). Share Room Code "${room.code}" or the QR code!`;
    }
    if (runners.length === 0 && hunters.length === 0) {
      return 'No teams assigned yet. Click "Randomize Teams" to split the group!';
    }
    if (runners.length === 0) {
      return 'Need at least 1 Runner on foot. Click "Join Runners" or "Randomize Teams".';
    }
    if (hunters.length === 0) {
      return 'Need at least 1 Hunter. Click "Join Hunters" or "Randomize Teams".';
    }
    return null;
  };

  const validationWarning = getValidationWarning();
  const canStart = !validationWarning;

  const handleStartClick = () => {
    if (!canStart) {
      sound.playErrorBuzz();
      setValidationError(validationWarning);
      setTimeout(() => setValidationError(''), 4500);
      return;
    }
    setValidationError('');
    onStartGame();
  };

  const handleShuffleClick = () => {
    onRandomizeTeams(shuffleMode);
  };

  return (
    <div className="w-full h-full touch-scroll overflow-y-auto overscroll-contain animate-fadeIn">
      <div className="max-w-xl mx-auto flex flex-col gap-4 p-4 sm:p-6 pb-36">
        {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onLeaveRoom}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Menu</span>
        </button>

        <button
          onClick={onOpenRules}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-400 border border-cyan-800/60 text-xs font-semibold transition active:scale-95 shadow-sm"
        >
          <BookOpen className="w-4 h-4" />
          <span>Field Rules</span>
        </button>
      </div>

      {/* Main Room Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="Trampis Hunt Logo"
              className="w-13 h-13 rounded-2xl border border-slate-700 shadow-md object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  LOBBY
                </span>
                <span className="text-xs text-slate-400 font-mono font-semibold">
                  {players.length} Player{players.length !== 1 ? 's' : ''}
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white mt-1">
                Trampis Hunt
              </h1>
              <p className="text-xs text-slate-400">
                {durationMinutes >= 60 ? `${durationMinutes / 60}h` : `${durationMinutes}m`} Match • {pinIntervalMinutes}m Ping Drops
              </p>
            </div>
          </div>

          {/* Quick QR Invite Button */}
          <button
            onClick={() => setShowQrModal(true)}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-2xl transition border border-slate-700 flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-200 active:scale-95 cursor-pointer"
            title="Scan to Join"
          >
            <div className="p-1 bg-white rounded-lg">
              <QRCodeSVG value={joinUrl} size={36} />
            </div>
            <span>Invite</span>
          </button>
        </div>

        {/* Room Code Display */}
        <div className="mt-4 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
              ROOM CODE
            </div>
            <div className="text-2xl font-mono font-black tracking-widest text-emerald-400">
              {room.code}
            </div>
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition active:scale-95 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Share Code'}</span>
          </button>
        </div>
      </div>

      {/* Team Balance Actions & Shuffle Mode Selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Runners: <strong className="text-emerald-400">{runners.length}</strong></span>
            <span>•</span>
            <span>Hunters: <strong className="text-blue-400">{hunters.length}</strong></span>
          </div>

          {isHost && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Hunt Duration & Intervals"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleShuffleClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500 text-slate-200 text-xs font-bold transition shadow-sm active:scale-95"
              >
                <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Shuffle Teams</span>
              </button>
            </div>
          )}
        </div>

        {/* Shuffle Mode Selector for Friend Groups */}
        {isHost && (
          <div className="p-2.5 bg-slate-900/70 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
              Split Mode:
            </span>
            <div className="grid grid-cols-4 gap-1 sm:flex sm:gap-1.5">
              {[
                { id: 'balanced', label: 'Balanced' },
                { id: 'solo_runner', label: 'Solo' },
                { id: 'duo_runner', label: 'Duo' },
                { id: '50_50', label: '50/50' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setShuffleMode(m.id);
                    onRandomizeTeams(m.id);
                  }}
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-mono font-bold transition text-center active:scale-95 ${
                    shuffleMode === m.id
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Host Settings (Duration up to 3 Hours!) */}
      {isHost && showSettings && (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-lg animate-fadeIn">
          <div className="text-xs font-bold text-slate-200 flex items-center gap-2 font-mono">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Hunt Duration & Schedule (Max 3 Hours)</span>
          </div>

          {/* Duration Presets */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                Game Duration
              </label>
              <span className="text-xs font-mono font-black text-cyan-400">
                {durationMinutes >= 60 ? `${(durationMinutes / 60).toFixed(1)} Hours` : `${durationMinutes} Minutes`}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5 mt-1.5">
              {[
                { label: '30m', val: 30 },
                { label: '45m', val: 45 },
                { label: '1h', val: 60 },
                { label: '1.5h', val: 90 },
                { label: '2h', val: 120 },
                { label: '2.5h', val: 150 },
                { label: '3h (Max)', val: 180 }
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => onUpdateSettings({ gameDurationMinutes: opt.val })}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition active:scale-95 ${
                    durationMinutes === opt.val
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-md font-bold'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom Duration Slider */}
            <div className="mt-4 p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400 font-bold uppercase">Fine Tune Time</span>
                <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 font-black">
                  {durationMinutes >= 60
                    ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60 > 0 ? `${durationMinutes % 60}m` : ''}`.trim()
                    : `${durationMinutes}m`}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <span className="text-[10px] font-mono font-bold text-slate-500">15m</span>
                <div className="flex-1 relative flex items-center">
                  <input
                    type="range"
                    min="15"
                    max="180"
                    step="5"
                    value={durationMinutes}
                    onChange={(e) => onUpdateSettings({ gameDurationMinutes: Number(e.target.value) })}
                    className="tactical-slider cursor-pointer"
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-500">3h (180m)</span>
              </div>

              {/* Progress visual steps */}
              <div className="flex justify-between px-1 text-[9px] font-mono text-slate-600">
                <span>| 30m</span>
                <span>| 1h</span>
                <span>| 1.5h</span>
                <span>| 2h</span>
                <span>| 2.5h</span>
                <span>| 3h</span>
              </div>
            </div>
          </div>

          {/* Pin Drop Interval */}
          <div className="pt-2 border-t border-slate-800">
            <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
              Pin Drop Interval
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mt-1.5">
              {[
                { label: '1m (Test)', val: 1 },
                { label: '3m', val: 3 },
                { label: '5m', val: 5 },
                { label: '10m (Std)', val: 10 },
                { label: '15m (Stealth)', val: 15 }
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => onUpdateSettings({ pinIntervalMinutes: opt.val })}
                  className={`py-2 px-1 text-center rounded-xl text-[11px] font-semibold border transition active:scale-95 ${
                    pinIntervalMinutes === opt.val
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-md font-bold'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Friend Group Team Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Runners Column (Emerald Theme) */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-900/80 border border-emerald-900/40">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Footprints className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-emerald-300">
                Runners (On Foot)
              </span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50">
              {runners.length}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 mt-1 min-h-[80px]">
            {runners.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{p.avatar || '🏃'}</span>
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color || '#10B981' }}
                  />
                  <span className="font-semibold text-slate-200">
                    {p.name} {p.id === playerId ? '(You)' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {p.id === room.hostId && (
                    <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded">
                      HOST
                    </span>
                  )}
                  {isHost && p.id !== playerId && (
                    <button
                      onClick={() => onKickPlayer && onKickPlayer(p.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                      title={`Kick ${p.name}`}
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {runners.length === 0 && (
              <div className="text-center py-4 text-xs text-slate-500 italic">
                No runners assigned yet.
              </div>
            )}
          </div>

          <button
            onClick={() => onSetRole('runner')}
            className="mt-1 w-full py-2 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition active:scale-95"
          >
            Join Runners
          </button>
        </div>

        {/* Hunters Column (Cobalt Theme) */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-900/80 border border-blue-900/40">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                <Car className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-blue-300">
                Hunters (Vehicle/Foot)
              </span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/50">
              {hunters.length}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 mt-1 min-h-[80px]">
            {hunters.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{p.avatar || '🚔'}</span>
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color || '#3B82F6' }}
                  />
                  <span className="font-semibold text-slate-200">
                    {p.name} {p.id === playerId ? '(You)' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {p.id === room.hostId && (
                    <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded">
                      HOST
                    </span>
                  )}
                  {isHost && p.id !== playerId && (
                    <button
                      onClick={() => onKickPlayer && onKickPlayer(p.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                      title={`Kick ${p.name}`}
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {hunters.length === 0 && (
              <div className="text-center py-4 text-xs text-slate-500 italic">
                No hunters assigned yet.
              </div>
            )}
          </div>

          <button
            onClick={() => onSetRole('hunter')}
            className="mt-1 w-full py-2 rounded-xl text-xs font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 transition active:scale-95"
          >
            Join Hunters
          </button>
        </div>
      </div>

      {/* Unassigned Notification */}
      {unassigned.length > 0 && (
        <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-4 h-4 text-slate-400" />
            <span>Unassigned ({unassigned.length}): {unassigned.map((p) => p.name).join(', ')}</span>
          </div>
          {isHost && (
            <button
              onClick={() => onAutoSplitUnassigned ? onAutoSplitUnassigned() : handleShuffleClick()}
              className="text-xs text-cyan-400 font-bold hover:underline cursor-pointer"
            >
              Auto-Split
            </button>
          )}
        </div>
      )}

      {/* Error / Failsafe Message Banner */}
      {validationError && (
        <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-2xl text-xs text-rose-300 flex items-center gap-2.5 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 animate-bounce" />
          <span className="leading-tight font-medium">{validationError}</span>
        </div>
      )}

      {/* Launch Action */}
      {isHost ? (
        <div className="flex flex-col gap-2">
          {validationWarning && (
            <div className="text-[11px] font-mono text-amber-400/90 bg-amber-950/40 p-2.5 rounded-xl border border-amber-900/60 flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>{validationWarning}</span>
            </div>
          )}

          <button
            onClick={handleStartClick}
            className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
              canStart
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 cursor-pointer border border-slate-700'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>START THE HUNT ({players.length} PLAYERS)</span>
          </button>
        </div>
      ) : (
        <div className="text-center py-3.5 px-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Awaiting host to launch the hunt...</span>
        </div>
      )}
      </div>

      {/* QR Code Invite Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-800 shadow-2xl flex flex-col items-center text-center">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="w-12 h-12 rounded-xl mb-2 border border-cyan-500/40"
            />
            <h3 className="text-lg font-serif font-black text-white">
              Scan to Join Trampis Hunt
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Friends can point their mobile camera to join Room <strong>{room.code}</strong>.
            </p>

            <div className="p-4 bg-white rounded-2xl shadow-inner mt-4">
              <QRCodeSVG value={joinUrl} size={180} />
            </div>

            <div className="mt-3 text-xs font-mono text-slate-300 break-all select-all">
              {joinUrl}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
