import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static build if available
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();
const roomCleanupTimers = new Map();

function generateCatchCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        candidates.push(net.address);
      }
    }
  }
  // Prefer common home/LAN Wi-Fi subnets 192.168.x.x
  const wifiSubnet = candidates.find((ip) => ip.startsWith('192.168.'));
  if (wifiSubnet) return wifiSubnet;
  return candidates[0] || 'localhost';
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 999999;
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 999999;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// REST route for room health / info
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size, localIp: getLocalIpAddress() });
});

app.get('/api/ip', (req, res) => {
  res.json({ ip: getLocalIpAddress() });
});

// Any unmatched route returns index.html for SPA (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.send(`Trampis Hunt Backend is running. Run 'npm run dev' to access the client.`);
    }
  });
});

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Create Room
  socket.on('create_room', ({ playerName, settings }, callback) => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    const defaultSettings = {
      pinIntervalMinutes: 10,
      gameDurationMinutes: 60,
      warningSeconds: 30,
      proximityTagMeters: 25,
      allowVehiclesForHunters: true,
      ...settings
    };

    const room = {
      code,
      hostId: socket.id,
      status: 'lobby',
      settings: defaultSettings,
      players: {
        [socket.id]: {
          id: socket.id,
          name: playerName || 'Lead Operative',
          role: 'unassigned',
          isReady: true,
          catchCode: generateCatchCode(),
          isCaught: false,
          caughtAt: null,
          caughtBy: null,
          currentLocation: null,
          powerups: {
            decoysLeft: 1,
            jammersLeft: 1,
            droneScansLeft: 1,
            tripwiresLeft: 2
          }
        }
      },
      gameState: {
        startedAt: null,
        endsAt: null,
        nextPinAt: null,
        lastPinAt: null,
        pinHistory: [],
        tripwires: [],
        log: []
      }
    };

    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerName = playerName;

    console.log(`[Room Created] ${code} by ${playerName} (${socket.id})`);
    if (callback) callback({ success: true, room, playerId: socket.id });
    io.to(code).emit('room_updated', room);
  });

  // Join Room
  socket.on('join_room', ({ roomCode, playerName }, callback) => {
    const code = roomCode?.trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      if (callback) callback({ success: false, message: 'Room not found. Check the code and try again.' });
      return;
    }

    if (room.status !== 'lobby') {
      if (callback) callback({ success: false, message: 'Hunt already in progress. Wait for next round.' });
      return;
    }

    const trimmedName = (playerName || '').trim();
    if (!trimmedName) {
      if (callback) callback({ success: false, message: 'Please enter a valid codename to join.' });
      return;
    }

    // Check for duplicate names (case-insensitive)
    const existingPlayer = Object.values(room.players).find(
      (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingPlayer) {
      if (callback) {
        callback({
          success: false,
          message: `The name "${trimmedName}" is already taken in this hunt! Choose another codename.`
        });
      }
      return;
    }

    room.players[socket.id] = {
      id: socket.id,
      name: trimmedName,
      role: 'unassigned',
      isReady: false,
      catchCode: generateCatchCode(),
      isCaught: false,
      caughtAt: null,
      caughtBy: null,
      currentLocation: null,
      powerups: {
        decoysLeft: 1,
        jammersLeft: 1,
        droneScansLeft: 1,
        tripwiresLeft: 2
      }
    };

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerName = playerName;

    console.log(`[Room Joined] ${code}: ${playerName} (${socket.id})`);
    if (callback) callback({ success: true, room, playerId: socket.id });
    io.to(code).emit('room_updated', room);
  });

  // Leave Room / Return to Menu
  socket.on('leave_room', (callback) => {
    const code = socket.data.roomCode;
    if (code && rooms.has(code)) {
      const room = rooms.get(code);
      delete room.players[socket.id];
      socket.leave(code);
      socket.data.roomCode = null;

      if (Object.keys(room.players).length === 0) {
        rooms.delete(code);
        console.log(`[Room Deleted] ${code} (all left)`);
      } else {
        if (room.hostId === socket.id) {
          room.hostId = Object.keys(room.players)[0];
        }
        io.to(code).emit('room_updated', room);
      }
    }
    if (callback) callback({ success: true });
  });

  // Assign / Change Role
  socket.on('set_role', ({ role, targetPlayerId }) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;

    const playerId = targetPlayerId || socket.id;
    if (room.players[playerId]) {
      room.players[playerId].role = role;
      io.to(code).emit('room_updated', room);
    }
  });

  // Randomize Teams with Preset Modes for Friend Groups
  socket.on('randomize_teams', ({ mode = 'balanced' } = {}) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;

    const playerIds = Object.keys(room.players);
    if (playerIds.length < 2) {
      socket.emit('game_error', {
        message: 'Cannot randomize: You need at least 2 players in the lobby! Share the code with your friends.'
      });
      return;
    }

    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    let runnerCount = 1;

    if (mode === 'solo_runner') {
      runnerCount = 1;
    } else if (mode === 'duo_runner') {
      runnerCount = Math.min(2, Math.max(1, shuffled.length - 1));
    } else if (mode === '50_50') {
      runnerCount = Math.max(1, Math.floor(shuffled.length / 2));
    } else {
      // Balanced standard manhunt (approx 1/3 runners, 2/3 hunters)
      runnerCount = Math.max(1, Math.round(shuffled.length / 3));
      if (shuffled.length === 2 || shuffled.length === 3) runnerCount = 1;
    }

    shuffled.forEach((id, idx) => {
      room.players[id].role = idx < runnerCount ? 'runner' : 'hunter';
    });

    console.log(`[Teams Randomized] Room ${code} (${mode}): ${runnerCount} runners, ${playerIds.length - runnerCount} hunters`);
    io.to(code).emit('room_updated', room);
  });

  // Update Settings
  socket.on('update_settings', (newSettings) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;

    room.settings = { ...room.settings, ...newSettings };
    io.to(code).emit('room_updated', room);
  });

  // Start Game with Robust Failsafes
  socket.on('start_game', (callback) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;

    if (room.hostId !== socket.id) {
      const err = { message: 'Only the host can launch the hunt!' };
      socket.emit('game_error', err);
      if (callback) callback({ success: false, ...err });
      return;
    }

    const players = Object.values(room.players);
    const runners = players.filter(p => p.role === 'runner');
    const hunters = players.filter(p => p.role === 'hunter');
    const unassigned = players.filter(p => p.role !== 'runner' && p.role !== 'hunter');

    if (players.length < 2) {
      const err = {
        message: `Cannot start with 1 player! Trampis Hunt requires at least 2 players (1 Runner and 1 Hunter). Share Room Code "${code}" or the QR code with a friend!`
      };
      socket.emit('game_error', err);
      if (callback) callback({ success: false, ...err });
      return;
    }

    if (runners.length === 0) {
      const err = {
        message: 'Cannot start: No Runners assigned! At least 1 player must be on foot as a Runner. Tap "Join Runners" or "Randomize Teams".'
      };
      socket.emit('game_error', err);
      if (callback) callback({ success: false, ...err });
      return;
    }

    if (hunters.length === 0) {
      const err = {
        message: 'Cannot start: No Hunters assigned! At least 1 player must hunt. Tap "Join Hunters" or "Randomize Teams".'
      };
      socket.emit('game_error', err);
      if (callback) callback({ success: false, ...err });
      return;
    }

    // Auto-assign any remaining unassigned players to the smaller team
    if (unassigned.length > 0) {
      unassigned.forEach(p => {
        p.role = runners.length <= hunters.length ? 'runner' : 'hunter';
      });
    }

    const now = Date.now();
    const durationMs = (room.settings.gameDurationMinutes || 60) * 60 * 1000;
    const intervalMs = (room.settings.pinIntervalMinutes || 10) * 60 * 1000;

    room.status = 'playing';
    room.gameState = {
      startedAt: now,
      endsAt: now + durationMs,
      nextPinAt: now + intervalMs,
      lastPinAt: now,
      pinHistory: [],
      tripwires: [],
      log: [
        {
          timestamp: now,
          text: `🚨 HUNT COMMENCED! ${runners.length} Runner(s) on foot. ${hunters.length} Hunter(s) tracking. First ping in ${room.settings.pinIntervalMinutes}m!`
        }
      ]
    };

    // Initial drop
    runners.forEach(runner => {
      if (runner.currentLocation) {
        room.gameState.pinHistory.push({
          id: `pin_${Date.now()}_${runner.id}`,
          runnerId: runner.id,
          runnerName: runner.name,
          lat: runner.currentLocation.lat,
          lng: runner.currentLocation.lng,
          timestamp: now,
          isDecoy: false
        });
      }
    });

    console.log(`[Game Started] Room ${code}`);
    io.to(code).emit('game_started', room);
    if (callback) callback({ success: true });
  });

  // Player Location Update (rate-limited: max 1 per second per player)
  socket.on('update_location', (location) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;

    const player = room.players[socket.id];
    if (!player) return;

    // Server-side rate limit: ignore updates within 1s of last one
    const now = Date.now();
    if (player._lastLocUpdate && now - player._lastLocUpdate < 1000) return;
    player._lastLocUpdate = now;

    // Reject obviously invalid coordinates
    if (location == null || typeof location.lat !== 'number' || typeof location.lng !== 'number') return;
    if (location.lat < -90 || location.lat > 90 || location.lng < -180 || location.lng > 180) return;

    player.currentLocation = {
      ...location,
      updatedAt: now
    };

    // If hunter: broadcast to fellow hunters in real-time
    if (player.role === 'hunter') {
      socket.to(code).emit('hunter_location_updated', {
        hunterId: socket.id,
        hunterName: player.name,
        location: player.currentLocation
      });
    }

    // Check game loop if playing
    if (room.status === 'playing') {
      // Check tripwires if player is a runner
      if (player.role === 'runner' && !player.isCaught && room.gameState.tripwires?.length > 0) {
        room.gameState.tripwires.forEach((tw) => {
          if (!tw.triggered) {
            const dist = calculateDistanceMeters(
              player.currentLocation.lat,
              player.currentLocation.lng,
              tw.lat,
              tw.lng
            );
            if (dist <= 50) {
              tw.triggered = true;
              tw.triggeredAt = Date.now();
              tw.triggeredBy = player.name;

              room.gameState.log.unshift({
                timestamp: Date.now(),
                text: `⚡ TRIPWIRE ALARM: Motion detected near ${tw.deployedBy}'s sensor (~${dist}m)!`
              });

              io.to(code).emit('tripwire_triggered', {
                tripwire: tw,
                room
              });

              io.to(code).emit('universal_ability_alert', {
                ability: 'tripwire',
                title: '🚨 PERIMETER TRIPWIRE TRIPPED',
                user: player.name,
                role: 'runner',
                hunterDesc: `Motion detected near ${tw.deployedBy}'s sensor beacon!`,
                runnerDesc: `ALERT: You tripped a hunter motion sensor! SCATTER!`
              });
            }
          }
        });
      }

      const now = Date.now();
      if (now >= room.gameState.endsAt) {
        endGame(code, 'runners_escaped', 'Time expired! Surviving runners escaped!');
        return;
      }
      if (now >= room.gameState.nextPinAt) {
        triggerPinDrop(code);
      }
    }
  });

  // Hunter Tactical Gear 1: Drone Recon Sweep
  socket.on('use_drone_scan', () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || room.status !== 'playing') return;

    const player = room.players[socket.id];
    if (!player || player.role !== 'hunter') return;

    if (player.powerups.droneScansLeft <= 0) {
      socket.emit('game_error', { message: 'No drone reconnaissance sweeps remaining!' });
      return;
    }

    player.powerups.droneScansLeft -= 1;
    const now = Date.now();
    const runners = Object.values(room.players).filter(p => p.role === 'runner' && !p.isCaught);

    runners.forEach(runner => {
      if (runner.currentLocation) {
        room.gameState.pinHistory.push({
          id: `drone_${now}_${runner.id}`,
          runnerId: runner.id,
          runnerName: runner.name,
          lat: runner.currentLocation.lat,
          lng: runner.currentLocation.lng,
          timestamp: now,
          isDroneSweep: true
        });
      }
    });

    room.gameState.log.unshift({
      timestamp: now,
      text: `🛰️ DRONE SWEEP DEPLOYED by ${player.name}: Live aerial coordinates revealed!`
    });

    io.to(code).emit('drone_scan_activated', {
      deployedBy: player.name,
      room
    });

    io.to(code).emit('universal_ability_alert', {
      ability: 'drone',
      title: '🛰️ DRONE RECON SWEEP ACTIVE',
      user: player.name,
      role: 'hunter',
      hunterDesc: `Live aerial telemetry acquired by ${player.name}! Runner pins updated on radar.`,
      runnerDesc: `⚠️ WARNING: ENEMY DRONE SCAN OVERHEAD! Your live positions have been compromised!`
    });
  });

  // Hunter Tactical Gear 2: Motion Sensor Tripwire
  socket.on('deploy_tripwire', ({ lat, lng }) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || room.status !== 'playing') return;

    const player = room.players[socket.id];
    if (!player || player.role !== 'hunter') return;

    if (player.powerups.tripwiresLeft <= 0) {
      socket.emit('game_error', { message: 'No tripwire beacons remaining!' });
      return;
    }

    player.powerups.tripwiresLeft -= 1;
    const newTripwire = {
      id: `tw_${Date.now()}_${player.id}`,
      deployedBy: player.name,
      lat,
      lng,
      radiusMeters: 50,
      triggered: false,
      timestamp: Date.now()
    };

    room.gameState.tripwires.push(newTripwire);
    room.gameState.log.unshift({
      timestamp: Date.now(),
      text: `📡 ${player.name} armed a perimeter motion tripwire!`
    });

    io.to(code).emit('tripwire_deployed', {
      tripwire: newTripwire,
      room
    });

    io.to(code).emit('universal_ability_alert', {
      ability: 'tripwire_armed',
      title: '📡 TRIPWIRE BEACON ARMED',
      user: player.name,
      role: 'hunter',
      hunterDesc: `${player.name} deployed a perimeter sensor on the grid.`,
      runnerDesc: `SENSOR DETECTED: Hunters armed a motion tripwire in the area!`
    });
  });

  // Runner Tactical Gear 1: Decoy Pin
  socket.on('use_decoy_pin', ({ lat, lng }) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || room.status !== 'playing') return;

    const player = room.players[socket.id];
    if (!player || player.role !== 'runner' || player.isCaught) return;

    if (player.powerups.decoysLeft <= 0) {
      socket.emit('game_error', { message: 'No decoy pins remaining!' });
      return;
    }

    player.powerups.decoysLeft -= 1;
    const decoyPin = {
      id: `decoy_${Date.now()}_${player.id}`,
      runnerId: player.id,
      runnerName: player.name,
      lat,
      lng,
      timestamp: Date.now(),
      isDecoy: true
    };

    room.gameState.pinHistory.push(decoyPin);
    room.gameState.log.unshift({
      timestamp: Date.now(),
      text: `📡 RADAR DETECTED: Location signal broadcast!`
    });

    io.to(code).emit('pin_dropped', { pin: decoyPin, room });

    io.to(code).emit('universal_ability_alert', {
      ability: 'decoy',
      title: '👻 DECOY PIN BROADCAST',
      user: player.name,
      role: 'runner',
      hunterDesc: `RADAR ANOMALY: A new signal signature pinged on your radar!`,
      runnerDesc: `${player.name} deployed a Decoy Pin! False ping sent to hunter radar.`
    });
  });

  // Runner Tactical Gear 2: Radar Jammer
  socket.on('use_radar_jammer', () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || room.status !== 'playing') return;

    const player = room.players[socket.id];
    if (!player || player.role !== 'runner' || player.isCaught) return;

    if (player.powerups.jammersLeft <= 0) {
      socket.emit('game_error', { message: 'No radar jammers remaining!' });
      return;
    }

    player.powerups.jammersLeft -= 1;
    const delayMs = 3 * 60 * 1000;
    room.gameState.nextPinAt += delayMs;

    room.gameState.log.unshift({
      timestamp: Date.now(),
      text: `⚡ RADAR JAMMED: Signal scrambled! Next ping delayed by +3 minutes.`
    });

    io.to(code).emit('radar_jammed', { room, delayedByMinutes: 3 });

    io.to(code).emit('universal_ability_alert', {
      ability: 'jammer',
      title: '⚡ RADAR INTERFERENCE (+3m)',
      user: player.name,
      role: 'runner',
      hunterDesc: `TELEMETRY SCRAMBLED: Runner activated Electronic Jammer! Next ping delayed by +3m!`,
      runnerDesc: `${player.name} activated Radar Jammer! Hunters' next ping delayed by +3 minutes.`
    });
  });

  // Tag / Catch Runner
  socket.on('tag_runner', ({ runnerId, catchCodeInput }, callback) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || room.status !== 'playing') return;

    const hunter = room.players[socket.id];
    const runner = room.players[runnerId];

    if (!hunter || hunter.role !== 'hunter') {
      if (callback) callback({ success: false, message: 'Only active hunters can tag runners!' });
      return;
    }

    if (!runner || runner.role !== 'runner') {
      if (callback) callback({ success: false, message: 'Target runner not found.' });
      return;
    }

    if (runner.isCaught) {
      if (callback) callback({ success: false, message: 'Runner has already been captured!' });
      return;
    }

    const codeMatch = catchCodeInput && catchCodeInput.trim() === runner.catchCode;
    let proximityMatch = false;
    let distMeters = null;

    if (hunter.currentLocation && runner.currentLocation) {
      distMeters = calculateDistanceMeters(
        hunter.currentLocation.lat,
        hunter.currentLocation.lng,
        runner.currentLocation.lat,
        runner.currentLocation.lng
      );
      if (distMeters <= (room.settings.proximityTagMeters || 25)) {
        proximityMatch = true;
      }
    }

    if (!codeMatch && !proximityMatch) {
      const msg = distMeters !== null
        ? `Too far for proximity tag (${distMeters}m away). Must be within 25m or type runner's 4-digit catch code.`
        : "Must be within 25m with active GPS or enter runner's 4-digit catch code.";
      if (callback) callback({
        success: false,
        message: msg
      });
      return;
    }

    runner.isCaught = true;
    runner.caughtAt = Date.now();
    runner.caughtBy = hunter.name;

    room.gameState.log.unshift({
      timestamp: Date.now(),
      text: `🎯 CAPTURED! Hunter ${hunter.name} tagged Runner ${runner.name}!`
    });

    const allRunners = Object.values(room.players).filter(p => p.role === 'runner');
    const remainingRunners = allRunners.filter(p => !p.isCaught);

    io.to(code).emit('runner_tagged', {
      runnerId,
      runnerName: runner.name,
      hunterName: hunter.name,
      room
    });

    if (callback) callback({ success: true, message: `Captured ${runner.name}!` });

    if (remainingRunners.length === 0) {
      endGame(code, 'hunters_win', `All runners eliminated! Hunters dominate the hunt!`);
    }
  });

  // Runner Surrender
  socket.on('runner_surrender', () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || room.status !== 'playing') return;

    const runner = room.players[socket.id];
    if (!runner || runner.role !== 'runner' || runner.isCaught) return;

    runner.isCaught = true;
    runner.caughtAt = Date.now();
    runner.caughtBy = 'Self (Surrendered)';

    room.gameState.log.unshift({
      timestamp: Date.now(),
      text: `🏳️ Runner ${runner.name} surrendered.`
    });

    io.to(code).emit('runner_tagged', {
      runnerId: socket.id,
      runnerName: runner.name,
      hunterName: 'Surrendered',
      room
    });

    const allRunners = Object.values(room.players).filter(p => p.role === 'runner');
    const remainingRunners = allRunners.filter(p => !p.isCaught);
    if (remainingRunners.length === 0) {
      endGame(code, 'hunters_win', `All runners eliminated! Hunters dominate the hunt!`);
    }
  });

  // Quick Walkie-Talkie Radio Comms
  socket.on('send_quick_comm', ({ text }) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;

    const player = room.players[socket.id];
    if (!player) return;

    const msg = {
      id: `comm_${Date.now()}_${socket.id}`,
      senderId: socket.id,
      senderName: player.name,
      senderRole: player.role,
      text,
      timestamp: Date.now()
    };

    room.gameState.log.unshift({
      timestamp: Date.now(),
      text: `📻 [${player.role.toUpperCase()}] ${player.name}: "${text}"`
    });

    io.to(code).emit('quick_comm_received', msg);
  });

  // Reset Game
  socket.on('reset_game', () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;

    room.status = 'lobby';
    room.gameState = {
      startedAt: null,
      endsAt: null,
      nextPinAt: null,
      lastPinAt: null,
      pinHistory: [],
      tripwires: [],
      log: []
    };

    Object.values(room.players).forEach(p => {
      p.isCaught = false;
      p.caughtAt = null;
      p.caughtBy = null;
      p.catchCode = generateCatchCode();
      p.powerups = {
        decoysLeft: 1,
        jammersLeft: 1,
        droneScansLeft: 1,
        tripwiresLeft: 2
      };
    });

    io.to(code).emit('room_updated', room);
  });

  // Reconnect / Rejoin room on app resume or network recovery
  socket.on('reconnect_room', ({ roomCode, playerId, playerName }, callback) => {
    const code = roomCode?.trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      if (callback) callback({ success: false, message: 'Room session expired.' });
      return;
    }

    // Cancel pending room deletion if anyone reconnects
    if (roomCleanupTimers.has(code)) {
      clearTimeout(roomCleanupTimers.get(code));
      roomCleanupTimers.delete(code);
    }

    // Find player by old socket ID or by codename
    let player = room.players[playerId];
    if (!player && playerName) {
      player = Object.values(room.players).find(
        (p) => p.name.trim().toLowerCase() === playerName.trim().toLowerCase()
      );
    }

    if (player) {
      const oldId = player.id;
      delete room.players[oldId];
      player.id = socket.id;
      player.isOnline = true;
      delete player.disconnectedAt;
      room.players[socket.id] = player;

      if (room.hostId === oldId) {
        room.hostId = socket.id;
      }

      socket.join(code);
      socket.data.roomCode = code;
      socket.data.playerName = player.name;

      console.log(`[Player Reconnected] ${player.name} (${socket.id}) in room ${code}`);
      if (callback) callback({ success: true, room, playerId: socket.id });
      io.to(code).emit('room_updated', room);
      return;
    }

    if (callback) callback({ success: false, message: 'Player not found in active session.' });
  });

  // Disconnect - Mark offline, do NOT destroy room immediately!
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    const code = socket.data.roomCode;
    if (code && rooms.has(code)) {
      const room = rooms.get(code);
      const player = room.players[socket.id];
      if (player) {
        player.isOnline = false;
        player.disconnectedAt = Date.now();
      }

      // Check if all players in room are offline
      const onlinePlayers = Object.values(room.players).filter((p) => p.isOnline !== false);
      if (onlinePlayers.length === 0) {
        console.log(`[Room Idle] All players disconnected from ${code}. Setting 10-minute grace timer.`);
        if (roomCleanupTimers.has(code)) clearTimeout(roomCleanupTimers.get(code));
        const timer = setTimeout(() => {
          rooms.delete(code);
          roomCleanupTimers.delete(code);
          console.log(`[Room Deleted] ${code} (grace period expired)`);
        }, 10 * 60 * 1000);
        roomCleanupTimers.set(code, timer);
      } else {
        io.to(code).emit('room_updated', room);
      }
    }
  });
});

