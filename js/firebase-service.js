import { FIREBASE } from "./firebase-config.js";

const BASE = (FIREBASE.config.databaseURL || "").replace(/\/+$/, "");

/* ============================================================
   ADM ARENA 360 — CAMADA FIREBASE SEGURA
   VERSÃO OTIMIZADA DE CONSUMO
   ------------------------------------------------------------
   • preserva a API atual do projeto;
   • mantém PATCH granular para salas;
   • reduz leituras automáticas;
   • impede consultas simultâneas redundantes;
   • preserva professor, empresas, Mobile e rodadas;
   • não altera dados existentes da Arena.
   ============================================================ */

const cache = new Map();

/*
  Antes: 700 ms.
  Agora: 10 segundos.

  Ações feitas pelo usuário continuam sendo gravadas
  imediatamente. O intervalo abaixo afeta somente a
  verificação automática de mudanças.
*/
const SYNC_INTERVAL = 10000;

function ensureConfigured() {
  if (!FIREBASE.enabled) return false;

  if (!BASE || BASE.includes("COLE_AQUI")) {
    throw new Error(
      "Firebase não configurado: databaseURL ausente."
    );
  }

  return true;
}

function pathUrl(path) {
  const clean = String(path || "")
    .replace(/^\/+|\/+$/g, "");

  return `${BASE}/${clean}.json`;
}

function snapshot(value) {
  return {
    val() {
      return value;
    },

    exists() {
      return (
        value !== null &&
        value !== undefined
      );
    }
  };
}

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function isPlainObject(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function sameValue(a, b) {
  return (
    JSON.stringify(a) ===
    JSON.stringify(b)
  );
}

function joinPath(base, child) {
  return base
    ? `${base}/${child}`
    : child;
}

/* ============================================================
   PATCH PROFUNDO
   ============================================================ */

function buildDeepPatch(
  before,
  after,
  basePath = "",
  out = {}
) {
  if (sameValue(before, after)) {
    return out;
  }

  const beforeObj = isPlainObject(before);
  const afterObj = isPlainObject(after);

  if (!beforeObj || !afterObj) {
    if (basePath) {
      out[basePath] =
        after === undefined
          ? null
          : after;
    }

    return out;
  }

  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {})
  ]);

  for (const key of keys) {
    const nextPath =
      joinPath(basePath, key);

    const hasAfter =
      Object.prototype
        .hasOwnProperty
        .call(after, key);

    if (!hasAfter) {
      out[nextPath] = null;
      continue;
    }

    buildDeepPatch(
      before?.[key],
      after?.[key],
      nextPath,
      out
    );
  }

  return out;
}

function isRoomRoot(refPath) {
  return (
    /^rooms\/[^/]+$/
      .test(String(refPath || ""))
  );
}

/* ============================================================
   REQUISIÇÃO FIREBASE
   ============================================================ */

async function httpJson(
  url,
  options = {}
) {
  const response =
    await fetch(url, options);

  if (!response.ok) {
    const txt =
      await response.text();

    throw new Error(
      `Firebase recusou a operação (${response.status}): ${txt}`
    );
  }

  if (response.status === 204) {
    return null;
  }

  const text =
    await response.text();

  return text
    ? JSON.parse(text)
    : null;
}

/* ============================================================
   GRAVAÇÃO SEGURA DA SALA
   ============================================================ */

async function safeRoomWrite(
  refPath,
  value
) {
  const previous =
    cache.get(refPath);

  /*
    Primeira gravação conhecida:
    mantém o comportamento original.
  */

  if (previous === undefined) {
    await httpJson(
      pathUrl(refPath),
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(value)
      }
    );

    cache.set(
      refPath,
      clone(value)
    );

    return true;
  }

  const patch =
    buildDeepPatch(
      previous,
      value
    );

  const entries =
    Object.entries(patch);

  if (!entries.length) {
    cache.set(
      refPath,
      clone(value)
    );

    return true;
  }

  await httpJson(
    pathUrl(refPath),
    {
      method: "PATCH",

      headers: {
        "Content-Type":
          "application/json"
      },

      body:
        JSON.stringify(patch)
    }
  );

  cache.set(
    refPath,
    clone(value)
  );

  return true;
}

/* ============================================================
   FIREBASE
   ============================================================ */

