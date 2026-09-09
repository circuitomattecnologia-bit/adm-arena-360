import { FIREBASE } from "./firebase-config.js";

const BASE = (FIREBASE.config.databaseURL || "").replace(/\/+$/, "");

/* ============================================================
   ADM ARENA 360 — CAMADA FIREBASE SEGURA
   ------------------------------------------------------------
   Objetivo:
   • reduzir risco de sobrescrita quando várias empresas agem juntas;
   • preservar a API já usada por empresa.js e professor.js;
   • transformar gravações de sala inteira em PATCH granular;
   • manter gravações diretas em caminhos específicos normalmente.
   ============================================================ */

const cache = new Map();

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
   CRIA PATCH PROFUNDO

   Exemplo:

   companies/empresa-a/caixa: 90000
   auction/status: "closed"

   Assim uma mudança em UMA empresa não precisa substituir
   todas as outras empresas da sala.
   ============================================================ */

function buildDeepPatch(
  before,
  after,
  basePath = "",
  out = {}
) {
  if (
    sameValue(
      before,
      after
    )
  ) {
    return out;
  }

  const beforeObj =
    isPlainObject(before);

  const afterObj =
    isPlainObject(after);

  if (
    !beforeObj ||
    !afterObj
  ) {
    if (basePath) {
      out[basePath] =
        after === undefined
          ? null
          : after;
    }

    return out;
  }

  const keys =
    new Set([
      ...Object.keys(
        before || {}
      ),

      ...Object.keys(
        after || {}
      )
    ]);

  for (
    const key of keys
  ) {
    const nextPath =
      joinPath(
        basePath,
        key
      );

    const hasAfter =
      Object.prototype
        .hasOwnProperty
        .call(
          after,
          key
        );

    if (!hasAfter) {
      out[nextPath] =
        null;

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

function isRoomRoot(
  refPath
) {
  return (
    /^rooms\/[^/]+$/
      .test(
        String(
          refPath || ""
        )
      )
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
    await fetch(
      url,
      options
    );

  if (!response.ok) {
    const txt =
      await response.text();

    throw new Error(
      `Firebase recusou a operação (${response.status}): ${txt}`
    );
  }

  if (
    response.status === 204
  ) {
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
    cache.get(
      refPath
    );

  /*
    Se ainda não conhecemos uma versão anterior,
    fazemos PUT normal.

    Isto acontece principalmente
    durante a criação inicial da sala.
  */

  if (
    previous === undefined
  ) {
    await httpJson(
      pathUrl(refPath),
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(
            value
          )
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
    Object.entries(
      patch
    );

  if (
    !entries.length
  ) {
    cache.set(
      refPath,
      clone(value)
    );

    return true;
  }

  /*
    Aqui está a principal blindagem:

    em vez de substituir a sala inteira,
    somente os campos realmente modificados
    são enviados ao Firebase.
  */

  await httpJson(
    pathUrl(refPath),
    {
      method: "PATCH",

      headers: {
        "Content-Type":
          "application/json"
      },

      body:
        JSON.stringify(
          patch
        )
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
  if (
    !ensureConfigured()
  ) {
    return null;
  }

  return {

    db: true,


    ref(
      _db,
      path
    ) {
      return String(
        path || ""
      ).replace(
        /^\/+|\/+$/g,
        ""
      );
    },


    /* ========================================================
       SET

       Mantém compatibilidade com o projeto atual.

       Se professor.js ou empresa.js tentarem salvar
       rooms/ADM-XXXX inteira,
       esta camada converte automaticamente para PATCH profundo.
       ======================================================== */

    async set(
      refPath,
      value
    ) {
      const cleanPath =
        String(
          refPath || ""
        ).replace(
          /^\/+|\/+$/g,
          ""
        );

      if (
        isRoomRoot(
          cleanPath
        ) &&
        isPlainObject(
          value
        )
      ) {
        return safeRoomWrite(
          cleanPath,
          value
        );
      }

      /*
        Caminhos específicos continuam podendo
        ser gravados diretamente.

        Exemplo:
        rooms/ADM-1234/companies/empresa-a
      */

      await httpJson(
        pathUrl(
          cleanPath
        ),
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              value
            )
        }
      );

      /*
        Atualiza o cache local da sala
        quando um filho é gravado diretamente.
      */

      for (
        const [
          cachedPath,
          cachedValue
        ]
        of cache.entries()
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
          clone(
            cachedValue
          ) || {};

        let cursor =
          next;

        for (
          let i = 0;
          i <
          relative.length - 1;
          i++
        ) {
          const key =
            relative[i];

          if (
            !isPlainObject(
              cursor[key]
            )
          ) {
            cursor[key] =
              {};
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
       PATCH DIRETO

       Deixamos disponível para as próximas melhorias
       de leilão, negociação, acesso e comandos.
       ======================================================== */

    async patch(
      refPath,
      value
    ) {
      const cleanPath =
        String(
          refPath || ""
        ).replace(
          /^\/+|\/+$/g,
          ""
        );

      await httpJson(
        pathUrl(
          cleanPath
        ),
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

    async get(
      refPath
    ) {
      const cleanPath =
        String(
          refPath || ""
        ).replace(
          /^\/+|\/+$/g,
          ""
        );

      const value =
        await httpJson(
          `${pathUrl(cleanPath)}?t=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store"
          }
        );

      if (
        isRoomRoot(
          cleanPath
        )
      ) {
        cache.set(
          cleanPath,
          clone(value)
        );
      }

      return snapshot(
        value
      );
    },


    /* ========================================================
       REMOVE
       ======================================================== */

    async remove(
      refPath
    ) {
      const cleanPath =
        String(
          refPath || ""
        ).replace(
          /^\/+|\/+$/g,
          ""
        );

      await httpJson(
        pathUrl(
          cleanPath
        ),
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
       TEMPO REAL

       Mantém atualização rápida
       entre professor e empresas.
       ======================================================== */

    onValue(
      refPath,
      callback
    ) {
      const cleanPath =
        String(
          refPath || ""
        ).replace(
          /^\/+|\/+$/g,
          ""
        );

      let active =
        true;

      let last =
        Symbol(
          "initial"
        );

      const poll =
        async () => {

          if (!active) {
            return;
          }

          try {

            const value =
              await httpJson(
                `${pathUrl(cleanPath)}?t=${Date.now()}`,
                {
                  method:
                    "GET",

                  cache:
                    "no-store"
                }
              );

            if (
              isRoomRoot(
                cleanPath
              )
            ) {
              cache.set(
                cleanPath,
                clone(value)
              );
            }

            const serialized =
              JSON.stringify(
                value
              );

            if (
              serialized !==
              last
            ) {
              last =
                serialized;

              callback(
                snapshot(
                  value
                )
              );
            }

          } catch (
            err
          ) {

            console.error(
              "ADM Arena Firebase:",
              err
            );

          }
        };

      /*
        700 ms:
        resposta mais rápida entre telas,
        sem transformar a aplicação em bombardeio
        excessivo ao Firebase.
      */

      poll();

      const timer =
        setInterval(
          poll,
          700
        );

      return () => {

        active =
          false;

        clearInterval(
          timer
        );

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
      ? JSON.parse(
          value
        )
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
    JSON.stringify(
      value
    )
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