function triggerPinDrop(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== 'playing') return;

  const now = Date.now();
  const intervalMs = (room.settings.pinIntervalMinutes || 10) * 60 * 1000;
  room.gameState.lastPinAt = now;
  room.gameState.nextPinAt = now + intervalMs;

  const runners = Object.values(room.players).filter(p => p.role === 'runner' && !p.isCaught);
  let pinsDroppedCount = 0;

  runners.forEach(runner => {
    if (runner.currentLocation) {
      const newPin = {
        id: `pin_${now}_${runner.id}`,
        runnerId: runner.id,
        runnerName: runner.name,
        lat: runner.currentLocation.lat,
        lng: runner.currentLocation.lng,
        accuracy: runner.currentLocation.accuracy,
        timestamp: now,
        isDecoy: false
      };
      room.gameState.pinHistory.push(newPin);
      pinsDroppedCount++;
    }
  });

  room.gameState.log.unshift({
    timestamp: now,
    text: `📍 MANDATORY PIN DROP! Radar broadcasted for ${pinsDroppedCount} active runner(s)!`
  });

  io.to(roomCode).emit('mandatory_pin_dropped', {
    timestamp: now,
    nextPinAt: room.gameState.nextPinAt,
    pinHistory: room.gameState.pinHistory,
    room
  });
}

