import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360 — RODADA 14
   A GRANDE CRISE

   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   PADRÃO PEDAGÓGICO
   ---------------------------------------------------------
   CENÁRIO
   → O QUE VOCÊ PRECISA OBSERVAR
   → DICA ESTRATÉGICA AUTOMÁTICA
   → 3 DECISÕES
   → CONFIRMAÇÃO
   → CONSEQUÊNCIA EXPLICADA

   OBJETIVO
   ---------------------------------------------------------
   Ensinar o estudante a administrar uma situação de pressão
   utilizando informações simples:
   - caixa
   - clientes
   - reputação
   - equipe

   REGRAS
   ---------------------------------------------------------
   - Só funciona na Rodada 14.
   - Não avança rodada.
   - Não altera o status da Arena.
   - Não interfere nas Rodadas 1–13.
   - Uma decisão por empresa.
   - Não utiliza resultado aleatório.
   - A situação anterior da empresa influencia o resultado.
   - Empresas fragilizadas continuam podendo se recuperar.
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
    Math.min(
      max,
      Number(value || 0)
    )
  );
}

function signed(value) {
  const number =
    Number(value || 0);

  if (number > 0) {
    return `+${number}`;
  }

  return String(number);
}

function detectRoomCode() {
  const url =
    new URL(window.location.href);

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
    const code =
      normalizeCode(value);

    if (code) return code;
  }

  return "";
}

function getVisibleCompany(
  data = roomData
) {
  if (!data) return null;

  const visibleName =
    document.querySelector("#empresaNome")
      ?.textContent
      ?.trim() ||
    document.querySelector("#nomeEmpresa")
      ?.value
      ?.trim() ||
    "";

  const normalized =
    normalizeName(visibleName);

  if (!normalized) return null;

  const found =
    Object.entries(
      data.companies || {}
    ).find(
      ([, company]) =>
        normalizeName(
          company?.name
        ) === normalized
    );

  if (!found) return null;

  return {
    id: found[0],
    company: found[1]
  };
}

function toast(text) {
  let box =
    document.querySelector(
      "#adm360R14Toast"
    );

  if (!box) {
    box =
      document.createElement("div");

    box.id =
      "adm360R14Toast";

    document.body.appendChild(box);
  }

  box.textContent = text;

  box.classList.add("show");

  clearTimeout(box._timer);

  box._timer =
    setTimeout(
      () => {
        box.classList.remove("show");
      },
      3500
    );
}


/* =========================================================
   PERFIL ATUAL DA EMPRESA
========================================================= */

function companySituation(company) {
  const cash =
    Number(company?.caixa || 0);

  const clients =
    Number(company?.clientes || 0);

  const reputation =
    Number(company?.reputacao || 0);

  const team =
    Number(company?.equipe || 0);

  const social =
    Number(
      company?.responsabilidadeSocial ||
      company?.social ||
      0
    );

  if (
    company?.financialRestriction?.active
  ) {
    return "financialRestriction";
  }

  if (
    cash < 20000 &&
    clients < 45
  ) {
    return "critical";
  }

  if (cash < 22000) {
    return "lowCash";
  }

  if (clients < 45) {
    return "lowClients";
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
    social >= 15 &&
    reputation >= 65
  ) {
    return "communityTrust";
  }

  if (
    cash >= 70000 &&
    reputation >= 70 &&
    clients >= 55
  ) {
    return "strong";
  }

  return "balanced";
}


/* =========================================================
   DICAS ESTRATÉGICAS AUTOMÁTICAS
========================================================= */

function strategicTip(company) {
  const situation =
    companySituation(company);

  const tips = {
    financialRestriction:
      "Sua empresa já possui pressão financeira. Durante uma crise, preservar recursos pode ser importante, mas também é preciso evitar perder ainda mais clientes e confiança.",

    critical:
      "Caixa e clientes estão pressionados ao mesmo tempo. Procure uma decisão que reduza o risco imediato sem impedir a recuperação da empresa.",

    lowCash:
      "O caixa está baixo. Evite escolher uma reação que exija um investimento maior do que a empresa consegue sustentar.",

    lowClients:
      "Sua empresa já possui poucos clientes. Uma crise pode piorar isso. Pense em como preservar o relacionamento com o mercado.",

    lowReputation:
      "Quando a confiança já está fragilizada, decisões muito duras podem prejudicar ainda mais a imagem da empresa.",

    teamPressure:
      "A equipe já está sob pressão. Uma crise não pode ser enfrentada apenas exigindo mais das pessoas.",

    communityTrust:
      "Sua empresa construiu confiança e impacto social. Em uma crise, esse relacionamento com as pessoas pode ajudar na recuperação.",

    strong:
      "Sua empresa entra na crise em uma posição melhor. Isso permite reagir com mais equilíbrio e até investir para proteger mercado e reputação.",

    balanced:
      "Em uma crise, não observe apenas o caixa. Clientes, reputação e equipe também influenciam a capacidade de recuperação."
  };

  return (
    tips[situation] ||
    tips.balanced
  );
}


