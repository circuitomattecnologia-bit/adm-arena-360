import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360 — RODADA 16
   CHOQUE DE MERCADO

   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   CENÁRIO
   → O QUE VOCÊ PRECISA OBSERVAR
   → DICA ESTRATÉGICA
   → 3 DECISÕES
   → CONFIRMAÇÃO
   → CONSEQUÊNCIA EXPLICADA

   REGRAS
   ---------------------------------------------------------
   • Funciona somente na Rodada 16.
   • NÃO é mais o Conselho Final.
   • O Conselho Final acontece na Rodada 20.
   • Não avança rodada automaticamente.
   • Não altera o status da Arena.
   • Não interfere nas Rodadas 1–15.
   • Uma decisão por empresa.
   • Preserva todo o progresso anterior.
   • Não utiliza resultados aleatórios.
   • Empresas em dificuldade possuem possibilidade real
     de recuperação, sem dinheiro gratuito.
========================================================= */

const PAGE =
  String(window.location.pathname || "")
    .split("/")
    .pop()
    .toLowerCase();

const IS_EMPRESA =
  PAGE === "empresa.html";

let roomCode = "";
let roomData = null;
let selectedAction = "";
let busy = false;


/* =========================================================
   DECISÕES
========================================================= */

const ACTIONS = [
  {
    id: "proteger",

    title:
      "Proteger caixa e operação",

    description:
      "Reduzir a exposição ao choque, renegociar custos e preservar a continuidade da empresa.",

    focus:
      "Caixa · estabilidade · equipe"
  },

  {
    id: "clientes",

    title:
      "Defender clientes e reputação",

    description:
      "Investir no relacionamento com clientes para reduzir perdas e proteger a presença no mercado.",

    focus:
      "Clientes · reputação · mercado"
  },

  {
    id: "reagir",

    title:
      "Reagir com inovação",

    description:
      "Assumir risco controlado para transformar a crise em uma oportunidade competitiva.",

    focus:
      "Inovação · crescimento · risco"
  }
];


/* =========================================================
   UTILIDADES
========================================================= */

function normalizeCode(value) {

  const match =
    String(value || "")
      .toUpperCase()
      .match(/\bADM-\d{4}\b/);

  if (
    !match ||
    match[0] === "ADM-0000"
  ) {
    return "";
  }

  return match[0];
}


function normalizeName(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    );
}


function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   IDENTIFICAR ARENA
========================================================= */

function detectRoomCode() {

  const url =
    new URL(
      window.location.href
    );

  const candidates = [
    url.searchParams.get("sala"),
    url.searchParams.get("room"),
    url.searchParams.get("codigo"),

    document.querySelector(
      "#codigo"
    )?.value,

    document.querySelector(
      "#salaPill"
    )?.textContent,

    localStorage.getItem(
      "adm360:openingRoomCode"
    ),

    localStorage.getItem(
      "admArena360Room"
    ),

    localStorage.getItem(
      "admArenaRoom"
    ),

    localStorage.getItem(
      "admArenaRoomCode"
    )
  ];

  for (
    const value
    of candidates
  ) {

    const code =
      normalizeCode(
        value
      );

    if (code) {
      return code;
    }
  }

  return "";
}


/* =========================================================
   IDENTIFICAR EMPRESA
========================================================= */

function getVisibleCompany(
  data = roomData
) {

  if (!data) {
    return null;
  }

  const visibleName =
    document.querySelector(
      "#empresaNome"
    )
      ?.textContent
      ?.trim() ||

    document.querySelector(
      "#nomeEmpresa"
    )
      ?.value
      ?.trim() ||

    "";

  const normalized =
    normalizeName(
      visibleName
    );

  if (!normalized) {
    return null;
  }

  const found =
    Object.entries(
      data.companies || {}
    )
      .find(
        ([, targetCompany]) =>
          normalizeName(
            targetCompany?.name
          ) ===
          normalized
      );

  if (!found) {
    return null;
  }

  return {
    id:
      found[0],

    company:
      found[1]
  };
}


/* =========================================================
   SITUAÇÃO DA EMPRESA
========================================================= */

function companySituation(
  company
) {

  const cash =
    Number(
      company?.caixa || 0
    );

  const clients =
    Number(
      company?.clientes || 0
    );

  const reputation =
    Number(
      company?.reputacao || 0
    );

  if (
    company
      ?.financialRestriction
      ?.active ||

    cash < 18000
  ) {

    return "finance";
  }


  if (
    clients < 40 ||
    reputation < 50
  ) {

    return "market";
  }


  if (
    cash >= 65000 &&
    clients >= 60 &&
    reputation >= 65
  ) {

    return "strong";
  }


  return "balanced";
}


/* =========================================================
   DICA CONTEXTUAL
========================================================= */

