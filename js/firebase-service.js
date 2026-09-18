import { FIREBASE } from "./firebase-config.js";

const BASE = (FIREBASE.config.databaseURL || "").replace(/\/+$/, "");

/* ============================================================
   ADM ARENA 360 — CAMADA FIREBASE SEGURA
   VERSÃO OTIMIZADA DE CONSUMO — SINCRONIZAÇÃO COMPARTILHADA
   ------------------------------------------------------------
   • preserva a API atual do projeto;
   • mantém PATCH granular para salas;
   • reduz leituras automáticas;
   • compartilha a mesma leitura entre módulos da mesma página;
   • impede consultas simultâneas redundantes;
   • preserva Professor, Empresas, Mobile, Ranking e rodadas;
   • pausa sincronização quando a aba fica oculta;
   • não altera dados existentes da Arena.
   ============================================================ */

const cache = new Map();

/*
   Guarda leituras que já estão em andamento.
   Se dois módulos pedirem a mesma sala simultaneamente,
   ambos reaproveitam a mesma requisição.
*/
const inflightReads = new Map();

/*
   Uma única rotina de sincronização para cada caminho.

   Exemplo:
   professor.js
   mobile-inteligencia.js
   professor-gestao-avancada.js

   podem acompanhar rooms/ADM-6498 sem criar
   três pollings independentes.
*/
const sharedPolls = new Map();

/*
   Ações do usuário continuam sendo gravadas imediatamente.

   Este intervalo controla somente a verificação automática
   de alterações vindas do Firebase.
*/
const SYNC_INTERVAL = 10000;


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

function ensureConfigured() {

  if (!FIREBASE.enabled) {
    return false;
  }

  if (
    !BASE ||
    BASE.includes("COLE_AQUI")
  ) {

    throw new Error(
      "Firebase não configurado: databaseURL ausente."
    );

  }

  return true;
}


/* ============================================================
   CAMINHO FIREBASE
   ============================================================ */

function pathUrl(path) {

  const clean =
    String(path || "")
      .replace(/^\/+|\/+$/g, "");

  return `${BASE}/${clean}.json`;

}


/* ============================================================
   SNAPSHOT COMPATÍVEL
   ============================================================ */

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


/* ============================================================
   CLONE
   ============================================================ */

function clone(value) {

  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );

}


/* ============================================================
   OBJETO SIMPLES
   ============================================================ */

function isPlainObject(value) {

  return Boolean(

    value &&
    typeof value === "object" &&
    !Array.isArray(value)

  );

}


/* ============================================================
   COMPARAÇÃO
   ============================================================ */

function sameValue(a, b) {

  return (
    JSON.stringify(a) ===
    JSON.stringify(b)
  );

}


/* ============================================================
   CAMINHOS
   ============================================================ */

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
    const key
    of keys
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


/* ============================================================
   IDENTIFICA RAIZ DA SALA
   ============================================================ */

function isRoomRoot(refPath) {

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
   LEITURA COMPARTILHADA

   Se uma leitura da mesma sala já estiver acontecendo,
   reutiliza a Promise existente em vez de baixar tudo
   novamente.
   ============================================================ */

async function readFresh(
  cleanPath
) {

  if (
    inflightReads.has(
      cleanPath
    )
  ) {

    return inflightReads.get(
      cleanPath
    );

  }


  const request =
    httpJson(

      `${pathUrl(cleanPath)}?t=${Date.now()}`,

      {

        method: "GET",

        cache: "no-store"

      }

    )

      .then(
        value => {

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


          return value;

        }
      )

      .finally(
        () => {

          inflightReads.delete(
            cleanPath
          );

        }
      );


  inflightReads.set(
    cleanPath,
    request
  );


  return request;

}


/* ============================================================
   ATUALIZA CACHE DE SALA APÓS GRAVAÇÃO ESPECÍFICA
   ============================================================ */

function updateParentCaches(
  cleanPath,
  value
) {

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
      i < relative.length - 1;
      i++
    ) {

      const key =
        relative[i];


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


    const lastKey =
      relative[
        relative.length - 1
      ];


    if (
      value === null ||
      value === undefined
    ) {

      delete cursor[lastKey];

    } else {

      cursor[lastKey] =
        clone(value);

    }


    cache.set(
      cachedPath,
      next
    );

  }

}


/* ============================================================
   PATCH NO CACHE
   ============================================================ */

