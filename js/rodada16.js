import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360 — RODADA 16
   CONSELHO FINAL
   DECISÃO FINAL DA EMPRESA

   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   PADRÃO PEDAGÓGICO
   ---------------------------------------------------------
   TRAJETÓRIA
   → O QUE VOCÊ PRECISA OBSERVAR
   → DICA ESTRATÉGICA AUTOMÁTICA
   → 3 DECISÕES FINAIS
   → CONFIRMAÇÃO
   → CONSEQUÊNCIA
   → RESULTADO GLOBAL DA EMPRESA

   PESOS DO RESULTADO FINAL
   ---------------------------------------------------------
   25% Financeiro
   20% Clientes / Mercado
   15% Reputação
   15% Pessoas
   10% Inovação
   10% Estratégia / XP
    5% Responsabilidade Social

   REGRAS
   ---------------------------------------------------------
   - Só funciona na Rodada 16.
   - Não avança rodada.
   - Não muda automaticamente o status da Arena.
   - Não interfere nas Rodadas 1–15.
   - Uma decisão final por empresa.
   - Sem resultado aleatório.
   - O campeão não é definido apenas pelo caixa.
   - Dívidas e restrições financeiras geram penalidades.
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
  const number = Number(value || 0);

  if (number > 0) {
    return `+${number}`;
  }

  return String(number);
}


function round1(value) {
  return Math.round(
    Number(value || 0) * 10
  ) / 10;
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
      "#adm360R16Toast"
    );

  if (!box) {
    box =
      document.createElement("div");

    box.id =
      "adm360R16Toast";

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
   PERFIL FINAL DA EMPRESA
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

  const innovation =
    Number(company?.inovacao || 0);

  const social =
    Number(
      company?.responsabilidadeSocial ||
      company?.social ||
      0
    );

  if (
    company?.financialRestriction?.active
  ) {
    return "financialPressure";
  }

  if (
    cash < 20000 &&
    clients < 45
  ) {
    return "recovery";
  }

  if (cash < 25000) {
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
    innovation >= 70
  ) {
    return "innovative";
  }

  if (
    social >= 20 &&
    reputation >= 65
  ) {
    return "socialStrength";
  }

  if (
    cash >= 70000 &&
    clients >= 60 &&
    reputation >= 70
  ) {
    return "strong";
  }

  return "balanced";
}


/* =========================================================
   DICA AUTOMÁTICA
========================================================= */

function strategicTip(company) {
  const situation =
    companySituation(company);

  const tips = {
    financialPressure:
      "Sua empresa chega ao Conselho Final com pressão financeira. Evite uma última decisão que aumente ainda mais o risco.",

    recovery:
      "Sua empresa passou por dificuldades, mas ainda pode terminar a Arena demonstrando recuperação, equilíbrio e capacidade de gestão.",

    lowCash:
      "O caixa continua limitado. Uma decisão final precisa proteger a sustentabilidade da empresa.",

    lowClients:
      "Sua empresa precisa fortalecer sua presença no mercado. Observe se a decisão final ajuda a recuperar relacionamento com clientes.",

    lowReputation:
      "A confiança ainda é um ponto de atenção. No encerramento, reputação vale tanto quanto crescimento.",

    teamPressure:
      "Sua equipe chega pressionada à fase final. Crescer sem cuidar das pessoas pode prejudicar a gestão global.",

    innovative:
      "A inovação é uma força da sua empresa. Pense em como transformá-la em resultado sem perder equilíbrio.",

    socialStrength:
      "Sua empresa construiu boa relação com a comunidade. Essa responsabilidade também faz parte de uma gestão completa.",

    strong:
      "Sua empresa chega forte à decisão final. O desafio agora é consolidar uma gestão equilibrada, e não apenas aumentar um único indicador.",

    balanced:
      "No Conselho Final, observe o conjunto da empresa: dinheiro, clientes, reputação, equipe, inovação e impacto social."
  };

  return (
    tips[situation] ||
    tips.balanced
  );
}


/* =========================================================
   TRAJETÓRIA
========================================================= */

