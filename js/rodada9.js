import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360 — RODADA 9
   BOLSA DE VALORES + VENCIMENTO DE DÍVIDAS

   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   REGRAS
   ---------------------------------------------------------
   - Só funciona na Rodada 9.
   - Não avança rodada.
   - Não altera status da Arena.
   - Não interfere nas Rodadas 1–8.
   - Dívidas vencidas precisam ser administradas antes
     da decisão de Bolsa.
   - Uma decisão financeira e uma decisão de Bolsa por empresa.
   - Resultados da Bolsa dependem do perfil da empresa.
========================================================= */

const PAGE = String(window.location.pathname || "")
  .split("/")
  .pop()
  .toLowerCase();

const IS_EMPRESA = PAGE === "empresa.html";

let roomCode = "";
let roomData = null;
let unsubscribeRoom = null;
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
  return Number(value || 0).toLocaleString("pt-BR");
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
    document.querySelector("#empresaNome")?.textContent?.trim() ||
    document.querySelector("#nomeEmpresa")?.value?.trim() ||
    "";

  const normalized = normalizeName(visibleName);

  if (!normalized) return null;

  const found = Object.entries(data.companies || {}).find(
    ([, company]) => normalizeName(company?.name) === normalized
  );

  if (!found) return null;

  return {
    id: found[0],
    company: found[1]
  };
}

function openDueDebts(company) {
  return Object.entries(company?.debts || {}).filter(
    ([, debt]) =>
      debt?.status === "open" &&
      Number(debt?.dueRound || 0) <= 9
  );
}

function totalDue(company) {
  return openDueDebts(company).reduce(
    (sum, [, debt]) => sum + Number(debt?.totalDue || 0),
    0
  );
}