function patchParentCaches(
  cleanPath,
  patchValue
) {

  if (
    !isPlainObject(
      patchValue
    )
  ) {

    return;

  }


  for (
    const [
      key,
      value
    ]
    of Object.entries(
      patchValue
    )
  ) {

    updateParentCaches(

      cleanPath
        ? `${cleanPath}/${key}`
        : key,

      value

    );

  }

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
     Se ainda não conhecemos o estado da sala,
     preserva o comportamento original.
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


    /* ========================================================
       REF
       ======================================================== */

    ref(
      _db,
      path
    ) {

      return String(
        path || ""
      )
        .replace(
          /^\/+|\/+$/g,
          ""
        );

    },


    /* ========================================================
       SET
       ======================================================== */

    async set(
      refPath,
      value
    ) {

      const cleanPath =
        String(
          refPath || ""
        )
          .replace(
            /^\/+|\/+$/g,
            ""
          );


      /*
         Quando o projeto grava a sala inteira,
         usa PATCH profundo sempre que existe cache.
      */

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
         Atualiza o cache local sem realizar
         uma nova leitura no Firebase.
      */

      updateParentCaches(
        cleanPath,
        value
      );


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
        String(
          refPath || ""
        )
          .replace(
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


      /*
         Mantém cache sincronizado após PATCH,
         sem baixar novamente a sala.
      */

      patchParentCaches(
        cleanPath,
        value || {}
      );


      return true;

    },


    /* ========================================================
       GET

       Leituras simultâneas do mesmo caminho são agrupadas.
       ======================================================== */

    async get(
      refPath
    ) {

      const cleanPath =
        String(
          refPath || ""
        )
          .replace(
            /^\/+|\/+$/g,
            ""
          );


      const value =
        await readFresh(
          cleanPath
        );


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
        )
          .replace(
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


      updateParentCaches(
        cleanPath,
        null
      );


      return true;

    },


    /* ========================================================
       TEMPO REAL OTIMIZADO E COMPARTILHADO

       Uma única sincronização por caminho/página.

       Exemplo:
       professor.js + Mobile + Gestão Avançada
       observando rooms/ADM-6498 passam a compartilhar
       a mesma consulta automática.

       Mantém:
       • primeira leitura imediata;
       • sincronização a cada 10 segundos;
       • sem consultas simultâneas redundantes;
       • callback apenas quando houver alteração;
       • pausa quando a aba estiver oculta;
       • sincronização imediata ao retornar.
       ======================================================== */

    onValue(
      refPath,
      callback
    ) {

      const cleanPath =
        String(
          refPath || ""
        )
          .replace(
            /^\/+|\/+$/g,
            ""
          );


      /*
         Procura sincronização já existente
         para esse mesmo caminho.
      */

      let shared =
        sharedPolls.get(
          cleanPath
        );


      /*
         Se ainda não existe, cria apenas UMA.
      */

      if (!shared) {

        shared = {

          subscribers:
            new Set(),

          running:
            false,

          timer:
            null,

          visibilityHandler:
            null,

          poll:
            null

        };


        shared.poll =
          async () => {

            if (
              shared.running
            ) {

              return;

            }


            /*
               Não consome Firebase quando
               a página está em segundo plano.
            */

            if (
              typeof document !==
                "undefined" &&
              document.hidden
            ) {

              return;

            }


            shared.running =
              true;


            try {

              const value =
                await readFresh(
                  cleanPath
                );


              const serialized =
                JSON.stringify(
                  value
                );


              /*
                 Entrega os mesmos dados
                 para todos os módulos inscritos.
              */

              for (
                const subscriber
                of shared.subscribers
              ) {

                if (
                  !subscriber.active
                ) {

                  continue;

                }


                if (
                  subscriber.last ===
                  serialized
                ) {

                  continue;

                }


                subscriber.last =
                  serialized;


                try {

                  subscriber.callback(

                    snapshot(
                      value
                    )

                  );

                } catch (
                  callbackError
                ) {

                  console.error(

                    "ADM Arena Firebase callback:",

                    callbackError

                  );

                }

              }

            } catch (err) {

              console.error(

                "ADM Arena Firebase:",

                err

              );

            } finally {

              shared.running =
                false;

            }

          };


        /*
           Uma única rotina automática
           para esse caminho.
        */

        shared.timer =
          setInterval(

            shared.poll,

            SYNC_INTERVAL

          );


        /*
           Ao voltar para a página,
           sincroniza imediatamente.
        */

        shared.visibilityHandler =
          () => {

            if (

              typeof document !==
                "undefined" &&

              !document.hidden &&

              shared.subscribers.size

            ) {

              shared.poll();

            }

          };


        if (
          typeof document !==
          "undefined"
        ) {

          document.addEventListener(

            "visibilitychange",

            shared.visibilityHandler

          );

        }


        sharedPolls.set(

          cleanPath,

          shared

        );

      }


      /*
         Registra o módulo como assinante.
      */

      const subscriber = {

        active: true,

        callback,

        last:
          Symbol("initial")

      };


      shared.subscribers.add(
        subscriber
      );


      /*
         Se já existe cache da sala,
         entrega imediatamente ao novo módulo
         SEM novo download.
      */

      if (
        cache.has(
          cleanPath
        )
      ) {

        const value =
          clone(
            cache.get(
              cleanPath
            )
          );


        subscriber.last =
          JSON.stringify(
            value
          );


        try {

          callback(

            snapshot(
              value
            )

          );

        } catch (
          callbackError
        ) {

          console.error(

            "ADM Arena Firebase callback:",

            callbackError

          );

        }

      } else {

        /*
           Somente a primeira inscrição
           provoca leitura imediata.
        */

        shared.poll();

      }


      /*
         Retorna função de desligamento,
         preservando exatamente a API
         utilizada pelo projeto.
      */

      return () => {

        subscriber.active =
          false;


        shared.subscribers.delete(
          subscriber
        );


        /*
           Se ainda existem outros módulos
           usando a mesma sala, mantém
           a sincronização funcionando.
        */

        if (
          shared.subscribers.size
        ) {

          return;

        }


        /*
           Se ninguém mais usa o caminho,
           encerra o polling.
        */

        clearInterval(
          shared.timer
        );


        if (

          typeof document !==
            "undefined" &&

          shared.visibilityHandler

        ) {

          document.removeEventListener(

            "visibilitychange",

            shared.visibilityHandler

          );

        }


        sharedPolls.delete(
          cleanPath
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