function trajectoryMessage(company) {
  const crisis =
    String(
      company?.crisisProfile?.strategy ||
      ""
    );

  const recovery =
    String(
      company?.round15
        ?.recoveryDecision
        ?.action ||
      ""
    );

  const parts = [];

  if (crisis === "proteger") {
    parts.push(
      "Na Grande Crise, a empresa priorizou proteção financeira."
    );
  }

  if (crisis === "clientes") {
    parts.push(
      "Na Grande Crise, a empresa priorizou seus clientes."
    );
  }

  if (crisis === "reagir") {
    parts.push(
      "Na Grande Crise, a empresa reagiu de forma ativa."
    );
  }

  if (recovery === "reconstruir") {
    parts.push(
      "Na recuperação, escolheu fortalecer sua base."
    );
  }

  if (recovery === "crescer") {
    parts.push(
      "Na recuperação, escolheu crescer com equilíbrio."
    );
  }

  if (recovery === "expandir") {
    parts.push(
      "Na recuperação, acelerou a expansão."
    );
  }

  if (!parts.length) {
    return (
      "Sua empresa chega ao Conselho Final com os resultados acumulados ao longo da ADM Arena 360."
    );
  }

  return parts.join(" ");
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
      "O caixa ainda exige cuidado antes de qualquer novo investimento."
    );
  } else {
    items.push(
      "A empresa possui recursos para sustentar uma decisão final."
    );
  }

  if (
    clients < 50 ||
    reputation < 60
  ) {
    items.push(
      "Mercado e confiança ainda podem ser fortalecidos."
    );
  } else {
    items.push(
      "Clientes e reputação formam uma base importante para o futuro."
    );
  }

  if (
    team > 0 &&
    team < 55
  ) {
    items.push(
      "A equipe precisa ser protegida para que o crescimento seja sustentável."
    );
  } else {
    items.push(
      "Uma equipe equilibrada ajuda a empresa a manter seus resultados."
    );
  }

  return items.slice(0, 3);
}


/* =========================================================
   CENÁRIO FINAL
========================================================= */

const SCENARIO = {
  title:
    "CONSELHO FINAL — O FUTURO DA EMPRESA",

  text:
    "Depois de enfrentar vendas, crédito, mercado, pessoas, concorrência, responsabilidade social, crise e recuperação, chegou o momento da última decisão.",

  challenge:
    "Que direção sua empresa escolherá para encerrar a ADM Arena 360?"
};


/* =========================================================
   DECISÕES FINAIS
========================================================= */

const ACTIONS = [
  {
    id: "consolidar",

    title:
      "Consolidar resultados",

    description:
      "A empresa prioriza estabilidade, organização, equipe e proteção dos resultados conquistados.",

    focus:
      "Estabilidade · pessoas · reputação"
  },

  {
    id: "mercado",

    title:
      "Fortalecer presença no mercado",

    description:
      "A empresa realiza um último esforço comercial para ampliar clientes e reforçar sua presença.",

    focus:
      "Clientes · mercado · crescimento"
  },

  {
    id: "futuro",

    title:
      "Investir no futuro da empresa",

    description:
      "A empresa direciona recursos para inovação, reputação e responsabilidade, pensando na continuidade do negócio.",

    focus:
      "Inovação · futuro · gestão sustentável"
  }
];


/* =========================================================
   CONSEQUÊNCIAS DA DECISÃO FINAL
========================================================= */