function clamp(value, min = 0, max = Infinity) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function toast(text) {
  let box = document.querySelector("#adm360R9Toast");

  if (!box) {
    box = document.createElement("div");
    box.id = "adm360R9Toast";
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
   PERFIL PARA A BOLSA

   A Bolsa NÃO é puramente aleatória.
   O índice considera:
   - caixa
   - reputação
   - clientes
   - inovação
   - XP
   - situação da dívida
========================================================= */

function managementScore(company) {
  const cash = Number(company?.caixa || 0);
  const reputation = Number(company?.reputacao || 0);
  const clients = Number(company?.clientes || 0);
  const innovation = Number(company?.inovacao || 0);
  const xp = Number(company?.xp || 0);

  let score = 0;

  score += Math.min(25, cash / 4000);
  score += Math.min(25, reputation / 4);
  score += Math.min(20, clients / 3);
  score += Math.min(15, innovation / 5);
  score += Math.min(15, xp / 6);

  if (openDueDebts(company).length) {
    score -= 10;
  }

  return Math.round(clamp(score, 0, 100));
}

function profileLabel(score) {
  if (score >= 75) return "GESTÃO FORTE";
  if (score >= 55) return "GESTÃO ESTÁVEL";
  if (score >= 35) return "GESTÃO EM ATENÇÃO";
  return "GESTÃO SOB PRESSÃO";
}


/* =========================================================
   DECISÕES FINANCEIRAS
========================================================= */

const DEBT_ACTIONS = [
  {
    id: "pagar",
    title: "Quitar a obrigação",
    description:
      "A empresa paga integralmente as dívidas vencidas e preserva sua credibilidade financeira."
  },
  {
    id: "renegociar",
    title: "Renegociar a dívida",
    description:
      "A empresa ganha prazo, mas assume novo custo financeiro e perde parte de sua reputação."
  },
  {
    id: "inadimplencia",
    title: "Não pagar no vencimento",
    description:
      "A empresa preserva caixa imediatamente, mas entra em inadimplência e sofre consequências gerenciais."
  }
];

const MARKET_ACTIONS = [
  {
    id: "conservador",
    title: "Carteira Conservadora",
    cost: 5000,
    description:
      "Menor exposição. Prioriza proteção do capital e estabilidade."
  },
  {
    id: "equilibrado",
    title: "Carteira Equilibrada",
    cost: 10000,
    description:
      "Combina segurança e oportunidade de valorização."
  },
  {
    id: "agressivo",
    title: "Carteira Agressiva",
    cost: 15000,
    description:
      "Maior exposição ao mercado. Exige empresa financeiramente preparada."
  },
  {
    id: "nao_investir",
    title: "Não investir na Bolsa",
    cost: 0,
    description:
      "A empresa mantém liquidez e evita exposição ao mercado nesta rodada."
  }
];


/* =========================================================
   ESTILO
========================================================= */

function installStyle() {
  if (document.querySelector("#adm360R9Style")) return;

  const style = document.createElement("style");
  style.id = "adm360R9Style";

  style.textContent = `
    .adm360-r9 {
      display:grid;
      gap:14px;
      margin-top:14px;
    }

    .adm360-r9-badge {
      display:inline-flex;
      width:fit-content;
      padding:6px 11px;
      border-radius:999px;
      border:1px solid rgba(255,82,174,.42);
      background:rgba(255,82,174,.10);
      color:#ffabd8;
      font-size:.72rem;
      font-weight:950;
    }

    .adm360-r9-box {
      padding:15px;
      border-radius:15px;
      border:1px solid rgba(255,255,255,.09);
      background:rgba(255,255,255,.035);
    }

    .adm360-r9-box h3 {
      margin:0 0 8px;
      color:#fff;
      font-size:1rem;
    }

    .adm360-r9-box p {
      color:rgba(255,255,255,.68);
      line-height:1.5;
      font-size:.82rem;
    }

    .adm360-r9-kpis {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:8px;
      margin:10px 0;
    }

    .adm360-r9-kpi {
      padding:10px;
      border-radius:11px;
      background:rgba(255,255,255,.04);
      text-align:center;
    }

    .adm360-r9-kpi small {
      display:block;
      color:rgba(255,255,255,.50);
      margin-bottom:4px;
    }

    .adm360-r9-kpi strong {
      color:#fff;
    }

    .adm360-r9-options {
      display:grid;
      gap:9px;
      margin-top:10px;
    }

    .adm360-r9-option {
      padding:12px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.025);
      cursor:pointer;
    }

    .adm360-r9-option.selected {
      border-color:#ff52ae;
      background:rgba(255,82,174,.09);
    }

    .adm360-r9-option strong {
      display:block;
      color:#fff;
      margin-bottom:4px;
    }

    .adm360-r9-option span {
      color:rgba(255,255,255,.63);
      font-size:.78rem;
      line-height:1.4;
    }

    .adm360-r9-button {
      width:100%;
      min-height:46px;
      margin-top:11px;
      border:1px solid rgba(255,82,174,.65);
      border-radius:12px;
      background:linear-gradient(135deg,#da2c8b,#9f2fcb);
      color:#fff;
      font-weight:950;
      cursor:pointer;
    }

    .adm360-r9-button:disabled {
      opacity:.40;
      cursor:not-allowed;
    }

    .adm360-r9-success {
      padding:13px;
      border-radius:12px;
      border:1px solid rgba(71,220,154,.30);
      background:rgba(71,220,154,.07);
      color:#b8f5d8;
      line-height:1.5;
    }

    .adm360-r9-warning {
      padding:12px;
      border-radius:12px;
      border:1px solid rgba(255,198,62,.30);
      background:rgba(255,198,62,.06);
      color:#ffe7a4;
      line-height:1.45;
    }

    #adm360R9Toast {
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

    #adm360R9Toast.show {
      display:block;
    }

    @media(max-width:700px) {
      .adm360-r9-kpis {
        grid-template-columns:1fr;
      }
    }
  `;

  document.head.appendChild(style);
}


/* =========================================================
   PROCESSAMENTO DA DÍVIDA
========================================================= */

async function confirmDebtAction() {
  if (!selectedDebtAction) return;

  const ok = window.confirm(
    "CONFIRMAR DECISÃO FINANCEIRA DA R9?\n\n" +
    "Esta decisão será registrada no histórico da empresa."
  );

  if (!ok) return;

  const f = await getFirebase();
  const snap = await f.get(f.ref(f.db, `rooms/${roomCode}`));
  const latest = snap.val();

  if (!latest || Number(latest.round || 0) !== 9) {
    toast("A Arena não está mais na Rodada 9.");
    return;
  }

  if (latest.status === "Pausado") {
    toast("A Arena está pausada.");
    return;
  }

  const visible = getVisibleCompany(latest);
  if (!visible) {
    toast("Empresa não identificada.");
    return;
  }

  const company = visible.company;
  const companyId = visible.id;

  company.round9 = company.round9 || {};

  if (company.round9.debtDecision) {
    toast("A decisão financeira da R9 já foi registrada.");
    return;
  }

  const debts = openDueDebts(company);
  const due = debts.reduce(
    (sum, [, debt]) => sum + Number(debt?.totalDue || 0),
    0
  );

  const before = {
    caixa: Number(company.caixa || 0),
    reputacao: Number(company.reputacao || 0),
    xp: Number(company.xp || 0)
  };

  let resultText = "";

  if (!due) {
    company.round9.debtDecision = {
      action: "sem_divida",
      title: "Nenhuma obrigação vencida",
      amount: 0,
      decidedAt: Date.now()
    };

    await f.set(
      f.ref(f.db, `rooms/${roomCode}/companies/${companyId}`),
      company
    );

    toast("Situação financeira confirmada.");
    return;
  }

  if (selectedDebtAction === "pagar") {
    if (Number(company.caixa || 0) < due) {
      toast("Caixa insuficiente para quitar integralmente a dívida.");
      return;
    }

    company.caixa = Number(company.caixa || 0) - due;
    company.reputacao = clamp(Number(company.reputacao || 0) + 4, 0, 100);
    company.xp = Number(company.xp || 0) + 10;

    debts.forEach(([id, debt]) => {
      company.debts[id] = {
        ...debt,
        status: "paid",
        paidAt: Date.now(),
        paidRound: 9
      };
    });

    resultText = "Dívida quitada integralmente no vencimento.";
  }

  if (selectedDebtAction === "renegociar") {
    const newTotal = Math.round(due * 1.20);

    debts.forEach(([id, debt]) => {
      company.debts[id] = {
        ...debt,
        status: "renegotiated",
        renegotiatedAt: Date.now(),
        renegotiatedRound: 9
      };
    });

    const newDebtId = `reneg-r9-${Date.now()}`;

    company.debts[newDebtId] = {
      id: newDebtId,
      createdRound: 9,
      createdAt: Date.now(),
      type: "Renegociação de dívida",
      principal: due,
      totalDue: newTotal,
      dueRound: 12,
      status: "open"
    };

    company.reputacao = clamp(Number(company.reputacao || 0) - 4, 0, 100);
    company.xp = Number(company.xp || 0) + 5;

    resultText =
      `Dívida renegociada. Novo compromisso: ADM$ ${money(newTotal)} na R12.`;
  }

  if (selectedDebtAction === "inadimplencia") {
    debts.forEach(([id, debt]) => {
      company.debts[id] = {
        ...debt,
        status: "overdue",
        overdueAt: Date.now(),
        overdueRound: 9
      };
    });

    company.reputacao = clamp(Number(company.reputacao || 0) - 15, 0, 100);
    company.clientes = clamp(Number(company.clientes || 0) - 4);
    company.xp = clamp(Number(company.xp || 0) - 5);

    company.financialRestriction = {
      active: true,
      sinceRound: 9,
      amount: due
    };

    resultText =
      "Empresa entrou em inadimplência e recebeu restrição financeira.";
  }

  company.round9.debtDecision = {
    action: selectedDebtAction,
    amount: due,
    result: resultText,
    before,
    after: {
      caixa: Number(company.caixa || 0),
      reputacao: Number(company.reputacao || 0),
      xp: Number(company.xp || 0)
    },
    decidedAt: Date.now()
  };

  await f.set(
    f.ref(f.db, `rooms/${roomCode}/companies/${companyId}`),
    company
  );

  selectedDebtAction = "";
  toast("Decisão financeira registrada.");
}


/* =========================================================
   PROCESSAMENTO DA BOLSA
========================================================= */

function marketResult(company, actionId) {
  const score = managementScore(company);

  if (actionId === "nao_investir") {
    return {
      cashDelta: 0,
      reputationDelta: 0,
      xpDelta: 5,
      text: "A empresa preservou liquidez e não assumiu exposição ao mercado."
    };
  }

  if (actionId === "conservador") {
    return {
      cashDelta: score >= 45 ? 1500 : 500,
      reputationDelta: 1,
      xpDelta: 6,
      text:
        score >= 45
          ? "A carteira conservadora apresentou valorização estável."
          : "A carteira preservou grande parte do capital em cenário desfavorável."
    };
  }

  if (actionId === "equilibrado") {
    if (score >= 65) {
      return {
        cashDelta: 5000,
        reputationDelta: 2,
        xpDelta: 9,
        text: "A boa gestão permitiu aproveitar a valorização do mercado."
      };
    }

    if (score >= 45) {
      return {
        cashDelta: 1500,
        reputationDelta: 1,
        xpDelta: 7,
        text: "A carteira teve resultado positivo moderado."
      };
    }

    return {
      cashDelta: -2500,
      reputationDelta: -1,
      xpDelta: 5,
      text: "A fragilidade gerencial reduziu o desempenho da carteira."
    };
  }

  if (actionId === "agressivo") {
    if (score >= 75) {
      return {
        cashDelta: 10000,
        reputationDelta: 3,
        xpDelta: 12,
        text:
          "A empresa estava preparada para o risco e obteve forte valorização."
      };
    }

    if (score >= 55) {
      return {
        cashDelta: 2500,
        reputationDelta: 0,
        xpDelta: 8,
        text:
          "A operação apresentou ganho limitado diante da exposição assumida."
      };
    }

    return {
      cashDelta: -7000,
      reputationDelta: -3,
      xpDelta: 4,
      text:
        "A empresa assumiu risco acima de sua capacidade financeira e sofreu perda."
    };
  }

  return {
    cashDelta: 0,
    reputationDelta: 0,
    xpDelta: 0,
    text: ""
  };
}

async function confirmMarketAction() {
  if (!selectedMarketAction) return;

  const ok = window.confirm(
    "CONFIRMAR DECISÃO DE BOLSA?\n\n" +
    "O resultado será calculado considerando a situação gerencial da empresa."
  );

  if (!ok) return;

  const f = await getFirebase();
  const snap = await f.get(f.ref(f.db, `rooms/${roomCode}`));
  const latest = snap.val();

  if (!latest || Number(latest.round || 0) !== 9) {
    toast("A Arena não está mais na Rodada 9.");
    return;
  }

  if (latest.status === "Pausado") {
    toast("A Arena está pausada.");
    return;
  }

  const visible = getVisibleCompany(latest);

  if (!visible) {
    toast("Empresa não identificada.");
    return;
  }

  const company = visible.company;
  const companyId = visible.id;

  company.round9 = company.round9 || {};

  if (!company.round9.debtDecision) {
    toast("Resolva primeiro a situação financeira da empresa.");
    return;
  }

  if (company.round9.marketDecision) {
    toast("A decisão de Bolsa já foi registrada.");
    return;
  }

  const option = MARKET_ACTIONS.find(
    item => item.id === selectedMarketAction
  );

  if (!option) return;

  const cost = Number(option.cost || 0);

  if (Number(company.caixa || 0) < cost) {
    toast("Caixa insuficiente para essa estratégia.");
    return;
  }

  const score = managementScore(company);
  const result = marketResult(company, selectedMarketAction);

  const before = {
    caixa: Number(company.caixa || 0),
    reputacao: Number(company.reputacao || 0),
    xp: Number(company.xp || 0)
  };

  /*
    O investimento sai do caixa.
    Depois retorna o capital investido + resultado.
    Portanto o efeito líquido final é apenas cashDelta.
  */

  company.caixa =
    Number(company.caixa || 0) +
    Number(result.cashDelta || 0);

  company.reputacao = clamp(
    Number(company.reputacao || 0) +
      Number(result.reputationDelta || 0),
    0,
    100
  );

  company.xp = clamp(
    Number(company.xp || 0) +
      Number(result.xpDelta || 0)
  );

  company.round9.marketDecision = {
    action: option.id,
    title: option.title,
    exposureValue: cost,
    managementScore: score,
    profile: profileLabel(score),
    result: result.text,
    cashDelta: result.cashDelta,
    reputationDelta: result.reputationDelta,
    xpDelta: result.xpDelta,
    before,
    after: {
      caixa: Number(company.caixa || 0),
      reputacao: Number(company.reputacao || 0),
      xp: Number(company.xp || 0)
    },
    decidedAt: Date.now()
  };

  company.managementDecisions =
    company.managementDecisions || {};

  company.managementDecisions[9] = {
    round: 9,
    roundName: "Bolsa de Valores",
    optionId: option.id,
    optionTitle: option.title,
    managementScore: score,
    result: result.text,
    totalDelta: {
      caixa: result.cashDelta,
      reputacao: result.reputationDelta,
      xp: result.xpDelta
    },
    decidedAt: Date.now()
  };

  await f.set(
    f.ref(f.db, `rooms/${roomCode}/companies/${companyId}`),
    company
  );

  selectedMarketAction = "";
  toast("Decisão da Bolsa registrada.");
}


/* =========================================================
   RENDER
========================================================= */

function render() {
  if (!IS_EMPRESA || !roomData) return;

  if (Number(roomData.round || 0) !== 9) return;

  const area = document.querySelector("#decisaoArea");
  if (!area) return;

  const visible = getVisibleCompany();
  if (!visible) return;

  const company = visible.company;
  const debtDecision = company?.round9?.debtDecision;
  const marketDecision = company?.round9?.marketDecision;
  const due = totalDue(company);
  const score = managementScore(company);

  let debtHtml = "";

  if (debtDecision) {
    debtHtml = `
      <div class="adm360-r9-success">
        <strong>SITUAÇÃO FINANCEIRA RESOLVIDA</strong><br>
        ${escapeHtml(
          debtDecision.result ||
          "Nenhuma obrigação financeira pendente."
        )}
      </div>
    `;
  } else if (!due) {
    debtHtml = `
      <div class="adm360-r9-warning">
        Esta empresa não possui dívida vencendo na R9.
        Confirme a situação financeira para liberar a etapa da Bolsa.
      </div>

      <button
        type="button"
        class="adm360-r9-button"
        id="adm360R9NoDebt"
      >
        CONFIRMAR SITUAÇÃO FINANCEIRA
      </button>
    `;
  } else {
    debtHtml = `
      <div class="adm360-r9-warning">
        <strong>OBRIGAÇÃO VENCENDO AGORA:</strong>
        ADM$ ${money(due)}
      </div>

      <div class="adm360-r9-options">
        ${DEBT_ACTIONS.map(
          option => `
            <div
              class="adm360-r9-option ${
                selectedDebtAction === option.id ? "selected" : ""
              }"
              data-debt-action="${escapeHtml(option.id)}"
            >
              <strong>${escapeHtml(option.title)}</strong>
              <span>${escapeHtml(option.description)}</span>
            </div>
          `
        ).join("")}
      </div>

      <button
        type="button"
        id="adm360R9DebtConfirm"
        class="adm360-r9-button"
        ${selectedDebtAction ? "" : "disabled"}
      >
        CONFIRMAR DECISÃO FINANCEIRA
      </button>
    `;
  }

  let marketHtml = "";

  if (!debtDecision) {
    marketHtml = `
      <div class="adm360-r9-warning">
        A Bolsa será liberada depois que a empresa resolver sua situação financeira.
      </div>
    `;
  } else if (marketDecision) {
    marketHtml = `
      <div class="adm360-r9-success">
        <strong>DECISÃO DE BOLSA REGISTRADA</strong><br>
        ${escapeHtml(marketDecision.title)}<br><br>
        ${escapeHtml(marketDecision.result)}
      </div>
    `;
  } else {
    marketHtml = `
      <div class="adm360-r9-kpis">
        <div class="adm360-r9-kpi">
          <small>ÍNDICE GERENCIAL</small>
          <strong>${score}/100</strong>
        </div>

        <div class="adm360-r9-kpi">
          <small>PERFIL</small>
          <strong>${escapeHtml(profileLabel(score))}</strong>
        </div>

        <div class="adm360-r9-kpi">
          <small>CAIXA ATUAL</small>
          <strong>ADM$ ${money(company.caixa)}</strong>
        </div>
      </div>

      <p>
        O resultado não depende apenas da escolha da carteira.
        A condição gerencial construída pela empresa nas rodadas anteriores
        também influencia o desempenho.
      </p>

      <div class="adm360-r9-options">
        ${MARKET_ACTIONS.map(
          option => `
            <div
              class="adm360-r9-option ${
                selectedMarketAction === option.id ? "selected" : ""
              }"
              data-market-action="${escapeHtml(option.id)}"
            >
              <strong>${escapeHtml(option.title)}</strong>
              <span>
                ${escapeHtml(option.description)}
                ${
                  option.cost
                    ? ` Exposição: ADM$ ${money(option.cost)}.`
                    : ""
                }
              </span>
            </div>
          `
        ).join("")}
      </div>

      <button
        type="button"
        id="adm360R9MarketConfirm"
        class="adm360-r9-button"
        ${selectedMarketAction ? "" : "disabled"}
      >
        CONFIRMAR ESTRATÉGIA DE INVESTIMENTO
      </button>
    `;
  }

  area.innerHTML = `
    <div class="adm360-r9">

      <span class="adm360-r9-badge">
        R9 · MERCADO FINANCEIRO
      </span>

      <div class="adm360-r9-box">
        <h3>1. VENCIMENTO DAS OBRIGAÇÕES</h3>

        <p>
          Chegou o momento de enfrentar as consequências das decisões
          financeiras anteriores. Crédito ajudou a empresa a crescer,
          mas agora precisa ser administrado.
        </p>

        ${debtHtml}
      </div>

      <div class="adm360-r9-box">
        <h3>2. BOLSA DE VALORES</h3>

        <p>
          Depois de organizar suas obrigações, a empresa poderá decidir
          quanto risco deseja assumir no mercado financeiro.
        </p>

        ${marketHtml}
      </div>

    </div>
  `;

  area.querySelectorAll("[data-debt-action]").forEach(card => {
    card.addEventListener("click", () => {
      selectedDebtAction = card.dataset.debtAction || "";
      render();
    });
  });

  area.querySelectorAll("[data-market-action]").forEach(card => {
    card.addEventListener("click", () => {
      selectedMarketAction = card.dataset.marketAction || "";
      render();
    });
  });

  area
    .querySelector("#adm360R9DebtConfirm")
    ?.addEventListener("click", confirmDebtAction);

  area
    .querySelector("#adm360R9MarketConfirm")
    ?.addEventListener("click", confirmMarketAction);

  area
    .querySelector("#adm360R9NoDebt")
    ?.addEventListener("click", async () => {
      selectedDebtAction = "sem_divida";
      await confirmDebtAction();
    });
}


