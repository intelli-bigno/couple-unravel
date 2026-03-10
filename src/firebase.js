import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove, push, get, update, onDisconnect } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAvnf6Sl_9CGBx2daS3KiIW-Ul62_3L6YA",
  authDomain: "couple-diary-61d56.firebaseapp.com",
  projectId: "couple-diary-61d56",
  storageBucket: "couple-diary-61d56.firebasestorage.app",
  messagingSenderId: "434666098108",
  appId: "1:434666098108:web:0d110b3419299ea31b2fb9",
  databaseURL: "https://couple-diary-61d56-default-rtdb.firebaseio.com"
};

let app, db, auth;
try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  auth = getAuth(app);
} catch (e) {
  console.warn('Firebase init error:', e);
}

export async function signIn() {
  try {
    if (!auth) return 'solo-' + Math.random().toString(36).substring(2, 8);
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch (e) {
    console.warn('Auth error, using solo mode:', e);
    return 'solo-' + Math.random().toString(36).substring(2, 8);
  }
}

export function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createRoom(code, uid) {
  const roomRef = ref(db, `rooms/${code}`);
  await set(roomRef, {
    host: uid,
    player1: uid,
    player2: null,
    state: 'waiting',
    stage: 1,
    puzzle: {},
    createdAt: Date.now()
  });
  onDisconnect(ref(db, `rooms/${code}/players/${uid}`)).remove();
  return code;
}

export async function joinRoom(code, uid) {
  const roomRef = ref(db, `rooms/${code}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return null;
  const data = snap.val();
  if (data.player2 && data.player2 !== uid) return null;
  await update(roomRef, { player2: uid, state: 'ready' });
  onDisconnect(ref(db, `rooms/${code}/players/${uid}`)).remove();
  return data;
}

export function syncPlayerPosition(code, playerNum, x, y, velX, velY) {
  const pRef = ref(db, `rooms/${code}/positions/p${playerNum}`);
  set(pRef, { x, y, velX, velY, t: Date.now() });
}

export function onPlayerPosition(code, playerNum, callback) {
  const pRef = ref(db, `rooms/${code}/positions/p${playerNum}`);
  return onValue(pRef, (snap) => {
    if (snap.exists()) callback(snap.val());
  });
}

export function syncPuzzleState(code, puzzleId, state) {
  const pRef = ref(db, `rooms/${code}/puzzle/${puzzleId}`);
  set(pRef, state);
}

export function onPuzzleState(code, callback) {
  const pRef = ref(db, `rooms/${code}/puzzle`);
  return onValue(pRef, (snap) => {
    if (snap.exists()) callback(snap.val());
  });
}

export function syncStage(code, stage) {
  set(ref(db, `rooms/${code}/stage`), stage);
}

export function onStageChange(code, callback) {
  onValue(ref(db, `rooms/${code}/stage`), (snap) => {
    if (snap.exists()) callback(snap.val());
  });
}

export function syncGameEvent(code, event) {
  set(ref(db, `rooms/${code}/event`), { ...event, t: Date.now() });
}

export function onGameEvent(code, callback) {
  onValue(ref(db, `rooms/${code}/event`), (snap) => {
    if (snap.exists()) callback(snap.val());
  });
}

export { db, auth, ref, set, onValue, remove, get, update };

// Safe wrappers for when Realtime DB isn't available
export function safeSyncPlayerPosition(code, playerNum, x, y, velX, velY) {
  if (!db) return;
  try { syncPlayerPosition(code, playerNum, x, y, velX, velY); } catch(e) {}
}

export function safeOnPlayerPosition(code, playerNum, callback) {
  if (!db) return () => {};
  try { return onPlayerPosition(code, playerNum, callback); } catch(e) { return () => {}; }
}
