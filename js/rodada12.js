import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360 — RODADA 12
   CONCORRÊNCIA E POSICIONAMENTO DE MERCADO

   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   ETAPAS
   ---------------------------------------------------------
   1. Se existir obrigação financeira vencendo na R12:
      → situação financeira
      → dica
      → decisão simples

   2. Concorrência:
      → cenário
      → o que observar
      → dica estratégica automática
      → 3 decisões
      → consequência explicada

   REGRAS
   ---------------------------------------------------------
   - Só funciona na Rodada 12.
   - Não avança rodada.
   - Não altera o status da Arena.
   - Não interfere nas Rodadas 1–11.
   - Uma decisão financeira, quando necessária.
   - Uma decisão de concorrência por empresa.
   - Dicas automáticas e contextualizadas.
   - Linguagem adequada aos estudantes.
   - Sem cálculos complexos expostos ao estudante.
   - Empresas em dificuldade continuam podendo se recuperar.
========================================================= */

const PAGE = String(window.location.pathname || "")
  .split("/")
  .pop()
  .toLowerCase();

const IS_EMPRESA = PAGE === "empresa.html";

let roomCode = "";
let roomData = null;

let selectedDebtAction = "";
let selectedMarketAction = "";

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
  const n = Number(value || 0);

  if (n > 0) return `+${n}`;
  return String(n);
}

function detectRoomCode() {
  const directCode =
    normalizeCode(
      window
        .__ADM360_ROUND_CONTEXT__
        ?.roomCode
    );

  if (directCode) {
    return directCode;
  }

  const url =
    new URL(
      window.location.href
    );

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

    if (code) {
      return code;
    }
  }

  return "";
}
function getVisibleCompany(
  data = roomData
) {
  if (!data) {
    return null;
  }

  const directId =
    window
      .__ADM360_ROUND_CONTEXT__
      ?.companyId;

  if (
    directId &&
    data.companies?.[directId]
  ) {
    return {
      id: directId,
      company:
        data.companies[directId]
    };
  }

  const visibleName =
    document.querySelector(
      "#empresaNome"
    )?.textContent?.trim() ||
    document.querySelector(
      "#nomeEmpresa"
    )?.value?.trim() ||
    "";

  const normalized =
    normalizeName(visibleName);

  if (!normalized) {
    return null;
  }

  const found =
    Object.entries(
      data.companies || {}
    ).find(
      ([, company]) =>
        normalizeName(
          company?.name
        ) === normalized
    );

  if (!found) {
    return null;
  }

  return {
    id: found[0],
    company: found[1]
  };
}

