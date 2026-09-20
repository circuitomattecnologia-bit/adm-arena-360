import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360 — RODADA 13
   EMPRESA QUE TRANSFORMA
   RESPONSABILIDADE SOCIAL

   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   PADRÃO PEDAGÓGICO
   ---------------------------------------------------------
   CENÁRIO
   → O QUE VOCÊ PRECISA OBSERVAR
   → DICA ESTRATÉGICA AUTOMÁTICA
   → 3 POSSIBILIDADES DE AÇÃO
   → CONFIRMAÇÃO
   → CONSEQUÊNCIA EXPLICADA

   REGRAS
   ---------------------------------------------------------
   - Só funciona na Rodada 13.
   - Não avança rodada.
   - Não altera o status da Arena.
   - Não interfere nas Rodadas 1–12.
   - Uma decisão por empresa.
   - A dica considera a situação da empresa.
   - Responsabilidade social não é apenas gastar dinheiro.
   - Empresas com menos caixa também podem gerar impacto.
   - Decisões anteriores continuam tendo importância.
========================================================= */

const PAGE = String(window.location.pathname || "")
  .split("/")
  .pop()
  .toLowerCase();

const IS_EMPRESA = PAGE === "empresa.html";

let roomCode = "";
let roomData = null;
let selectedAction = "";
let renderTimer = null;


/* =========================================================
   UTILIDADES
========================================================= */

function normalizeCode(value) {
  const match = String(value || "")
    .toUpperCase()
    .match(/\bADM-\d{4}\b/);

  if (!match || match[0] === "ADM-0000") return "";
  return match[0];
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
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value) {
  return Number(value || 0)
    .toLocaleString("pt-BR");
}

function clamp(value, min = 0, max = Infinity) {
  return Math.max(
    min,
    Math.min(max, Number(value || 0))
  );
}

function signed(value) {
  const n = Number(value || 0);

  if (n > 0) return `+${n}`;
  return String(n);
}

function detectRoomCode() {
  const url = new URL(window.location.href);

  const candidates = [
    url.searchParams.get("sala"),
    url.searchParams.get("room"),
    url.searchParams.get("codigo"),
    document.querySelector("#codigo")?.value,
    document.querySelector("#salaPill")?.textContent,
    localStorage.getItem("adm360:openingRoomCode"),
    localStorage.getItem("admArena360Room"),
    localStorage.getItem("admArenaRoom"),
    localStorage.getItem("admArenaRoomCode")
  ];

  for (const value of candidates) {
    const code = normalizeCode(value);

    if (code) return code;
  }

  return "";
}

function getVisibleCompany(data = roomData) {
  if (!data) return null;

  const visibleName =
    document.querySelector("#empresaNome")
      ?.textContent
      ?.trim() ||
    document.querySelector("#nomeEmpresa")
      ?.value
      ?.trim() ||
    "";

  const normalized = normalizeName(visibleName);

  if (!normalized) return null;

  const found = Object.entries(
    data.companies || {}
  ).find(
    ([, company]) =>
      normalizeName(company?.name) === normalized
  );

  if (!found) return null;

  return {
    id: found[0],
    company: found[1]
  };
}

function toast(text) {
  let box =
    document.querySelector("#adm360R13Toast");

  if (!box) {
    box = document.createElement("div");
    box.id = "adm360R13Toast";
    document.body.appendChild(box);
  }

  box.textContent = text;
  box.classList.add("show");

  clearTimeout(box._timer);

  box._timer = setTimeout(() => {
    box.classList.remove("show");
  }, 3500);
}


/* =========================================================
   SITUAÇÃO DA EMPRESA
========================================================= */

function companySituation(company) {
  const cash =
    Number(company?.caixa || 0);

  const reputation =
    Number(company?.reputacao || 0);

  const clients =
    Number(company?.clientes || 0);

  const team =
    Number(company?.equipe || 0);

  if (
    company?.financialRestriction?.active
  ) {
    return "financialPressure";
  }

  if (cash < 20000) {
    return "veryLowCash";
  }

  if (cash < 35000) {
    return "lowCash";
  }

  if (reputation < 55) {
    return "lowReputation";
  }

  if (
    team > 0 &&
    team < 55
  ) {
    return "teamPressure";
  }

  if (
    cash >= 70000 &&
    reputation >= 65
  ) {
    return "strong";
  }

  if (
    clients >= 60 &&
    reputation >= 70
  ) {
    return "marketStrong";
  }

  return "balanced";
}