function strategicTip(
  company
) {

  const situation =
    companySituation(
      company
    );


  if (
    situation ===
    "finance"
  ) {

    return (
      "Seu caixa está pressionado. " +
      "Observe o custo de cada reação antes de buscar crescimento."
    );
  }


  if (
    situation ===
    "market"
  ) {

    return (
      "Clientes ou reputação estão abaixo do ideal. " +
      "Proteger mercado pode ser decisivo neste choque."
    );
  }


  if (
    situation ===
    "strong"
  ) {

    return (
      "Sua empresa chega forte. " +
      "Evite transformar vantagem em exposição excessiva ao risco."
    );
  }


  return (
    "Compare caixa, clientes e reputação. " +
    "O melhor movimento é aquele que mantém a empresa " +
    "capaz de competir nas próximas rodadas."
  );
}


/* =========================================================
   CONSEQUÊNCIAS
========================================================= */

function calculateConsequence(
  company,
  actionId
) {

  const situation =
    companySituation(
      company
    );


  /* -------------------------------------------------------
     PROTEGER
  ------------------------------------------------------- */

  if (
    actionId ===
    "proteger"
  ) {

    return {

      caixa:
        situation === "finance"
          ? 9000
          : 6500,

      clientes:
        -1,

      reputacao:
        3,

      equipe:
        5,

      inovacao:
        1,

      xp:
        situation === "finance"
          ? 12
          : 9,

      text:
        "A empresa reduziu sua exposição ao choque, reorganizou custos e preservou capacidade para continuar competindo."
    };
  }


  /* -------------------------------------------------------
     CLIENTES
  ------------------------------------------------------- */

  if (
    actionId ===
    "clientes"
  ) {

    return {

      caixa:
        -5500,

      clientes:
        situation === "market"
          ? 10
          : 7,

      reputacao:
        situation === "market"
          ? 7
          : 5,

      equipe:
        1,

      inovacao:
        2,

      xp:
        situation === "market"
          ? 13
          : 11,

      text:
        "A empresa absorveu parte do custo do choque para proteger clientes, reputação e presença no mercado."
    };
  }


  /* -------------------------------------------------------
     REAGIR
  ------------------------------------------------------- */

  return {

    caixa:
      -9000,

    clientes:
      situation === "strong"
        ? 7
        : 9,

    reputacao:
      2,

    equipe:
      -1,

    inovacao:
      8,

    xp:
      14,

    text:
      "A empresa reagiu com inovação, assumindo custo e risco controlado para criar uma nova vantagem competitiva."
  };
}


/* =========================================================
   RENDER
========================================================= */

function render() {

  if (
    !roomData ||
    Number(
      roomData.round || 0
    ) !== 16
  ) {

    return;
  }


  const visible =
    getVisibleCompany();


  const area =
    document.querySelector(
      "#decisaoArea"
    );


  if (
    !visible ||
    !area
  ) {

    return;
  }


  const targetCompany =
    visible.company;


  /* -------------------------------------------------------
     DECISÃO JÁ REALIZADA
  ------------------------------------------------------- */

  if (
    targetCompany
      ?.round16
      ?.completed ||

    targetCompany
      ?.managementDecisions
      ?.[16]
  ) {

    const saved =
      targetCompany.round16 ||
      {};

    area.innerHTML = `

      <section
        class="adm-round-special"
      >

        <div
          class="adm-round-kicker"
        >
          RODADA 16 /
          CHOQUE DE MERCADO
        </div>


        <h2>
          Decisão registrada
        </h2>


        <div
          class="adm-result-box"
        >

          <strong>
            CONSEQUÊNCIA
          </strong>

          <p>
            ${escapeHtml(
              saved.resultText ||
              "A empresa concluiu sua resposta ao choque de mercado."
            )}
          </p>

        </div>

      </section>
    `;

    return;
  }


  /* -------------------------------------------------------
     TELA DA RODADA
  ------------------------------------------------------- */

  area.innerHTML = `

    <section
      class="adm-round-special"
      id="admR16"
    >

      <div
        class="adm-round-kicker"
      >
        RODADA 16 /
        CHOQUE DE MERCADO
      </div>


      <h2>
        O mercado mudou
        de forma inesperada
      </h2>


      <p>
        Custos, comportamento dos clientes
        e pressão competitiva mudaram
        ao mesmo tempo.

        Sua empresa precisa reagir
        sem comprometer
        as próximas rodadas.
      </p>


      <div
        class="adm-observation"
      >

        <strong>
          O QUE VOCÊ PRECISA OBSERVAR
        </strong>

        <p>
          Analise o caixa disponível,
          a força da carteira de clientes,
          a reputação da empresa
          e sua capacidade
          de absorver riscos.
        </p>

      </div>


      <div
        class="adm-tip"
      >

        <strong>
          DICA ESTRATÉGICA
        </strong>

        <p>
          ${escapeHtml(
            strategicTip(
              targetCompany
            )
          )}
        </p>

      </div>


      <div
        class="adm-actions"
      >

        ${ACTIONS
          .map(
            action => `

              <button
                type="button"
                class="
                  adm-action-card
                  ${
                    selectedAction ===
                    action.id
                      ? "selected"
                      : ""
                  }
                "
                data-r16-action="${action.id}"
              >

                <strong>
                  ${escapeHtml(
                    action.title
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    action.description
                  )}
                </span>

                <small>
                  ${escapeHtml(
                    action.focus
                  )}
                </small>

              </button>
            `
          )
          .join("")}

      </div>


      <button
        type="button"
        id="admR16Confirm"
        ${
          !selectedAction ||
          busy
            ? "disabled"
            : ""
        }
      >

        ${
          busy
            ? "ENVIANDO..."
            : "CONFIRMAR DECISÃO"
        }

      </button>

    </section>
  `;
}