function toast(text) {
  let box =
    document.querySelector(
      "#adm360R12Toast"
    );

  if (!box) {
    box =
      document.createElement("div");

    box.id =
      "adm360R12Toast";

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
   DÍVIDAS COM VENCIMENTO ATÉ A R12
========================================================= */

function dueDebts(company) {
  return Object.entries(
    company?.debts || {}
  ).filter(
    ([, debt]) =>
      debt?.status === "open" &&
      Number(debt?.dueRound || 0) <= 12
  );
}

function totalDue(company) {
  return dueDebts(company)
    .reduce(
      (sum, [, debt]) =>
        sum +
        Number(debt?.totalDue || 0),
      0
    );
}

function needsDebtDecision(company) {
  return (
    totalDue(company) > 0 &&
    !company?.round12?.debtDecision
  );
}


/* =========================================================
   ETAPA FINANCEIRA DA R12
========================================================= */

const DEBT_ACTIONS = [
  {
    id: "pagar",
    title: "Quitar a obrigação",
    description:
      "A empresa paga o compromisso agora e encerra essa dívida."
  },

  {
    id: "parcelar",
    title: "Fazer um último acordo",
    description:
      "A empresa ganha novo prazo, mas o valor da dívida aumenta um pouco."
  },

  {
    id: "atrasar",
    title: "Não pagar agora",
    description:
      "A empresa mantém o dinheiro no caixa, mas perde credibilidade e entra em situação financeira de atenção."
  }
];

function debtTip(company) {
  const cash =
    Number(company?.caixa || 0);

  const due =
    totalDue(company);

  if (cash >= due * 1.5) {
    return (
      "Sua empresa possui caixa para enfrentar essa obrigação. " +
      "Pense no custo de continuar carregando uma dívida."
    );
  }

  if (cash >= due) {
    return (
      "É possível pagar, mas observe quanto dinheiro sobrará para manter a empresa funcionando."
    );
  }

  return (
    "Seu caixa não cobre toda a obrigação. " +
    "Compare o custo de ganhar prazo com os riscos de simplesmente deixar de pagar."
  );
}


/* =========================================================
   SITUAÇÃO DA EMPRESA PARA A CONCORRÊNCIA
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

  if (
    company?.financialRestriction?.active
  ) {
    return "financialPressure";
  }

  if (clients < 45) {
    return "lowClients";
  }

  if (reputation < 55) {
    return "lowReputation";
  }

  if (cash < 25000) {
    return "lowCash";
  }

  if (
    team > 0 &&
    team < 55
  ) {
    return "teamPressure";
  }

  if (innovation >= 65) {
    return "innovative";
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
   DICAS AUTOMÁTICAS DA CONCORRÊNCIA
========================================================= */

function strategicTip(company) {
  const situation =
    companySituation(company);

  const tips = {
    financialPressure:
      "Sua empresa está financeiramente pressionada. Uma estratégia agressiva pode trazer clientes, mas também pode exigir recursos que hoje fazem falta.",

    lowClients:
      "Sua empresa precisa atrair clientes. Pense no que faria alguém escolher sua empresa em vez de uma concorrente.",

    lowReputation:
      "Preço não é tudo. Quando a reputação está baixa, confiança e qualidade podem ser tão importantes quanto promoção.",

    lowCash:
      "Seu caixa está limitado. Procure uma forma de competir sem assumir um investimento difícil de sustentar.",

    teamPressure:
      "Uma estratégia comercial também precisa ser executada pela equipe. Evite prometer ao mercado mais do que sua empresa consegue entregar.",

    innovative:
      "Sua empresa já possui força em inovação. Pense se vale competir apenas por preço ou mostrar algo que a diferencie.",

    marketStrong:
      "Sua empresa está bem posicionada. O desafio agora é proteger essa vantagem sem gastar recursos desnecessariamente.",

    balanced:
      "Antes de competir apenas pelo menor preço, pense em três coisas: clientes, reputação e capacidade financeira."
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
  const items = [];

  const cash =
    Number(company?.caixa || 0);

  const clients =
    Number(company?.clientes || 0);

  const reputation =
    Number(company?.reputacao || 0);

  if (clients < 45) {
    items.push(
      "Sua empresa precisa recuperar clientes."
    );
  } else {
    items.push(
      "Observe se sua empresa consegue proteger os clientes que já conquistou."
    );
  }

  if (reputation < 55) {
    items.push(
      "Sua reputação precisa de atenção."
    );
  } else {
    items.push(
      "Sua marca possui uma imagem que deve ser preservada."
    );
  }

  if (cash < 25000) {
    items.push(
      "O caixa permite pouco espaço para grandes investimentos."
    );
  } else {
    items.push(
      "Existe algum espaço financeiro para reagir à concorrência."
    );
  }

  return items.slice(0, 3);
}


/* =========================================================
   CENÁRIO
========================================================= */

const SCENARIO = {
  title:
    "UM NOVO CONCORRENTE ENTROU NO MERCADO",

  text:
    "Uma nova empresa começou a disputar os mesmos clientes e lançou uma campanha forte para ganhar espaço. " +
    "Sua empresa precisa decidir como vai se posicionar.",

  challenge:
    "Como competir sem perder o equilíbrio da empresa?"
};


/* =========================================================
   DECISÕES DE MERCADO
========================================================= */

const MARKET_ACTIONS = [
  {
    id: "preco",
    title:
      "Competir com preço e promoção",

    description:
      "A empresa reduz margens por um período para tentar atrair mais clientes."
  },

  {
    id: "valor",
    title:
      "Fortalecer qualidade e atendimento",

    description:
      "A empresa evita uma guerra de preços e procura conquistar clientes pelo valor entregue."
  },

  {
    id: "diferenciar",
    title:
      "Criar uma ação de diferenciação",

    description:
      "A empresa investe em novidade, comunicação ou melhoria para se destacar da concorrência."
  }
];


/* =========================================================
   CONSEQUÊNCIAS DA CONCORRÊNCIA
========================================================= */

function calculateMarketResult(
  company,
  actionId
) {
  const situation =
    companySituation(company);

  if (actionId === "preco") {
    let result = {
      caixa: 6000,
      clientes: 7,
      reputacao: -1,
      equipe: -2,
      inovacao: 0,
      xp: 8,

      text:
        "A promoção trouxe novos clientes, mas reduziu o ganho por venda e aumentou a pressão sobre a operação."
    };

    if (situation === "lowClients") {
      result.clientes = 10;
      result.xp = 10;

      result.text =
        "A promoção ajudou a recuperar clientes rapidamente. Agora a empresa precisará trabalhar para manter esse público.";
    }

    if (
      situation === "lowReputation"
    ) {
      result.clientes = 4;
      result.reputacao = -3;
      result.xp = 6;

      result.text =
        "O preço chamou atenção, mas a reputação fragilizada limitou o resultado da campanha.";
    }

    if (
      situation === "financialPressure" ||
      situation === "lowCash"
    ) {
      result.caixa = 3000;
      result.clientes = 5;
      result.xp = 7;

      result.text =
        "A promoção trouxe clientes, mas uma empresa financeiramente pressionada consegue sustentar descontos por menos tempo.";
    }

    return result;
  }


  if (actionId === "valor") {
    let result = {
      caixa: 5000,
      clientes: 4,
      reputacao: 6,
      equipe: 3,
      inovacao: 1,
      xp: 10,

      text:
        "A empresa fortaleceu atendimento e qualidade. O crescimento foi mais moderado, mas a confiança do mercado aumentou."
    };

    if (
      situation === "lowReputation"
    ) {
      result.clientes = 5;
      result.reputacao = 9;
      result.xp = 12;

      result.text =
        "A estratégia ajudou diretamente a recuperar a confiança dos clientes e melhorou a imagem da empresa.";
    }

    if (
      situation === "teamPressure"
    ) {
      result.equipe = 6;
      result.reputacao = 5;

      result.text =
        "A estratégia organizou melhor o atendimento e também ajudou a equipe a trabalhar com mais segurança.";
    }

    return result;
  }


  if (actionId === "diferenciar") {
    let result = {
      caixa: -8000,
      clientes: 6,
      reputacao: 5,
      equipe: 0,
      inovacao: 8,
      xp: 11,

      text:
        "A diferenciação exigiu investimento, mas aumentou a inovação e ajudou a empresa a se destacar."
    };

    if (
      situation === "innovative"
    ) {
      result.caixa = -6000;
      result.clientes = 9;
      result.reputacao = 6;
      result.inovacao = 10;
      result.xp = 13;

      result.text =
        "A empresa aproveitou sua capacidade de inovação e conseguiu se destacar fortemente da concorrência.";
    }

    if (
      situation === "lowCash" ||
      situation === "financialPressure"
    ) {
      result.caixa = -11000;
      result.clientes = 4;
      result.reputacao = 3;
      result.inovacao = 6;
      result.xp = 7;

      result.text =
        "A ideia trouxe diferenciação, mas o investimento pesou bastante sobre uma empresa que já tinha pouco espaço financeiro.";
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
      "#adm360R12Style"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "adm360R12Style";

  style.textContent = `
    .adm360-r12 {
      display:grid;
      gap:14px;
      margin-top:14px;
    }

    .adm360-r12-badge {
      display:inline-flex;
      width:fit-content;
      padding:6px 11px;
      border-radius:999px;
      border:1px solid rgba(255,117,70,.45);
      background:rgba(255,117,70,.10);
      color:#ffc0aa;
      font-size:.72rem;
      font-weight:950;
    }

    .adm360-r12-box {
      padding:15px;
      border-radius:15px;
      border:1px solid rgba(255,255,255,.09);
      background:rgba(255,255,255,.035);
    }

    .adm360-r12-box h3 {
      margin:0 0 8px;
      color:#fff;
      font-size:1rem;
    }

    .adm360-r12-box p {
      color:rgba(255,255,255,.72);
      line-height:1.55;
      font-size:.84rem;
    }

    .adm360-r12-kpis {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:8px;
      margin-top:10px;
    }

    .adm360-r12-kpi {
      padding:10px;
      border-radius:11px;
      background:rgba(255,255,255,.04);
      text-align:center;
    }

    .adm360-r12-kpi small {
      display:block;
      color:rgba(255,255,255,.52);
      margin-bottom:4px;
    }

    .adm360-r12-kpi strong {
      color:#fff;
    }

    .adm360-r12-observe {
      display:grid;
      gap:7px;
      margin-top:10px;
    }

    .adm360-r12-observe div {
      padding:9px 11px;
      border-radius:10px;
      background:rgba(255,255,255,.04);
      color:rgba(255,255,255,.78);
      font-size:.80rem;
    }

    .adm360-r12-tip {
      padding:14px;
      border-radius:13px;
      border:1px solid rgba(255,202,66,.38);
      background:rgba(255,202,66,.08);
    }

    .adm360-r12-tip strong {
      display:block;
      color:#ffe294;
      margin-bottom:6px;
      font-size:.82rem;
    }

    .adm360-r12-tip span {
      color:#fff2c9;
      font-size:.84rem;
      line-height:1.5;
    }

    .adm360-r12-warning {
      padding:14px;
      border-radius:13px;
      border:1px solid rgba(255,100,100,.36);
      background:rgba(255,100,100,.07);
      color:#ffd0d0;
      line-height:1.5;
    }

    .adm360-r12-options {
      display:grid;
      gap:9px;
      margin-top:10px;
    }

    .adm360-r12-option {
      padding:13px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.025);
      cursor:pointer;
      transition:.16s ease;
    }

    .adm360-r12-option:hover {
      background:rgba(255,255,255,.05);
    }

    .adm360-r12-option.selected {
      border-color:#ff7546;
      background:rgba(255,117,70,.11);
    }

    .adm360-r12-option strong {
      display:block;
      color:#fff;
      margin-bottom:4px;
    }

    .adm360-r12-option span {
      color:rgba(255,255,255,.65);
      font-size:.79rem;
      line-height:1.45;
    }

    .adm360-r12-button {
      width:100%;
      min-height:47px;
      margin-top:12px;
      border:1px solid rgba(255,117,70,.70);
      border-radius:12px;
      background:linear-gradient(
        135deg,
        #e85635,
        #d73370
      );
      color:#fff;
      font-weight:950;
      cursor:pointer;
    }

    .adm360-r12-button:disabled {
      opacity:.40;
      cursor:not-allowed;
    }

    .adm360-r12-result {
      padding:15px;
      border-radius:13px;
      border:1px solid rgba(71,220,154,.32);
      background:rgba(71,220,154,.07);
      color:#c7f8df;
      line-height:1.55;
    }

    .adm360-r12-result strong {
      color:#fff;
    }

    .adm360-r12-delta {
      display:flex;
      flex-wrap:wrap;
      gap:7px;
      margin-top:10px;
    }

    .adm360-r12-delta span {
      padding:6px 9px;
      border-radius:999px;
      background:rgba(255,255,255,.07);
      font-size:.75rem;
    }

    #adm360R12Toast {
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

    #adm360R12Toast.show {
      display:block;
    }

    @media(max-width:700px) {
      .adm360-r12-kpis {
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
   DECISÃO FINANCEIRA
========================================================= */

async function confirmDebtAction() {
  if (!selectedDebtAction) return;

  const option =
    DEBT_ACTIONS.find(
      item =>
        item.id ===
        selectedDebtAction
    );

  if (!option) return;

  const ok =
    window.confirm(
      `CONFIRMAR DECISÃO FINANCEIRA?\n\n${option.title}\n\n` +
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
    Number(latest.round || 0) !== 12
  ) {
    toast(
      "A Arena não está mais na Rodada 12."
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

  company.round12 =
    company.round12 || {};

  if (
    company.round12.debtDecision
  ) {
    toast(
      "A decisão financeira da R12 já foi registrada."
    );
    return;
  }

  const debts =
    dueDebts(company);

  const due =
    totalDue(company);

  if (!due) {
    company.round12.debtDecision = {
      action: "sem_divida",
      title:
        "Nenhuma obrigação financeira vencida",
      amount: 0,
      decidedAt: Date.now()
    };

    await f.set(
      f.ref(
        f.db,
        `rooms/${roomCode}/companies/${companyId}`
      ),
      company
    );

    toast(
      "Situação financeira confirmada."
    );

    return;
  }

  const before = {
    caixa:
      Number(company.caixa || 0),

    reputacao:
      Number(company.reputacao || 0),

    clientes:
      Number(company.clientes || 0),

    xp:
      Number(company.xp || 0)
  };

  let resultText = "";


  /* QUITAR */

  if (
    selectedDebtAction === "pagar"
  ) {
    if (
      Number(company.caixa || 0) < due
    ) {
      toast(
        "O caixa não é suficiente para quitar toda a obrigação."
      );
      return;
    }

    company.caixa =
      Number(company.caixa || 0) -
      due;

    company.reputacao =
      clamp(
        Number(
          company.reputacao || 0
        ) + 5,
        0,
        100
      );

    company.xp =
      Number(company.xp || 0) +
      10;

    debts.forEach(
      ([id, debt]) => {
        company.debts[id] = {
          ...debt,
          status: "paid",
          paidAt: Date.now(),
          paidRound: 12
        };
      }
    );

    if (
      company.financialRestriction
    ) {
      company.financialRestriction = {
        ...company.financialRestriction,
        active: false,
        resolvedRound: 12,
        resolvedAt: Date.now()
      };
    }

    resultText =
      "A empresa quitou a obrigação, encerrou a dívida e fortaleceu sua credibilidade financeira.";
  }


  /* PARCELAR */

  if (
    selectedDebtAction === "parcelar"
  ) {
    const newTotal =
      Math.round(
        due * 1.15
      );

    debts.forEach(
      ([id, debt]) => {
        company.debts[id] = {
          ...debt,
          status: "renegotiated",
          renegotiatedAt:
            Date.now(),
          renegotiatedRound: 12
        };
      }
    );

    const newDebtId =
      `r12-${Date.now()}`;

    company.debts =
      company.debts || {};

    company.debts[newDebtId] = {
      id: newDebtId,
      source:
        "Renegociação R12",
      principal: due,
      totalDue: newTotal,
      createdRound: 12,
      dueRound: 15,
      status: "open",
      createdAt: Date.now()
    };

    company.reputacao =
      clamp(
        Number(
          company.reputacao || 0
        ) - 2,
        0,
        100
      );

    company.xp =
      Number(company.xp || 0) +
      5;

    resultText =
      "A empresa ganhou novo prazo, mas o valor da obrigação aumentou. O compromisso agora vence na R15.";
  }


  /* ATRASAR */

  if (
    selectedDebtAction === "atrasar"
  ) {
    debts.forEach(
      ([id, debt]) => {
        company.debts[id] = {
          ...debt,
          status: "overdue",
          overdueAt: Date.now(),
          overdueRound: 12
        };
      }
    );

    company.reputacao =
      clamp(
        Number(
          company.reputacao || 0
        ) - 10,
        0,
        100
      );

    company.clientes =
      clamp(
        Number(
          company.clientes || 0
        ) - 2
      );

    company.xp =
      clamp(
        Number(company.xp || 0) -
        3
      );

    company.financialRestriction = {
      active: true,
      sinceRound: 12,
      amount: due,
      reason:
        "Obrigação financeira não paga na R12"
    };

    resultText =
      "A empresa preservou caixa no curto prazo, mas perdeu credibilidade e passou a ter restrição financeira.";
  }


  company.round12.debtDecision = {
    action:
      selectedDebtAction,

    title:
      option.title,

    amount:
      due,

    result:
      resultText,

    before,

    after: {
      caixa:
        Number(company.caixa || 0),

      reputacao:
        Number(
          company.reputacao || 0
        ),

      clientes:
        Number(
          company.clientes || 0
        ),

      xp:
        Number(company.xp || 0)
    },

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

  selectedDebtAction = "";

  toast(
    "Decisão financeira registrada."
  );
}


/* =========================================================
   DECISÃO DE CONCORRÊNCIA
========================================================= */

async function confirmMarketAction() {
  if (!selectedMarketAction) return;

  const option =
    MARKET_ACTIONS.find(
      item =>
        item.id ===
        selectedMarketAction
    );

  if (!option) return;

  const ok =
    window.confirm(
      `CONFIRMAR ESTRATÉGIA?\n\n${option.title}\n\n` +
      "Depois de confirmada, a estratégia será registrada para a R12."
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
    Number(latest.round || 0) !== 12
  ) {
    toast(
      "A Arena não está mais na Rodada 12."
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

  company.round12 =
    company.round12 || {};


  /* GARANTE QUE O COMPROMISSO FINANCEIRO
     FOI TRATADO PRIMEIRO */

  if (
    needsDebtDecision(company)
  ) {
    toast(
      "Resolva primeiro o compromisso financeiro da R12."
    );
    return;
  }


  if (
    company.round12.marketDecision
  ) {
    toast(
      "A estratégia da R12 já foi registrada."
    );
    return;
  }


  const originalSituation =
    companySituation(company);

  const originalTip =
    strategicTip(company);

  const result =
    calculateMarketResult(
      company,
      selectedMarketAction
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

    inovacao:
      Number(company.inovacao || 0),

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


  company.round12.marketDecision = {
    action:
      selectedMarketAction,

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
    },

    decidedAt:
      Date.now()
  };


  company.managementDecisions =
    company.managementDecisions || {};

  company.managementDecisions[12] = {
    round: 12,

    roundName:
      "Concorrência e Posicionamento de Mercado",

    optionId:
      selectedMarketAction,

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

  selectedMarketAction = "";

  toast(
    "Estratégia registrada com sucesso."
  );
}


/* =========================================================
   TELA FINANCEIRA
========================================================= */

function renderDebtStage(
  area,
  company
) {
  const due =
    totalDue(company);

  area.innerHTML = `
    <div class="adm360-r12">

      <span class="adm360-r12-badge">
        R12 · COMPROMISSO FINANCEIRO
      </span>

      <div class="adm360-r12-warning">

        <strong>
          ATENÇÃO
        </strong>

        <br><br>

        Sua empresa possui uma obrigação de
        <strong>
          ADM$ ${money(due)}
        </strong>
        com vencimento nesta rodada.

      </div>


      <div class="adm360-r12-box">

        <h3>
          O QUE VOCÊ PRECISA OBSERVAR
        </h3>

        <div class="adm360-r12-kpis">

          <div class="adm360-r12-kpi">
            <small>CAIXA</small>
            <strong>
              ADM$ ${money(company.caixa)}
            </strong>
          </div>

          <div class="adm360-r12-kpi">
            <small>DÍVIDA</small>
            <strong>
              ADM$ ${money(due)}
            </strong>
          </div>

          <div class="adm360-r12-kpi">
            <small>REPUTAÇÃO</small>
            <strong>
              ${Number(
                company.reputacao || 0
              )}
            </strong>
          </div>

        </div>

      </div>


      <div class="adm360-r12-tip">

        <strong>
          DICA ESTRATÉGICA
        </strong>

        <span>
          ${escapeHtml(
            debtTip(company)
          )}
        </span>

      </div>


      <div class="adm360-r12-box">

        <h3>
          COMO A EMPRESA VAI AGIR?
        </h3>

        <div class="adm360-r12-options">

          ${DEBT_ACTIONS.map(
            option => `
              <div
                class="adm360-r12-option ${
                  selectedDebtAction ===
                  option.id
                    ? "selected"
                    : ""
                }"
                data-r12-debt="${
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

              </div>
            `
          ).join("")}

        </div>

        <button
          type="button"
          id="adm360R12DebtConfirm"
          class="adm360-r12-button"
          ${
            selectedDebtAction
              ? ""
              : "disabled"
          }
        >
          CONFIRMAR DECISÃO FINANCEIRA
        </button>

      </div>

    </div>
  `;


  area
    .querySelectorAll(
      "[data-r12-debt]"
    )
    .forEach(
      card => {
        card.addEventListener(
          "click",
          () => {
            selectedDebtAction =
              card.dataset.r12Debt ||
              "";

            render();
          }
        );
      }
    );


  area
    .querySelector(
      "#adm360R12DebtConfirm"
    )
    ?.addEventListener(
      "click",
      confirmDebtAction
    );
}


/* =========================================================
   TELA DE CONCORRÊNCIA
========================================================= */

function renderMarketStage(
  area,
  company
) {
  const decision =
    company?.round12
      ?.marketDecision;


  if (decision) {
    area.innerHTML = `
      <div class="adm360-r12">

        <span class="adm360-r12-badge">
       RODADA 12 DE 20 · CONCORRÊNCIA E POSICIONAMENTO
        </span>

        <div class="adm360-r12-box">

          <h3>
            DECISÃO CONCLUÍDA
          </h3>

          <div class="adm360-r12-result">

            <strong>
              ${escapeHtml(
                decision.title
              )}
            </strong>

            <br><br>

            ${escapeHtml(
              decision.result
            )}

            <div class="adm360-r12-delta">
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


  area.innerHTML = `
    <div class="adm360-r12">

      <span class="adm360-r12-badge">
       RODADA 12 DE 20 · CONCORRÊNCIA E POSICIONAMENTO
      </span>


      <div class="adm360-r12-box">

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


      <div class="adm360-r12-box">

        <h3>
          O QUE VOCÊ PRECISA OBSERVAR
        </h3>

        <div class="adm360-r12-kpis">

          <div class="adm360-r12-kpi">

            <small>
              CLIENTES
            </small>

            <strong>
              ${Number(
                company.clientes || 0
              )}
            </strong>

          </div>


          <div class="adm360-r12-kpi">

            <small>
              REPUTAÇÃO
            </small>

            <strong>
              ${Number(
                company.reputacao || 0
              )}
            </strong>

          </div>


          <div class="adm360-r12-kpi">

            <small>
              CAIXA
            </small>

            <strong>
              ADM$ ${money(
                company.caixa
              )}
            </strong>

          </div>

        </div>


        <div class="adm360-r12-observe">

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


      <div class="adm360-r12-tip">

        <strong>
          DICA ESTRATÉGICA
        </strong>

        <span>
          ${escapeHtml(tip)}
        </span>

      </div>


      <div class="adm360-r12-box">

        <h3>
          COMO A EMPRESA VAI COMPETIR?
        </h3>

        <div class="adm360-r12-options">

          ${MARKET_ACTIONS.map(
            option => `
              <div
                class="adm360-r12-option ${
                  selectedMarketAction ===
                  option.id
                    ? "selected"
                    : ""
                }"
                data-r12-market="${
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

              </div>
            `
          ).join("")}

        </div>


        <button
          type="button"
          id="adm360R12MarketConfirm"
          class="adm360-r12-button"
          ${
            selectedMarketAction
              ? ""
              : "disabled"
          }
        >
          CONFIRMAR ESTRATÉGIA
        </button>

      </div>

    </div>
  `;


  area
    .querySelectorAll(
      "[data-r12-market]"
    )
    .forEach(
      card => {
        card.addEventListener(
          "click",
          () => {
            selectedMarketAction =
              card.dataset
                .r12Market || "";

            render();
          }
        );
      }
    );


  area
    .querySelector(
      "#adm360R12MarketConfirm"
    )
    ?.addEventListener(
      "click",
      confirmMarketAction
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
    12
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
    needsDebtDecision(company)
  ) {
    renderDebtStage(
      area,
      company
    );

    return;
  }


  renderMarketStage(
    area,
    company
  );
}


/* =========================================================
   MISSÃO
========================================================= */

function updateMission() {
  if (
    Number(roomData?.round || 0) !==
    12
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
    visible &&
    needsDebtDecision(
      visible.company
    )
  ) {
    mission.textContent =
      "Antes de enfrentar a concorrência, sua empresa precisa administrar um compromisso financeiro que vence nesta rodada.";

    return;
  }

  mission.textContent =
    "Um novo concorrente entrou no mercado. Observe clientes, reputação e caixa, leia a dica estratégica e escolha como sua empresa vai se posicionar.";
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





/* =========================================================
   FIREBASE
========================================================= */

async function connectRoom() {
  const code =
    detectRoomCode();

  if (!code) {
    console.error(
      "ADM Arena 360 — R12: sala não identificada."
    );
    return;
  }

  roomCode = code;

  const f =
    await getFirebase();

  if (!f) {
    return;
  }

  const roomPath =
    f.ref(
      f.db,
      `rooms/${roomCode}`
    );

  try {
    const initialSnapshot =
      await f.get(roomPath);

    roomData =
      initialSnapshot.val() || {};

    if (
      Number(roomData.round || 0) === 12
    ) {
      scheduleRender();
    }
  } catch (error) {
    console.error(
      "ADM Arena 360 — R12: erro na leitura inicial:",
      error
    );
  }

  f.onValue(
    roomPath,
    snapshot => {
      roomData =
        snapshot.val() || {};

      if (
        Number(roomData.round || 0) === 12
      ) {
        scheduleRender();
      }
    }
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
      "ADM Arena 360 — Rodada 12:",
      error
    );
  }
);