function calculateFinalDecision(
  company,
  actionId
) {
  const situation =
    companySituation(company);


  /* CONSOLIDAR */

  if (actionId === "consolidar") {
    let result = {
      caixa: 7000,
      clientes: 1,
      reputacao: 5,
      equipe: 7,
      inovacao: 1,
      social: 1,
      xp: 10,

      text:
        "A empresa encerrou a Arena fortalecendo estabilidade, equipe e confiança."
    };

    if (
      situation === "recovery" ||
      situation === "lowCash" ||
      situation === "financialPressure"
    ) {
      result.caixa = 10000;
      result.reputacao = 6;
      result.equipe = 8;
      result.xp = 12;

      result.text =
        "A consolidação foi especialmente importante para uma empresa que ainda precisava recuperar equilíbrio.";
    }

    if (situation === "strong") {
      result.caixa = 8000;
      result.reputacao = 4;
      result.equipe = 5;
      result.xp = 9;

      result.text =
        "A empresa terminou de forma segura, preservando uma posição já bastante favorável.";
    }

    return result;
  }


  /* MERCADO */

  if (actionId === "mercado") {
    let result = {
      caixa: -7000,
      clientes: 9,
      reputacao: 5,
      equipe: -1,
      inovacao: 2,
      social: 0,
      xp: 12,

      text:
        "A empresa fez um último movimento comercial e ampliou sua presença no mercado."
    };

    if (situation === "lowClients") {
      result.caixa = -6000;
      result.clientes = 12;
      result.reputacao = 6;
      result.xp = 14;

      result.text =
        "A estratégia final ajudou a recuperar fortemente a base de clientes.";
    }

    if (situation === "strong") {
      result.caixa = -6500;
      result.clientes = 11;
      result.reputacao = 6;
      result.equipe = 0;
      result.xp = 14;

      result.text =
        "A empresa utilizou sua boa estrutura para ampliar ainda mais sua posição no mercado.";
    }

    if (
      situation === "financialPressure" ||
      situation === "lowCash"
    ) {
      result.caixa = -9000;
      result.clientes = 5;
      result.reputacao = 2;
      result.equipe = -3;
      result.xp = 7;

      result.text =
        "A empresa conquistou algum mercado, mas o esforço comercial pesou sobre uma situação financeira ainda delicada.";
    }

    return result;
  }


  /* FUTURO */

  if (actionId === "futuro") {
    let result = {
      caixa: -9000,
      clientes: 4,
      reputacao: 7,
      equipe: 3,
      inovacao: 10,
      social: 4,
      xp: 13,

      text:
        "A empresa encerrou a Arena investindo em inovação, confiança e capacidade de continuidade."
    };

    if (
      situation === "innovative"
    ) {
      result.caixa = -8000;
      result.clientes = 6;
      result.reputacao = 8;
      result.inovacao = 13;
      result.social = 5;
      result.xp = 15;

      result.text =
        "A empresa aproveitou sua força em inovação e consolidou uma visão de futuro."
    }

    if (
      situation === "socialStrength"
    ) {
      result.caixa = -8000;
      result.reputacao = 10;
      result.inovacao = 9;
      result.social = 8;
      result.xp = 15;

      result.text =
        "A empresa integrou inovação, reputação e responsabilidade social em sua estratégia final.";
    }

    if (
      situation === "financialPressure" ||
      situation === "lowCash"
    ) {
      result.caixa = -11000;
      result.clientes = 2;
      result.reputacao = 4;
      result.equipe = 1;
      result.inovacao = 7;
      result.social = 3;
      result.xp = 8;

      result.text =
        "A estratégia trouxe avanços, mas exigiu recursos importantes de uma empresa financeiramente pressionada.";
    }

    return result;
  }


  return {
    caixa: 0,
    clientes: 0,
    reputacao: 0,
    equipe: 0,
    inovacao: 0,
    social: 0,
    xp: 0,
    text: ""
  };
}


/* =========================================================
   DÍVIDAS / PENALIDADES
========================================================= */

function overdueDebtTotal(company) {
  return Object.values(
    company?.debts || {}
  ).reduce(
    (sum, debt) => {

      const status =
        String(
          debt?.status || ""
        );

      if (
        status === "overdue" ||
        (
          status === "open" &&
          Number(
            debt?.dueRound || 0
          ) <= 16
        )
      ) {
        return (
          sum +
          Number(
            debt?.totalDue || 0
          )
        );
      }

      return sum;
    },
    0
  );
}


/* =========================================================
   CÁLCULO DO RESULTADO GLOBAL
========================================================= */