/* =========================================================
   DICA ESTRATÉGICA AUTOMÁTICA
========================================================= */

function strategicTip(company) {
  const situation =
    companySituation(company);

  const tips = {
    financialPressure:
      "Sua empresa ainda enfrenta pressão financeira. Responsabilidade social também pode acontecer com organização, parceria e participação das pessoas — não apenas com grandes gastos.",

    veryLowCash:
      "Seu caixa está bastante limitado. Procure uma ação que gere impacto social sem colocar a continuidade da empresa em risco.",

    lowCash:
      "Sua empresa precisa cuidar do caixa. Compare o impacto de cada ação com o investimento necessário para realizá-la.",

    lowReputation:
      "Uma ação social pode aproximar empresa e comunidade, mas precisa ser verdadeira e coerente. Não pense somente em publicidade.",

    teamPressure:
      "Sua equipe também faz parte da responsabilidade da empresa. Pense se a ação escolhida consegue envolver as pessoas sem aumentar demais a pressão.",

    strong:
      "Sua empresa possui boas condições para gerar impacto. Pense se é o momento de assumir uma ação mais estruturada e duradoura.",

    marketStrong:
      "Sua empresa possui boa presença no mercado. Uma ação social coerente pode transformar essa presença em contribuição para a comunidade.",

    balanced:
      "Não escolha apenas pela quantidade de dinheiro investido. Observe o impacto social, a capacidade da empresa e a participação das pessoas."
  };

  return tips[situation] || tips.balanced;
}


/* =========================================================
   O QUE OBSERVAR
========================================================= */

function observationItems(company) {
  const items = [];

  const cash =
    Number(company?.caixa || 0);

  const reputation =
    Number(company?.reputacao || 0);

  const team =
    Number(company?.equipe || 0);

  if (cash < 25000) {
    items.push(
      "O caixa está apertado: uma ação social precisa caber na realidade da empresa."
    );
  } else {
    items.push(
      "A empresa possui algum espaço para investir em uma ação social."
    );
  }

  if (reputation < 55) {
    items.push(
      "A confiança do mercado precisa ser fortalecida com atitudes coerentes."
    );
  } else {
    items.push(
      "A empresa possui uma imagem que pode ser aproximada ainda mais da comunidade."
    );
  }

  if (
    team > 0 &&
    team < 55
  ) {
    items.push(
      "A equipe está pressionada e não deve receber uma carga excessiva."
    );
  } else {
    items.push(
      "A participação da equipe pode ampliar o impacto da ação."
    );
  }

  return items.slice(0, 3);
}


/* =========================================================
   CENÁRIO
========================================================= */

const SCENARIO = {
  title:
    "DESAFIO: EMPRESA QUE TRANSFORMA",

  text:
    "A comunidade apresentou diferentes necessidades sociais e convidou as empresas da Arena a participar. " +
    "Sua empresa precisa escolher uma ação possível, responsável e coerente com sua situação.",

  challenge:
    "Como contribuir com a comunidade sem perder de vista a sustentabilidade da própria empresa?"
};


/* =========================================================
   AÇÕES SOCIAIS
========================================================= */

const ACTIONS = [
  {
    id: "campanha",
    title:
      "Campanha solidária com participação da equipe",

    description:
      "Organizar uma campanha de arrecadação de alimentos e produtos essenciais para montagem de cestas destinadas a famílias da comunidade.",

    impact:
      "Investimento menor · participação coletiva · impacto comunitário"
  },

  {
    id: "instituicao",
    title:
      "Apoiar uma instituição social",

    description:
      "Destinar recursos e mobilização para apoiar uma instituição que atende idosos, pessoas com deficiência ou outro público da comunidade.",

    impact:
      "Investimento intermediário · parceria social · impacto direcionado"
  },

  {
    id: "projeto",
    title:
      "Criar uma ação social própria da empresa",

    description:
      "Planejar uma iniciativa de maior alcance envolvendo recursos, equipe e relacionamento com a comunidade.",

    impact:
      "Investimento maior · maior planejamento · possibilidade de impacto ampliado"
  }
];


