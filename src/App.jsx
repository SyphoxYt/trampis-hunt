import React, { useState, useEffect, useRef } from 'react';
import socket, { getSavedServerUrl, reconnectToServer } from './services/socket';
import { locationTracker } from './services/geolocation';
import { sound } from './services/sound';
import Lobby from './components/Lobby';
import RunnerView from './components/RunnerView';
import HunterView from './components/HunterView';
import GameOverView from './components/GameOverView';
import RulesModal from './components/RulesModal';
import AvatarPickerModal from './components/AvatarPickerModal';
import MatchHistoryModal from './components/MatchHistoryModal';
import AvatarDisplay from './components/AvatarDisplay';
import {
  Moon,
  Sun,
  BookOpen,
  Wifi,
  WifiOff,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Radio,
  Server,
  Trophy,
  History,
  Camera
} from 'lucide-react';

export default function App() {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('trampis_player_name') || `Operative_${Math.floor(100 + Math.random() * 900)}`;
  });
  const [playerColor, setPlayerColor] = useState(() => {
    return localStorage.getItem('trampis_player_color') || '#10B981';
  });
  const [playerAvatar, setPlayerAvatar] = useState(() => {
    return localStorage.getItem('trampis_player_avatar') || '⚡';
  });
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showMatchHistory, setShowMatchHistory] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [teammateLocations, setTeammateLocations] = useState([]);
  const [spottedRunners, setSpottedRunners] = useState([]);
  const [invitedRoomCode, setInvitedRoomCode] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [serverIp, setServerIp] = useState('');
  const [showServerModal, setShowServerModal] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(() => getSavedServerUrl());

  const lastSpottedVibrateRef = useRef(0);

  // Mobile AudioContext auto-unlock on first user interaction
  useEffect(() => {
    const unlockAudio = () => {
      sound.init();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Active Tactical Ability Banner displayed to everyone on both teams
  const [activeAbilityBanner, setActiveAbilityBanner] = useState(null);

  const handleNameChange = (val) => {
    setPlayerName(val);
    localStorage.setItem('trampis_player_name', val);
  };

  const showAbilityBanner = (bannerData) => {
    setActiveAbilityBanner(bannerData);
    setTimeout(() => {
      setActiveAbilityBanner((prev) => (prev?.id === bannerData.id ? null : prev));
    }, 6000);
  };

  // Socket Connection and Event Listeners
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setPlayerId(socket.id);

      // Reconnect to active room if phone woke up from background
      const savedCode = localStorage.getItem('trampis_active_room');
      const savedName = localStorage.getItem('trampis_player_name');
      const savedToken = localStorage.getItem('trampis_session_token');
      if (savedCode) {
        socket.emit('reconnect_room', { roomCode: savedCode, playerId: socket.id, playerName: savedName, sessionToken: savedToken }, (res) => {
          if (res?.success) {
            setRoom(res.room);
            if (res.sessionToken) localStorage.setItem('trampis_session_token', res.sessionToken);
          } else {
            localStorage.removeItem('trampis_active_room');
            localStorage.removeItem('trampis_session_token');
          }
        });
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onRoomUpdated = (updatedRoom) => {
      setRoom(updatedRoom);
    };

    const onGameStarted = (updatedRoom) => {
      setRoom(updatedRoom);
      sound.playSonarPing();
      showAbilityBanner({
        id: `start_${Date.now()}`,
        title: '🚨 THE HUNT HAS COMMENCED',
        desc: 'Runners on foot must evade capture! Hunters have begun pursuit.',
        type: 'danger'
      });
    };

    const onPinWarning = () => {
      sound.playWarningTick(true);
      sound.vibrate(200);
    };

    const onMandatoryPinDropped = ({ room: updatedRoom }) => {
      setRoom(updatedRoom);
      sound.playSonarPing();
      sound.vibrate([150, 100, 150]);
      showAbilityBanner({
        id: `pin_${Date.now()}`,
        title: '📍 MANDATORY RADAR PIN DROP',
        desc: 'Runner GPS coordinates have been broadcasted to all hunters!',
        type: 'warning'
      });
    };

    // Universal Ability Broadcast received by ALL PLAYERS on BOTH TEAMS!
    const onUniversalAbilityAlert = (alertData) => {
      // Use functional state access to avoid stale closure on room
      setRoom((currentRoom) => {
        const myRole = currentRoom?.players?.[socket.id]?.role;
        const isRunner = myRole === 'runner';
        const desc = isRunner ? alertData.runnerDesc : alertData.hunterDesc;

        let bannerType = 'info';
        if (alertData.ability === 'drone') {
          sound.playDroneScan();
          sound.vibrate([100, 50, 100]);
          bannerType = isRunner ? 'danger' : 'success';
        } else if (alertData.ability === 'tripwire') {
          sound.playTripwireAlert();
          sound.vibrateTripwire();
          bannerType = 'danger';
        } else if (alertData.ability === 'jammer') {
          sound.playJammerNoise();
          bannerType = isRunner ? 'success' : 'warning';
        } else if (alertData.ability === 'decoy') {
          sound.playRadioChirp();
          bannerType = 'info';
        }

        showAbilityBanner({
          id: `ab_${Date.now()}`,
          title: alertData.title,
          desc: desc || alertData.title,
          user: alertData.user,
          type: bannerType
        });

        return currentRoom; // don't mutate, just read
      });
    };

    const onRunnerTagged = ({ runnerName, hunterName, room: updatedRoom }) => {
      setRoom(updatedRoom);
      sound.playCaptureKlaxon();
      sound.vibrateTagged();
      showAbilityBanner({
        id: `tag_${Date.now()}`,
        title: '🎯 RUNNER CAPTURED!',
        desc: `Hunter ${hunterName} tracked down and tagged ${runnerName}!`,
        type: 'danger'
      });
    };

    const onGameEnded = ({ room: updatedRoom, reason }) => {
      setRoom(updatedRoom);
      if (updatedRoom?.gameState) {
        try {
          const myPlayer = updatedRoom.players?.[socket.id];
          const startedAt = updatedRoom.gameState.startedAt || Date.now();
          const endedAt = updatedRoom.gameState.endedAt || Date.now();
          const durationSeconds = Math.max(0, Math.round((endedAt - startedAt) / 1000));
          const mySurvivalSeconds = myPlayer?.role === 'runner'
            ? (myPlayer.isCaught && myPlayer.caughtAt ? Math.max(0, Math.round((myPlayer.caughtAt - startedAt) / 1000)) : durationSeconds)
            : 0;

          const runnersList = Object.values(updatedRoom.players || {})
            .filter((p) => p.role === 'runner')
            .map((r) => ({
              id: r.id,
              name: r.name,
              isCaught: !!r.isCaught,
              caughtBy: r.caughtBy || null
            }));

          const matchEntry = {
            id: `hunt_${Date.now()}`,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            winner: updatedRoom.gameState.winner || 'unknown',
            reason: reason || updatedRoom.gameState.endReason || 'Time expired',
            myRole: myPlayer?.role || 'spectator',
            myCaught: !!myPlayer?.isCaught,
            mySurvivalSeconds,
            durationSeconds,
            runners: runnersList
          };

          const historyStr = localStorage.getItem('trampis_hunt_history');
          const history = historyStr ? JSON.parse(historyStr) : [];
          const updatedHistory = [matchEntry, ...history.filter((h) => h.id !== matchEntry.id)].slice(0, 30);
          localStorage.setItem('trampis_hunt_history', JSON.stringify(updatedHistory));
        } catch (e) {
          console.error('Error logging match history:', e);
        }
      }
    };

    const onHunterLocationUpdated = ({ hunterId, hunterName, location, color, avatar }) => {
      setTeammateLocations((prev) => {
        const filtered = prev.filter((t) => t.id !== hunterId);
        return [...filtered, { id: hunterId, name: hunterName, location, color, avatar }];
      });
    };

    const onRunnerLocationUpdated = ({ runnerId, runnerName, location, color, avatar }) => {
      setTeammateLocations((prev) => {
        const filtered = prev.filter((t) => t.id !== runnerId);
        return [...filtered, { id: runnerId, name: runnerName, location, color, avatar }];
      });
    };

    const onRunnerSpottedLive = ({ runnerId, runnerName, location, distance }) => {
      const now = Date.now();
      if (now - lastSpottedVibrateRef.current >= 8000) {
        lastSpottedVibrateRef.current = now;
        sound.vibrateSpotted();
      }
      setSpottedRunners((prev) => {
        const filtered = prev.filter((r) => r.runnerId !== runnerId);
        return [...filtered, { runnerId, runnerName, location, distance }];
      });
    };

    const onRunnerLostSight = ({ runnerId }) => {
      setSpottedRunners((prev) => prev.filter((r) => r.runnerId !== runnerId));
    };

    const onGameError = ({ message }) => {
      sound.playErrorBuzz();
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(''), 5000);
    };

    const onKickedFromRoom = ({ reason, message }) => {
      localStorage.removeItem('trampis_active_room');
      localStorage.removeItem('trampis_session_token');
      setRoom(null);
      sound.playErrorBuzz();
      setErrorMessage(reason || message || 'You were removed from the hunt room.');
      setTimeout(() => setErrorMessage(''), 5000);
    };

    const onQuickCommReceived = (msg) => {
      sound.playRadioChirp();
      showAbilityBanner({
        id: `comm_${Date.now()}`,
        title: `📻 RADIO COMMS • ${msg.senderName.toUpperCase()}`,
        desc: `"${msg.text}"`,
        type: 'info'
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_updated', onRoomUpdated);
    socket.on('game_started', onGameStarted);
    socket.on('pin_warning', onPinWarning);
    socket.on('mandatory_pin_dropped', onMandatoryPinDropped);
    socket.on('universal_ability_alert', onUniversalAbilityAlert);
    socket.on('quick_comm_received', onQuickCommReceived);
    socket.on('runner_tagged', onRunnerTagged);
    socket.on('game_ended', onGameEnded);
    socket.on('hunter_location_updated', onHunterLocationUpdated);
    socket.on('runner_location_updated', onRunnerLocationUpdated);
    socket.on('runner_spotted_live', onRunnerSpottedLive);
    socket.on('runner_lost_sight', onRunnerLostSight);
    socket.on('game_error', onGameError);
    socket.on('kicked_from_room', onKickedFromRoom);

    fetch('/api/ip')
      .then((res) => res.json())
      .then((data) => setServerIp(data.ip))
      .catch(() => {});

    // QR Code invite link handler: prefill room code, prompt for name, DO NOT auto-join!
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    if (joinCode) {
      const code = joinCode.trim().toUpperCase();
      setRoomCodeInput(code);
      setInvitedRoomCode(code);
      try { window.history.replaceState({}, '', window.location.pathname); } catch(e) {}
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_updated', onRoomUpdated);
      socket.off('game_started', onGameStarted);
      socket.off('pin_warning', onPinWarning);
      socket.off('mandatory_pin_dropped', onMandatoryPinDropped);
      socket.off('universal_ability_alert', onUniversalAbilityAlert);
      socket.off('runner_tagged', onRunnerTagged);
      socket.off('game_ended', onGameEnded);
      socket.off('hunter_location_updated', onHunterLocationUpdated);
      socket.off('runner_location_updated', onRunnerLocationUpdated);
      socket.off('runner_spotted_live', onRunnerSpottedLive);
      socket.off('runner_lost_sight', onRunnerLostSight);
      socket.off('game_error', onGameError);
      socket.off('kicked_from_room', onKickedFromRoom);
      socket.off('quick_comm_received', onQuickCommReceived);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- all handlers use functional state, no stale closures

  // GPS Tracking Loop — start once, responsive live tracking (1s throttle)
  useEffect(() => {
    let lastEmitTime = 0;
    const THROTTLE_MS = 1000; // 1 second updates for crisp live pursuit

    locationTracker.start(
      (loc) => {
        setUserLocation(loc);
        const now = Date.now();
        if (socket.connected && now - lastEmitTime >= THROTTLE_MS) {
          lastEmitTime = now;
          socket.emit('update_location', loc);
        }
      },
      (err) => {
        console.warn('GPS signal pending or error:', err?.message || err);
      }
    );

    return () => locationTracker.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers
  const handleColorChange = (color) => {
    setPlayerColor(color);
    localStorage.setItem('trampis_player_color', color);
    if (socket.connected && room) {
      socket.emit('update_profile', { playerColor: color });
    }
  };

  const handleAvatarChange = (avatar) => {
    setPlayerAvatar(avatar);
    localStorage.setItem('trampis_player_avatar', avatar);
    if (socket.connected && room) {
      socket.emit('update_profile', { playerAvatar: avatar });
    }
  };

  const handleCreateRoom = () => {
    sound.init();
    if (!socket.connected) {
      setErrorMessage('Connecting to game server... Please try again in a few seconds.');
      socket.connect();
      return;
    }
    socket.emit('create_room', { playerName, playerColor, playerAvatar }, (res) => {
      if (res?.success) {
        setRoom(res.room);
        setPlayerId(res.playerId);
        localStorage.setItem('trampis_active_room', res.room.code);
        if (res.sessionToken) localStorage.setItem('trampis_session_token', res.sessionToken);
      } else {
        setErrorMessage(res?.message || 'Failed to create room. Please try again.');
      }
    });
  };

  const handleJoinRoom = () => {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) {
      setErrorMessage('Please enter a 5-character room code.');
      return;
    }
    const cleanName = (playerName || '').trim();
    if (!cleanName) {
      setErrorMessage('Please enter a codename before joining.');
      return;
    }
    if (!socket.connected) {
      setErrorMessage('Connecting to game server... Please wait a moment.');
      socket.connect();
      return;
    }
    sound.init();
    socket.emit(
      'join_room',
      { roomCode: code, playerName, playerColor, playerAvatar },
      (res) => {
        if (res?.success) {
          setRoom(res.room);
          setPlayerId(res.playerId);
          localStorage.setItem('trampis_active_room', res.room.code);
          if (res.sessionToken) localStorage.setItem('trampis_session_token', res.sessionToken);
        } else {
          sound.playErrorBuzz();
          setErrorMessage(res?.message || 'Room not found. Check code and try again.');
          setTimeout(() => setErrorMessage(''), 5000);
        }
      }
    );
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem('trampis_active_room');
    localStorage.removeItem('trampis_session_token');
    setTeammateLocations([]);
    setSpottedRunners([]);
    socket.emit('leave_room', () => {
      setRoom(null);
    });
  };

  const handleSetRole = (role) => {
    setTeammateLocations([]);
    setSpottedRunners([]);
    socket.emit('set_role', { role, targetPlayerId: playerId });
  };

  const handleRandomizeTeams = (mode = 'balanced') => {
    socket.emit('randomize_teams', { mode });
  };

  const handleAutoSplitUnassigned = () => {
    socket.emit('auto_split_unassigned');
  };

  const handleKickPlayer = (targetPlayerId) => {
    socket.emit('kick_player', { targetPlayerId }, (res) => {
      if (!res?.success) {
        setErrorMessage(res?.message || 'Failed to kick player.');
        setTimeout(() => setErrorMessage(''), 4000);
      }
    });
  };

  const handleEndHunt = () => {
    if (confirm('End the hunt early? This will declare current match results.')) {
      socket.emit('end_hunt', (res) => {
        if (!res?.success) {
          setErrorMessage(res?.message || 'Failed to end hunt.');
          setTimeout(() => setErrorMessage(''), 4000);
        }
      });
    }
  };

  const handleUpdateSettings = (newSettings) => {
    socket.emit('update_settings', newSettings);
  };

  const handleStartGame = () => {
    socket.emit('start_game');
  };

  const handleUseDecoy = ({ lat, lng }) => {
    socket.emit('use_decoy_pin', { lat, lng });
  };

  const handleUseJammer = () => {
    socket.emit('use_radar_jammer');
  };

  const handleUseDroneScan = () => {
    socket.emit('use_drone_scan');
  };

  const handleDeployTripwire = ({ lat, lng }) => {
    socket.emit('deploy_tripwire', { lat, lng });
  };

  const handleSurrender = () => {
    if (confirm('Confirm surrender? You will yield as captured.')) {
      socket.emit('runner_surrender');
    }
  };

  const handleTagRunner = ({ runnerId, catchCodeInput }, cb) => {
    socket.emit('tag_runner', { runnerId, catchCodeInput }, cb);
  };

  const handleSendComm = (text) => {
    socket.emit('send_quick_comm', { text });
  };

  const handleResetGame = () => {
    setTeammateLocations([]);
    setSpottedRunners([]);
    socket.emit('reset_game');
  };

  const handleTestAudio = () => {
    sound.init();
    sound.playSonarPing();
    sound.vibrate([100, 50, 100]);
    setErrorMessage('🔊 Audio & Haptics verified!');
    setTimeout(() => setErrorMessage(''), 2500);
  };

  const currentUser = room?.players?.[playerId] || {
    id: playerId,
    name: playerName,
    role: 'unassigned',
    color: playerColor,
    avatar: playerAvatar,
    powerups: {
      decoysLeft: 1,
      jammersLeft: 1,
      droneScansLeft: 1,
      tripwiresLeft: 2
    }
  };

  return (
    <div className={`h-full w-full flex flex-col overflow-hidden ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans antialiased`}>
      {/* Universal Tactical Header Bar */}
      <header className="safe-header px-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between flex-shrink-0 z-40">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.jpg"
            alt="Trampis Hunt Logo"
            className="w-8 h-8 rounded-xl border border-cyan-500/50 shadow-md object-cover"
          />
          <div>
            <div className="text-sm font-black tracking-tight text-white font-serif leading-none">
              Trampis Hunt
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
              <span>SQUAD PURSUIT</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {isConnected ? (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <Wifi className="w-2.5 h-2.5" /> LIVE
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-0.5">
                    <WifiOff className="w-2.5 h-2.5" /> RECONNECTING
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Operative Photo & Marker Button */}
          <button
            onClick={() => setShowAvatarPicker(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold transition active:scale-95 cursor-pointer"
            title="My Marker & Photo Avatar"
          >
            <AvatarDisplay
              avatar={playerAvatar}
              name={playerName}
              color={playerColor}
              size="xs"
              ring={false}
            />
            <span className="hidden sm:inline text-slate-200">Marker</span>
          </button>

          {/* Match History */}
          <button
            onClick={() => setShowMatchHistory(true)}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-semibold transition active:scale-95 flex items-center gap-1 cursor-pointer"
            title="Match History & Records"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </button>

          {/* Audio Test Button */}
          <button
            onClick={handleTestAudio}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-700 transition active:scale-95 cursor-pointer"
            title="Test Phone Speaker / Unmute"
          >
            🔊
          </button>

          {/* Rules Button */}
          <button
            onClick={() => setShowRules(true)}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-semibold transition active:scale-95 flex items-center gap-1 cursor-pointer"
            title="Field Rules"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          {/* Server / Crossplay Config Button */}
          <button
            onClick={() => setShowServerModal(true)}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-700 transition active:scale-95 cursor-pointer"
            title="Crossplay Server Settings"
          >
            <Server className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            title="Toggle Mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Universal Tactical Ability Announcement Banner (Visible to Both Teams!) */}
      {activeAbilityBanner && (
        <div className="fixed safe-banner-top left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border animate-fadeIn flex items-start gap-3 transition-all bg-slate-900/95 border-cyan-400/80 text-white">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 flex-shrink-0 mt-0.5">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-black uppercase font-mono tracking-wider text-cyan-400">
              {activeAbilityBanner.title}
            </div>
            <div className="text-xs text-slate-200 mt-0.5 font-medium leading-snug">
              {activeAbilityBanner.desc}
            </div>
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="fixed safe-banner-top left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-rose-600 text-white rounded-2xl text-xs font-bold shadow-2xl border border-rose-400/40 animate-fadeIn flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative">
        {!room ? (
          /* Staging / Welcome / Join Screen */
          <div className="w-full h-full touch-scroll overflow-y-auto overscroll-contain">
            <div className="flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 max-w-md mx-auto w-full min-h-full py-6 safe-bottom-space">
              <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-4 sm:gap-5 my-auto">
              {/* Logo & Title */}
              <div className="flex flex-col items-center text-center">
                <img
                  src="/logo.jpg"
                  alt="Trampis Hunt Logo"
                  className="w-20 h-20 rounded-2xl border border-slate-700 shadow-md object-cover mb-3"
                />
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  REAL-WORLD GPS PURSUIT
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-white mt-2">
                  Trampis Hunt
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Runners on foot vs Hunters tracking on radar. Don't get caught.
                </p>
              </div>

              {/* Invited Room Code Alert Callout */}
              {invitedRoomCode && (
                <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/60 rounded-2xl flex flex-col gap-1 text-center animate-fadeIn shadow-md">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
                    🎯 INVITED TO HUNT ROOM
                  </span>
                  <div className="text-xl font-mono font-black text-white tracking-widest">
                    {invitedRoomCode}
                  </div>
                  <p className="text-xs text-slate-300">
                    Pick your codename below, then tap <strong>JOIN ROOM</strong> to start!
                  </p>
                </div>
              )}

              {/* Codename Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                  Your Codename
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (roomCodeInput.trim()) handleJoinRoom();
                      else handleCreateRoom();
                    }
                  }}
                  placeholder="Enter codename"
                  className="px-4 py-3 rounded-2xl border border-slate-800 bg-slate-950 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Tactical Marker & Photo Avatar Card */}
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition active:scale-95 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <AvatarDisplay
                    avatar={playerAvatar}
                    name={playerName}
                    color={playerColor}
                    size="md"
                  />
                  <div className="text-left">
                    <div className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Camera className="w-3 h-3 text-cyan-400" />
                      <span>Tactical Marker & Photo</span>
                    </div>
                    <div className="text-xs font-bold text-white">Camera Photo • Custom Color</div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-xl">
                  Customize
                </span>
              </button>

              {/* Match History & Season Records Card */}
              <button
                type="button"
                onClick={() => setShowMatchHistory(true)}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition active:scale-95 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <History className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Hunt Records</div>
                    <div className="text-xs font-bold text-white">Match History & Season Stats</div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-xl">
                  View
                </span>
              </button>

              {/* Host Game Button */}
              <button
                onClick={handleCreateRoom}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>HOST NEW HUNT</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">OR ENTER CODE</span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              {/* Join Code Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={5}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleJoinRoom();
                  }}
                  placeholder="5-LETTER CODE"
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-800 bg-slate-950 text-sm font-mono font-bold tracking-widest uppercase text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!roomCodeInput.trim() || !playerName.trim()}
                  className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md"
                >
                  <span>{invitedRoomCode ? `Join ${invitedRoomCode}` : 'Join'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Field Manual Link */}
              <button
                onClick={() => setShowRules(true)}
                className="text-center text-xs text-slate-400 hover:text-white font-medium transition flex items-center justify-center gap-1.5 pt-1 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>How to Play & Field Rules</span>
              </button>

              {/* Offline / Reconnecting Helper Card */}
              {!isConnected && (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-400">
                    <span className="flex items-center gap-1.5">
                      <WifiOff className="w-3.5 h-3.5" /> CONNECTING TO SERVER
                    </span>
                    <button
                      onClick={() => setShowServerModal(true)}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] hover:bg-slate-700 font-bold"
                    >
                      Server Settings
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Connecting to <strong className="text-white font-mono">{customServerUrl || 'https://trampis-hunt.onrender.com'}</strong>...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        ) : room.status === 'lobby' ? (
          <Lobby
            room={room}
            playerId={playerId}
            onSetRole={handleSetRole}
            onRandomizeTeams={handleRandomizeTeams}
            onAutoSplitUnassigned={handleAutoSplitUnassigned}
            onKickPlayer={handleKickPlayer}
            onOpenAvatarPicker={() => setShowAvatarPicker(true)}
            onOpenMatchHistory={() => setShowMatchHistory(true)}
            onUpdateSettings={handleUpdateSettings}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
            onOpenRules={() => setShowRules(true)}
            serverIp={serverIp}
          />
        ) : room.status === 'playing' ? (
          currentUser.role === 'runner' ? (
            <RunnerView
              room={room}
              player={currentUser}
              userLocation={userLocation}
              teammateLocations={teammateLocations}
              onUseDecoy={handleUseDecoy}
              onUseJammer={handleUseJammer}
              onSurrender={handleSurrender}
              onEndHunt={handleEndHunt}
            />
          ) : (
            <HunterView
              room={room}
              player={currentUser}
              userLocation={userLocation}
              teammateLocations={teammateLocations}
              spottedRunners={spottedRunners}
              onTagRunner={handleTagRunner}
              onUseDroneScan={handleUseDroneScan}
              onDeployTripwire={handleDeployTripwire}
              onEndHunt={handleEndHunt}
              onKickPlayer={handleKickPlayer}
            />
          )
        ) : (
          <GameOverView
            room={room}
            playerId={playerId}
            onResetGame={handleResetGame}
            onLeaveRoom={handleLeaveRoom}
            onOpenMatchHistory={() => setShowMatchHistory(true)}
          />
        )}
      </main>

      {/* Rules Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        playerName={playerName}
        playerColor={playerColor}
        playerAvatar={playerAvatar}
        onUpdateColor={handleColorChange}
        onUpdateAvatar={handleAvatarChange}
      />

      {/* Match History Modal */}
      <MatchHistoryModal
        isOpen={showMatchHistory}
        onClose={() => setShowMatchHistory(false)}
        playerName={playerName}
      />

      {/* Crossplay Server Settings Modal */}
      {showServerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] touch-scroll overflow-y-auto overscroll-contain">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Crossplay Connection</h3>
                <p className="text-[11px] text-slate-400">Sync between .APK and Web App</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If playing on the native <strong className="text-emerald-400">.APK</strong>, enter the host PC's Wi-Fi IP address so all devices join the same room.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                Host Server URL
              </label>
              <input
                type="text"
                value={customServerUrl}
                onChange={(e) => setCustomServerUrl(e.target.value)}
                placeholder="http://192.168.0.103:3001"
                className="px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {serverIp && (
              <button
                type="button"
                onClick={() => setCustomServerUrl(`http://${serverIp}:3001`)}
                className="text-left text-[11px] text-cyan-400 hover:underline font-mono"
              >
                Auto-fill Local LAN: http://{serverIp}:3001
              </button>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowServerModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  reconnectToServer(customServerUrl);
                  setShowServerModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition active:scale-95"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