function calculateFinalScore(company) {
  const cash =
    Number(company?.caixa || 0);

  const clients =
    Number(company?.clientes || 0);

  const reputation =
    Number(company?.reputacao || 0);

  const team =
    Number(company?.equipe || 0);

  const innovation =
    Number(company?.inovacao || 0);

  const xp =
    Number(company?.xp || 0);

  const social =
    Number(
      company?.responsabilidadeSocial ||
      company?.social ||
      0
    );


  /* -------------------------------------------------------
     CADA INDICADOR É CONVERTIDO PARA ESCALA 0–100
  ------------------------------------------------------- */

  const financeScore =
    clamp(
      cash / 1000,
      0,
      100
    );

  const marketScore =
    clamp(
      clients * 1.5,
      0,
      100
    );

  const reputationScore =
    clamp(
      reputation,
      0,
      100
    );

  const peopleScore =
    clamp(
      team,
      0,
      100
    );

  const innovationScore =
    clamp(
      innovation,
      0,
      100
    );

  const strategyScore =
    clamp(
      xp,
      0,
      100
    );

  const socialScore =
    clamp(
      social * 4,
      0,
      100
    );


  /* -------------------------------------------------------
     PESOS
  ------------------------------------------------------- */

  const weighted = {
    financeiro:
      financeScore * 0.25,

    mercado:
      marketScore * 0.20,

    reputacao:
      reputationScore * 0.15,

    pessoas:
      peopleScore * 0.15,

    inovacao:
      innovationScore * 0.10,

    estrategia:
      strategyScore * 0.10,

    social:
      socialScore * 0.05
  };


  let grossScore =
    Object.values(weighted)
      .reduce(
        (sum, value) =>
          sum + value,
        0
      );


  /* -------------------------------------------------------
     PENALIDADES
  ------------------------------------------------------- */

  let penalty = 0;

  const penaltyReasons = [];

  const overdue =
    overdueDebtTotal(company);

  if (overdue > 0) {
    penalty += 8;

    penaltyReasons.push(
      "Dívida vencida ou pendente: -8 pontos"
    );
  }

  if (
    company?.financialRestriction?.active
  ) {
    penalty += 5;

    penaltyReasons.push(
      "Restrição financeira ativa: -5 pontos"
    );
  }

  const finalAdjustment =
    Number(
      company?.finalFinancialAdjustment
        ?.amount ||
      0
    );

  if (finalAdjustment > 0) {
    const adjustmentPenalty =
      Math.min(
        5,
        finalAdjustment / 10000
      );

    penalty += adjustmentPenalty;

    penaltyReasons.push(
      `Acordo financeiro final: -${round1(
        adjustmentPenalty
      )} pontos`
    );
  }

  if (cash < 10000) {
    penalty += 3;

    penaltyReasons.push(
      "Caixa crítico no encerramento: -3 pontos"
    );
  }


  const finalScore =
    clamp(
      grossScore - penalty,
      0,
      100
    );


  return {
    indicators: {
      financeiro:
        round1(financeScore),

      mercado:
        round1(marketScore),

      reputacao:
        round1(reputationScore),

      pessoas:
        round1(peopleScore),

      inovacao:
        round1(innovationScore),

      estrategia:
        round1(strategyScore),

      social:
        round1(socialScore)
    },

    weighted: {
      financeiro:
        round1(weighted.financeiro),

      mercado:
        round1(weighted.mercado),

      reputacao:
        round1(weighted.reputacao),

      pessoas:
        round1(weighted.pessoas),

      inovacao:
        round1(weighted.inovacao),

      estrategia:
        round1(weighted.estrategia),

      social:
        round1(weighted.social)
    },

    grossScore:
      round1(grossScore),

    penalty:
      round1(penalty),

    penaltyReasons,

    finalScore:
      round1(finalScore)
  };
}


/* =========================================================
   CLASSIFICAÇÃO GERENCIAL
========================================================= */

function managementLevel(score) {
  const value =
    Number(score || 0);

  if (value >= 85) {
    return {
      title:
        "GESTÃO DE EXCELÊNCIA",

      description:
        "A empresa demonstrou forte equilíbrio entre resultados, mercado, pessoas, estratégia e futuro."
    };
  }

  if (value >= 70) {
    return {
      title:
        "GESTÃO FORTE",

      description:
        "A empresa apresentou uma trajetória consistente e boa capacidade administrativa."
    };
  }

  if (value >= 55) {
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
      "A empresa enfrentou desafios relevantes e encerra a Arena com aprendizados importantes para futuras decisões."
  };
}


/* =========================================================
   ESTILO
========================================================= */