/* =========================================================
   O QUE OBSERVAR
========================================================= */

function observationItems(company) {
  const cash =
    Number(company?.caixa || 0);

  const clients =
    Number(company?.clientes || 0);

  const reputation =
    Number(company?.reputacao || 0);

  const team =
    Number(company?.equipe || 0);

  const items = [];

  if (cash < 25000) {
    items.push(
      "Seu caixa oferece pouca margem para enfrentar gastos inesperados."
    );
  } else {
    items.push(
      "Observe quanto do caixa pode ser usado sem comprometer as próximas rodadas."
    );
  }

  if (clients < 50) {
    items.push(
      "A base de clientes já está menor e precisa ser protegida."
    );
  } else {
    items.push(
      "Preservar os clientes atuais pode ser tão importante quanto conquistar novos."
    );
  }

  if (
    reputation < 55
  ) {
    items.push(
      "A reputação está vulnerável: cuidado com decisões que prejudiquem ainda mais a confiança."
    );
  } else if (
    team > 0 &&
    team < 55
  ) {
    items.push(
      "A equipe já sente pressão e precisa ser considerada na decisão."
    );
  } else {
    items.push(
      "A forma como a empresa reage à crise também será percebida por clientes e equipe."
    );
  }

  return items.slice(0, 3);
}


/* =========================================================
   CENÁRIO DA GRANDE CRISE
========================================================= */

const SCENARIO = {
  title:
    "ALERTA: A GRANDE CRISE CHEGOU",

  text:
    "Uma forte retração atingiu o mercado. Os custos aumentaram, os consumidores ficaram mais cautelosos e várias empresas começaram a perder vendas. " +
    "Sua empresa precisa reagir rapidamente, mas uma decisão precipitada pode agravar o problema.",

  challenge:
    "Qual estratégia ajudará sua empresa a atravessar a crise e chegar à próxima rodada com capacidade de recuperação?"
};


/* =========================================================
   DECISÕES DA R14
========================================================= */

const ACTIONS = [
  {
    id: "proteger",
    title:
      "Reduzir gastos e proteger o caixa",

    description:
      "A empresa corta despesas não essenciais e evita novos investimentos enquanto acompanha a crise.",

    focus:
      "Maior proteção financeira · menor capacidade de reação comercial"
  },

  {
    id: "clientes",
    title:
      "Proteger clientes e relacionamento",

    description:
      "A empresa mantém parte dos investimentos e concentra esforços em atendimento, fidelização e confiança.",

    focus:
      "Equilíbrio · clientes · reputação"
  },

  {
    id: "reagir",
    title:
      "Reagir e investir na recuperação",

    description:
      "A empresa utiliza parte do caixa para fortalecer vendas, comunicação e operação, tentando sair da crise mais rapidamente.",

    focus:
      "Maior investimento · maior oportunidade de recuperação"
  }
];


/* =========================================================
   CONSEQUÊNCIAS
========================================================= */

