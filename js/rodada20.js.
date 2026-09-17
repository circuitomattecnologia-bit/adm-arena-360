import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360 — RODADA 20
   CONSELHO FINAL — O LEGADO DA EMPRESA
   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   RESULTADO FINAL
   25% Financeiro
   20% Clientes / Mercado
   15% Reputação
   15% Pessoas
   10% Inovação
   10% Estratégia / XP
    5% Responsabilidade Social

   REGRAS
   - Só funciona na Rodada 20.
   - Considera a trajetória construída até a R19.
   - Não avança rodada.
   - Não encerra a sala automaticamente.
   - Não altera R1–R19.
   - Uma decisão final por empresa.
   - Sem resultado aleatório.
   - Caixa sozinho não define o resultado.
========================================================= */

const ROUND = 20;

let roomCode = "";
let roomData = null;
let selectedAction = "";


/* =========================================================
   DECISÕES FINAIS
========================================================= */

const ACTIONS = {

  consolidar: {
    title: "Consolidar o legado",

    description:
      "Protege os resultados conquistados, fortalece a equipe e consolida a reputação da empresa.",

    caixa: 7000,
    clientes: 2,
    reputacao: 6,
    equipe: 7,
    inovacao: 2,
    social: 2,
    xp: 12
  },

  mercado: {
    title: "Ampliar presença no mercado",

    description:
      "Realiza um último movimento comercial para conquistar clientes e ampliar a presença da empresa.",

    caixa: -7000,
    clientes: 10,
    reputacao: 5,
    equipe: -1,
    inovacao: 3,
    social: 0,
    xp: 14
  },

  futuro: {
    title: "Investir no futuro sustentável",

    description:
      "Direciona recursos para inovação, reputação, pessoas e responsabilidade social.",

    caixa: -9000,
    clientes: 4,
    reputacao: 7,
    equipe: 3,
    inovacao: 10,
    social: 5,
    xp: 15
  }
};


/* =========================================================
   UTILIDADES
========================================================= */

function clamp(value, min = 0, max = 100) {

  return Math.max(
    min,
    Math.min(
      max,
      Number(value || 0)
    )
  );
}


function normalizeName(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}


function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


function money(value) {

  return Number(value || 0)
    .toLocaleString("pt-BR");
}


