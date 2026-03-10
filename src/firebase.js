import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';

let db = null;
let firebaseReady = false;
let dbModule = null;

const firebaseConfig = {
  apiKey: "AIzaSyAvnf6Sl_9CGBx2daS3KiIW-Ul62_3L6YA",
  authDomain: "couple-diary-61d56.firebaseapp.com",
  projectId: "couple-diary-61d56",
  storageBucket: "couple-diary-61d56.firebasestorage.app",
  messagingSenderId: "434666098108",
  appId: "1:434666098108:web:0d110b3419299ea31b2fb9",
  databaseURL: "https://couple-diary-61d56-default-rtdb.firebaseio.com"
};

let app, auth;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch(e) {
  console.warn('Firebase app init error:', e.message);
}

// Lazy init Realtime Database
async function initDB() {
  if (db) return true;
  try {
    dbModule = await import('firebase/database');
    db = dbModule.getDatabase(app);
    firebaseReady = true;
    return true;
  } catch(e) {
    console.warn('Realtime DB not available:', e.message);
    return false;
  }
}

export async function signIn() {
  if (!auth) return 'solo-' + Math.random().toString(36).substring(2, 8);
  try {
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch (e) {
    console.warn('Auth error:', e.message);
    return 'solo-' + Math.random().toString(36).substring(2, 8);
  }
}

export function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createRoom(code, uid) {
  if (!(await initDB())) return code;
  try {
    const roomRef = dbModule.ref(db, `rooms/${code}`);
    await dbModule.set(roomRef, {
      host: uid, player1: uid, player2: null,
      state: 'waiting', stage: 1, puzzle: {}, createdAt: Date.now()
    });
  } catch(e) { console.warn('createRoom error:', e.message); }
  return code;
}

export async function joinRoom(code, uid) {
  if (!(await initDB())) return null;
  try {
    const roomRef = dbModule.ref(db, `rooms/${code}`);
    const snap = await dbModule.get(roomRef);
    if (!snap.exists()) return null;
    const data = snap.val();
    if (data.player2 && data.player2 !== uid) return null;
    await dbModule.update(roomRef, { player2: uid, state: 'ready' });
    return data;
  } catch(e) { console.warn('joinRoom error:', e.message); return null; }
}

export function syncPlayerPosition(code, playerNum, x, y, velX, velY) {
  if (!firebaseReady || !dbModule) return;
  try { dbModule.set(dbModule.ref(db, `rooms/${code}/positions/p${playerNum}`), { x, y, velX, velY, t: Date.now() }); } catch(e) {}
}

export function onPlayerPosition(code, playerNum, callback) {
  if (!firebaseReady || !dbModule) return () => {};
  try {
    return dbModule.onValue(dbModule.ref(db, `rooms/${code}/positions/p${playerNum}`), (snap) => {
      if (snap.exists()) callback(snap.val());
    });
  } catch(e) { return () => {}; }
}

export function syncPuzzleState(code, puzzleId, state) {
  if (!firebaseReady || !dbModule) return;
  try { dbModule.set(dbModule.ref(db, `rooms/${code}/puzzle/${puzzleId}`), state); } catch(e) {}
}

export function onPuzzleState(code, callback) {
  if (!firebaseReady || !dbModule) return () => {};
  try {
    return dbModule.onValue(dbModule.ref(db, `rooms/${code}/puzzle`), (snap) => {
      if (snap.exists()) callback(snap.val());
    });
  } catch(e) { return () => {}; }
}

export function syncStage(code, stage) {
  if (!firebaseReady || !dbModule) return;
  try { dbModule.set(dbModule.ref(db, `rooms/${code}/stage`), stage); } catch(e) {}
}

export function onStageChange(code, callback) {
  if (!firebaseReady || !dbModule) return () => {};
  try {
    return dbModule.onValue(dbModule.ref(db, `rooms/${code}/stage`), (snap) => {
      if (snap.exists()) callback(snap.val());
    });
  } catch(e) { return () => {}; }
}

export function syncGameEvent(code, event) {
  if (!firebaseReady || !dbModule) return;
  try { dbModule.set(dbModule.ref(db, `rooms/${code}/event`), { ...event, t: Date.now() }); } catch(e) {}
}

export function onGameEvent(code, callback) {
  if (!firebaseReady || !dbModule) return () => {};
  try {
    return dbModule.onValue(dbModule.ref(db, `rooms/${code}/event`), (snap) => {
      if (snap.exists()) callback(snap.val());
    });
  } catch(e) { return () => {}; }
}

export { db, auth, firebaseReady };
