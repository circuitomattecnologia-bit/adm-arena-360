import {
  getFirebase
} from "./firebase-service.js";


/* =========================================================
   ADM ARENA 360
   GESTÃO AVANÇADA — RODADAS 5 A 8

   PROJETO EMPREENDEDOR
   PROF. LEOPOLDO

   R5 — VENDAS & RESULTADO
   R6 — CRÉDITO EMPRESARIAL
   R7 — COMÉRCIO INTERNACIONAL
   R8 — CRISE LOGÍSTICA

   PRINCÍPIOS
   ---------------------------------------------------------
   - Só atua nas Rodadas 5, 6, 7 e 8.
   - Nunca altera rodadas anteriores.
   - Nunca avança rodada.
   - Nunca muda status da Arena.
   - Uma decisão por empresa/rodada.
   - Registra decisão, efeitos, antes e depois.
   - R7 influencia a R8.
   - Crédito da R6 registra dívida futura.
========================================================= */


const PAGE =
  String(
    window.location.pathname || ""
  )
    .split("/")
    .pop()
    .toLowerCase();


const IS_EMPRESA =
  PAGE === "empresa.html";


let arenaCode = "";
let arenaData = null;
let unsubscribeArena = null;
let selectedOptionId = "";
let renderTimer = null;


/* =========================================================
   CONFIGURAÇÃO DAS RODADAS
========================================================= */

