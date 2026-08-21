import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';

async function runDeathmatchTest() {
  console.log('--- STARTING NEXUS FIRST-TO-30 DEATHMATCH TEST ---');

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

  // 2. Create and Join Room
  const createRes = await new Promise((resolve) => {
    client1.emit('create_room', { playerName: 'CyberLord' }, resolve);
  });
  console.log('✓ Create Room:', createRes.roomCode);
  roomCode = createRes.roomCode;

  const joinRes = await new Promise((resolve) => {
    client2.emit('join_room', { roomCode, playerName: 'NeonPhantom' }, resolve);
  });
  console.log('✓ Join Room Success');

  // 3. Ready & Start Match
  client2.emit('set_ready', { isReady: true });
  await new Promise((resolve) => client1.emit('start_match', resolve));

  // 4. Wait for countdown
  await new Promise((resolve) => {
    client1.on('countdown_tick', (data) => {
      if (data.count === 0) setTimeout(resolve, 300);
    });
  });

  console.log('✓ Deathmatch in progress! Continuous combat active. First to 30 wins.');

  let latestSnapshot = null;
  client1.on('game_snapshot', (snap) => {
    latestSnapshot = snap;
  });

  await new Promise((r) => setTimeout(r, 400));

  let killCount = 0;
  let respawnCount = 0;

  client1.on('player_died', (data) => {
    killCount++;
    console.log(`[KILL #${killCount}] ⚔ ${data.killerName} eliminated ${data.victimName} (Score: ${data.killerScore}/30)`);
  });

  client1.on('player_respawned', (data) => {
    respawnCount++;
    console.log(`[RESPAWN #${respawnCount}] ⚡ ${data.playerName} respawned at (${Math.round(data.x)}, ${Math.round(data.y)})!`);
  });

  let matchOverPromise = new Promise((resolve) => {
    client1.on('match_over', (data) => {
      console.log('🏆 MATCH OVER! Champion:', data.winner.name, 'Final Score:', data.winner.score);
      resolve(data);
    });
  });

  // Perimeter pathfinder
  function getPerimeterMove(x, y, targetX, targetY) {
    let up = false, down = false, left = false, right = false;

    // If target is in line of sight (same quadrant or same perimeter wall)
    if (Math.abs(x - targetX) < 150) {
      if (targetY > y + 20) down = true;
      else if (targetY < y - 20) up = true;
    } else if (Math.abs(y - targetY) < 150) {
      if (targetX > x + 20) right = true;
      else if (targetX < x - 20) left = true;
    } else {
      // Move along perimeter ring: Top (y<=250), Right (x>=1750), Bottom (y>=1750), Left (x<=250)
      if (y <= 250 && x < 1750 && targetX > x) right = true;
      else if (x >= 1750 && y < 1750 && targetY > y) down = true;
      else if (y >= 1750 && x > 250 && targetX < x) left = true;
      else if (x <= 250 && y > 250 && targetY < y) up = true;
      else if (y <= 250) right = true;
      else if (x >= 1750) down = true;
      else if (y >= 1750) left = true;
      else up = true;
    }

    return { up, down, left, right };
  }

  // Steering & combat loop
  const loop = setInterval(() => {
    if (!latestSnapshot || latestSnapshot.state !== 'PLAYING') return;

    const p1 = latestSnapshot.players.find((p) => p.id === client1.id);
    const p2 = latestSnapshot.players.find((p) => p.id === client2.id);

    if (p1 && p2 && p2.isAlive) {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);

      const move = getPerimeterMove(p1.x, p1.y, p2.x, p2.y);
      client1.emit('player_input', {
        ...move,
        angle,
      });

      // Shoot when in range
      if (dist < 1200) {
        client1.emit('player_shoot');
      }
    }
  }, 40);

  const finalMatchData = await matchOverPromise;
  clearInterval(loop);

  console.log('✓ Final Match Champion:', finalMatchData.winner.name);
  console.log('✓ Champion Score:', finalMatchData.winner.score);
  console.log('✓ Total Respawns During Match:', respawnCount);

  if (finalMatchData.winner.score < 30) {
    throw new Error(`Winner score was ${finalMatchData.winner.score}, expected >= 30`);
  }

  // Test Play Again / Rematch
  console.log('✓ Testing PLAY AGAIN...');
  const playAgainRes = await new Promise((resolve) => {
    client1.emit('play_again', resolve);
  });
  console.log('✓ Play Again Response:', playAgainRes);

  client1.disconnect();
  client2.disconnect();

  console.log('--- ALL DEATHMATCH MULTIPLAYER TEST SUITES PASSED PERFECTLY ---');
  process.exit(0);
}

runDeathmatchTest().catch((err) => {
  console.error('❌ DEATHMATCH TEST FAILED:', err);
  process.exit(1);
});