function detectRoomCode() {

  const url =
    new URL(window.location.href);

  const candidates = [

    url.searchParams.get("sala"),
    url.searchParams.get("room"),
    url.searchParams.get("codigo"),

    document.querySelector("#codigo")
      ?.value,

    document.querySelector("#salaPill")
      ?.textContent,

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


  for (const value of candidates) {

    const match =
      String(value || "")
        .toUpperCase()
        .match(/\bADM-\d{4}\b/);

    if (
      match &&
      match[0] !== "ADM-0000"
    ) {
      return match[0];
    }
  }

  return "";
}


function getVisibleCompany(
  data = roomData
) {

  if (!data) return null;

  const visibleName =
    normalizeName(

      document.querySelector(
        "#empresaNome"
      )?.textContent ||

      document.querySelector(
        "#nomeEmpresa"
      )?.value
    );


  if (!visibleName) return null;


  const found =
    Object.entries(
      data.companies || {}
    ).find(
      ([, company]) =>
        normalizeName(
          company?.name
        ) === visibleName
    );


  if (!found) return null;


  return {
    id: found[0],
    company: found[1]
  };
}


/* =========================================================
   DÍVIDAS
========================================================= */

function hasOverdueDebt(company) {

  return Object.values(
    company?.debts || {}
  ).some(
    debt => {

      const status =
        String(
          debt?.status || ""
        );

      return (
        status === "overdue" ||

        (
          status === "open" &&
          Number(
            debt?.dueRound || 0
          ) <= ROUND
        )
      );
    }
  );
}


/* =========================================================
   PONTUAÇÃO FINAL
========================================================= */

function calculateFinalScore(company) {

  const indicators = {

    financeiro:
      clamp(
        Number(company.caixa || 0) /
        1000
      ),

    mercado:
      clamp(
        Number(
          company.clientes || 0
        ) * 1.5
      ),

    reputacao:
      clamp(
        company.reputacao
      ),

    pessoas:
      clamp(
        company.equipe
      ),

    inovacao:
      clamp(
        company.inovacao
      ),

    estrategia:
      clamp(
        company.xp
      ),

    social:
      clamp(
        Number(
          company.responsabilidadeSocial ||
          company.social ||
          0
        ) * 4
      )
  };


  const weighted = {

    financeiro:
      indicators.financeiro * 0.25,

    mercado:
      indicators.mercado * 0.20,

    reputacao:
      indicators.reputacao * 0.15,

    pessoas:
      indicators.pessoas * 0.15,

    inovacao:
      indicators.inovacao * 0.10,

    estrategia:
      indicators.estrategia * 0.10,

    social:
      indicators.social * 0.05
  };


  let penalty = 0;

  const penaltyReasons = [];


  if (
    hasOverdueDebt(company)
  ) {

    penalty += 8;

    penaltyReasons.push(
      "Dívida vencida ou pendente: -8"
    );
  }


  if (
    company?.financialRestriction
      ?.active
  ) {

    penalty += 5;

    penaltyReasons.push(
      "Restrição financeira ativa: -5"
    );
  }


  if (
    Number(
      company.caixa || 0
    ) < 10000
  ) {

    penalty += 3;

    penaltyReasons.push(
      "Caixa crítico: -3"
    );
  }


  const grossScore =
    Object.values(weighted)
      .reduce(
        (sum, value) =>
          sum + value,
        0
      );


  return {

    indicators,

    weighted,

    grossScore:
      Number(
        grossScore.toFixed(1)
      ),

    penalty,

    penaltyReasons,

    finalScore:
      Number(
        clamp(
          grossScore - penalty
        ).toFixed(1)
      )
  };
}


/* =========================================================
   CLASSIFICAÇÃO
========================================================= */

function managementLevel(score) {

  if (score >= 85) {

    return {
      title:
        "GESTÃO DE EXCELÊNCIA",

      description:
        "A empresa demonstrou forte equilíbrio entre resultados, mercado, pessoas, estratégia e futuro."
    };
  }


  if (score >= 70) {

    return {
      title:
        "GESTÃO FORTE",

      description:
        "A empresa apresentou trajetória consistente e boa capacidade administrativa."
    };
  }


  if (score >= 55) {

    return {
      title:
        "GESTÃO EM DESENVOLVIMENTO",

      description:
        "A empresa construiu resultados importantes, embora ainda existam áreas que podem ser fortalecidas."
    };
  }


  return {

    title:
      "GESTÃO EM RECUPERAÇÃO",

    description:
      "A empresa enfrentou desafios relevantes e encerra a Arena com importantes aprendizados de gestão."
  };
}


/* =========================================================
   DICA ESTRATÉGICA
========================================================= */

function strategicTip(company) {

  if (
    company?.financialRestriction
      ?.active ||
    Number(company.caixa || 0) <
      20000
  ) {

    return (
      "O financeiro exige cautela. " +
      "O Conselho avaliará equilíbrio, " +
      "não apenas crescimento."
    );
  }


  if (
    Number(
      company.clientes || 0
    ) < 45
  ) {

    return (
      "Clientes ainda são um ponto de atenção. " +
      "Observe presença de mercado e sustentabilidade."
    );
  }


  if (
    Number(
      company.equipe || 0
    ) < 55
  ) {

    return (
      "Sua equipe está pressionada. " +
      "Crescimento sustentável também depende das pessoas."
    );
  }


  if (
    Number(
      company.inovacao || 0
    ) >= 70
  ) {

    return (
      "A inovação é uma força da empresa. " +
      "Transforme essa vantagem em legado sem perder equilíbrio."
    );
  }


  return (
    "Observe o conjunto da empresa: caixa, clientes, " +
    "reputação, pessoas, inovação, estratégia e impacto social."
  );
}


/* =========================================================
   ESTILO
========================================================= */

function installStyle() {

  if (
    document.querySelector(
      "#admArenaR20Style"
    )
  ) {
    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "admArenaR20Style";


  style.textContent = `

    .adm-r20 {
      display:grid;
      gap:14px;
      margin-top:14px;
    }

    .adm-r20-box {
      padding:17px;
      border-radius:15px;

      border:
        1px solid
        rgba(255,203,67,.30);

      background:
        linear-gradient(
          135deg,
          rgba(255,203,67,.08),
          rgba(120,72,255,.06)
        );

      color:#fff;
    }

    .adm-r20-badge {
      display:inline-block;

      padding:
        6px 11px;

      border-radius:
        999px;

      background:
        rgba(255,203,67,.10);

      color:
        #ffe59a;

      font-size:
        .75rem;

      font-weight:
        900;
    }

    .adm-r20-grid {

      display:grid;

      grid-template-columns:
        repeat(2,1fr);

      gap:8px;

      margin-top:
        12px;
    }

    .adm-r20-kpi {

      padding:
        11px;

      border-radius:
        10px;

      background:
        rgba(255,255,255,.05);
    }

    .adm-r20-kpi small {

      display:block;

      color:
        rgba(255,255,255,.55);

      margin-bottom:
        5px;
    }

    .adm-r20-option {

      padding:
        14px;

      margin:
        9px 0;

      border:
        1px solid
        rgba(255,255,255,.15);

      border-radius:
        12px;

      cursor:pointer;

      background:
        rgba(255,255,255,.035);
    }

    .adm-r20-option.selected {

      border-color:
        #ffcb43;

      background:
        rgba(255,203,67,.10);
    }

    .adm-r20-option strong {

      display:block;

      margin-bottom:
        6px;
    }

    .adm-r20-confirm {

      width:100%;

      min-height:
        48px;

      margin-top:
        12px;

      border:0;

      border-radius:
        11px;

      background:
        linear-gradient(
          135deg,
          #d59d18,
          #963fc6
        );

      color:#fff;

      font-weight:
        950;

      cursor:pointer;
    }

    .adm-r20-confirm:disabled {

      opacity:.40;

      cursor:
        not-allowed;
    }

    .adm-r20-score {

      font-size:
        2.6rem;

      font-weight:
        950;

      color:
        #fff;

      margin:
        10px 0;
    }

    @media(max-width:600px) {

      .adm-r20-grid {

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
   CONFIRMAR DECISÃO FINAL
========================================================= */

async function confirmFinal() {

  if (!selectedAction) return;


  const action =
    ACTIONS[selectedAction];


  if (!action) return;


  const confirmed =
    window.confirm(

      "CONFIRMAR DECISÃO FINAL?\n\n" +

      action.title +

      "\n\nA Pontuação Final de Gestão será calculada."
    );


  if (!confirmed) return;


  const f =
    await getFirebase();


  const snapshot =
    await f.get(

      f.ref(
        f.db,
        `rooms/${roomCode}`
      )
    );


  const latest =
    snapshot.val();


  if (
    !latest ||
    Number(
      latest.round || 0
    ) !== ROUND
  ) {

    alert(
      "A Arena não está na Rodada 20."
    );

    return;
  }


  if (
    latest.status ===
    "Pausado"
  ) {

    alert(
      "A Arena está pausada."
    );

    return;
  }


  const visible =
    getVisibleCompany(
      latest
    );


  if (!visible) {

    alert(
      "Empresa não identificada."
    );

    return;
  }


  const company = {
    ...visible.company
  };


  if (
    company?.round20?.decision
  ) {

    alert(
      "A decisão final já foi registrada."
    );

    return;
  }


  if (
    Number(
      company.caixa || 0
    ) +
    action.caixa <
    0
  ) {

    alert(
      "O caixa atual não permite esta decisão."
    );

    return;
  }


  const before = {

    caixa:
      Number(
        company.caixa || 0
      ),

    clientes:
      Number(
        company.clientes || 0
      ),

    reputacao:
      Number(
        company.reputacao || 0
      ),

    equipe:
      Number(
        company.equipe || 0
      ),

    inovacao:
      Number(
        company.inovacao || 0
      ),

    social:
      Number(
        company.responsabilidadeSocial ||
        company.social ||
        0
      ),

    xp:
      Number(
        company.xp || 0
      )
  };


  company.caixa =
    Math.max(
      0,
      before.caixa +
      action.caixa
    );


  company.clientes =
    Math.max(
      0,
      before.clientes +
      action.clientes
    );


  company.reputacao =
    clamp(
      before.reputacao +
      action.reputacao
    );


  company.equipe =
    clamp(
      before.equipe +
      action.equipe
    );


  company.inovacao =
    clamp(
      before.inovacao +
      action.inovacao
    );


  company.responsabilidadeSocial =
    Math.max(
      0,
      before.social +
      action.social
    );


  company.social =
    company.responsabilidadeSocial;


  company.xp =
    Math.max(
      0,
      before.xp +
      action.xp
    );


  const score =
    calculateFinalScore(
      company
    );


  const level =
    managementLevel(
      score.finalScore
    );


  company.round20 = {

    decision: {

      action:
        selectedAction,

      title:
        action.title,

      description:
        action.description,

      delta: {

        caixa:
          action.caixa,

        clientes:
          action.clientes,

        reputacao:
          action.reputacao,

        equipe:
          action.equipe,

        inovacao:
          action.inovacao,

        social:
          action.social,

        xp:
          action.xp
      },

      before,

      decidedAt:
        Date.now()
    },

    finalScore:
      score,

    managementLevel:
      level
  };


  company.managementDecisions =
    company.managementDecisions ||
    {};


  company.managementDecisions[20] = {

    round:
      20,

    roundName:
      "Conselho Final — O Legado da Empresa",

    optionId:
      selectedAction,

    optionTitle:
      action.title,

    totalDelta:
      company.round20
        .decision
        .delta,

    decidedAt:
      Date.now()
  };


  /* CAMPOS FINAIS PARA O RANKING */

  company.finalScore =
    score.finalScore;


  company.finalScoreDetails =
    score;


  company.finalManagementLevel =
    level.title;


  company.arenaCompleted =
    true;


  company.completedRound =
    20;


  company.completedAt =
    Date.now();


  await f.set(

    f.ref(
      f.db,
      `rooms/${roomCode}/companies/${visible.id}`
    ),

    company
  );


  selectedAction = "";
}


/* =========================================================
   RENDERIZAÇÃO
========================================================= */

function render() {

  if (
    Number(
      roomData?.round || 0
    ) !== ROUND
  ) {
    return;
  }


  const area =
    document.querySelector(
      "#decisaoArea"
    );


  const visible =
    getVisibleCompany();


  if (
    !area ||
    !visible
  ) {
    return;
  }


  const company =
    visible.company;


  /* FINAL JÁ CONCLUÍDA */

  if (
    company?.round20?.decision
  ) {

    const score =
      company.finalScoreDetails ||
      company.round20.finalScore;


    const level =
      company.finalManagementLevel ||
      company.round20
        ?.managementLevel
        ?.title ||
      "GESTÃO CONCLUÍDA";


    area.innerHTML = `

      <div class="adm-r20">

        <div class="adm-r20-box">

          <span class="adm-r20-badge">
            R20 · CONSELHO FINAL CONCLUÍDO
          </span>

          <h2>
            O LEGADO DA EMPRESA
          </h2>

          <p>
            <strong>
              ${
                escapeHtml(
                  company.round20
                    .decision
                    .title
                )
              }
            </strong>
          </p>

        </div>


        <div
          class="adm-r20-box"
          style="text-align:center;"
        >

          <small>
            PONTUAÇÃO FINAL DE GESTÃO
          </small>

          <div class="adm-r20-score">

            ${
              Number(
                score?.finalScore ||
                0
              ).toFixed(1)
            }

          </div>

          <strong>
            ${escapeHtml(level)}
          </strong>


          <div class="adm-r20-grid">

            <div class="adm-r20-kpi">

              <small>
                Financeiro · 25%
              </small>

              <strong>
                ${
                  Number(
                    score?.weighted
                      ?.financeiro ||
                    0
                  ).toFixed(1)
                }
              </strong>

            </div>


            <div class="adm-r20-kpi">

              <small>
                Mercado · 20%
              </small>

              <strong>
                ${
                  Number(
                    score?.weighted
                      ?.mercado ||
                    0
                  ).toFixed(1)
                }
              </strong>

            </div>


            <div class="adm-r20-kpi">

              <small>
                Reputação · 15%
              </small>

              <strong>
                ${
                  Number(
                    score?.weighted
                      ?.reputacao ||
                    0
                  ).toFixed(1)
                }
              </strong>

            </div>


            <div class="adm-r20-kpi">

              <small>
                Pessoas · 15%
              </small>

              <strong>
                ${
                  Number(
                    score?.weighted
                      ?.pessoas ||
                    0
                  ).toFixed(1)
                }
              </strong>

            </div>


            <div class="adm-r20-kpi">

              <small>
                Inovação · 10%
              </small>

              <strong>
                ${
                  Number(
                    score?.weighted
                      ?.inovacao ||
                    0
                  ).toFixed(1)
                }
              </strong>

            </div>


            <div class="adm-r20-kpi">

              <small>
                Estratégia / XP · 10%
              </small>

              <strong>
                ${
                  Number(
                    score?.weighted
                      ?.estrategia ||
                    0
                  ).toFixed(1)
                }
              </strong>

            </div>


            <div class="adm-r20-kpi">

              <small>
                Responsabilidade Social · 5%
              </small>

              <strong>
                ${
                  Number(
                    score?.weighted
                      ?.social ||
                    0
                  ).toFixed(1)
                }
              </strong>

            </div>


            <div class="adm-r20-kpi">

              <small>
                Penalidades
              </small>

              <strong>
                -${
                  Number(
                    score?.penalty ||
                    0
                  ).toFixed(1)
                }
              </strong>

            </div>

          </div>

        </div>


        <div class="adm-r20-box">

          <strong>
            ADM ARENA 360 CONCLUÍDA
          </strong>

          <p>
            O resultado considera a gestão
            global da empresa.
            Caixa sozinho não define a
            classificação final.
          </p>

        </div>

      </div>
    `;


    return;
  }


  /* DECISÃO FINAL */

  area.innerHTML = `

    <div class="adm-r20">


      <div class="adm-r20-box">

        <span class="adm-r20-badge">
          R20 · CONSELHO FINAL
        </span>

        <h2>
          O LEGADO DA EMPRESA
        </h2>

        <p>
          Depois de 19 rodadas de decisões,
          crises, oportunidades, concorrência,
          pessoas e inovação, chegou a última
          decisão estratégica.
        </p>

        <strong>
          Que legado sua empresa deseja deixar?
        </strong>

      </div>


      <div class="adm-r20-box">

        <h3>
          O QUE VOCÊ PRECISA OBSERVAR
        </h3>


        <div class="adm-r20-grid">

          <div class="adm-r20-kpi">

            <small>
              CAIXA
            </small>

            <strong>
              ADM$
              ${money(company.caixa)}
            </strong>

          </div>


          <div class="adm-r20-kpi">

            <small>
              CLIENTES
            </small>

            <strong>
              ${
                Number(
                  company.clientes ||
                  0
                )
              }
            </strong>

          </div>


          <div class="adm-r20-kpi">

            <small>
              REPUTAÇÃO
            </small>

            <strong>
              ${
                Number(
                  company.reputacao ||
                  0
                )
              }
            </strong>

          </div>


          <div class="adm-r20-kpi">

            <small>
              EQUIPE
            </small>

            <strong>
              ${
                Number(
                  company.equipe ||
                  0
                )
              }
            </strong>

          </div>

        </div>

      </div>


      <div class="adm-r20-box">

        <strong>
          DICA ESTRATÉGICA
        </strong>

        <p>
          ${
            escapeHtml(
              strategicTip(
                company
              )
            )
          }
        </p>

      </div>


      <div class="adm-r20-box">

        <h3>
          DECISÃO FINAL
        </h3>


        ${
          Object.entries(
            ACTIONS
          ).map(
            ([id, action]) => `

              <div
                class="
                  adm-r20-option
                  ${
                    selectedAction === id
                      ? "selected"
                      : ""
                  }
                "
                data-r20="${id}"
              >

                <strong>
                  ${
                    escapeHtml(
                      action.title
                    )
                  }
                </strong>

                <span>
                  ${
                    escapeHtml(
                      action.description
                    )
                  }
                </span>

              </div>
            `
          ).join("")
        }


        <button
          type="button"
          id="admR20Confirm"
          class="adm-r20-confirm"
          ${
            selectedAction
              ? ""
              : "disabled"
          }
        >

          CONFIRMAR DECISÃO FINAL

        </button>

      </div>


    </div>
  `;


  area
    .querySelectorAll(
      "[data-r20]"
    )
    .forEach(
      option => {

        option.onclick =
          () => {

            selectedAction =
              option.dataset.r20;

            render();
          };
      }
    );


  area
    .querySelector(
      "#admR20Confirm"
    )
    ?.addEventListener(
      "click",
      confirmFinal
    );
}


/* =========================================================
   FIREBASE
========================================================= */

async function start() {

  const page =
    String(
      window.location.pathname ||
      ""
    )
      .split("/")
      .pop()
      .toLowerCase();


  if (
    page !== "empresa.html"
  ) {
    return;
  }


  installStyle();


  const finder =
    setInterval(
      async () => {

        const code =
          detectRoomCode();


        if (!code) return;


        clearInterval(
          finder
        );


        roomCode =
          code;


        const f =
          await getFirebase();


        f.onValue(

          f.ref(
            f.db,
            `rooms/${roomCode}`
          ),

          snapshot => {

            roomData =
              snapshot.val() ||
              {};


            if (
              Number(
                roomData.round ||
                0
              ) === ROUND
            ) {

              render();
            }
          }
        );

      },

      400
    );


  new MutationObserver(
    () => {

      if (
        Number(
          roomData?.round ||
          0
        ) === ROUND
      ) {

        setTimeout(
          render,
          70
        );
      }
    }
  ).observe(

    document.body,

    {
      childList: true,
      subtree: true
    }
  );
}


start().catch(
  error => {

    console.error(
      "ADM Arena 360 — Rodada 20:",
      error
    );
  }
);
