// ============================================================
// PEBALAASH POINTS WALLET ENGINE
// Shared module — import this on balloon.html & pebalaash.html
// Requires Firebase (same config already used in your project)
// ============================================================

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  increment, collection, addDoc, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── Re-use existing Firebase app if already initialized ──────
const firebaseConfig = window._firebaseConfig || {};   // set this once in your main firebase-init.js
const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ── Wallet document path: users/{uid}/wallet/points ──────────
const walletRef = (uid) => doc(db, "users", uid, "wallet", "points");
const logRef    = (uid) => collection(db, "users", uid, "pointsLog");
const adminRef  = ()    => collection(db, "adminPointsStats");

// ─────────────────────────────────────────────────────────────
// 1.  GET current points for logged-in user
// ─────────────────────────────────────────────────────────────
export async function getPoints(uid) {
  const snap = await getDoc(walletRef(uid));
  if (!snap.exists()) {
    await setDoc(walletRef(uid), { total: 0, lastUpdated: serverTimestamp() });
    return 0;
  }
  return snap.data().total || 0;
}

// ─────────────────────────────────────────────────────────────
// 2.  ADD points (call this from balloon.js on winning options)
// ─────────────────────────────────────────────────────────────
export async function addPoints(uid, amount, reason = "balloon") {
  if (!uid || amount <= 0) return;

  // upsert wallet
  const ref = walletRef(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { total: amount, lastUpdated: serverTimestamp() });
  } else {
    await updateDoc(ref, { total: increment(amount), lastUpdated: serverTimestamp() });
  }

  const newTotal = (snap.exists() ? (snap.data().total || 0) : 0) + amount;

  // append to per-user log
  await addDoc(logRef(uid), {
    amount,
    reason,
    newTotal,
    ts: serverTimestamp()
  });

  // push to admin aggregate collection (for admin dashboard)
  await addDoc(adminRef(), {
    uid,
    amount,
    reason,
    newTotal,
    ts: serverTimestamp()
  });

  return newTotal;
}

// ─────────────────────────────────────────────────────────────
// 3.  LIVE listener — fires callback(totalPoints) on any change
//     Use on pebalaash.html to reactively update ice state
// ─────────────────────────────────────────────────────────────
export function listenToPoints(uid, callback) {
  return onSnapshot(walletRef(uid), (snap) => {
    callback(snap.exists() ? (snap.data().total || 0) : 0);
  });
}

// ─────────────────────────────────────────────────────────────
// 4.  CURRENT USER helper — resolves when auth is ready
// ─────────────────────────────────────────────────────────────
export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}