/* =========================================================
   CONSEQUÊNCIAS
========================================================= */

function calculateResult(company, actionId) {
  const situation =
    companySituation(company);

  if (actionId === "campanha") {
    let result = {
      caixa: -3000,
      clientes: 1,
      reputacao: 5,
      equipe: 4,
      social: 8,
      xp: 9,

      text:
        "A campanha mobilizou a equipe e a comunidade. Mesmo com investimento financeiro menor, a empresa conseguiu gerar impacto social positivo."
    };

    if (
      situation === "financialPressure" ||
      situation === "veryLowCash" ||
      situation === "lowCash"
    ) {
      result.caixa = -2000;
      result.reputacao = 6;
      result.equipe = 5;
      result.social = 9;
      result.xp = 11;

      result.text =
        "A empresa escolheu uma ação compatível com sua realidade financeira e mostrou que responsabilidade social também depende de mobilização e participação.";
    }

    if (situation === "teamPressure") {
      result.equipe = 2;
      result.social = 7;

      result.text =
        "A campanha gerou impacto positivo, mas a participação precisou ser organizada com cuidado porque a equipe já estava pressionada.";
    }

    return result;
  }


  if (actionId === "instituicao") {
    let result = {
      caixa: -7000,
      clientes: 2,
      reputacao: 8,
      equipe: 3,
      social: 12,
      xp: 11,

      text:
        "A parceria com uma instituição direcionou recursos para uma necessidade concreta e fortaleceu a relação da empresa com a comunidade."
    };

    if (
      situation === "strong" ||
      situation === "marketStrong"
    ) {
      result.reputacao = 9;
      result.social = 14;
      result.xp = 13;

      result.text =
        "A empresa utilizou sua boa condição para estabelecer uma parceria social consistente e ampliar seu impacto na comunidade.";
    }

    if (
      situation === "veryLowCash" ||
      situation === "financialPressure"
    ) {
      result.caixa = -9000;
      result.reputacao = 5;
      result.social = 8;
      result.xp = 7;

      result.text =
        "A ação trouxe benefício social, mas exigiu recursos importantes de uma empresa que já enfrentava pressão financeira.";
    }

    return result;
  }


  if (actionId === "projeto") {
    let result = {
      caixa: -12000,
      clientes: 3,
      reputacao: 10,
      equipe: 4,
      social: 16,
      xp: 13,

      text:
        "A empresa estruturou uma iniciativa própria e conseguiu ampliar sua presença social, assumindo também maior responsabilidade pela execução."
    };

    if (situation === "strong") {
      result.caixa = -10000;
      result.clientes = 4;
      result.reputacao = 12;
      result.equipe = 5;
      result.social = 20;
      result.xp = 15;

      result.text =
        "A empresa possuía estrutura para realizar uma iniciativa mais ampla. O projeto gerou forte impacto social e valorizou a organização.";
    }

    if (
      situation === "veryLowCash" ||
      situation === "financialPressure"
    ) {
      result.caixa = -15000;
      result.clientes = 1;
      result.reputacao = 5;
      result.equipe = -2;
      result.social = 9;
      result.xp = 6;

      result.text =
        "O projeto teve valor social, mas foi maior do que a capacidade atual da empresa. O esforço financeiro e operacional reduziu parte dos benefícios.";
    }

    if (situation === "teamPressure") {
      result.caixa = -12000;
      result.equipe = -4;
      result.reputacao = 7;
      result.social = 11;
      result.xp = 8;

      result.text =
        "A iniciativa gerou impacto, mas exigiu demais de uma equipe que já estava pressionada. Uma ação social também precisa respeitar a capacidade das pessoas."
    }

    return result;
  }


  return {
    caixa: 0,
    clientes: 0,
    reputacao: 0,
    equipe: 0,
    social: 0,
    xp: 0,
    text: ""
  };
}