/* =========================================================
   CONFIRMAR DECISÃO
========================================================= */

async function confirmDecision() {

  if (
    !selectedAction ||
    busy ||
    !roomCode
  ) {

    return;
  }


  const visible =
    getVisibleCompany();


  if (!visible) {
    return;
  }


  const firebase =
    await getFirebase();


  if (!firebase) {
    return;
  }


  busy = true;

  render();


  try {

    const snapshot =
      await firebase.get(

        firebase.ref(
          firebase.db,

          `rooms/${roomCode}/companies/${visible.id}`
        )
      );


    const latestCompany =
      snapshot.val();


    if (!latestCompany) {
      return;
    }


    if (
      latestCompany
        ?.round16
        ?.completed ||

      latestCompany
        ?.managementDecisions
        ?.[16]
    ) {

      return;
    }


    const result =
      calculateConsequence(
        latestCompany,
        selectedAction
      );


    const updated = {
      ...latestCompany
    };


    updated.caixa =
      Number(
        latestCompany.caixa || 0
      ) +
      result.caixa;


    updated.clientes =
      Math.max(
        0,

        Number(
          latestCompany.clientes || 0
        ) +
        result.clientes
      );


    updated.reputacao =
      Math.max(
        0,

        Math.min(
          100,

          Number(
            latestCompany.reputacao || 0
          ) +
          result.reputacao
        )
      );


    updated.equipe =
      Math.max(
        0,

        Math.min(
          100,

          Number(
            latestCompany.equipe || 0
          ) +
          result.equipe
        )
      );


    updated.inovacao =
      Math.max(
        0,

        Math.min(
          100,

          Number(
            latestCompany.inovacao || 0
          ) +
          result.inovacao
        )
      );


    updated.xp =
      Math.max(
        0,

        Number(
          latestCompany.xp || 0
        ) +
        result.xp
      );


    updated.managementDecisions = {
      ...(
        latestCompany
          .managementDecisions ||
        {}
      ),

      16:
        selectedAction
    };


    updated.round16 = {

      completed:
        true,

      action:
        selectedAction,

      completedAt:
        Date.now(),

      resultText:
        result.text,

      effects: {

        caixa:
          result.caixa,

        clientes:
          result.clientes,

        reputacao:
          result.reputacao,

        equipe:
          result.equipe,

        inovacao:
          result.inovacao,

        xp:
          result.xp
      }
    };


    await firebase.set(

      firebase.ref(
        firebase.db,

        `rooms/${roomCode}/companies/${visible.id}`
      ),

      updated
    );


    selectedAction = "";

  } catch (error) {

    console.error(
      "ADM Arena 360 — R16:",
      error
    );

  } finally {

    busy = false;

    render();
  }
}


/* =========================================================
   EVENTOS — DELEGAÇÃO
   Evita perder o CONFIRMAR quando a tela é renderizada.
========================================================= */

function bindEvents() {

  document.addEventListener(
    "click",

    event => {

      const action =
        event.target.closest(
          "[data-r16-action]"
        );


      if (
        action &&
        Number(
          roomData?.round || 0
        ) === 16
      ) {

        selectedAction =
          action.dataset
            .r16Action ||
          "";

        render();

        return;
      }


      const confirm =
        event.target.closest(
          "#admR16Confirm"
        );


      if (confirm) {

        confirmDecision();
      }
    }
  );
}


/* =========================================================
   INICIAR
========================================================= */

async function start() {

  if (!IS_EMPRESA) {
    return;
  }


  bindEvents();


  const firebase =
    await getFirebase();


  if (!firebase) {
    return;
  }


  let connectedCode = "";


  function connect() {

    const detected =
      detectRoomCode();


    if (
      !detected ||
      detected ===
        connectedCode
    ) {

      return;
    }


    roomCode =
      detected;

    connectedCode =
      detected;


    firebase.onValue(

      firebase.ref(
        firebase.db,

        `rooms/${roomCode}`
      ),

      snapshot => {

        roomData =
          snapshot.val();


        if (
          Number(
            roomData?.round ||
            0
          ) === 16
        ) {

          render();
        }
      }
    );
  }


  connect();


  setInterval(
    connect,
    1000
  );
}


/* =========================================================
   EXECUÇÃO
========================================================= */

start()
  .catch(
    error => {

      console.error(
        "ADM Arena 360 — Rodada 16:",
        error
      );
    }
  );