const ADVANCED_ROUNDS = {

  5: {

    name:
      "Vendas & Resultado",

    eyebrow:
      "GESTÃO COMERCIAL",

    mission:
      "O mercado entrou em uma fase de maior pressão por resultados. " +
      "Sua empresa precisa transformar estratégia em vendas sem perder " +
      "controle financeiro, reputação e capacidade operacional.",

    question:
      "Qual será a estratégia comercial da empresa nesta rodada?",

    options: [

      {
        id:
          "vendas_agressivas",

        title:
          "Acelerar as vendas",

        description:
          "A empresa fará uma ação comercial forte para aumentar rapidamente " +
          "o volume de clientes, aceitando maior pressão sobre a equipe e a margem.",

        impact:
          "Maior geração imediata de caixa e clientes, com desgaste operacional.",

        delta: {
          caixa: 18000,
          clientes: 8,
          reputacao: -2,
          equipe: -5,
          xp: 8
        }
      },

      {
        id:
          "crescimento_equilibrado",

        title:
          "Crescer com equilíbrio",

        description:
          "A empresa amplia as vendas de forma controlada, buscando resultado " +
          "financeiro sem comprometer relacionamento, atendimento e equipe.",

        impact:
          "Crescimento consistente, reputação positiva e bom aprendizado gerencial.",

        delta: {
          caixa: 12000,
          clientes: 5,
          reputacao: 4,
          equipe: -2,
          xp: 10
        }
      },

      {
        id:
          "margem_valor",

        title:
          "Priorizar margem e valor",

        description:
          "A empresa evita disputar apenas por volume e trabalha qualidade, " +
          "valor percebido e rentabilidade.",

        impact:
          "Crescimento menor em clientes, porém com fortalecimento da reputação.",

        delta: {
          caixa: 9000,
          clientes: 2,
          reputacao: 5,
          xp: 9
        }
      }

    ]
  },


  6: {

    name:
      "Crédito Empresarial",

    eyebrow:
      "GESTÃO FINANCEIRA",

    mission:
      "O sistema financeiro oferece novas possibilidades de crédito. " +
      "Dinheiro emprestado pode acelerar o crescimento, mas também cria " +
      "obrigações futuras que precisarão ser pagas.",

    question:
      "Como a empresa lidará com a possibilidade de crédito?",

    options: [

      {
        id:
          "credito_investir",

        title:
          "Contratar crédito e investir",

        description:
          "A empresa contrata ADM$ 20.000. Parte será imediatamente utilizada " +
          "em expansão, tecnologia e estrutura.",

        impact:
          "Entra caixa líquido, cresce a inovação e é criada uma dívida de ADM$ 24.000.",

        delta: {
          caixa: 12000,
          clientes: 3,
          inovacao: 8,
          xp: 10
        },

        debt: {
          principal: 20000,
          totalDue: 24000,
          dueRound: 9,
          type: "Crédito para investimento"
        }
      },

      {
        id:
          "credito_reserva",

        title:
          "Contratar crédito e preservar caixa",

        description:
          "A empresa contrata ADM$ 20.000 e mantém o recurso disponível " +
          "para enfrentar oportunidades ou crises futuras.",

        impact:
          "O caixa aumenta, mas a dívida de ADM$ 24.000 será cobrada futuramente.",

        delta: {
          caixa: 20000,
          xp: 4
        },

        debt: {
          principal: 20000,
          totalDue: 24000,
          dueRound: 9,
          type: "Crédito para capital de giro"
        }
      },

      {
        id:
          "sem_credito",

        title:
          "Não contratar crédito",

        description:
          "A empresa decide preservar sua independência financeira e continuar " +
          "operando apenas com os próprios recursos.",

        impact:
          "Não aumenta o caixa, mas nenhuma nova obrigação financeira é criada.",

        delta: {
          xp: 8
        }
      }

    ]
  },


  7: {

    name:
      "Comércio Internacional",

    eyebrow:
      "MERCADO GLOBAL",

    mission:
      "O cenário internacional passa a influenciar preços, fornecedores, " +
      "demanda e custos. A empresa precisa decidir quanto risco deseja assumir.",

    question:
      "Qual será a estratégia internacional da empresa?",

    options: [

      {
        id:
          "expansao_internacional",

        title:
          "Buscar expansão internacional",

        description:
          "A empresa assume maior exposição ao mercado externo para aproveitar " +
          "novos clientes e oportunidades comerciais.",

        impact:
          "Maior retorno imediato, porém aumenta a exposição à crise logística da R8.",

        delta: {
          caixa: 15000,
          clientes: 7,
          reputacao: 3,
          equipe: -3,
          xp: 10
        },

        internationalRisk:
          "high"
      },

      {
        id:
          "diversificar_fornecedores",

        title:
          "Diversificar fornecedores e mercados",

        description:
          "A empresa investe agora para reduzir dependência de um único mercado " +
          "e fortalecer sua capacidade de adaptação.",

        impact:
          "Custo imediato, mas menor vulnerabilidade na próxima rodada.",

        delta: {
          caixa: -6000,
          reputacao: 3,
          inovacao: 3,
          xp: 10
        },

        internationalRisk:
          "protected"
      },

      {
        id:
          "mercado_domestico",

        title:
          "Concentrar-se no mercado interno",

        description:
          "A empresa limita a exposição internacional e busca estabilidade " +
          "dentro do mercado nacional.",

        impact:
          "Menor crescimento, com risco logístico intermediário.",

        delta: {
          caixa: 5000,
          clientes: 2,
          xp: 6
        },

        internationalRisk:
          "domestic"
      }

    ]
  },


  8: {

    name:
      "Crise Logística",

    eyebrow:
      "ALTA GESTÃO",

    mission:
      "Combustível, frete, energia e abastecimento ficaram mais caros. " +
      "A decisão tomada no comércio internacional agora poderá aumentar " +
      "ou reduzir os impactos desta crise.",

    question:
      "Como a empresa reagirá à crise logística?",

    options: [

      {
        id:
          "apoio_emergencial",

        title:
          "Contratar apoio emergencial",

        description:
          "A empresa assume um custo elevado para preservar atendimento, " +
          "prazos e relacionamento com os clientes.",

        impact:
          "Maior custo, porém forte proteção de reputação e clientes.",

        delta: {
          caixa: -9000,
          clientes: 2,
          reputacao: 5,
          xp: 10
        }
      },

      {
        id:
          "renegociar_operacao",

        title:
          "Renegociar e priorizar operações",

        description:
          "A empresa reduz atividades menos importantes, renegocia prazos " +
          "e reorganiza sua operação.",

        impact:
          "Custo moderado e perda limitada de mercado.",

        delta: {
          caixa: -4000,
          clientes: -1,
          reputacao: 2,
          xp: 9
        }
      },

      {
        id:
          "aguardar_normalizacao",

        title:
          "Aguardar a normalização",

        description:
          "A empresa evita gastos emergenciais e aceita os impactos temporários " +
          "da crise.",

        impact:
          "Preserva caixa no curto prazo, mas pode perder clientes, equipe e reputação.",

        delta: {
          clientes: -5,
          reputacao: -8,
          equipe: -4,
          xp: 2
        }
      }

    ]
  }

};


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

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function money(value) {

  return Number(value || 0)
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


function getVisibleCompany() {

  if (!arenaData) {
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
      arenaData.companies || {}
    )
      .find(
        ([, company]) =>
          normalizeName(
            company?.name
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


function clampMetric(
  field,
  value
) {

  let result =
    Number(
      value || 0
    );


  if (
    field ===
      "reputacao" ||
    field ===
      "equipe"
  ) {

    result =
      Math.max(
        0,
        Math.min(
          100,
          result
        )
      );

  } else {

    result =
      Math.max(
        0,
        result
      );

  }


  return result;
}


function mergeDelta(
  base,
  extra
) {

  const result = {
    ...(base || {})
  };


  Object.entries(
    extra || {}
  )
    .forEach(
      ([field, value]) => {

        result[field] =
          Number(
            result[field] || 0
          ) +
          Number(
            value || 0
          );

      }
    );


  return result;
}


function formatDelta(
  delta
) {

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
    delta || {}
  )
    .map(
      ([field, value]) => {

        const number =
          Number(value || 0);

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
   CONTEXTO ESPECIAL DA RODADA 8
========================================================= */

function round8Context(
  company
) {

  const risk =
    company
      ?.internationalStrategy
      ?.risk ||
    "";


  if (
    risk ===
    "high"
  ) {

    return {

      label:
        "ALTA EXPOSIÇÃO INTERNACIONAL",

      text:
        "A estratégia internacional da Rodada 7 aumentou a exposição da empresa. " +
        "A crise logística gera uma pressão adicional de ADM$ 5.000 e perda de 2 clientes.",

      delta: {
        caixa: -5000,
        clientes: -2
      }

    };

  }


  if (
    risk ===
    "protected"
  ) {

    return {

      label:
        "PROTEÇÃO POR DIVERSIFICAÇÃO",

      text:
        "A diversificação realizada na Rodada 7 reduziu o impacto da crise. " +
        "A empresa economiza ADM$ 3.000 frente ao cenário normal.",

      delta: {
        caixa: 3000
      }

    };

  }


  return {

    label:
      "EXPOSIÇÃO INTERMEDIÁRIA",

    text:
      "A empresa manteve maior concentração no mercado interno. " +
      "Não haverá ajuste adicional antes da decisão logística.",

    delta: {}

  };
}


/* =========================================================
   ESTILO
========================================================= */

function installStyle() {

  if (
    document.querySelector(
      "#adm360AdvancedRoundsStyle"
    )
  ) {
    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "adm360AdvancedRoundsStyle";


  style.textContent = `

    .adm360-advanced-round {

      display:
        grid;

      gap:
        14px;

      margin-top:
        14px;

    }


    .adm360-advanced-badge {

      display:
        inline-flex;

      width:
        fit-content;

      padding:
        6px 10px;

      border-radius:
        999px;

      border:
        1px solid
        rgba(
          255,
          82,
          174,
          .35
        );

      background:
        rgba(
          255,
          82,
          174,
          .11
        );

      color:
        #ff9fd2;

      font-size:
        .72rem;

      font-weight:
        950;

      letter-spacing:
        .04em;

    }


    .adm360-advanced-question {

      margin:
        0;

      color:
        #fff;

      font-weight:
        900;

      line-height:
        1.45;

    }


    .adm360-advanced-options {

      display:
        grid;

      gap:
        10px;

    }


    .adm360-advanced-option {

      padding:
        14px;

      border-radius:
        15px;

      border:
        1px solid
        rgba(
          255,
          255,
          255,
          .10
        );

      background:
        rgba(
          255,
          255,
          255,
          .035
        );

      cursor:
        pointer;

      transition:
        .16s ease;

    }


    .adm360-advanced-option:hover {

      border-color:
        rgba(
          255,
          82,
          174,
          .40
        );

      transform:
        translateY(-1px);

    }


    .adm360-advanced-option.selected {

      border-color:
        rgba(
          255,
          82,
          174,
          .85
        );

      background:
        rgba(
          255,
          82,
          174,
          .09
        );

      box-shadow:
        0 0 20px
        rgba(
          255,
          82,
          174,
          .09
        );

    }


    .adm360-advanced-option strong {

      display:
        block;

      margin-bottom:
        6px;

      color:
        #fff;

      font-size:
        .96rem;

    }


    .adm360-advanced-option p {

      margin:
        0 0 8px;

      color:
        rgba(
          255,
          255,
          255,
          .68
        );

      line-height:
        1.48;

      font-size:
        .82rem;

    }


    .adm360-advanced-impact {

      color:
        #ffafd9;

      font-size:
        .76rem;

      font-weight:
        800;

      line-height:
        1.45;

    }


    .adm360-advanced-confirm {

      width:
        100%;

      min-height:
        48px;

      border:
        1px solid
        rgba(
          255,
          82,
          174,
          .65
        );

      border-radius:
        13px;

      background:
        linear-gradient(
          135deg,
          #da2c8b,
          #ac2dcc
        );

      color:
        #fff;

      font-weight:
        950;

      cursor:
        pointer;

    }


    .adm360-advanced-confirm:disabled {

      opacity:
        .42;

      cursor:
        not-allowed;

    }


    .adm360-advanced-context {

      padding:
        12px 13px;

      border-radius:
        13px;

      border:
        1px solid
        rgba(
          255,
          199,
          70,
          .26
        );

      background:
        rgba(
          255,
          199,
          70,
          .06
        );

      color:
        #ffe8ad;

      font-size:
        .8rem;

      line-height:
        1.5;

    }


    .adm360-advanced-context strong {

      display:
        block;

      margin-bottom:
        4px;

    }


    .adm360-advanced-confirmed {

      padding:
        16px;

      border-radius:
        15px;

      border:
        1px solid
        rgba(
          71,
          220,
          154,
          .30
        );

      background:
        rgba(
          71,
          220,
          154,
          .07
        );

    }


    .adm360-advanced-confirmed strong {

      display:
        block;

      color:
        #a7f3d0;

      margin-bottom:
        7px;

    }


    .adm360-advanced-confirmed p {

      margin:
        5px 0;

      color:
        rgba(
          255,
          255,
          255,
          .72
        );

      line-height:
        1.5;

    }


    #adm360AdvancedToast {

      position:
        fixed;

      left:
        50%;

      bottom:
        28px;

      transform:
        translateX(-50%);

      z-index:
        2147483000;

      display:
        none;

      max-width:
        min(
          680px,
          calc(100vw - 28px)
        );

      padding:
        13px 17px;

      border-radius:
        14px;

      border:
        1px solid
        rgba(
          255,
          255,
          255,
          .14
        );

      background:
        rgba(
          5,
          17,
          38,
          .97
        );

      color:
        #fff;

      box-shadow:
        0 18px 50px
        rgba(
          0,
          0,
          0,
          .40
        );

      font-weight:
        850;

      text-align:
        center;

    }


    #adm360AdvancedToast.show {

      display:
        block;

    }

  `;


  document.head.appendChild(
    style
  );


  const toast =
    document.createElement(
      "div"
    );


  toast.id =
    "adm360AdvancedToast";


  document.body.appendChild(
    toast
  );

}


/* =========================================================
   TOAST
========================================================= */

function toast(
  text
) {

  const box =
    document.querySelector(
      "#adm360AdvancedToast"
    );


  if (!box) {
    return;
  }


  box.textContent =
    text;


  box.classList.add(
    "show"
  );


  clearTimeout(
    box._timer
  );


  box._timer =
    setTimeout(
      () => {

        box.classList.remove(
          "show"
        );

      },
      3500
    );

}


/* =========================================================
   RENDER
========================================================= */

function renderAdvancedRound() {

  if (
    !IS_EMPRESA ||
    !arenaData
  ) {
    return;
  }


  const area =
    document.querySelector(
      "#decisaoArea"
    );


  if (!area) {
    return;
  }


  const round =
    Number(
      arenaData.round || 0
    );


  const config =
    ADVANCED_ROUNDS[
      round
    ];


  /*
    Fora das rodadas 5 a 8
    não interfere na área original.
  */

  if (!config) {
    return;
  }


  const current =
    getVisibleCompany();


  if (!current) {
    return;
  }


  const company =
    current.company;


  const decision =
    company
      ?.managementDecisions
      ?.[round];


  const marker =
    `${round}:${
      decision?.decidedAt || "open"
    }:${selectedOptionId}`;


  if (
    area.dataset
      .adm360AdvancedMarker ===
    marker &&
    area.querySelector(
      ".adm360-advanced-round"
    )
  ) {
    return;
  }


  area.dataset
    .adm360AdvancedMarker =
    marker;


  if (decision) {

    area.innerHTML = `
      <div class="adm360-advanced-round">

        <span class="adm360-advanced-badge">
          ${escapeHtml(
            config.eyebrow
          )}
        </span>

        <div class="adm360-advanced-confirmed">

          <strong>
            ✅ DECISÃO DA RODADA CONFIRMADA
          </strong>

          <p>
            <b>${escapeHtml(
              decision.optionTitle ||
              "Decisão registrada"
            )}</b>
          </p>

          <p>
            ${escapeHtml(
              decision.optionDescription ||
              ""
            )}
          </p>

          <p>
            <b>Efeitos registrados:</b>
            ${escapeHtml(
              formatDelta(
                decision.totalDelta ||
                decision.delta ||
                {}
              )
            )}
          </p>

        </div>

      </div>
    `;

    return;
  }


  let contextHtml =
    "";


  if (
    round === 8
  ) {

    const context =
      round8Context(
        company
      );


    contextHtml = `
      <div class="adm360-advanced-context">

        <strong>
          ${escapeHtml(
            context.label
          )}
        </strong>

        ${escapeHtml(
          context.text
        )}

      </div>
    `;

  }


  area.innerHTML = `
    <div class="adm360-advanced-round">

      <span class="adm360-advanced-badge">
        ${escapeHtml(
          config.eyebrow
        )}
      </span>

      ${contextHtml}

      <p class="adm360-advanced-question">
        ${escapeHtml(
          config.question
        )}
      </p>

      <div class="adm360-advanced-options">

        ${config.options
          .map(
            option => `
              <div
                class="
                  adm360-advanced-option
                  ${
                    selectedOptionId ===
                      option.id
                      ? "selected"
                      : ""
                  }
                "
                data-option-id="${escapeHtml(
                  option.id
                )}"
              >

                <strong>
                  ${escapeHtml(
                    option.title
                  )}
                </strong>

                <p>
                  ${escapeHtml(
                    option.description
                  )}
                </p>

                <div class="adm360-advanced-impact">
                  ${escapeHtml(
                    option.impact
                  )}
                </div>

              </div>
            `
          )
          .join("")}

      </div>

      <button
        type="button"
        id="adm360ConfirmAdvancedDecision"
        class="adm360-advanced-confirm"
        ${
          selectedOptionId
            ? ""
            : "disabled"
        }
      >
        CONFIRMAR DECISÃO DA RODADA
      </button>

    </div>
  `;


  area
    .querySelectorAll(
      ".adm360-advanced-option"
    )
    .forEach(
      card => {

        card.addEventListener(
          "click",
          () => {

            selectedOptionId =
              card.dataset
                .optionId ||
              "";

            area.dataset
              .adm360AdvancedMarker =
              "";

            renderAdvancedRound();

          }
        );

      }
    );


  area
    .querySelector(
      "#adm360ConfirmAdvancedDecision"
    )
    ?.addEventListener(
      "click",
      confirmAdvancedDecision
    );

}


/* =========================================================
   CONFIRMAR DECISÃO
========================================================= */

async function confirmAdvancedDecision() {

  const round =
    Number(
      arenaData?.round || 0
    );


  const config =
    ADVANCED_ROUNDS[
      round
    ];


  if (
    !config ||
    !selectedOptionId
  ) {
    return;
  }


  const option =
    config.options.find(
      item =>
        item.id ===
        selectedOptionId
    );


  if (!option) {
    return;
  }


  const ok =
    window.confirm(
      `CONFIRMAR DECISÃO\n\n` +
      `${config.name}\n\n` +
      `${option.title}\n\n` +
      `Depois de confirmada, a empresa não poderá repetir esta decisão.`
    );


  if (!ok) {
    return;
  }


  try {

    const f =
      await getFirebase();


    if (!f) {

      toast(
        "Firebase indisponível."
      );

      return;
    }


    const snapshot =
      await f.get(
        f.ref(
          f.db,
          `rooms/${arenaCode}`
        )
      );


    const latest =
      snapshot.val();


    if (!latest) {

      toast(
        "Arena não encontrada."
      );

      return;
    }


    if (
      Number(
        latest.round || 0
      ) !==
      round
    ) {

      toast(
        "A rodada mudou antes da confirmação. Atualize a tela."
      );

      return;
    }


    if (
      latest.status ===
      "Pausado"
    ) {

      toast(
        "A Arena está pausada. A decisão não foi enviada."
      );

      return;
    }


    const visible =
      getVisibleCompany();


    if (!visible) {

      toast(
        "Empresa não identificada."
      );

      return;
    }


    const companyId =
      visible.id;


    const company =
      latest
        .companies
        ?.[companyId];


    if (!company) {

      toast(
        "Empresa não encontrada na Arena."
      );

      return;
    }


    company.managementDecisions =
      company.managementDecisions ||
      {};


    if (
      company
        .managementDecisions
        ?.[round]
    ) {

      toast(
        "Esta empresa já confirmou a decisão desta rodada."
      );

      return;
    }


    let contextualDelta =
      {};


    let contextualNote =
      "";


    if (
      round === 8
    ) {

      const context =
        round8Context(
          company
        );


      contextualDelta =
        context.delta;


      contextualNote =
        context.text;

    }


    const totalDelta =
      mergeDelta(
        option.delta,
        contextualDelta
      );


    const trackedFields = [
      "caixa",
      "clientes",
      "reputacao",
      "equipe",
      "inovacao",
      "xp"
    ];


    const before = {};


    const after = {};


    trackedFields
      .forEach(
        field => {

          const currentValue =
            Number(
              company[field] || 0
            );


          before[field] =
            currentValue;


          const nextValue =
            currentValue +
            Number(
              totalDelta[
                field
              ] || 0
            );


          company[field] =
            clampMetric(
              field,
              nextValue
            );


          after[field] =
            company[field];

        }
      );


    /* =====================================================
       RODADA 6 — DÍVIDA
    ===================================================== */

    let debtRecord =
      null;


    if (
      round === 6 &&
      option.debt
    ) {

      company.debts =
        company.debts ||
        {};


      const debtId =
        `debt-r6-${Date.now()}`;


      debtRecord = {

        id:
          debtId,

        createdRound:
          6,

        createdAt:
          Date.now(),

        type:
          option.debt.type,

        principal:
          Number(
            option.debt.principal
          ),

        totalDue:
          Number(
            option.debt.totalDue
          ),

        dueRound:
          Number(
            option.debt.dueRound
          ),

        status:
          "open"

      };


      company.debts[
        debtId
      ] =
        debtRecord;

    }


    /* =====================================================
       RODADA 7 — ESTRATÉGIA INTERNACIONAL
    ===================================================== */

    if (
      round === 7
    ) {

      company.internationalStrategy = {

        optionId:
          option.id,

        optionTitle:
          option.title,

        risk:
          option
            .internationalRisk ||
          "domestic",

        decidedAt:
          Date.now()

      };

    }


    /* =====================================================
       RODADA 8 — ALTA GESTÃO
    ===================================================== */

    if (
      round === 8
    ) {

      company.highManagementUnlocked =
        true;


      company.highManagementUnlockedAt =
        Date.now();

    }


    const record = {

      round,

      roundName:
        config.name,

      optionId:
        option.id,

      optionTitle:
        option.title,

      optionDescription:
        option.description,

      baseDelta:
        option.delta || {},

      contextualDelta,

      contextualNote,

      totalDelta,

      before,

      after,

      debt:
        debtRecord,

      decidedAt:
        Date.now()

    };


    company.managementDecisions[
      round
    ] =
      record;


    await f.set(
      f.ref(
        f.db,
        `rooms/${arenaCode}/companies/${companyId}`
      ),
      company
    );


    selectedOptionId =
      "";


    toast(
      "✅ Decisão confirmada e registrada."
    );


  } catch (error) {

    console.error(
      "ADM Arena 360 — Gestão Avançada:",
      error
    );


    toast(
      "Não foi possível registrar a decisão."
    );

  }

}


/* =========================================================
   ATUALIZA MISSÃO VISUAL
========================================================= */

function updateMissionText() {

  const round =
    Number(
      arenaData?.round || 0
    );


  const config =
    ADVANCED_ROUNDS[
      round
    ];


  if (!config) {
    return;
  }


  const mission =
    document.querySelector(
      "#missaoTexto"
    );


  if (!mission) {
    return;
  }


  const desired =
    config.mission;


  if (
    mission.textContent !==
    desired
  ) {

    mission.textContent =
      desired;

  }

}


/* =========================================================
   RENDER SEGURO
========================================================= */

function scheduleRender() {

  clearTimeout(
    renderTimer
  );


  renderTimer =
    setTimeout(
      () => {

        updateMissionText();

        renderAdvancedRound();

      },
      60
    );

}


/* =========================================================
   OBSERVA ALTERAÇÕES DA ÁREA ORIGINAL

   empresa.js pode renderizar novamente #decisaoArea.
   Quando isso acontecer, este módulo recoloca apenas
   as rodadas 5 a 8.
========================================================= */

function observeDecisionArea() {

  const observer =
    new MutationObserver(
      () => {

        const round =
          Number(
            arenaData?.round || 0
          );


        if (
          ADVANCED_ROUNDS[
            round
          ]
        ) {

          scheduleRender();

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
   FIREBASE
========================================================= */

async function connectArena() {

  const finder =
    setInterval(
      async () => {

        const code =
          detectRoomCode();


        if (!code) {
          return;
        }


        clearInterval(
          finder
        );


        arenaCode =
          code;


        const f =
          await getFirebase();


        if (!f) {
          return;
        }


        if (
          unsubscribeArena
        ) {

          unsubscribeArena();

        }


        unsubscribeArena =
          f.onValue(
            f.ref(
              f.db,
              `rooms/${arenaCode}`
            ),
            snapshot => {

              arenaData =
                snapshot.val() ||
                {};


              const round =
                Number(
                  arenaData.round || 0
                );


              if (
                !ADVANCED_ROUNDS[
                  round
                ]
              ) {

                selectedOptionId =
                  "";

                return;
              }


              scheduleRender();

            }
          );

      },
      400
    );

}


/* =========================================================
   INÍCIO
========================================================= */

async function start() {

  if (!IS_EMPRESA) {
    return;
  }


  installStyle();

  observeDecisionArea();

  await connectArena();

}


start()
  .catch(
    error => {

      console.error(
        "ADM Arena 360 — inicialização Gestão Avançada:",
        error
      );

    }
  );
