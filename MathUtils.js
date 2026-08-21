export class MathUtils {
  static lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  static lerpAngle(start, end, amt) {
    let diff = end - start;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return start + diff * amt;
  }

  static hexToNumber(hexStr) {
    if (!hexStr) return 0x00f0ff;
    return parseInt(hexStr.replace('#', ''), 16);
  }
}
