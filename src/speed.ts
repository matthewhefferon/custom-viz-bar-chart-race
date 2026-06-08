/** Maps Speed 1 (slow) … 10 (fast) to milliseconds per frame. */
export function speedToFrameMs(speed: number) {
  const clamped = Math.min(10, Math.max(1, speed));
  return Math.round(300 + (1700 * (10 - clamped)) / 9);
}
