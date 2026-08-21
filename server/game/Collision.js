export class Collision {
  /**
   * Resolves collision between a circle (Player) and an AABB rectangle (Obstacle)
   * Mutates player position (x, y) if overlapping.
   * Returns true if a collision occurred.
   */
  static resolveCircleRect(circleX, circleY, radius, rect) {
    const rx = rect.x;
    const ry = rect.y;
    const rw = rect.width;
    const rh = rect.height;

    // Find the closest point on the rectangle to the circle center
    const closestX = Math.max(rx, Math.min(circleX, rx + rw));
    const closestY = Math.max(ry, Math.min(circleY, ry + rh));

    const distX = circleX - closestX;
    const distY = circleY - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);

      if (dist === 0) {
        // Circle center is inside the rectangle; push out to nearest edge
        const leftDist = Math.abs(circleX - rx);
        const rightDist = Math.abs(rx + rw - circleX);
        const topDist = Math.abs(circleY - ry);
        const bottomDist = Math.abs(ry + rh - circleY);

        const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);
        if (minDist === leftDist) return { x: rx - radius, y: circleY, collided: true };
        if (minDist === rightDist) return { x: rx + rw + radius, y: circleY, collided: true };
        if (minDist === topDist) return { x: circleX, y: ry - radius, collided: true };
        return { x: circleX, y: ry + rh + radius, collided: true };
      }

      // Push circle out along normal
      const overlap = radius - dist;
      const nx = distX / dist;
      const ny = distY / dist;

      return {
        x: circleX + nx * overlap,
        y: circleY + ny * overlap,
        collided: true,
      };
    }

    return { x: circleX, y: circleY, collided: false };
  }

  /**
   * Tests if a circle (Projectile) intersects an AABB rectangle
   */
  static checkCircleRect(circleX, circleY, radius, rect) {
    const closestX = Math.max(rect.x, Math.min(circleX, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circleY, rect.y + rect.height));

    const distX = circleX - closestX;
    const distY = circleY - closestY;

    return distX * distX + distY * distY < radius * radius;
  }

  /**
   * Tests if two circles intersect (e.g. Projectile vs Player)
   */
  static checkCircleCircle(x1, y1, r1, x2, y2, r2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const rSum = r1 + r2;
    return dx * dx + dy * dy < rSum * rSum;
  }
}
