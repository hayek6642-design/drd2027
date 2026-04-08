/**
 * balloon.service.js
 *
 * Handles balloon game logic:
 * - Balloon has 4 options (A/B/C/D)
 * - Options A, B, C award points; D awards 0 (the "trap")
 * - Points are sent to the Pebalaash wallet via the server API
 * - The IceOverlay in Pebalaash reacts in real time via window events
 *
 * NO Firebase / Firestore is used. All state lives in the Pebalaash
 * PostgreSQL database via: POST /api/pebalaash/balloon/pop
 */

// ── Point values per option ──────────────────────────────────────────────────
export const OPTION_POINTS = {
  A: 25,   // e.g. "Watch ad"       → most points
  B: 15,   // e.g. "Share platform" → medium points
  C: 10,   // e.g. "Like content"   → small points
  D: 0,    // e.g. "Pop & leave"    → trap, no points
};

// ── Pebalaash API base (override with env var in Node context) ───────────────
const PEBALAASH_BASE =
  (typeof process !== "undefined" && process.env?.PEBALAASH_API_URL) ||
  (typeof window  !== "undefined" && window.location.origin) ||
  "http://localhost:5000";

/**
 * Called when the user selects an option after popping a balloon.
 *
 * @param {string} optionKey  "A" | "B" | "C" | "D"
 * @param {string} [userId]   Reserved for future multi-user support
 * @returns {{ success: boolean, points: number, newTotal: number }}
 */
export async function handleBalloonOption(optionKey, userId = null) {
  const points = OPTION_POINTS[optionKey] ?? 0;

  try {
    const res = await fetch(`${PEBALAASH_BASE}/api/pebalaash/balloon/pop`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ points, optionKey, userId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("[BalloonService] pop failed:", res.status, err);
      return { success: false, points: 0, newTotal: 0 };
    }

    const data = await res.json();
    const newTotal = Number(data.newTotal ?? 0);

    // Broadcast to any listening IceOverlay / UI components
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("balloon:points:update", {
        detail: { newTotal, delta: points, optionKey },
      }));
    }

    return { success: true, points, newTotal };
  } catch (err) {
    console.error("[BalloonService] Network error:", err);
    return { success: false, points: 0, newTotal: 0 };
  }
}

/**
 * Fetch current balloon points total for a user.
 * Useful to sync state on page load.
 *
 * @returns {number} current balloon points total
 */
export async function getBalloonPoints() {
  try {
    const res = await fetch(`${PEBALAASH_BASE}/api/pebalaash/balloon/points`);
    if (!res.ok) return 0;
    const { balloonPoints } = await res.json();
    return Number(balloonPoints ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Returns the reward description for each option.
 * Use this to label the 4 balloon option buttons in the UI.
 */
export function getOptionLabels() {
  return {
    A: { label: "Watch Ad",        points: OPTION_POINTS.A, emoji: "📺" },
    B: { label: "Share",           points: OPTION_POINTS.B, emoji: "🔗" },
    C: { label: "Like & Follow",   points: OPTION_POINTS.C, emoji: "❤️" },
    D: { label: "Pop & Leave",     points: OPTION_POINTS.D, emoji: "💨" },
  };
}