export async function getFirebase() {
  if (!ensureConfigured()) {
    return null;
  }

  return {

    db: true,

    ref(_db, path) {
      return String(path || "")
        .replace(/^\/+|\/+$/g, "");
    },

    /* ========================================================
       SET
       ======================================================== */

    async set(
      refPath,
      value
    ) {
      const cleanPath =
        String(refPath || "")
          .replace(/^\/+|\/+$/g, "");

      if (
        isRoomRoot(cleanPath) &&
        isPlainObject(value)
      ) {
        return safeRoomWrite(
          cleanPath,
          value
        );
      }

      await httpJson(
        pathUrl(cleanPath),
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(value)
        }
      );

      /*
        Atualiza caches de sala já existentes,
        sem realizar nova leitura no Firebase.
      */

      for (
        const [
          cachedPath,
          cachedValue
        ] of cache.entries()
      ) {

        if (
          !cleanPath.startsWith(
            `${cachedPath}/`
          )
        ) {
          continue;
        }

        const relative =
          cleanPath
            .slice(
              cachedPath.length + 1
            )
            .split("/");

        const next =
          clone(cachedValue) || {};

        let cursor = next;

        for (
          let i = 0;
          i < relative.length - 1;
          i++
        ) {
          const key = relative[i];

          if (
            !isPlainObject(
              cursor[key]
            )
          ) {
            cursor[key] = {};
          }

          cursor =
            cursor[key];
        }

        cursor[
          relative[
            relative.length - 1
          ]
        ] =
          clone(value);

        cache.set(
          cachedPath,
          next
        );
      }

      return true;
    },

    /* ========================================================
       PATCH
       ======================================================== */

    async patch(
      refPath,
      value
    ) {
      const cleanPath =
        String(refPath || "")
          .replace(/^\/+|\/+$/g, "");

      await httpJson(
        pathUrl(cleanPath),
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              value || {}
            )
        }
      );

      return true;
    },

    /* ========================================================
       GET
       ======================================================== */

    async get(refPath) {
      const cleanPath =
        String(refPath || "")
          .replace(/^\/+|\/+$/g, "");

      const value =
        await httpJson(
          `${pathUrl(cleanPath)}?t=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store"
          }
        );

      if (
        isRoomRoot(cleanPath)
      ) {
        cache.set(
          cleanPath,
          clone(value)
        );
      }

      return snapshot(value);
    },

    /* ========================================================
       REMOVE
       ======================================================== */

    async remove(refPath) {
      const cleanPath =
        String(refPath || "")
          .replace(/^\/+|\/+$/g, "");

      await httpJson(
        pathUrl(cleanPath),
        {
          method: "DELETE",

          headers: {
            "Content-Type":
              "application/json"
          }
        }
      );

      return true;
    },

    /* ========================================================
       TEMPO REAL OTIMIZADO

       IMPORTANTE:
       A versão anterior consultava o Firebase a cada 700 ms.

       Agora:
       • primeira leitura imediata;
       • atualização automática a cada 10 segundos;
       • nunca executa duas consultas simultâneas;
       • callback somente quando os dados mudam;
       • pausa atualização quando a página não está visível;
       • ao retornar à página, sincroniza imediatamente.
       ======================================================== */

    onValue(
      refPath,
      callback
    ) {
      const cleanPath =
        String(refPath || "")
          .replace(/^\/+|\/+$/g, "");

      let active = true;
      let running = false;

      let last =
        Symbol("initial");

      const poll =
        async () => {

          if (
            !active ||
            running
          ) {
            return;
          }

          /*
            Não consome Firebase enquanto a aba
            estiver em segundo plano.
          */
          if (
            typeof document !== "undefined" &&
            document.hidden
          ) {
            return;
          }

          running = true;

          try {

            const value =
              await httpJson(
                `${pathUrl(cleanPath)}?t=${Date.now()}`,
                {
                  method: "GET",
                  cache: "no-store"
                }
              );

            if (
              isRoomRoot(cleanPath)
            ) {
              cache.set(
                cleanPath,
                clone(value)
              );
            }

            const serialized =
              JSON.stringify(value);

            if (
              serialized !== last
            ) {
              last = serialized;

              callback(
                snapshot(value)
              );
            }

          } catch (err) {

            console.error(
              "ADM Arena Firebase:",
              err
            );

          } finally {

            running = false;
          }
        };

      /*
        Primeira sincronização:
        imediata.
      */
      poll();

      /*
        Demais sincronizações:
        10 segundos.
      */
      const timer =
        setInterval(
          poll,
          SYNC_INTERVAL
        );

      /*
        Quando o usuário volta para a aba,
        atualiza imediatamente.
      */
      const visibilityHandler =
        () => {
          if (
            !document.hidden &&
            active
          ) {
            poll();
          }
        };

      if (
        typeof document !== "undefined"
      ) {
        document.addEventListener(
          "visibilitychange",
          visibilityHandler
        );
      }

      /*
        Retorna função de desligamento,
        preservando a API já utilizada
        pelo projeto.
      */
      return () => {

        active = false;

        clearInterval(timer);

        if (
          typeof document !== "undefined"
        ) {
          document.removeEventListener(
            "visibilitychange",
            visibilityHandler
          );
        }
      };
    }

  };
}

/* ============================================================
   MODO LOCAL / DEMONSTRAÇÃO
   ============================================================ */

export function demoGet(
  key,
  fallback = null
) {
  try {

    const value =
      localStorage.getItem(
        "adm360:" + key
      );

    return value
      ? JSON.parse(value)
      : fallback;

  } catch {

    return fallback;
  }
}

export function demoSet(
  key,
  value
) {
  localStorage.setItem(
    "adm360:" + key,
    JSON.stringify(value)
  );
}

/* ============================================================
   CÓDIGO DE SALA
   ============================================================ */

export function roomCode() {
  return (
    "ADM-" +
    Math.floor(
      1000 +
      Math.random() *
      9000
    )
  );
}
