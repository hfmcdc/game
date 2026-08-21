import { WEAPON_CONFIG, GAME_STATES } from '../config/constants.js';
import { Projectile } from '../game/Projectile.js';
import { Collision } from '../game/Collision.js';

export class CombatSystem {
  constructor(game) {
    this.game = game;
  }

  tryShoot(player) {
    if (this.game.state !== GAME_STATES.PLAYING) return null;
    if (!player || !player.isAlive) return null;

    const now = Date.now();
    if (now - player.lastShotTime < WEAPON_CONFIG.FIRE_RATE) {
      return null; // Rate-limited
    }

    player.lastShotTime = now;

    const projectile = new Projectile(
      player.id,
      player.name,
      player.x,
      player.y,
      player.angle,
      player.color
    );

    this.game.projectiles.push(projectile);

    return {
      type: 'shot_fired',
      projectile: projectile.serialize(),
      shooterId: player.id,
      x: projectile.x,
      y: projectile.y,
      angle: projectile.angle,
    };
  }

  update(dt) {
    if (this.game.state !== GAME_STATES.PLAYING) return [];

    const events = [];
    const remainingProjectiles = [];

    for (const proj of this.game.projectiles) {
      const expired = proj.update(dt);
      if (expired) {
        continue;
      }

      // 1. Check projectile vs Arena Obstacles
      let hitObstacle = false;
      for (const obstacle of this.game.arena.obstacles) {
        if (Collision.checkCircleRect(proj.x, proj.y, proj.radius, obstacle)) {
          hitObstacle = true;
          events.push({
            type: 'projectile_hit_wall',
            x: proj.x,
            y: proj.y,
            projectileId: proj.id,
          });
          break;
        }
      }

      if (hitObstacle) {
        continue;
      }

      // 2. Check projectile vs Other Players
      let hitPlayer = false;
      for (const player of this.game.players.values()) {
        if (!player.isAlive || player.id === proj.ownerId) {
          continue;
        }

        if (Collision.checkCircleCircle(proj.x, proj.y, proj.radius, player.x, player.y, player.radius)) {
          hitPlayer = true;
          const died = player.takeDamage(proj.damage);

          if (!died) {
            events.push({
              type: 'player_hit',
              victimId: player.id,
              victimName: player.name,
              attackerId: proj.ownerId,
              attackerName: proj.ownerName,
              damage: proj.damage,
              remainingHealth: player.health,
              x: player.x,
              y: player.y,
            });
          } else {
            const killer = this.game.players.get(proj.ownerId);
            if (killer) {
              killer.kills += 1;
              killer.score += 1;
            }

            events.push({
              type: 'player_died',
              victimId: player.id,
              victimName: player.name,
              killerId: proj.ownerId,
              killerName: proj.ownerName,
              killerScore: killer ? killer.score : 0,
              x: player.x,
              y: player.y,
            });

            // Win condition check: First to target score (10)
            if (killer && killer.score >= this.game.targetScore) {
              this.game.endMatch(killer);
            }
          }

          break;
        }
      }

      if (!hitPlayer) {
        remainingProjectiles.push(proj);
      }
    }

    this.game.projectiles = remainingProjectiles;
    return events;
  }
}
