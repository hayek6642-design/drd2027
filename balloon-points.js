// ============================================================
// BALLOON LOGIC — POINTS INTEGRATION
// Add this script to balloon.html (or merge into existing JS)
// ============================================================
// RULES:
//   Option A → +30 pts  (e.g. "Watch an Ad")
//   Option B → +20 pts  (e.g. "Answer a Question")
//   Option C → +10 pts  (e.g. "Spin & Win")
//   Option D →  0 pts   (the "bad" option — pop & nothing)
//
// Adjust POINT_MAP below to match your actual option labels.
// ============================================================

import { addPoints, getCurrentUser } from "./points-wallet.js";

// ── Point values per option ──────────────────────────────────
const POINT_MAP = {
  optionA: 30,   // winning option 1
  optionB: 20,   // winning option 2
  optionC: 10,   // winning option 3
  optionD: 0,    // losing option
};

// ── Toast notification helper ────────────────────────────────
function showPointsToast(pts) {
  const existing = document.getElementById("pts-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "pts-toast";
  toast.innerHTML = pts > 0
    ? `<span>🎉 +${pts} نقطة أضيفت لمحفظتك!</span>`
    : `<span>💨 حظ أوفر في المرة القادمة!</span>`;

  Object.assign(toast.style, {
    position: "fixed",
    bottom: "90px",
    left: "50%",
    transform: "translateX(-50%)",
    background: pts > 0 ? "linear-gradient(135deg,#00c6ff,#0072ff)" : "#555",
    color: "#fff",
    padding: "12px 28px",
    borderRadius: "50px",
    fontFamily: "Cairo, sans-serif",
    fontSize: "15px",
    fontWeight: "700",
    boxShadow: "0 8px 24px rgba(0,0,0,.3)",
    zIndex: "9999",
    opacity: "1",
    transition: "opacity .5s ease"
  });

  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; }, 2500);
  setTimeout(() => toast.remove(), 3100);
}

// ── Main handler — call this when user picks an option ───────
// optionKey: "optionA" | "optionB" | "optionC" | "optionD"
export async function handleBalloonPick(optionKey) {
  const pts = POINT_MAP[optionKey] ?? 0;
  showPointsToast(pts);

  if (pts > 0) {
    const user = await getCurrentUser();
    if (!user) {
      console.warn("Balloon: user not logged in — points not saved");
      return;
    }
    try {
      const newTotal = await addPoints(user.uid, pts, `balloon_${optionKey}`);
      console.log(`✅ +${pts} pts → total: ${newTotal}`);

      // Dispatch event so pebalaash ice layer can react even if on same page
      window.dispatchEvent(new CustomEvent("pointsUpdated", { detail: { total: newTotal } }));
    } catch (e) {
      console.error("Failed to save points:", e);
    }
  }
}

// ── Wire up existing balloon option buttons ──────────────────
// This assumes your balloon buttons have data-option="optionA" etc.
// Adjust the selector if your markup is different.
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll("[data-balloon-option]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.balloonOption; // "optionA" … "optionD"
      handleBalloonPick(key);
    });
  });
});

// ── Example: if you use a function call in your existing code ─
// Replace your existing balloon pick handler with:
//   import { handleBalloonPick } from "./balloon-points.js";
//   handleBalloonPick("optionA");  // or B, C, D
