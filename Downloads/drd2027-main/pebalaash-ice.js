/* ============================================================
   PEBALAASH ICE OVERLAY — paste in pebalaash.html
   ============================================================
   HOW IT WORKS:
   • A full-screen ice layer sits ABOVE the products section.
   • It uses position:sticky so it stays on screen as user scrolls.
   • CSS clip-path or opacity animates based on points.
   • Thresholds: 0→99 pts = fully frozen, 100→299 = partial melt,
     300+ = fully melted (products revealed).
   • Adjust THRESHOLDS to match your game balance.
   ============================================================ */

/* ── 1. PASTE THIS HTML just inside your products section wrapper ── */
/*
  <div id="ice-overlay-wrap">
    <div id="ice-overlay">
      <div class="ice-content">
        <div class="ice-icon">❄️</div>
        <h2 class="ice-title">المنتجات مجمّدة!</h2>
        <p class="ice-subtitle">اجمع نقاطاً من البالون لإذابة الجليد واكتشاف المنتجات</p>
        <div class="ice-points-bar-wrap">
          <div class="ice-points-bar" id="iceProgressBar"></div>
        </div>
        <p class="ice-pts-label" id="icePtsLabel">0 / 300 نقطة</p>
      </div>
    </div>
  </div>
*/

/* ── 2. CSS — add to your stylesheet or <style> tag ── */
const ICE_CSS = `
#ice-overlay-wrap {
  position: relative;
  z-index: 10;
}

#ice-overlay {
  position: sticky;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  pointer-events: all;
  overflow: hidden;
  background: transparent;
  transition: opacity 1.2s ease;
  z-index: 10;
}

/* ---- frosted glass ice effect ---- */
#ice-overlay::before {
  content: "";
  position: absolute;
  inset: 0;
  background: 
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E"),
    linear-gradient(160deg, rgba(200,235,255,0.82) 0%, rgba(170,215,255,0.75) 40%, rgba(140,200,255,0.82) 100%);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  border-bottom: 2px solid rgba(255,255,255,0.5);
  transition: opacity 1.2s ease;
}

/* ice cracks overlay */
#ice-overlay::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("https://i.imgur.com/zYlax2e.png"); /* ice crack texture */
  background-size: cover;
  opacity: 0.18;
  mix-blend-mode: overlay;
  pointer-events: none;
}

.ice-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 14px;
  padding: 20px;
  text-align: center;
  color: #003060;
  font-family: 'Cairo', sans-serif;
  direction: rtl;
}

.ice-icon {
  font-size: 64px;
  animation: icePulse 2.5s ease-in-out infinite;
  filter: drop-shadow(0 0 18px rgba(100,200,255,0.9));
}

@keyframes icePulse {
  0%,100% { transform: scale(1) rotate(-5deg); }
  50%      { transform: scale(1.12) rotate(5deg); }
}

.ice-title {
  font-size: 28px;
  font-weight: 900;
  color: #002244;
  text-shadow: 0 2px 12px rgba(100,200,255,0.5);
  margin: 0;
}

.ice-subtitle {
  font-size: 15px;
  color: #014080;
  max-width: 300px;
  margin: 0;
}

.ice-points-bar-wrap {
  width: 260px;
  height: 18px;
  background: rgba(255,255,255,0.4);
  border-radius: 50px;
  overflow: hidden;
  border: 1.5px solid rgba(100,180,255,0.5);
  box-shadow: inset 0 2px 8px rgba(0,0,0,.1);
}

.ice-points-bar {
  height: 100%;
  width: 0%;
  border-radius: 50px;
  background: linear-gradient(90deg, #00c6ff, #0072ff);
  transition: width 0.8s cubic-bezier(.4,0,.2,1);
  box-shadow: 0 0 12px rgba(0,114,255,0.6);
}

.ice-pts-label {
  font-size: 14px;
  font-weight: 700;
  color: #003060;
  margin: 0;
}

/* partial melt: cracks show through */
#ice-overlay.melting-25::before  { opacity: 0.75; }
#ice-overlay.melting-50::before  { opacity: 0.55; }
#ice-overlay.melting-75::before  { opacity: 0.35; }
#ice-overlay.melted {
  pointer-events: none;
  opacity: 0;
  height: 0;
  overflow: hidden;
}
#ice-overlay.melted::before { opacity: 0; }
`;