function calculateResult(
  company,
  actionId
) {
  const situation =
    companySituation(company);

  /* -------------------------------------------------------
     1. PROTEGER CAIXA
  ------------------------------------------------------- */

  if (actionId === "proteger") {
    let result = {
      caixa: 9000,
      clientes: -4,
      reputacao: -2,
      equipe: -3,
      inovacao: 0,
      xp: 7,

      text:
        "A empresa conseguiu preservar recursos e atravessou a fase mais crítica com maior segurança financeira, mas perdeu parte do ritmo comercial."
    };

    if (
      situation === "financialRestriction" ||
      situation === "critical" ||
      situation === "lowCash"
    ) {
      result.caixa = 11000;
      result.clientes = -2;
      result.reputacao = -1;
      result.equipe = -2;
      result.xp = 10;

      result.text =
        "A decisão foi compatível com uma empresa financeiramente pressionada. O caixa ganhou fôlego e as perdas comerciais foram controladas.";
    }

    if (
      situation === "strong"
    ) {
      result.caixa = 10000;
      result.clientes = -6;
      result.reputacao = -3;
      result.xp = 6;

      result.text =
        "A empresa preservou caixa, mas adotou uma postura muito defensiva apesar de possuir condições para reagir melhor ao mercado.";
    }

    return result;
  }


  /* -------------------------------------------------------
     2. PROTEGER CLIENTES
  ------------------------------------------------------- */

  if (actionId === "clientes") {
    let result = {
      caixa: -4000,
      clientes: 4,
      reputacao: 6,
      equipe: 2,
      inovacao: 1,
      xp: 11,

      text:
        "A empresa priorizou relacionamento e confiança. Mesmo em um mercado retraído, conseguiu preservar clientes e fortalecer sua reputação."
    };

    if (
      situation === "lowClients"
    ) {
      result.caixa = -3500;
      result.clientes = 7;
      result.reputacao = 7;
      result.xp = 13;

      result.text =
        "Como a empresa já sofria com poucos clientes, proteger o relacionamento foi especialmente importante e ajudou a recuperar parte do mercado.";
    }

    if (
      situation === "lowReputation"
    ) {
      result.clientes = 3;
      result.reputacao = 9;
      result.xp = 13;

      result.text =
        "A empresa aproveitou a crise para demonstrar compromisso com seus clientes e recuperar parte da confiança perdida.";
    }

    if (
      situation === "communityTrust"
    ) {
      result.caixa = -3000;
      result.clientes = 6;
      result.reputacao = 8;
      result.xp = 14;

      result.text =
        "A relação positiva construída com a comunidade ajudou a empresa a manter confiança e clientes durante a crise.";
    }

    if (
      situation === "financialRestriction"
    ) {
      result.caixa = -6000;
      result.clientes = 3;
      result.reputacao = 5;
      result.xp = 9;

      result.text =
        "A estratégia protegeu parte dos clientes, mas exigiu esforço financeiro de uma empresa que já estava pressionada.";
    }

    return result;
  }


  /* -------------------------------------------------------
     3. REAGIR E INVESTIR
  ------------------------------------------------------- */

  if (actionId === "reagir") {
    let result = {
      caixa: -11000,
      clientes: 8,
      reputacao: 4,
      equipe: -1,
      inovacao: 5,
      xp: 12,

      text:
        "A empresa decidiu reagir de forma ativa. O investimento trouxe recuperação comercial e aumentou sua capacidade competitiva."
    };

    if (
      situation === "strong"
    ) {
      result.caixa = -9000;
      result.clientes = 11;
      result.reputacao = 6;
      result.equipe = 1;
      result.inovacao = 7;
      result.xp = 15;

      result.text =
        "A empresa utilizou sua posição financeira para reagir com força e saiu da crise com vantagem competitiva."
    }

    if (
      situation === "lowClients"
    ) {
      result.caixa = -10000;
      result.clientes = 10;
      result.reputacao = 4;
      result.inovacao = 6;
      result.xp = 13;

      result.text =
        "O investimento ajudou a empresa a recuperar clientes em um momento no qual sua base de mercado já estava fragilizada."
    }

    if (
      situation === "critical" ||
      situation === "financialRestriction"
    ) {
      result.caixa = -14000;
      result.clientes = 4;
      result.reputacao = 2;
      result.equipe = -4;
      result.inovacao = 4;
      result.xp = 6;

      result.text =
        "A reação trouxe algum resultado comercial, mas exigiu recursos demais de uma empresa que já estava sob forte pressão."
    }

    if (
      situation === "teamPressure"
    ) {
      result.caixa = -11000;
      result.clientes = 6;
      result.reputacao = 3;
      result.equipe = -7;
      result.inovacao = 5;
      result.xp = 8;

      result.text =
        "A empresa conseguiu reagir ao mercado, mas colocou pressão excessiva sobre uma equipe que já estava desgastada."
    }

    return result;
  }


  return {
    caixa: 0,
    clientes: 0,
    reputacao: 0,
    equipe: 0,
    inovacao: 0,
    xp: 0,
    text: ""
  };
}


/* =========================================================
   ESTILO
========================================================= */