function installStyle() {
  if (
    document.querySelector(
      "#adm360R16Style"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "adm360R16Style";

  style.textContent = `
    .adm360-r16 {
      display:grid;
      gap:14px;
      margin-top:14px;
    }

    .adm360-r16-badge {
      display:inline-flex;
      width:fit-content;
      padding:6px 11px;
      border-radius:999px;
      border:1px solid rgba(255,203,67,.48);
      background:rgba(255,203,67,.10);
      color:#ffe69b;
      font-size:.72rem;
      font-weight:950;
    }

    .adm360-r16-final {
      padding:17px;
      border-radius:16px;
      border:1px solid rgba(255,203,67,.28);
      background:
        linear-gradient(
          135deg,
          rgba(255,203,67,.09),
          rgba(120,72,255,.07)
        );
    }

    .adm360-r16-final h3 {
      margin:0 0 8px;
      color:#fff;
      font-size:1.08rem;
    }

    .adm360-r16-final p {
      margin:0;
      color:rgba(255,255,255,.76);
      line-height:1.55;
      font-size:.84rem;
    }

    .adm360-r16-box {
      padding:15px;
      border-radius:15px;
      border:1px solid rgba(255,255,255,.09);
      background:rgba(255,255,255,.035);
    }

    .adm360-r16-box h3 {
      margin:0 0 8px;
      color:#fff;
      font-size:1rem;
    }

    .adm360-r16-history {
      padding:13px;
      border-radius:12px;
      border:1px solid rgba(126,178,255,.25);
      background:rgba(126,178,255,.06);
      color:#d9e8ff;
      font-size:.80rem;
      line-height:1.5;
    }

    .adm360-r16-kpis {
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:8px;
      margin-top:10px;
    }

    .adm360-r16-kpi {
      padding:10px;
      border-radius:11px;
      background:rgba(255,255,255,.04);
      text-align:center;
    }

    .adm360-r16-kpi small {
      display:block;
      color:rgba(255,255,255,.52);
      margin-bottom:4px;
    }

    .adm360-r16-kpi strong {
      color:#fff;
    }

    .adm360-r16-observe {
      display:grid;
      gap:7px;
      margin-top:10px;
    }

    .adm360-r16-observe div {
      padding:9px 11px;
      border-radius:10px;
      background:rgba(255,255,255,.04);
      color:rgba(255,255,255,.78);
      font-size:.80rem;
    }

    .adm360-r16-tip {
      padding:14px;
      border-radius:13px;
      border:1px solid rgba(255,202,66,.38);
      background:rgba(255,202,66,.08);
    }

    .adm360-r16-tip strong {
      display:block;
      color:#ffe294;
      margin-bottom:6px;
      font-size:.82rem;
    }

    .adm360-r16-tip span {
      color:#fff2c9;
      font-size:.84rem;
      line-height:1.5;
    }

    .adm360-r16-options {
      display:grid;
      gap:9px;
      margin-top:10px;
    }

    .adm360-r16-option {
      padding:13px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.025);
      cursor:pointer;
      transition:.16s ease;
    }

    .adm360-r16-option:hover {
      background:rgba(255,255,255,.05);
    }

    .adm360-r16-option.selected {
      border-color:#ffcb43;
      background:rgba(255,203,67,.09);
    }

    .adm360-r16-option strong {
      display:block;
      color:#fff;
      margin-bottom:4px;
    }

    .adm360-r16-option span {
      display:block;
      color:rgba(255,255,255,.65);
      font-size:.79rem;
      line-height:1.45;
    }

    .adm360-r16-focus {
      margin-top:7px;
      color:#ffe59a !important;
      font-size:.72rem !important;
      font-weight:850;
    }

    .adm360-r16-button {
      width:100%;
      min-height:48px;
      margin-top:12px;
      border:1px solid rgba(255,203,67,.70);
      border-radius:12px;
      background:
        linear-gradient(
          135deg,
          #d59d18,
          #963fc6
        );
      color:#fff;
      font-weight:950;
      cursor:pointer;
    }

    .adm360-r16-button:disabled {
      opacity:.40;
      cursor:not-allowed;
    }

    .adm360-r16-score {
      padding:18px;
      border-radius:16px;
      border:1px solid rgba(255,203,67,.32);
      background:
        linear-gradient(
          135deg,
          rgba(255,203,67,.10),
          rgba(71,220,154,.08)
        );
      text-align:center;
    }

    .adm360-r16-score small {
      display:block;
      color:rgba(255,255,255,.58);
      font-size:.72rem;
      font-weight:900;
      letter-spacing:.05em;
    }

    .adm360-r16-score strong {
      display:block;
      margin:8px 0 4px;
      font-size:2.2rem;
      color:#fff;
    }

    .adm360-r16-score em {
      color:#ffe49a;
      font-style:normal;
      font-weight:900;
    }

    .adm360-r16-grid {
      display:grid;
      grid-template-columns:
        repeat(2,1fr);
      gap:8px;
      margin-top:12px;
    }

    .adm360-r16-result-item {
      padding:10px;
      border-radius:10px;
      background:rgba(255,255,255,.04);
      text-align:left;
    }

    .adm360-r16-result-item small {
      display:block;
      color:rgba(255,255,255,.48);
      margin-bottom:4px;
    }

    .adm360-r16-result-item strong {
      color:#fff;
      font-size:.92rem;
    }

    .adm360-r16-penalty {
      margin-top:12px;
      padding:11px;
      border-radius:11px;
      background:rgba(255,96,96,.07);
      border:1px solid rgba(255,96,96,.20);
      color:#ffd0d0;
      font-size:.78rem;
      line-height:1.5;
      text-align:left;
    }

    .adm360-r16-result {
      padding:14px;
      border-radius:12px;
      border:1px solid rgba(71,220,154,.30);
      background:rgba(71,220,154,.07);
      color:#caf7e1;
      line-height:1.5;
    }

    .adm360-r16-delta {
      display:flex;
      flex-wrap:wrap;
      gap:7px;
      margin-top:10px;
    }

    .adm360-r16-delta span {
      padding:6px 9px;
      border-radius:999px;
      background:rgba(255,255,255,.07);
      font-size:.75rem;
    }

    #adm360R16Toast {
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

    #adm360R16Toast.show {
      display:block;
    }

    @media(max-width:800px) {
      .adm360-r16-kpis,
      .adm360-r16-grid {
        grid-template-columns:
          repeat(2,1fr);
      }
    }

    @media(max-width:520px) {
      .adm360-r16-kpis,
      .adm360-r16-grid {
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
   CONFIRMAÇÃO FINAL
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
      `CONFIRMAR DECISÃO FINAL?\n\n${option.title}\n\n` +
      "Depois dessa confirmação, a Pontuação Final de Gestão da empresa será calculada."
    );

  if (!ok) return;

  const f =
    await getFirebase();

  const snap =
    await f.get(
      f.ref(
        f.db,
        `rooms/${roomCode}`
      )
    );

  const latest =
    snap.val();

  if (
    !latest ||
    Number(latest.round || 0) !== 16
  ) {
    toast(
      "A Arena não está mais na Rodada 16."
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
    company?.round16?.decision
  ) {
    toast(
      "A decisão final já foi registrada."
    );
    return;
  }

  const originalSituation =
    companySituation(company);

  const originalTip =
    strategicTip(company);

  const result =
    calculateFinalDecision(
      company,
      selectedAction
    );

  if (
    Number(company.caixa || 0) +
      Number(result.caixa || 0) <
    0
  ) {
    toast(
      "O caixa atual não permite essa decisão. Escolha uma estratégia compatível com a situação da empresa."
    );
    return;
  }

  const before = {
    caixa:
      Number(company.caixa || 0),

    clientes:
      Number(company.clientes || 0),

    reputacao:
      Number(company.reputacao || 0),

    equipe:
      Number(company.equipe || 0),

    inovacao:
      Number(company.inovacao || 0),

    social:
      Number(
        company.responsabilidadeSocial ||
        company.social ||
        0
      ),

    xp:
      Number(company.xp || 0)
  };


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

  company.inovacao =
    clamp(
      Number(company.inovacao || 0) +
      Number(result.inovacao || 0)
    );

  const socialBefore =
    Number(
      company.responsabilidadeSocial ||
      company.social ||
      0
    );

  company.responsabilidadeSocial =
    clamp(
      socialBefore +
      Number(result.social || 0)
    );

  company.social =
    company.responsabilidadeSocial;

  company.xp =
    clamp(
      Number(company.xp || 0) +
      Number(result.xp || 0)
    );


  /* RESULTADO FINAL */

  const finalScoreData =
    calculateFinalScore(company);

  const level =
    managementLevel(
      finalScoreData.finalScore
    );


  company.round16 = {
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

        inovacao:
          Number(company.inovacao || 0),

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
    },

    finalScore:
      finalScoreData,

    managementLevel: {
      title:
        level.title,

      description:
        level.description
    }
  };


  company.managementDecisions =
    company.managementDecisions || {};

  company.managementDecisions[16] = {
    round: 16,

    roundName:
      "Conselho Final",

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


  /* CAMPOS DIRETOS PARA RANKING */

  company.finalScore =
    finalScoreData.finalScore;

  company.finalScoreDetails =
    finalScoreData;

  company.finalManagementLevel =
    level.title;

  company.arenaCompleted =
    true;

  company.completedRound =
    16;

  company.completedAt =
    Date.now();


  await f.set(
    f.ref(
      f.db,
      `rooms/${roomCode}/companies/${companyId}`
    ),
    company
  );

  selectedAction = "";

  toast(
    "Conselho Final concluído."
  );
}


/* =========================================================
   RESULTADO FINAL
========================================================= */

function renderFinalResult(
  area,
  company
) {
  const round16 =
    company?.round16;

  const decision =
    round16?.decision;

  const score =
    company?.finalScoreDetails ||
    round16?.finalScore;

  const level =
    company?.finalManagementLevel ||
    round16?.managementLevel?.title ||
    "GESTÃO CONCLUÍDA";

  const levelDescription =
    round16?.managementLevel
      ?.description ||
    "";

  const penalties =
    score?.penaltyReasons || [];

  area.innerHTML = `
    <div class="adm360-r16">

      <span class="adm360-r16-badge">
        R16 · CONSELHO FINAL CONCLUÍDO
      </span>


      <div class="adm360-r16-result">

        <strong>
          ${escapeHtml(
            decision?.title || ""
          )}
        </strong>

        <br><br>

        ${escapeHtml(
          decision?.result || ""
        )}

        <div class="adm360-r16-delta">
          ${resultDeltas(
            decision?.delta || {}
          )}
        </div>

      </div>


      <div class="adm360-r16-score">

        <small>
          PONTUAÇÃO FINAL DE GESTÃO
        </small>

        <strong>
          ${Number(
            score?.finalScore || 0
          ).toFixed(1)}
        </strong>

        <em>
          ${escapeHtml(level)}
        </em>

        <p style="
          color:rgba(255,255,255,.70);
          line-height:1.5;
          margin-top:10px;
          font-size:.82rem;
        ">
          ${escapeHtml(
            levelDescription
          )}
        </p>


        <div class="adm360-r16-grid">

          <div class="adm360-r16-result-item">
            <small>Financeiro · 25%</small>
            <strong>
              ${Number(
                score?.weighted
                  ?.financeiro || 0
              ).toFixed(1)}
            </strong>
          </div>

          <div class="adm360-r16-result-item">
            <small>Mercado · 20%</small>
            <strong>
              ${Number(
                score?.weighted
                  ?.mercado || 0
              ).toFixed(1)}
            </strong>
          </div>

          <div class="adm360-r16-result-item">
            <small>Reputação · 15%</small>
            <strong>
              ${Number(
                score?.weighted
                  ?.reputacao || 0
              ).toFixed(1)}
            </strong>
          </div>

          <div class="adm360-r16-result-item">
            <small>Pessoas · 15%</small>
            <strong>
              ${Number(
                score?.weighted
                  ?.pessoas || 0
              ).toFixed(1)}
            </strong>
          </div>

          <div class="adm360-r16-result-item">
            <small>Inovação · 10%</small>
            <strong>
              ${Number(
                score?.weighted
                  ?.inovacao || 0
              ).toFixed(1)}
            </strong>
          </div>

          <div class="adm360-r16-result-item">
            <small>Estratégia/XP · 10%</small>
            <strong>
              ${Number(
                score?.weighted
                  ?.estrategia || 0
              ).toFixed(1)}
            </strong>
          </div>

          <div class="adm360-r16-result-item">
            <small>Responsabilidade Social · 5%</small>
            <strong>
              ${Number(
                score?.weighted
                  ?.social || 0
              ).toFixed(1)}
            </strong>
          </div>

          <div class="adm360-r16-result-item">
            <small>Penalidades</small>
            <strong>
              -${Number(
                score?.penalty || 0
              ).toFixed(1)}
            </strong>
          </div>

        </div>


        ${
          penalties.length
            ? `
              <div class="adm360-r16-penalty">

                <strong>
                  AJUSTES DO RESULTADO
                </strong>

                <br><br>

                ${penalties
                  .map(
                    item =>
                      `• ${escapeHtml(item)}`
                  )
                  .join("<br>")}

              </div>
            `
            : ""
        }

      </div>


      <div class="adm360-r16-history">

        <strong>
          ADM ARENA 360 CONCLUÍDA
        </strong>

        <br><br>

        Ter muito dinheiro não garante o título.
        A empresa campeã será aquela que apresentar
        a melhor gestão global.

      </div>

    </div>
  `;
}


/* =========================================================
   RENDER DA DECISÃO
========================================================= */

function renderDecision(
  area,
  company
) {
  const observations =
    observationItems(company);

  const tip =
    strategicTip(company);

  const trajectory =
    trajectoryMessage(company);


  area.innerHTML = `
    <div class="adm360-r16">

      <span class="adm360-r16-badge">
        R16 · CONSELHO FINAL
      </span>


      <div class="adm360-r16-final">

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


      <div class="adm360-r16-history">

        <strong>
          SUA TRAJETÓRIA
        </strong>

        <br><br>

        ${escapeHtml(
          trajectory
        )}

      </div>


      <div class="adm360-r16-box">

        <h3>
          O QUE VOCÊ PRECISA OBSERVAR
        </h3>

        <div class="adm360-r16-kpis">

          <div class="adm360-r16-kpi">

            <small>
              CAIXA
            </small>

            <strong>
              ADM$ ${money(
                company.caixa
              )}
            </strong>

          </div>


          <div class="adm360-r16-kpi">

            <small>
              CLIENTES
            </small>

            <strong>
              ${Number(
                company.clientes || 0
              )}
            </strong>

          </div>


          <div class="adm360-r16-kpi">

            <small>
              REPUTAÇÃO
            </small>

            <strong>
              ${Number(
                company.reputacao || 0
              )}
            </strong>

          </div>


          <div class="adm360-r16-kpi">

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


        <div class="adm360-r16-observe">

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


      <div class="adm360-r16-tip">

        <strong>
          DICA ESTRATÉGICA
        </strong>

        <span>
          ${escapeHtml(tip)}
        </span>

      </div>


      <div class="adm360-r16-box">

        <h3>
          QUAL SERÁ A DECISÃO FINAL?
        </h3>

        <div class="adm360-r16-options">

          ${ACTIONS.map(
            option => `
              <div
                class="adm360-r16-option ${
                  selectedAction ===
                  option.id
                    ? "selected"
                    : ""
                }"
                data-r16-action="${
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

                <span class="adm360-r16-focus">
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
          id="adm360R16Confirm"
          class="adm360-r16-button"
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
      "[data-r16-action]"
    )
    .forEach(
      card => {
        card.addEventListener(
          "click",
          () => {

            selectedAction =
              card.dataset
                .r16Action || "";

            render();

          }
        );
      }
    );


  area
    .querySelector(
      "#adm360R16Confirm"
    )
    ?.addEventListener(
      "click",
      confirmAction
    );
}


/* =========================================================
   RENDER PRINCIPAL
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
    16
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


  if (
    company?.round16?.decision
  ) {
    renderFinalResult(
      area,
      company
    );

    return;
  }


  renderDecision(
    area,
    company
  );
}


/* =========================================================
   MISSÃO
========================================================= */

function updateMission() {
  if (
    Number(
      roomData?.round || 0
    ) !== 16
  ) {
    return;
  }

  const mission =
    document.querySelector(
      "#missaoTexto"
    );

  if (!mission) return;

  const visible =
    getVisibleCompany();

  if (
    visible?.company
      ?.round16
      ?.decision
  ) {
    mission.textContent =
      "ADM Arena 360 concluída. Confira a Pontuação Final de Gestão da sua empresa.";

    return;
  }

  mission.textContent =
    "Chegou o Conselho Final. Observe a situação da empresa, considere toda a trajetória e tome a última decisão estratégica da ADM Arena 360.";
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
          ) === 16
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
              ) === 16
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

  observePage();

  await connectRoom();
}


start().catch(
  error => {

    console.error(
      "ADM Arena 360 — Rodada 16:",
      error
    );

  }
);
