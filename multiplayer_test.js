import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';

async function runMultiplayerTest() {
  console.log('--- STARTING NEXUS MULTIPLAYER AUTOMATED TEST ---');

  const client1 = io(SERVER_URL);
  const client2 = io(SERVER_URL);

  let roomCode = null;

  // 1. Connect
  await new Promise((resolve) => {
    let connected = 0;
    client1.on('connect', () => {
      console.log('✓ Client 1 Connected:', client1.id);
      if (++connected === 2) resolve();
    });
    client2.on('connect', () => {
      console.log('✓ Client 2 Connected:', client2.id);
      if (++connected === 2) resolve();
    });
  });

  // 2. Client 1 Creates Room
  const createRes = await new Promise((resolve) => {
    client1.emit('create_room', { playerName: 'Pilot_Alpha' }, resolve);
  });
  console.log('✓ Create Room Response:', createRes);
  if (!createRes.success) throw new Error('Create room failed');
  roomCode = createRes.roomCode;

  // 3. Client 2 Joins Room
  const joinRes = await new Promise((resolve) => {
    client2.emit('join_room', { roomCode, playerName: 'Pilot_Bravo' }, resolve);
  });
  console.log('✓ Join Room Response:', joinRes);
  if (!joinRes.success) throw new Error('Join room failed');

  // 4. Client 2 Sets Ready
  client2.emit('set_ready', { isReady: true });
  console.log('✓ Client 2 sent READY state');

  // 5. Client 1 Starts Match
  const startRes = await new Promise((resolve) => {
    client1.emit('start_match', resolve);
  });
  console.log('✓ Start Match Response:', startRes);
  if (!startRes.success) throw new Error('Start match failed');

  // 6. Wait for Match to begin (countdown 3s)
  await new Promise((resolve) => {
    client1.on('countdown_tick', (data) => {
      console.log(`[COUNTDOWN TICK] ${data.count === 0 ? 'GO!' : data.count}`);
      if (data.count === 0) {
        setTimeout(resolve, 300);
      }
    });
  });

  console.log('✓ Match in progress! Testing authoritative combat & projectile hits...');

  // Track latest snapshot
  let latestSnapshot = null;
  client1.on('game_snapshot', (snap) => {
    latestSnapshot = snap;
  });

  // Wait a moment for positions
  await new Promise((r) => setTimeout(r, 400));

  let player1Pos = latestSnapshot.players.find((p) => p.id === client1.id);
  let player2Pos = latestSnapshot.players.find((p) => p.id === client2.id);
  console.log('Initial Player 1 Pos:', player1Pos.x, player1Pos.y);
  console.log('Initial Player 2 Pos:', player2Pos.x, player2Pos.y);

  // 7. Aim Player 1 at Player 2 and Shoot
  let matchOverData = null;
  const matchOverPromise = new Promise((resolve) => {
    client1.on('match_over', (data) => {
      console.log('✓ MATCH OVER EVENT RECEIVED! Winner:', data.winner ? data.winner.name : 'None');
      matchOverData = data;
      resolve(data);
    });
  });

  client1.on('player_hit', (data) => {
    console.log(`[HIT EVENT] Victim: ${data.victimName}, Damage: ${data.damage}, HP Left: ${data.remainingHealth}`);
  });

  client1.on('player_died', (data) => {
    console.log(`[KILL EVENT] 💀 ${data.victimName} eliminated by ${data.killerName}!`);
  });

  // Shoot loop until match ends or 10 shots
  const shootInterval = setInterval(() => {
    if (!latestSnapshot) return;
    const p1 = latestSnapshot.players.find((p) => p.id === client1.id);
    const p2 = latestSnapshot.players.find((p) => p.id === client2.id);

    if (p1 && p2 && p2.isAlive) {
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      client1.emit('player_input', {
        up: false,
        down: false,
        left: false,
        right: false,
        angle,
      });
      client1.emit('player_shoot');
    }
  }, 200);

  await matchOverPromise;
  clearInterval(shootInterval);

  if (matchOverData && matchOverData.winner && matchOverData.winner.name === 'Pilot_Alpha') {
    console.log('🎉 TEST SUCCESSFUL: Pilot_Alpha won the match authoritatively!');
  } else {
    throw new Error('Test failed: unexpected winner ' + JSON.stringify(matchOverData));
  }

  // 8. Test Rematch
  const rematchRes = await new Promise((resolve) => {
    client1.emit('request_rematch', resolve);
  });
  console.log('✓ Rematch response:', rematchRes);

  client1.disconnect();
  client2.disconnect();

  console.log('--- ALL MULTIPLAYER TEST SUITES PASSED PERFECTLY ---');
  process.exit(0);
}

runMultiplayerTest().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