/* =========================================================
   ESTILO
========================================================= */

function installStyle() {
  if (
    document.querySelector("#adm360R13Style")
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "adm360R13Style";

  style.textContent = `
    .adm360-r13 {
      display:grid;
      gap:14px;
      margin-top:14px;
    }

    .adm360-r13-badge {
      display:inline-flex;
      width:fit-content;
      padding:6px 11px;
      border-radius:999px;
      border:1px solid rgba(255,92,143,.48);
      background:rgba(255,92,143,.10);
      color:#ffb5ce;
      font-size:.72rem;
      font-weight:950;
    }

    .adm360-r13-box {
      padding:15px;
      border-radius:15px;
      border:1px solid rgba(255,255,255,.09);
      background:rgba(255,255,255,.035);
    }

    .adm360-r13-box h3 {
      margin:0 0 8px;
      color:#fff;
      font-size:1rem;
    }

    .adm360-r13-box p {
      color:rgba(255,255,255,.72);
      line-height:1.55;
      font-size:.84rem;
    }

    .adm360-r13-kpis {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:8px;
      margin-top:10px;
    }

    .adm360-r13-kpi {
      padding:10px;
      border-radius:11px;
      background:rgba(255,255,255,.04);
      text-align:center;
    }

    .adm360-r13-kpi small {
      display:block;
      color:rgba(255,255,255,.52);
      margin-bottom:4px;
    }

    .adm360-r13-kpi strong {
      color:#fff;
    }

    .adm360-r13-observe {
      display:grid;
      gap:7px;
      margin-top:10px;
    }

    .adm360-r13-observe div {
      padding:9px 11px;
      border-radius:10px;
      background:rgba(255,255,255,.04);
      color:rgba(255,255,255,.78);
      font-size:.80rem;
    }

    .adm360-r13-tip {
      padding:14px;
      border-radius:13px;
      border:1px solid rgba(255,202,66,.38);
      background:rgba(255,202,66,.08);
    }

    .adm360-r13-tip strong {
      display:block;
      color:#ffe294;
      margin-bottom:6px;
      font-size:.82rem;
    }

    .adm360-r13-tip span {
      color:#fff2c9;
      font-size:.84rem;
      line-height:1.5;
    }

    .adm360-r13-options {
      display:grid;
      gap:9px;
      margin-top:10px;
    }

    .adm360-r13-option {
      padding:13px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.025);
      cursor:pointer;
      transition:.16s ease;
    }

    .adm360-r13-option:hover {
      background:rgba(255,255,255,.05);
    }

    .adm360-r13-option.selected {
      border-color:#ff5c8f;
      background:rgba(255,92,143,.11);
    }

    .adm360-r13-option strong {
      display:block;
      color:#fff;
      margin-bottom:4px;
    }

    .adm360-r13-option span {
      display:block;
      color:rgba(255,255,255,.66);
      font-size:.79rem;
      line-height:1.45;
    }

    .adm360-r13-impact {
      margin-top:7px;
      color:#ffb8d0 !important;
      font-size:.72rem !important;
      font-weight:850;
    }

    .adm360-r13-button {
      width:100%;
      min-height:47px;
      margin-top:12px;
      border:1px solid rgba(255,92,143,.70);
      border-radius:12px;
      background:linear-gradient(
        135deg,
        #d83d78,
        #9d3bd1
      );
      color:#fff;
      font-weight:950;
      cursor:pointer;
    }

    .adm360-r13-button:disabled {
      opacity:.40;
      cursor:not-allowed;
    }

    .adm360-r13-result {
      padding:15px;
      border-radius:13px;
      border:1px solid rgba(71,220,154,.32);
      background:rgba(71,220,154,.07);
      color:#c7f8df;
      line-height:1.55;
    }

    .adm360-r13-result strong {
      color:#fff;
    }

    .adm360-r13-delta {
      display:flex;
      flex-wrap:wrap;
      gap:7px;
      margin-top:10px;
    }

    .adm360-r13-delta span {
      padding:6px 9px;
      border-radius:999px;
      background:rgba(255,255,255,.07);
      font-size:.75rem;
    }

    .adm360-r13-note {
      padding:11px;
      border-radius:11px;
      background:rgba(255,92,143,.06);
      border:1px solid rgba(255,92,143,.18);
      color:#ffd4e2;
      font-size:.78rem;
      line-height:1.5;
    }

    #adm360R13Toast {
      position:fixed;
      left:50%;
      bottom:28px;
      transform:translateX(-50%);
      z-index:2147483000;
      display:none;
      padding:13px 17px;
      border-radius:13px;
      background:rgba(5,17,38,.98);
      color:#fff;
      border:1px solid rgba(255,255,255,.13);
      font-weight:850;
    }

    #adm360R13Toast.show {
      display:block;
    }

    @media(max-width:700px) {
      .adm360-r13-kpis {
        grid-template-columns:1fr;
      }
    }
  `;

  document.head.appendChild(style);
}


/* =========================================================
   RESULTADOS VISUAIS
========================================================= */

function resultDeltas(result) {
  const parts = [];

  if (result.caixa) {
    parts.push(
      `<span>Caixa: ${
        result.caixa > 0 ? "+" : "-"
      }ADM$ ${money(
        Math.abs(result.caixa)
      )}</span>`
    );
  }

  if (result.clientes) {
    parts.push(
      `<span>Clientes: ${signed(
        result.clientes
      )}</span>`
    );
  }

  if (result.reputacao) {
    parts.push(
      `<span>Reputação: ${signed(
        result.reputacao
      )}</span>`
    );
  }

  if (result.equipe) {
    parts.push(
      `<span>Equipe: ${signed(
        result.equipe
      )}</span>`
    );
  }

  if (result.social) {
    parts.push(
      `<span>Impacto Social: ${signed(
        result.social
      )}</span>`
    );
  }

  if (result.xp) {
    parts.push(
      `<span>XP: ${signed(
        result.xp
      )}</span>`
    );
  }

  return parts.join("");
}


/* =========================================================
   CONFIRMAR DECISÃO
========================================================= */

async function confirmAction() {
  if (!selectedAction) return;

  const option =
    ACTIONS.find(
      item =>
        item.id === selectedAction
    );

  if (!option) return;

  const ok =
    window.confirm(
      `CONFIRMAR AÇÃO SOCIAL?\n\n${option.title}\n\n` +
      "Depois de confirmada, a decisão será registrada para a R13."
    );

  if (!ok) return;

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
    Number(latest.round || 0) !== 13
  ) {
    toast(
      "A Arena não está mais na Rodada 13."
    );
    return;
  }

  if (
    latest.status === "Pausado"
  ) {
    toast("A Arena está pausada.");
    return;
  }

  const visible =
    getVisibleCompany(latest);

  if (!visible) {
    toast(
      "Empresa não identificada."
    );
    return;
  }

  const companyId =
    visible.id;

  const company =
    visible.company;

  if (
    company?.round13?.decision
  ) {
    toast(
      "A decisão da R13 já foi registrada."
    );
    return;
  }

  const originalSituation =
    companySituation(company);

  const originalTip =
    strategicTip(company);

  const result =
    calculateResult(
      company,
      selectedAction
    );

  const before = {
    caixa:
      Number(company.caixa || 0),

    clientes:
      Number(company.clientes || 0),

    reputacao:
      Number(company.reputacao || 0),

    equipe:
      Number(company.equipe || 0),

    social:
      Number(
        company.responsabilidadeSocial ||
        company.social ||
        0
      ),

    xp:
      Number(company.xp || 0)
  };


  /* NÃO PERMITE CAIXA NEGATIVO */

  if (
    Number(company.caixa || 0) +
      Number(result.caixa || 0) <
    0
  ) {
    toast(
      "O caixa atual não permite realizar essa ação. Escolha uma alternativa compatível com a situação da empresa."
    );
    return;
  }


  company.caixa =
    clamp(
      Number(company.caixa || 0) +
      Number(result.caixa || 0)
    );

  company.clientes =
    clamp(
      Number(company.clientes || 0) +
      Number(result.clientes || 0)
    );

  company.reputacao =
    clamp(
      Number(company.reputacao || 0) +
      Number(result.reputacao || 0),
      0,
      100
    );

  company.equipe =
    clamp(
      Number(company.equipe || 0) +
      Number(result.equipe || 0),
      0,
      100
    );

  const currentSocial =
    Number(
      company.responsabilidadeSocial ||
      company.social ||
      0
    );

  company.responsabilidadeSocial =
    clamp(
      currentSocial +
      Number(result.social || 0)
    );

  company.social =
    company.responsabilidadeSocial;

  company.xp =
    clamp(
      Number(company.xp || 0) +
      Number(result.xp || 0)
    );


  company.round13 = {
    decision: {
      action:
        selectedAction,

      title:
        option.title,

      situation:
        originalSituation,

      tipShown:
        originalTip,

      result:
        result.text,

      delta: {
        caixa:
          result.caixa,

        clientes:
          result.clientes,

        reputacao:
          result.reputacao,

        equipe:
          result.equipe,

        social:
          result.social,

        xp:
          result.xp
      },

      before,

      after: {
        caixa:
          Number(company.caixa || 0),

        clientes:
          Number(company.clientes || 0),

        reputacao:
          Number(company.reputacao || 0),

        equipe:
          Number(company.equipe || 0),

        social:
          Number(
            company.responsabilidadeSocial ||
            0
          ),

        xp:
          Number(company.xp || 0)
      },

      decidedAt:
        Date.now()
    }
  };


  company.managementDecisions =
    company.managementDecisions || {};

  company.managementDecisions[13] = {
    round: 13,

    roundName:
      "Empresa que Transforma",

    optionId:
      selectedAction,

    optionTitle:
      option.title,

    totalDelta: {
      caixa:
        result.caixa,

      clientes:
        result.clientes,

      reputacao:
        result.reputacao,

      equipe:
        result.equipe,

      social:
        result.social,

      xp:
        result.xp
    },

    result:
      result.text,

    decidedAt:
      Date.now()
  };


  await f.set(
    f.ref(
      f.db,
      `rooms/${roomCode}/companies/${companyId}`
    ),
    company
  );

  selectedAction = "";

  toast(
    "Ação social registrada com sucesso."
  );
}