function endGame(roomCode, winner, reason) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.status = 'ended';
  room.gameState.log.unshift({
    timestamp: Date.now(),
    text: `🏆 HUNT COMPLETE: ${reason}`
  });

  io.to(roomCode).emit('game_ended', {
    winner,
    reason,
    room
  });
}

// Tick loop for 30s countdown warning and auto-pins
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.status === 'playing') {
      if (now >= room.gameState.endsAt) {
        endGame(code, 'runners_escaped', 'Time expired! Surviving runners win!');
        continue;
      }

      if (now >= room.gameState.nextPinAt) {
        triggerPinDrop(code);
        continue;
      }

      const timeTillPin = room.gameState.nextPinAt - now;
      const warningMs = (room.settings.warningSeconds || 30) * 1000;
      if (timeTillPin <= warningMs && !room.gameState.warningEmitted) {
        room.gameState.warningEmitted = true;
        io.to(code).emit('pin_warning', {
          secondsRemaining: Math.ceil(timeTillPin / 1000)
        });
      } else if (timeTillPin > warningMs) {
        room.gameState.warningEmitted = false;
      }
    }
  }
}, 3000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`========================================`);
  console.log(`🎯 TRAMPIS HUNT SERVER IS LIVE!`);
  console.log(`💻 Local:   http://localhost:${PORT}`);
  console.log(`📱 Mobile:  http://${localIp}:${PORT}`);
  console.log(`========================================`);
});
