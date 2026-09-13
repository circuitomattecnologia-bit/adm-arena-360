import {
  getFirebase
} from "./firebase-service.js";


/* =========================================================
   ADM ARENA 360
   PAINEL DO PROFESSOR — GESTÃO AVANÇADA R5 A R8

   PROJETO EMPREENDEDOR
   PROF. LEOPOLDO

   OBJETIVO
   ---------------------------------------------------------
   Acompanhar:
   - R5 — Vendas & Resultado
   - R6 — Crédito Empresarial
   - R7 — Comércio Internacional
   - R8 — Crise Logística

   SOMENTE LEITURA
   ---------------------------------------------------------
   - NÃO altera Firebase.
   - NÃO altera rodada.
   - NÃO altera status.
   - NÃO altera caixa.
   - NÃO altera XP.
   - NÃO altera decisões.
   - NÃO cobra dívida.
========================================================= */


const PAGE =
  String(
    window.location.pathname || ""
  )
    .split("/")
    .pop()
    .toLowerCase();


const IS_PROFESSOR =
  PAGE === "professor.html";


let roomCode = "";
let roomData = null;
let unsubscribeRoom = null;
let panelOpen = false;


/* =========================================================
   UTILIDADES
========================================================= */

function normalizeCode(value) {

  const match =
    String(value || "")
      .toUpperCase()
      .match(/\bADM-\d{4}\b/);


  if (!match) {
    return "";
  }


  if (
    match[0] ===
    "ADM-0000"
  ) {
    return "";
  }


  return match[0];
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


function money(value) {

  return Number(
    value || 0
  )
    .toLocaleString(
      "pt-BR"
    );
}


function detectRoomCode() {

  const url =
    new URL(
      window.location.href
    );


  const candidates = [

    url.searchParams.get(
      "sala"
    ),

    url.searchParams.get(
      "room"
    ),

    url.searchParams.get(
      "codigo"
    ),

    document.querySelector(
      "#codigoSala"
    )?.textContent,

    document.querySelector(
      "#codigoExistente"
    )?.value,

    document.querySelector(
      "#salaCodigo"
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


function companies() {

  return Object.entries(
    roomData?.companies ||
    {}
  )
    .sort(
      (a, b) =>
        String(
          a[1]?.name || ""
        )
          .localeCompare(
            String(
              b[1]?.name || ""
            ),
            "pt-BR"
          )
    );
}


function currentRound() {

  return Number(
    roomData?.round || 0
  );
}


/* =========================================================
   DECISÕES
========================================================= */

function getDecision(
  company,
  round
) {

  return (
    company
      ?.managementDecisions
      ?.[round] ||
    null
  );
}


function decisionStatus(
  company,
  round
) {

  const decision =
    getDecision(
      company,
      round
    );


  if (decision) {
    return "done";
  }


  const actual =
    currentRound();


  if (
    actual < round
  ) {
    return "future";
  }


  if (
    actual === round
  ) {
    return "pending";
  }


  return "missed";
}


function statusText(
  status
) {

  const labels = {

    done:
      "DECISÃO REGISTRADA",

    pending:
      "AGUARDANDO DECISÃO",

    future:
      "RODADA FUTURA",

    missed:
      "SEM REGISTRO"

  };


  return (
    labels[status] ||
    status
  );
}


function formatDelta(
  delta
) {

  if (
    !delta ||
    !Object.keys(
      delta
    ).length
  ) {
    return "Sem alteração registrada.";
  }


  const labels = {

    caixa:
      "Caixa",

    clientes:
      "Clientes",

    reputacao:
      "Reputação",

    equipe:
      "Equipe",

    inovacao:
      "Inovação",

    xp:
      "XP"

  };


  return Object.entries(
    delta
  )
    .map(
      ([field, value]) => {

        const number =
          Number(
            value || 0
          );


        const sign =
          number > 0
            ? "+"
            : "";


        if (
          field ===
          "caixa"
        ) {

          return (
            `${labels[field]} ` +
            `${sign}ADM$ ${money(number)}`
          );
        }


        return (
          `${labels[field] || field} ` +
          `${sign}${number}`
        );

      }
    )
    .join(" • ");
}


/* =========================================================
   DÍVIDAS
========================================================= */

function getOpenDebts(
  company
) {

  return Object.values(
    company?.debts ||
    {}
  )
    .filter(
      debt =>
        debt?.status ===
        "open"
    );
}


function debtSummary(
  company
) {

  const debts =
    getOpenDebts(
      company
    );


  if (!debts.length) {

    return `
      <div class="adm360-ga-finance-ok">
        Nenhuma dívida aberta.
      </div>
    `;
  }


  const total =
    debts.reduce(
      (
        sum,
        debt
      ) =>
        sum +
        Number(
          debt?.totalDue || 0
        ),
      0
    );


  return `
    <div class="adm360-ga-debt-summary">

      <strong>
        DÍVIDA ABERTA:
        ADM$ ${money(total)}
      </strong>

      ${debts
        .map(
          debt => `
            <small>
              ${escapeHtml(
                debt?.type ||
                "Crédito"
              )}
              · vence na R${Number(
                debt?.dueRound || 0
              )}
              · ADM$ ${money(
                debt?.totalDue
              )}
            </small>
          `
        )
        .join("")}

    </div>
  `;
}


/* =========================================================
   RISCO INTERNACIONAL
========================================================= */

function internationalLabel(
  company
) {

  const risk =
    company
      ?.internationalStrategy
      ?.risk;


  if (
    risk ===
    "high"
  ) {
    return "ALTA EXPOSIÇÃO";
  }


  if (
    risk ===
    "protected"
  ) {
    return "PROTEGIDA / DIVERSIFICADA";
  }


  if (
    risk ===
    "domestic"
  ) {
    return "FOCO NO MERCADO INTERNO";
  }


  return "NÃO DEFINIDA";
}


/* =========================================================
   ESTILO
========================================================= */

function installStyle() {

  if (
    document.querySelector(
      "#adm360ProfessorGestaoStyle"
    )
  ) {
    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "adm360ProfessorGestaoStyle";


  style.textContent = `

    #adm360ProfessorGestao {

      width:
        100%;

      box-sizing:
        border-box;

      margin-bottom:
        16px;

    }


    .adm360-ga-bar {

      display:
        flex;

      justify-content:
        space-between;

      align-items:
        center;

      gap:
        14px;

      flex-wrap:
        wrap;

      padding:
        14px 16px;

      border-radius:
        16px;

      border:
        1px solid
        rgba(
          255,
          82,
          174,
          .26
        );

      background:
        linear-gradient(
          135deg,
          rgba(
            21,
            37,
            75,
            .96
          ),
          rgba(
            48,
            20,
            66,
            .94
          )
        );

    }


    .adm360-ga-bar-info strong {

      display:
        block;

      color:
        #fff;

      font-size:
        .95rem;

      margin-bottom:
        4px;

    }


    .adm360-ga-bar-info span {

      color:
        rgba(
          255,
          255,
          255,
          .63
        );

      font-size:
        .76rem;

    }


    .adm360-ga-open {

      min-height:
        40px;

      padding:
        8px 14px;

      border-radius:
        11px;

      border:
        1px solid
        rgba(
          255,
          82,
          174,
          .50
        );

      background:
        rgba(
          255,
          82,
          174,
          .12
        );

      color:
        #fff;

      font-weight:
        950;

      cursor:
        pointer;

    }


    .adm360-ga-panel {

      display:
        none;

      margin-top:
        10px;

      padding:
        15px;

      border-radius:
        16px;

      border:
        1px solid
        rgba(
          255,
          255,
          255,
          .08
        );

      background:
        rgba(
          5,
          17,
          38,
          .72
        );

    }


    .adm360-ga-panel.show {

      display:
        block;

    }


    .adm360-ga-summary {

      display:
        grid;

      grid-template-columns:
        repeat(
          4,
          minmax(
            0,
            1fr
          )
        );

      gap:
        9px;

      margin-bottom:
        14px;

    }


    .adm360-ga-summary-card {

      padding:
        11px;

      border-radius:
        12px;

      background:
        rgba(
          255,
          255,
          255,
          .035
        );

      border:
        1px solid
        rgba(
          255,
          255,
          255,
          .07
        );

      text-align:
        center;

    }


    .adm360-ga-summary-card span {

      display:
        block;

      color:
        rgba(
          255,
          255,
          255,
          .56
        );

      font-size:
        .68rem;

      font-weight:
        850;

      margin-bottom:
        5px;

    }


    .adm360-ga-summary-card strong {

      color:
        #fff;

      font-size:
        1rem;

    }


    .adm360-ga-company {

      margin-bottom:
        11px;

      padding:
        13px;

      border-radius:
        14px;

      border:
        1px solid
        rgba(
          255,
          255,
          255,
          .08
        );

      background:
        rgba(
          255,
          255,
          255,
          .025
        );

    }


    .adm360-ga-company-head {

      display:
        flex;

      justify-content:
        space-between;

      gap:
        10px;

      align-items:
        center;

      flex-wrap:
        wrap;

      margin-bottom:
        10px;

    }


    .adm360-ga-company-head strong {

      color:
        #fff;

      font-size:
        .93rem;

    }


    .adm360-ga-company-head span {

      color:
        rgba(
          255,
          255,
          255,
          .58
        );

      font-size:
        .72rem;

    }


    .adm360-ga-rounds {

      display:
        grid;

      grid-template-columns:
        repeat(
          4,
          minmax(
            0,
            1fr
          )
        );

      gap:
        8px;

    }


    .adm360-ga-round {

      padding:
        10px;

      min-height:
        93px;

      border-radius:
        11px;

      border:
        1px solid
        rgba(
          255,
          255,
          255,
          .07
        );

      background:
        rgba(
          255,
          255,
          255,
          .025
        );

    }


    .adm360-ga-round.done {

      border-color:
        rgba(
          54,
          219,
          149,
          .28
        );

      background:
        rgba(
          54,
          219,
          149,
          .055
        );

    }


    .adm360-ga-round.pending {

      border-color:
        rgba(
          255,
          202,
          65,
          .30
        );

      background:
        rgba(
          255,
          202,
          65,
          .055
        );

    }


    .adm360-ga-round.missed {

      border-color:
        rgba(
          255,
          82,
          100,
          .28
        );

    }


    .adm360-ga-round-number {

      color:
        #ff9fd2;

      font-size:
        .70rem;

      font-weight:
        950;

      margin-bottom:
        5px;

    }


    .adm360-ga-round-status {

      display:
        block;

      color:
        rgba(
          255,
          255,
          255,
          .55
        );

      font-size:
        .64rem;

      font-weight:
        900;

      margin-bottom:
        6px;

    }


    .adm360-ga-round strong {

      display:
        block;

      color:
        #fff;

      font-size:
        .76rem;

      line-height:
        1.35;

      margin-bottom:
        5px;

    }


    .adm360-ga-round small {

      display:
        block;

      color:
        rgba(
          255,
          255,
          255,
          .57
        );

      font-size:
        .67rem;

      line-height:
        1.4;

    }


    .adm360-ga-finance {

      display:
        grid;

      grid-template-columns:
        1fr 1fr;

      gap:
        8px;

      margin-top:
        9px;

    }


    .adm360-ga-finance-box {

      padding:
        9px 10px;

      border-radius:
        10px;

      border:
        1px solid
        rgba(
          255,
          255,
          255,
          .06
        );

      background:
        rgba(
          255,
          255,
          255,
          .02
        );

      color:
        rgba(
          255,
          255,
          255,
          .65
        );

      font-size:
        .70rem;

      line-height:
        1.45;

    }


    .adm360-ga-finance-box strong {

      display:
        block;

      color:
        #fff;

      margin-bottom:
        3px;

    }


    .adm360-ga-debt-summary {

      color:
        #ffd98d;

    }


    .adm360-ga-debt-summary strong {

      display:
        block;

      margin-bottom:
        3px;

    }


    .adm360-ga-debt-summary small {

      display:
        block;

      margin-top:
        2px;

      color:
        rgba(
          255,
          229,
          177,
          .75
        );

    }


    .adm360-ga-finance-ok {

      color:
        #a7f3d0;

    }


    @media(
      max-width:
      1050px
    ) {

      .adm360-ga-rounds,
      .adm360-ga-summary {

        grid-template-columns:
          repeat(
            2,
            minmax(
              0,
              1fr
            )
          );

      }

    }


    @media(
      max-width:
      680px
    ) {

      .adm360-ga-rounds,
      .adm360-ga-summary,
      .adm360-ga-finance {

        grid-template-columns:
          1fr;

      }

    }

  `;


  document.head.appendChild(
    style
  );

}


/* =========================================================
   CRIA PAINEL
========================================================= */

function installPanel() {

  if (
    !IS_PROFESSOR ||
    document.querySelector(
      "#adm360ProfessorGestao"
    )
  ) {
    return;
  }


  const empresas =
    document.querySelector(
      '.teacher-nucleus-panel[data-panel="empresas"]'
    );


  if (!empresas) {
    return;
  }


  const section =
    document.createElement(
      "section"
    );


  section.id =
    "adm360ProfessorGestao";


  section.innerHTML = `

    <div class="adm360-ga-bar">

      <div class="adm360-ga-bar-info">

        <strong>
          📊 GESTÃO AVANÇADA — R5 A R8
        </strong>

        <span
          id="adm360GaBarStatus"
        >
          Preparando acompanhamento...
        </span>

      </div>

      <button
        type="button"
        id="adm360GaOpen"
        class="adm360-ga-open"
      >
        ABRIR ACOMPANHAMENTO
      </button>

    </div>


    <div
      id="adm360GaPanel"
      class="adm360-ga-panel"
    >

      <div
        id="adm360GaSummary"
        class="adm360-ga-summary"
      ></div>

      <div
        id="adm360GaCompanies"
      ></div>

    </div>

  `;


  const companiesCard =
    empresas.querySelector(
      ".companies-card"
    );


  if (companiesCard) {

    empresas.insertBefore(
      section,
      companiesCard
    );

  } else {

    empresas.appendChild(
      section
    );

  }


  section
    .querySelector(
      "#adm360GaOpen"
    )
    ?.addEventListener(
      "click",
      () => {

        panelOpen =
          !panelOpen;


        render();

      }
    );

}


/* =========================================================
   RESUMO
========================================================= */

function renderSummary() {

  const box =
    document.querySelector(
      "#adm360GaSummary"
    );


  if (!box) {
    return;
  }


  const list =
    companies();


  const round =
    currentRound();


  const actual =
    round >= 5 &&
    round <= 8
      ? round
      : null;


  let decided =
    0;


  if (actual) {

    decided =
      list.filter(
        ([, company]) =>
          Boolean(
            getDecision(
              company,
              actual
            )
          )
      ).length;

  }


  const debtCompanies =
    list.filter(
      ([, company]) =>
        getOpenDebts(
          company
        ).length > 0
    ).length;


  const highManagement =
    list.filter(
      ([, company]) =>
        company
          ?.highManagementUnlocked
    ).length;


  box.innerHTML = `

    <div class="adm360-ga-summary-card">

      <span>
        RODADA ATUAL
      </span>

      <strong>
        ${round}/16
      </strong>

    </div>


    <div class="adm360-ga-summary-card">

      <span>
        DECISÕES DA RODADA
      </span>

      <strong>
        ${
          actual
            ? `${decided}/${list.length}`
            : "—"
        }
      </strong>

    </div>


    <div class="adm360-ga-summary-card">

      <span>
        EMPRESAS COM DÍVIDA
      </span>

      <strong>
        ${debtCompanies}
      </strong>

    </div>


    <div class="adm360-ga-summary-card">

      <span>
        ALTA GESTÃO
      </span>

      <strong>
        ${highManagement}/${list.length}
      </strong>

    </div>

  `;

}


/* =========================================================
   RODADA POR EMPRESA
========================================================= */

function roundCard(
  company,
  round
) {

  const status =
    decisionStatus(
      company,
      round
    );


  const decision =
    getDecision(
      company,
      round
    );


  return `

    <div
      class="
        adm360-ga-round
        ${escapeHtml(status)}
      "
    >

      <div class="adm360-ga-round-number">
        R${round}
      </div>

      <span class="adm360-ga-round-status">
        ${escapeHtml(
          statusText(
            status
          )
        )}
      </span>

      ${
        decision
          ? `
            <strong>
              ${escapeHtml(
                decision
                  ?.optionTitle ||
                "Decisão registrada"
              )}
            </strong>

            <small>
              ${escapeHtml(
                formatDelta(
                  decision
                    ?.totalDelta ||
                  decision
                    ?.baseDelta ||
                  {}
                )
              )}
            </small>
          `
          : `
            <strong>
              ${
                round === 5
                  ? "Vendas & Resultado"
                  : round === 6
                    ? "Crédito Empresarial"
                    : round === 7
                      ? "Comércio Internacional"
                      : "Crise Logística"
              }
            </strong>

            <small>
              Nenhuma decisão registrada.
            </small>
          `
      }

    </div>

  `;
}


/* =========================================================
   EMPRESAS
========================================================= */

function renderCompanies() {

  const box =
    document.querySelector(
      "#adm360GaCompanies"
    );


  if (!box) {
    return;
  }


  const list =
    companies();


  if (!list.length) {

    box.innerHTML = `
      <div class="adm360-ga-company">
        Nenhuma empresa cadastrada na Arena.
      </div>
    `;

    return;
  }


  box.innerHTML =
    list
      .map(
        ([id, company]) => {

          const debt =
            debtSummary(
              company
            );


          const international =
            internationalLabel(
              company
            );


          const high =
            company
              ?.highManagementUnlocked
              ? "LIBERADA"
              : "AINDA NÃO LIBERADA";


          return `

            <article
              class="adm360-ga-company"
              data-company-id="${escapeHtml(id)}"
            >

              <div class="adm360-ga-company-head">

                <strong>
                  🏢 ${escapeHtml(
                    company?.name ||
                    id
                  )}
                </strong>

                <span>
                  Caixa:
                  ADM$ ${money(
                    company?.caixa
                  )}
                  · XP:
                  ${Number(
                    company?.xp || 0
                  )}
                </span>

              </div>


              <div class="adm360-ga-rounds">

                ${roundCard(
                  company,
                  5
                )}

                ${roundCard(
                  company,
                  6
                )}

                ${roundCard(
                  company,
                  7
                )}

                ${roundCard(
                  company,
                  8
                )}

              </div>


              <div class="adm360-ga-finance">

                <div class="adm360-ga-finance-box">

                  <strong>
                    💳 SITUAÇÃO FINANCEIRA
                  </strong>

                  ${debt}

                </div>


                <div class="adm360-ga-finance-box">

                  <strong>
                    🌍 POSIÇÃO ESTRATÉGICA
                  </strong>

                  Comércio internacional:
                  ${escapeHtml(
                    international
                  )}

                  <br>

                  Alta Gestão:
                  ${escapeHtml(
                    high
                  )}

                </div>

              </div>

            </article>

          `;

        }
      )
      .join("");

}


/* =========================================================
   RENDER GERAL
========================================================= */

function render() {

  installPanel();


  const section =
    document.querySelector(
      "#adm360ProfessorGestao"
    );


  if (
    !section ||
    !roomData
  ) {
    return;
  }


  const round =
    currentRound();


  const companiesCount =
    companies().length;


  const label =
    section.querySelector(
      "#adm360GaBarStatus"
    );


  if (label) {

    if (
      round < 5
    ) {

      label.textContent =
        `Arena em R${round}/16 · ${companiesCount} empresas · ` +
        `próximo bloco preparado para a R5`;

    } else if (
      round >= 5 &&
      round <= 8
    ) {

      const decided =
        companies()
          .filter(
            ([, company]) =>
              Boolean(
                getDecision(
                  company,
                  round
                )
              )
          ).length;


      label.textContent =
        `Arena em R${round}/16 · ` +
        `${decided}/${companiesCount} empresas já decidiram`;

    } else {

      label.textContent =
        `Arena em R${round}/16 · histórico R5–R8 disponível`;

    }

  }


  const button =
    section.querySelector(
      "#adm360GaOpen"
    );


  const panel =
    section.querySelector(
      "#adm360GaPanel"
    );


  if (button) {

    button.textContent =
      panelOpen
        ? "FECHAR ACOMPANHAMENTO"
        : "ABRIR ACOMPANHAMENTO";

  }


  panel?.classList.toggle(
    "show",
    panelOpen
  );


  if (!panelOpen) {
    return;
  }


  renderSummary();

  renderCompanies();

}


/* =========================================================
   FIREBASE
========================================================= */

async function connectRoom() {

  const finder =
    setInterval(
      async () => {

        const code =
          detectRoomCode();


        if (!code) {
          return;
        }


        if (
          code ===
          roomCode &&
          unsubscribeRoom
        ) {
          return;
        }


        roomCode =
          code;


        const f =
          await getFirebase();


        if (!f) {
          return;
        }


        if (
          unsubscribeRoom
        ) {

          unsubscribeRoom();

          unsubscribeRoom =
            null;

        }


        unsubscribeRoom =
          f.onValue(
            f.ref(
              f.db,
              `rooms/${roomCode}`
            ),
            snapshot => {

              roomData =
                snapshot.val() ||
                {};


              render();

            }
          );

      },
      500
    );


  window.addEventListener(
    "beforeunload",
    () => {

      clearInterval(
        finder
      );


      if (
        unsubscribeRoom
      ) {
        unsubscribeRoom();
      }

    }
  );

}


/* =========================================================
   OBSERVADOR DE POSICIONAMENTO
========================================================= */

function installObserver() {

  const observer =
    new MutationObserver(
      () => {

        if (
          !document.querySelector(
            "#adm360ProfessorGestao"
          )
        ) {

          installPanel();

        }

      }
    );


  observer.observe(
    document.body,
    {
      childList:
        true,
      subtree:
        true
    }
  );

}


/* =========================================================
   INÍCIO
========================================================= */

async function start() {

  if (!IS_PROFESSOR) {
    return;
  }


  installStyle();

  installPanel();

  installObserver();

  await connectRoom();

}


start()
  .catch(
    error => {

      console.error(
        "ADM Arena 360 — Professor Gestão Avançada:",
        error
      );

    }
  );