/* =========================================================
   RENDER
========================================================= */

function render() {
  if (
    !IS_EMPRESA ||
    !roomData
  ) {
    return;
  }

  if (
    Number(roomData.round || 0) !==
    13
  ) {
    return;
  }

  const area =
    document.querySelector("#decisaoArea");

  if (!area) return;

  const visible =
    getVisibleCompany();

  if (!visible) return;

  const company =
    visible.company;

  const decision =
    company?.round13?.decision;


  if (decision) {
    area.innerHTML = `
      <div class="adm360-r13">

        <span class="adm360-r13-badge">
          R13 · EMPRESA QUE TRANSFORMA
        </span>

        <div class="adm360-r13-box">

          <h3>
            AÇÃO CONCLUÍDA
          </h3>

          <div class="adm360-r13-result">

            <strong>
              ${escapeHtml(
                decision.title
              )}
            </strong>

            <br><br>

            ${escapeHtml(
              decision.result
            )}

            <div class="adm360-r13-delta">
              ${resultDeltas(
                decision.delta || {}
              )}
            </div>

          </div>

        </div>

      </div>
    `;

    return;
  }


  const observations =
    observationItems(company);

  const tip =
    strategicTip(company);

  const social =
    Number(
      company.responsabilidadeSocial ||
      company.social ||
      0
    );


  area.innerHTML = `
    <div class="adm360-r13">

      <span class="adm360-r13-badge">
        R13 · RESPONSABILIDADE SOCIAL
      </span>


      <div class="adm360-r13-box">

        <h3>
          ${escapeHtml(
            SCENARIO.title
          )}
        </h3>

        <p>
          ${escapeHtml(
            SCENARIO.text
          )}
        </p>

        <strong style="
          display:block;
          margin-top:10px;
          color:#fff;
        ">
          ${escapeHtml(
            SCENARIO.challenge
          )}
        </strong>

      </div>


      <div class="adm360-r13-box">

        <h3>
          O QUE VOCÊ PRECISA OBSERVAR
        </h3>

        <div class="adm360-r13-kpis">

          <div class="adm360-r13-kpi">

            <small>
              CAIXA
            </small>

            <strong>
              ADM$ ${money(
                company.caixa
              )}
            </strong>

          </div>


          <div class="adm360-r13-kpi">

            <small>
              REPUTAÇÃO
            </small>

            <strong>
              ${Number(
                company.reputacao || 0
              )}
            </strong>

          </div>


          <div class="adm360-r13-kpi">

            <small>
              IMPACTO SOCIAL
            </small>

            <strong>
              ${social}
            </strong>

          </div>

        </div>


        <div class="adm360-r13-observe">

          ${observations
            .map(
              text =>
                `<div>${escapeHtml(
                  text
                )}</div>`
            )
            .join("")}

        </div>

      </div>


      <div class="adm360-r13-tip">

        <strong>
          DICA ESTRATÉGICA
        </strong>

        <span>
          ${escapeHtml(tip)}
        </span>

      </div>


      <div class="adm360-r13-note">
        Uma empresa socialmente responsável não é necessariamente aquela que gasta mais. O importante é gerar impacto de forma coerente com sua capacidade.
      </div>


      <div class="adm360-r13-box">

        <h3>
          QUAL AÇÃO SUA EMPRESA REALIZARÁ?
        </h3>

        <div class="adm360-r13-options">

          ${ACTIONS.map(
            option => `
              <div
                class="adm360-r13-option ${
                  selectedAction ===
                  option.id
                    ? "selected"
                    : ""
                }"
                data-r13-action="${
                  option.id
                }"
              >

                <strong>
                  ${escapeHtml(
                    option.title
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    option.description
                  )}
                </span>

                <span class="adm360-r13-impact">
                  ${escapeHtml(
                    option.impact
                  )}
                </span>

              </div>
            `
          ).join("")}

        </div>


        <button
          type="button"
          id="adm360R13Confirm"
          class="adm360-r13-button"
          ${
            selectedAction
              ? ""
              : "disabled"
          }
        >
          CONFIRMAR AÇÃO SOCIAL
        </button>

      </div>

    </div>
  `;


  area
    .querySelectorAll(
      "[data-r13-action]"
    )
    .forEach(
      card => {
        card.addEventListener(
          "click",
          () => {
            selectedAction =
              card.dataset
                .r13Action || "";

            render();
          }
        );
      }
    );


  area
    .querySelector(
      "#adm360R13Confirm"
    )
    ?.addEventListener(
      "click",
      confirmAction
    );
}


