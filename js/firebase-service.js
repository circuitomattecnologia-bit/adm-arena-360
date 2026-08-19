import { FIREBASE } from "./firebase-config.js";

const BASE = (FIREBASE.config.databaseURL || "").replace(/\/+$/, "");

function ensureConfigured() {
  if (!FIREBASE.enabled) return false;
  if (!BASE || BASE.includes("COLE_AQUI")) {
    throw new Error("Firebase não configurado: databaseURL ausente.");
  }
  return true;
}

function pathUrl(path) {
  const clean = String(path || "").replace(/^\/+|\/+$/g, "");
  return `${BASE}/${clean}.json`;
}

function snapshot(value) {
  return {
    val() { return value; },
    exists() { return value !== null && value !== undefined; }
  };
}

// Camada compatível com o restante do jogo, usando a REST API
// do Firebase Realtime Database. Evita dependência do SDK externo.
export async function getFirebase() {
  if (!ensureConfigured()) return null;

  return {
    db: true,

    ref(_db, path) {
      return String(path || "");
    },

    async set(refPath, value) {
      const response = await fetch(pathUrl(refPath), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value)
      });
      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Firebase recusou a gravação (${response.status}): ${txt}`);
      }
      return true;
    },

    async get(refPath) {
      const response = await fetch(pathUrl(refPath), {
        method: "GET",
        cache: "no-store"
      });
      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Firebase recusou a leitura (${response.status}): ${txt}`);
      }
      return snapshot(await response.json());
    },

    onValue(refPath, callback) {
      let active = true;
      let last = Symbol("initial");

      const poll = async () => {
        if (!active) return;
        try {
          const response = await fetch(`${pathUrl(refPath)}?t=${Date.now()}`, {
            method: "GET",
            cache: "no-store"
          });
          if (!response.ok) return;
          const value = await response.json();
          const serialized = JSON.stringify(value);
          if (serialized !== last) {
            last = serialized;
            callback(snapshot(value));
          }
        } catch (err) {
          console.error("ADM Arena Firebase:", err);
        }
      };

      poll();
      const timer = setInterval(poll, 900);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }
  };
}

export function demoGet(key, fallback = null) {
  try {
    const v = localStorage.getItem("adm360:" + key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export function demoSet(key, value) {
  localStorage.setItem("adm360:" + key, JSON.stringify(value));
}

export function roomCode() {
  return "ADM-" + Math.floor(1000 + Math.random() * 9000);
}