/* ── 3. JAVASCRIPT ── */
import { listenToPoints, getCurrentUser } from "./points-wallet.js";

const FULLY_MELTED_PTS = 300;  // points needed to fully reveal products

function injectIceCSS() {
  if (document.getElementById("ice-css")) return;
  const s = document.createElement("style");
  s.id = "ice-css";
  s.textContent = ICE_CSS;
  document.head.appendChild(s);
}

function injectIceHTML() {
  // Find your products container — adjust selector to match your markup
  const productsSection = document.querySelector(".products-section, #pebalaash-products, .pebalaash-grid, main");
  if (!productsSection) { console.warn("Ice: products section not found"); return; }

  const wrap = document.createElement("div");
  wrap.id = "ice-overlay-wrap";
  wrap.innerHTML = `
    <div id="ice-overlay">
      <div class="ice-content">
        <div class="ice-icon">❄️</div>
        <h2 class="ice-title">المنتجات مجمّدة!</h2>
        <p class="ice-subtitle">اجمع نقاطاً من البالون لإذابة الجليد واكتشاف المنتجات</p>
        <div class="ice-points-bar-wrap">
          <div class="ice-points-bar" id="iceProgressBar"></div>
        </div>
        <p class="ice-pts-label" id="icePtsLabel">0 / ${FULLY_MELTED_PTS} نقطة</p>
        <a href="balloon.html" style="
          margin-top:10px;
          display:inline-block;
          padding:10px 28px;
          background:linear-gradient(135deg,#00c6ff,#0072ff);
          color:#fff;
          border-radius:50px;
          font-family:Cairo,sans-serif;
          font-weight:700;
          font-size:14px;
          text-decoration:none;
          box-shadow:0 4px 16px rgba(0,114,255,.4);
        ">🎈 العب البالون واكسب نقاطاً</a>
      </div>
    </div>
  `;

  // Insert the ice overlay as FIRST child of products section
  productsSection.style.position = "relative";
  productsSection.insertBefore(wrap, productsSection.firstChild);
}

function updateIceState(pts) {
  const overlay   = document.getElementById("ice-overlay");
  const bar       = document.getElementById("iceProgressBar");
  const label     = document.getElementById("icePtsLabel");
  if (!overlay) return;

  const pct = Math.min((pts / FULLY_MELTED_PTS) * 100, 100);

  if (bar)   bar.style.width = pct + "%";
  if (label) label.textContent = `${pts} / ${FULLY_MELTED_PTS} نقطة`;

  // Remove all melt classes
  overlay.classList.remove("melting-25", "melting-50", "melting-75", "melted");

  if (pts >= FULLY_MELTED_PTS) {
    overlay.classList.add("melted");
  } else if (pts >= FULLY_MELTED_PTS * 0.75) {
    overlay.classList.add("melting-75");
  } else if (pts >= FULLY_MELTED_PTS * 0.5) {
    overlay.classList.add("melting-50");
  } else if (pts >= FULLY_MELTED_PTS * 0.25) {
    overlay.classList.add("melting-25");
  }
}

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  injectIceCSS();
  injectIceHTML();

  const user = await getCurrentUser();
  if (!user) return;

  // Real-time listener from Firestore
  listenToPoints(user.uid, (pts) => updateIceState(pts));

  // Also respond to same-page balloon events
  window.addEventListener("pointsUpdated", (e) => {
    updateIceState(e.detail.total);
  });
});