/* =========================================================
   MISSÃO
========================================================= */

function updateMission() {
  if (
    Number(roomData?.round || 0) !==
    13
  ) {
    return;
  }

  const mission =
    document.querySelector("#missaoTexto");

  if (!mission) return;

  mission.textContent =
    "Sua empresa foi convidada a gerar impacto positivo na comunidade. Observe sua realidade, leia a dica estratégica e escolha uma ação social responsável.";
}


/* =========================================================
   RENDERIZAÇÃO SEGURA
========================================================= */

function scheduleRender() {
  clearTimeout(renderTimer);

  renderTimer =
    setTimeout(
      () => {
        updateMission();
        render();
      },
      70
    );
}


function observePage() {
  const observer =
    new MutationObserver(
      () => {
        if (
          Number(
            roomData?.round || 0
          ) === 13
        ) {
          scheduleRender();
        }
      }
    );

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );
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

        if (!code) return;

        clearInterval(finder);

        roomCode = code;

        const f =
          await getFirebase();

        if (!f) return;

        f.onValue(
          f.ref(
            f.db,
            `rooms/${roomCode}`
          ),
          snapshot => {

            roomData =
              snapshot.val() || {};

            if (
              Number(
                roomData.round || 0
              ) === 13
            ) {
              scheduleRender();
            }
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
  if (!IS_EMPRESA) return;

  installStyle();
  

  await connectRoom();
}


start().catch(
  error => {
    console.error(
      "ADM Arena 360 — Rodada 13:",
      error
    );
  }
);