function installStyle() {
  if (
    document.querySelector(
      "#adm360R14Style"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "adm360R14Style";

  style.textContent = `
    .adm360-r14 {
      display:grid;
      gap:14px;
      margin-top:14px;
    }

    .adm360-r14-badge {
      display:inline-flex;
      width:fit-content;
      padding:6px 11px;
      border-radius:999px;
      border:1px solid rgba(255,77,77,.48);
      background:rgba(255,77,77,.11);
      color:#ffb7b7;
      font-size:.72rem;
      font-weight:950;
    }

    .adm360-r14-crisis {
      padding:16px;
      border-radius:15px;
      border:1px solid rgba(255,77,77,.30);
      background:
        linear-gradient(
          135deg,
          rgba(255,77,77,.09),
          rgba(255,255,255,.025)
        );
    }

    .adm360-r14-crisis h3 {
      margin:0 0 8px;
      color:#fff;
      font-size:1.04rem;
    }

    .adm360-r14-crisis p {
      margin:0;
      color:rgba(255,255,255,.76);
      line-height:1.55;
      font-size:.84rem;
    }

    .adm360-r14-box {
      padding:15px;
      border-radius:15px;
      border:1px solid rgba(255,255,255,.09);
      background:rgba(255,255,255,.035);
    }

    .adm360-r14-box h3 {
      margin:0 0 8px;
      color:#fff;
      font-size:1rem;
    }

    .adm360-r14-box p {
      color:rgba(255,255,255,.72);
      line-height:1.55;
      font-size:.84rem;
    }

    .adm360-r14-kpis {
      display:grid;
      grid-template-columns:
        repeat(4,1fr);
      gap:8px;
      margin-top:10px;
    }

    .adm360-r14-kpi {
      padding:10px;
      border-radius:11px;
      background:rgba(255,255,255,.04);
      text-align:center;
    }

    .adm360-r14-kpi small {
      display:block;
      color:rgba(255,255,255,.52);
      margin-bottom:4px;
    }

    .adm360-r14-kpi strong {
      color:#fff;
    }

    .adm360-r14-observe {
      display:grid;
      gap:7px;
      margin-top:10px;
    }

    .adm360-r14-observe div {
      padding:9px 11px;
      border-radius:10px;
      background:rgba(255,255,255,.04);
      color:rgba(255,255,255,.78);
      font-size:.80rem;
    }

    .adm360-r14-tip {
      padding:14px;
      border-radius:13px;
      border:1px solid rgba(255,202,66,.38);
      background:rgba(255,202,66,.08);
    }

    .adm360-r14-tip strong {
      display:block;
      color:#ffe294;
      margin-bottom:6px;
      font-size:.82rem;
    }

    .adm360-r14-tip span {
      color:#fff2c9;
      font-size:.84rem;
      line-height:1.5;
    }

    .adm360-r14-options {
      display:grid;
      gap:9px;
      margin-top:10px;
    }

    .adm360-r14-option {
      padding:13px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.025);
      cursor:pointer;
      transition:.16s ease;
    }

    .adm360-r14-option:hover {
      background:
        rgba(255,255,255,.05);
    }

    .adm360-r14-option.selected {
      border-color:#ff5959;
      background:
        rgba(255,89,89,.10);
    }

    .adm360-r14-option strong {
      display:block;
      color:#fff;
      margin-bottom:4px;
    }

    .adm360-r14-option span {
      display:block;
      color:rgba(255,255,255,.65);
      font-size:.79rem;
      line-height:1.45;
    }

    .adm360-r14-focus {
      margin-top:7px;
      color:#ffb9b9 !important;
      font-size:.72rem !important;
      font-weight:850;
    }

    .adm360-r14-button {
      width:100%;
      min-height:47px;
      margin-top:12px;
      border:1px solid rgba(255,89,89,.72);
      border-radius:12px;
      background:
        linear-gradient(
          135deg,
          #d62f45,
          #a72c83
        );
      color:#fff;
      font-weight:950;
      cursor:pointer;
    }

    .adm360-r14-button:disabled {
      opacity:.40;
      cursor:not-allowed;
    }

    .adm360-r14-result {
      padding:15px;
      border-radius:13px;
      border:1px solid rgba(71,220,154,.32);
      background:rgba(71,220,154,.07);
      color:#c7f8df;
      line-height:1.55;
    }

    .adm360-r14-result strong {
      color:#fff;
    }

    .adm360-r14-delta {
      display:flex;
      flex-wrap:wrap;
      gap:7px;
      margin-top:10px;
    }

    .adm360-r14-delta span {
      padding:6px 9px;
      border-radius:999px;
      background:rgba(255,255,255,.07);
      font-size:.75rem;
    }

    .adm360-r14-note {
      padding:11px;
      border-radius:11px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.025);
      color:rgba(255,255,255,.68);
      font-size:.78rem;
      line-height:1.5;
    }

    #adm360R14Toast {
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

    #adm360R14Toast.show {
      display:block;
    }

    @media(max-width:800px) {
      .adm360-r14-kpis {
        grid-template-columns:
          repeat(2,1fr);
      }
    }

    @media(max-width:520px) {
      .adm360-r14-kpis {
        grid-template-columns:1fr;
      }
    }
  `;

  document.head.appendChild(style);
}


/* =========================================================
   DELTAS VISUAIS
========================================================= */

function resultDeltas(result) {
  const parts = [];

  if (result.caixa) {
    parts.push(
      `<span>Caixa: ${
        result.caixa > 0
          ? "+"
          : "-"
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

  if (result.inovacao) {
    parts.push(
      `<span>Inovação: ${signed(
        result.inovacao
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
   CONFIRMAÇÃO DA DECISÃO
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
      `CONFIRMAR DECISÃO NA GRANDE CRISE?\n\n` +
      `${option.title}\n\n` +
      "Depois de confirmada, a decisão será registrada."
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
    Number(latest.round || 0) !==
      14
  ) {
    toast(
      "A Arena não está mais na Rodada 14."
    );
    return;
  }

  if (
    latest.status === "Pausado"
  ) {
    toast(
      "A Arena está pausada."
    );
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
    company?.round14?.decision
  ) {
    toast(
      "A decisão da R14 já foi registrada."
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
      Number(
        company.reputacao || 0
      ),

    equipe:
      Number(company.equipe || 0),

    inovacao:
      Number(
        company.inovacao || 0
      ),

    xp:
      Number(company.xp || 0)
  };


  /* -------------------------------------------------------
     PROTEÇÃO CONTRA CAIXA NEGATIVO

     Se a decisão ativa exigir mais caixa do que existe,
     não aplicamos a ação.
  ------------------------------------------------------- */

  if (
    Number(company.caixa || 0) +
      Number(result.caixa || 0) <
    0
  ) {
    toast(
      "O caixa da empresa não permite realizar essa estratégia. Escolha uma reação compatível com a situação atual."
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
      Number(
        company.clientes || 0
      ) +
      Number(
        result.clientes || 0
      )
    );

  company.reputacao =
    clamp(
      Number(
        company.reputacao || 0
      ) +
      Number(
        result.reputacao || 0
      ),
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

  company.inovacao =
    clamp(
      Number(
        company.inovacao || 0
      ) +
      Number(
        result.inovacao || 0
      )
    );

  company.xp =
    clamp(
      Number(company.xp || 0) +
      Number(result.xp || 0)
    );


  /* -------------------------------------------------------
     REGISTRO DA R14
  ------------------------------------------------------- */

  company.round14 = {
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

        inovacao:
          result.inovacao,

        xp:
          result.xp
      },

      before,

      after: {
        caixa:
          Number(company.caixa || 0),

        clientes:
          Number(
            company.clientes || 0
          ),

        reputacao:
          Number(
            company.reputacao || 0
          ),

        equipe:
          Number(company.equipe || 0),

        inovacao:
          Number(
            company.inovacao || 0
          ),

        xp:
          Number(company.xp || 0)
      },

      decidedAt:
        Date.now()
    }
  };


  /* -------------------------------------------------------
     MARCADOR PARA A R15

     A próxima rodada poderá utilizar a forma como a empresa
     enfrentou a crise para calcular a recuperação.
  ------------------------------------------------------- */

  company.crisisProfile = {
    round: 14,

    strategy:
      selectedAction,

    situationBefore:
      originalSituation,

    cashAfter:
      Number(company.caixa || 0),

    clientsAfter:
      Number(
        company.clientes || 0
      ),

    reputationAfter:
      Number(
        company.reputacao || 0
      ),

    teamAfter:
      Number(company.equipe || 0),

    recordedAt:
      Date.now()
  };


  /* -------------------------------------------------------
     HISTÓRICO GERENCIAL
  ------------------------------------------------------- */

  company.managementDecisions =
    company.managementDecisions || {};

  company.managementDecisions[14] = {
    round: 14,

    roundName:
      "A Grande Crise",

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

      inovacao:
        result.inovacao,

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
    "Decisão da Grande Crise registrada."
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
    14
  ) {
    return;
  }

  const area =
    document.querySelector(
      "#decisaoArea"
    );

  if (!area) return;

  const visible =
    getVisibleCompany();

  if (!visible) return;

  const company =
    visible.company;

  const decision =
    company?.round14?.decision;


  /* -------------------------------------------------------
     DECISÃO JÁ REALIZADA
  ------------------------------------------------------- */

  if (decision) {
    area.innerHTML = `
      <div class="adm360-r14">

        <span class="adm360-r14-badge">
          R14 · A GRANDE CRISE
        </span>

        <div class="adm360-r14-box">

          <h3>
            DECISÃO REGISTRADA
          </h3>

          <div class="adm360-r14-result">

            <strong>
              ${escapeHtml(
                decision.title
              )}
            </strong>

            <br><br>

            ${escapeHtml(
              decision.result
            )}

            <div class="adm360-r14-delta">
              ${resultDeltas(
                decision.delta || {}
              )}
            </div>

          </div>

        </div>

        <div class="adm360-r14-note">
          A forma como sua empresa atravessou a crise será considerada na próxima etapa da Arena.
        </div>

      </div>
    `;

    return;
  }


  const observations =
    observationItems(company);

  const tip =
    strategicTip(company);


  /* -------------------------------------------------------
     TELA DE DECISÃO
  ------------------------------------------------------- */

  area.innerHTML = `
    <div class="adm360-r14">

      <span class="adm360-r14-badge">
        R14 · A GRANDE CRISE
      </span>


      <div class="adm360-r14-crisis">

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
          margin-top:12px;
          color:#fff;
          line-height:1.5;
        ">
          ${escapeHtml(
            SCENARIO.challenge
          )}
        </strong>

      </div>


      <div class="adm360-r14-box">

        <h3>
          O QUE VOCÊ PRECISA OBSERVAR
        </h3>

        <div class="adm360-r14-kpis">

          <div class="adm360-r14-kpi">

            <small>
              CAIXA
            </small>

            <strong>
              ADM$ ${money(
                company.caixa
              )}
            </strong>

          </div>


          <div class="adm360-r14-kpi">

            <small>
              CLIENTES
            </small>

            <strong>
              ${Number(
                company.clientes || 0
              )}
            </strong>

          </div>


          <div class="adm360-r14-kpi">

            <small>
              REPUTAÇÃO
            </small>

            <strong>
              ${Number(
                company.reputacao || 0
              )}
            </strong>

          </div>


          <div class="adm360-r14-kpi">

            <small>
              EQUIPE
            </small>

            <strong>
              ${Number(
                company.equipe || 0
              )}
            </strong>

          </div>

        </div>


        <div class="adm360-r14-observe">

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


      <div class="adm360-r14-tip">

        <strong>
          DICA ESTRATÉGICA
        </strong>

        <span>
          ${escapeHtml(tip)}
        </span>

      </div>


      <div class="adm360-r14-box">

        <h3>
          COMO SUA EMPRESA VAI REAGIR?
        </h3>

        <div class="adm360-r14-options">

          ${ACTIONS.map(
            option => `
              <div
                class="adm360-r14-option ${
                  selectedAction ===
                  option.id
                    ? "selected"
                    : ""
                }"
                data-r14-action="${
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

                <span class="adm360-r14-focus">
                  ${escapeHtml(
                    option.focus
                  )}
                </span>

              </div>
            `
          ).join("")}

        </div>


        <button
          type="button"
          id="adm360R14Confirm"
          class="adm360-r14-button"
          ${
            selectedAction
              ? ""
              : "disabled"
          }
        >
          CONFIRMAR DECISÃO NA CRISE
        </button>

      </div>


      <div class="adm360-r14-note">
        Não existe uma única resposta correta. A melhor escolha depende da situação atual da sua empresa.
      </div>

    </div>
  `;


  area
    .querySelectorAll(
      "[data-r14-action]"
    )
    .forEach(
      card => {
        card.addEventListener(
          "click",
          () => {
            selectedAction =
              card.dataset
                .r14Action || "";

            render();
          }
        );
      }
    );


  area
    .querySelector(
      "#adm360R14Confirm"
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
    Number(
      roomData?.round || 0
    ) !== 14
  ) {
    return;
  }

  const mission =
    document.querySelector(
      "#missaoTexto"
    );

  if (!mission) return;

  mission.textContent =
    "Uma grande crise atingiu o mercado. Analise caixa, clientes, reputação e equipe, leia a dica estratégica e escolha como sua empresa enfrentará esse momento.";
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
          ) === 14
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
              ) === 14
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
      "ADM Arena 360 — Rodada 14:",
      error
    );
  }
);