/* =========================================================
   MISSÃO
========================================================= */

function updateMission() {
  if (Number(roomData?.round || 0) !== 9) return;

  const mission = document.querySelector("#missaoTexto");

  if (mission) {
    mission.textContent =
      "O mercado financeiro entrou na Arena. Antes de investir, a empresa " +
      "precisa administrar as obrigações assumidas anteriormente e avaliar " +
      "quanto risco sua situação gerencial realmente permite assumir.";
  }
}


/* =========================================================
   OBSERVAÇÃO
========================================================= */

function scheduleRender() {
  clearTimeout(renderTimer);

  renderTimer = setTimeout(() => {
    updateMission();
    render();
  }, 70);
}

function observePage() {
  const observer = new MutationObserver(() => {
    if (Number(roomData?.round || 0) === 9) {
      scheduleRender();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}


/* =========================================================
   FIREBASE
========================================================= */

async function connectRoom() {
  const finder = setInterval(async () => {
    const code = detectRoomCode();

    if (!code) return;

    clearInterval(finder);
    roomCode = code;

    const f = await getFirebase();

    if (!f) return;

    unsubscribeRoom = f.onValue(
      f.ref(f.db, `rooms/${roomCode}`),
      snapshot => {
        roomData = snapshot.val() || {};

        if (Number(roomData.round || 0) === 9) {
          scheduleRender();
        }
      }
    );
  }, 400);
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

start().catch(error => {
  console.error(
    "ADM Arena 360 — Rodada 9:",
    error
  );
});
