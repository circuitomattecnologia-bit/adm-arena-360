import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360 — RODADA 15
   RECUPERAÇÃO E EXPANSÃO

   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   ETAPAS
   ---------------------------------------------------------
   1. Se existir compromisso financeiro vencendo na R15:
      → observar caixa e dívida
      → dica automática
      → decisão financeira

   2. Recuperação e Expansão:
      → cenário
      → situação da empresa
      → dica estratégica automática
      → 3 decisões
      → confirmação
      → consequência explicada

   OBJETIVO PEDAGÓGICO
   ---------------------------------------------------------
   - Mostrar que uma empresa pode se recuperar.
   - Trabalhar equilíbrio entre crescimento e segurança.
   - Valorizar as consequências das decisões anteriores.
   - Preparar a empresa para a Rodada Final.

   REGRAS
   ---------------------------------------------------------
   - Só funciona na Rodada 15.
   - Não avança rodada.
   - Não altera status da Arena.
   - Não interfere nas Rodadas 1–14.
   - Sem resultados aleatórios.
   - Empresas fragilizadas podem se recuperar.
   - Empresas fortes também precisam administrar riscos.
========================================================= */

const PAGE = String(window.location.pathname || "")
  .split("/")
  .pop()
  .toLowerCase();

const IS_EMPRESA = PAGE === "empresa.html";

let roomCode = "";
let roomData = null;

let selectedDebtAction = "";
let selectedRecoveryAction = "";

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

  const found =
    Object.entries(
      data.companies || {}
    ).find(
      ([, company]) =>
        normalizeName(company?.name) ===
        normalized
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
      "#adm360R15Toast"
    );

  if (!box) {
    box = document.createElement("div");
    box.id = "adm360R15Toast";
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
   DÍVIDAS VENCENDO NA R15
========================================================= */

function dueDebts(company) {
  return Object.entries(
    company?.debts || {}
  ).filter(
    ([, debt]) =>
      debt?.status === "open" &&
      Number(debt?.dueRound || 0) <= 15
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
    !company?.round15?.debtDecision
  );
}


/* =========================================================
   AÇÕES FINANCEIRAS
========================================================= */

const DEBT_ACTIONS = [
  {
    id: "pagar",
    title: "Quitar a obrigação",
    description:
      "A empresa utiliza o caixa para encerrar a dívida e fortalecer sua credibilidade."
  },

  {
    id: "acordo_final",
    title: "Fazer um acordo final",
    description:
      "A empresa paga parte do compromisso agora e encerra o restante com custo adicional."
  },

  {
    id: "nao_pagar",
    title: "Não quitar a obrigação",
    description:
      "A empresa mantém o caixa, mas entra na fase final com forte restrição financeira."
  }
];

function debtTip(company) {
  const cash =
    Number(company?.caixa || 0);

  const due =
    totalDue(company);

  if (cash >= due * 1.4) {
    return (
      "Seu caixa permite pagar a obrigação e ainda manter recursos para a empresa. " +
      "Observe se continuar carregando uma dívida faz sentido nesta fase final."
    );
  }

  if (cash >= due) {
    return (
      "Sua empresa consegue quitar a dívida, mas o pagamento reduzirá bastante o caixa. " +
      "Pense também na necessidade de recuperação desta rodada."
    );
  }

  return (
    "Seu caixa não cobre toda a dívida. Compare o custo de um acordo com os riscos de entrar na fase final em situação de inadimplência."
  );
}


/* =========================================================
   PERFIL DE RECUPERAÇÃO
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

  if (
    cash < 20000 &&
    clients < 45
  ) {
    return "critical";
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
    innovation >= 65
  ) {
    return "innovative";
  }

  if (
    cash >= 70000 &&
    clients >= 55 &&
    reputation >= 70
  ) {
    return "strong";
  }

  return "balanced";
}


/* =========================================================
   EFEITO DA R14
========================================================= */

function crisisStrategy(company) {
  return String(
    company?.crisisProfile?.strategy ||
    company?.round14?.decision?.action ||
    ""
  );
}

function crisisMessage(company) {
  const strategy =
    crisisStrategy(company);

  if (strategy === "proteger") {
    return (
      "Na R14 sua empresa priorizou a proteção do caixa. " +
      "Agora precisa decidir como transformar essa segurança em recuperação."
    );
  }

  if (strategy === "clientes") {
    return (
      "Na R14 sua empresa protegeu o relacionamento com os clientes. " +
      "Essa confiança pode ajudar na recuperação."
    );
  }

  if (strategy === "reagir") {
    return (
      "Na R14 sua empresa reagiu de forma ativa à crise. " +
      "Agora precisa avaliar se continua acelerando ou consolida os resultados."
    );
  }

  return (
    "Sua empresa chega à fase de recuperação com os resultados acumulados das rodadas anteriores."
  );
}


/* =========================================================
   DICAS AUTOMÁTICAS
========================================================= */

function strategicTip(company) {
  const situation =
    companySituation(company);

  const tips = {
    financialPressure:
      "Sua empresa ainda enfrenta pressão financeira. Antes de pensar em crescer rapidamente, observe se existe estrutura para sustentar esse crescimento.",

    critical:
      "Sua empresa precisa recuperar equilíbrio. Uma decisão de reconstrução pode ser mais importante do que tentar crescer rapidamente.",

    lowCash:
      "O caixa está limitado. Crescer pode ser positivo, mas investimentos muito altos podem criar novo problema financeiro.",

    lowClients:
      "Sua empresa precisa recuperar mercado. Observe qual decisão ajuda a trazer clientes sem comprometer demais o caixa.",

    lowReputation:
      "A confiança ainda precisa ser fortalecida. Crescimento sem reputação pode não ser sustentável.",

    teamPressure:
      "Sua equipe precisa participar da recuperação. Evite uma expansão que aumente demais a pressão sobre as pessoas.",

    innovative:
      "Sua empresa possui capacidade de inovação. Pense se essa força pode ser usada para crescer de maneira diferenciada.",

    strong:
      "Sua empresa chega à recuperação em posição favorável. Existe espaço para expansão, mas ainda é importante manter equilíbrio.",

    balanced:
      "A melhor recuperação combina segurança, mercado e capacidade de crescimento. Observe qual desses pontos sua empresa mais precisa fortalecer."
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

  if (cash < 25000) {
    items.push(
      "O caixa ainda exige cuidado: crescimento precisa caber no orçamento."
    );
  } else {
    items.push(
      "Existe algum espaço financeiro para investir na recuperação."
    );
  }

  if (clients < 50) {
    items.push(
      "A empresa ainda precisa recuperar parte da sua base de clientes."
    );
  } else {
    items.push(
      "A base de clientes oferece uma boa referência para planejar os próximos passos."
    );
  }

  if (reputation < 60) {
    items.push(
      "A confiança do mercado ainda precisa ser fortalecida."
    );
  } else {
    items.push(
      "A reputação pode ajudar a empresa a sustentar uma nova fase de crescimento."
    );
  }

  return items.slice(0, 3);
}


/* =========================================================
   CENÁRIO
========================================================= */

const SCENARIO = {
  title:
    "O MERCADO COMEÇA A SE RECUPERAR",

  text:
    "Depois da grande crise, o mercado começa a apresentar sinais positivos. " +
    "Os consumidores estão voltando, novas oportunidades aparecem e as empresas precisam decidir como aproveitar esse momento.",

  challenge:
    "Sua empresa vai reconstruir, crescer com equilíbrio ou acelerar a expansão?"
};


/* =========================================================
   DECISÕES DE RECUPERAÇÃO
========================================================= */

const RECOVERY_ACTIONS = [
  {
    id: "reconstruir",
    title:
      "Reconstruir e fortalecer a base",

    description:
      "A empresa prioriza organização financeira, equipe e estabilidade antes de crescer.",

    focus:
      "Segurança · equipe · estabilidade"
  },

  {
    id: "crescer",
    title:
      "Crescer com equilíbrio",

    description:
      "A empresa investe de forma moderada para recuperar clientes e ampliar sua posição.",

    focus:
      "Equilíbrio · clientes · reputação"
  },

  {
    id: "expandir",
    title:
      "Acelerar a expansão",

    description:
      "A empresa investe mais recursos para aproveitar rapidamente a recuperação do mercado.",

    focus:
      "Maior investimento · crescimento · inovação"
  }
];


/* =========================================================
   RESULTADOS DA RECUPERAÇÃO
========================================================= */

function calculateRecoveryResult(
  company,
  actionId
) {
  const situation =
    companySituation(company);

  const previousCrisis =
    crisisStrategy(company);


  /* -------------------------------------------------------
     RECONSTRUIR
  ------------------------------------------------------- */

  if (actionId === "reconstruir") {
    let result = {
      caixa: 8000,
      clientes: 2,
      reputacao: 4,
      equipe: 7,
      inovacao: 1,
      xp: 10,

      text:
        "A empresa priorizou estabilidade e organização. O crescimento foi menor, mas sua estrutura ficou mais preparada para a fase final."
    };

    if (
      situation === "critical" ||
      situation === "financialPressure" ||
      situation === "lowCash"
    ) {
      result.caixa = 11000;
      result.clientes = 3;
      result.reputacao = 5;
      result.equipe = 9;
      result.xp = 13;

      result.text =
        "A empresa precisava recuperar equilíbrio. A reconstrução trouxe fôlego financeiro, melhorou a equipe e criou condições para continuar.";
    }

    if (
      previousCrisis === "proteger"
    ) {
      result.caixa += 2000;
      result.equipe += 1;

      result.text +=
        " A proteção adotada na crise ajudou a preservar recursos para esta etapa.";
    }

    return result;
  }


  /* -------------------------------------------------------
     CRESCER COM EQUILÍBRIO
  ------------------------------------------------------- */

  if (actionId === "crescer") {
    let result = {
      caixa: -5000,
      clientes: 7,
      reputacao: 7,
      equipe: 3,
      inovacao: 4,
      xp: 13,

      text:
        "A empresa aproveitou a recuperação do mercado com equilíbrio, conquistando clientes e fortalecendo sua imagem."
    };

    if (
      situation === "lowClients"
    ) {
      result.caixa = -4500;
      result.clientes = 10;
      result.reputacao = 7;
      result.xp = 15;

      result.text =
        "A estratégia ajudou diretamente a recuperar mercado e trouxe novos clientes sem exigir expansão excessiva.";
    }

    if (
      situation === "lowReputation"
    ) {
      result.reputacao = 10;
      result.clientes = 6;
      result.xp = 14;

      result.text =
        "O crescimento moderado permitiu recuperar mercado e também reconstruir a confiança na empresa.";
    }

    if (
      previousCrisis === "clientes"
    ) {
      result.clientes += 2;
      result.reputacao += 1;

      result.text +=
        " A confiança preservada durante a crise facilitou a retomada.";
    }

    return result;
  }


  /* -------------------------------------------------------
     ACELERAR EXPANSÃO
  ------------------------------------------------------- */

  if (actionId === "expandir") {
    let result = {
      caixa: -14000,
      clientes: 11,
      reputacao: 5,
      equipe: -2,
      inovacao: 8,
      xp: 14,

      text:
        "A empresa acelerou sua expansão, conquistando mercado e ampliando sua capacidade de inovação."
    };

    if (
      situation === "strong"
    ) {
      result.caixa = -12000;
      result.clientes = 14;
      result.reputacao = 7;
      result.equipe = 1;
      result.inovacao = 10;
      result.xp = 17;

      result.text =
        "A empresa estava preparada para crescer e conseguiu aproveitar fortemente a retomada do mercado.";
    }

    if (
      situation === "innovative"
    ) {
      result.caixa = -12000;
      result.clientes = 13;
      result.reputacao = 6;
      result.inovacao = 12;
      result.xp = 16;

      result.text =
        "A capacidade de inovação ajudou a empresa a transformar expansão em vantagem competitiva.";
    }

    if (
      situation === "critical" ||
      situation === "financialPressure" ||
      situation === "lowCash"
    ) {
      result.caixa = -17000;
      result.clientes = 5;
      result.reputacao = 2;
      result.equipe = -5;
      result.inovacao = 5;
      result.xp = 7;

      result.text =
        "A expansão trouxe algum crescimento, mas exigiu recursos demais para a condição atual da empresa.";
    }

    if (
      situation === "teamPressure"
    ) {
      result.caixa = -14000;
      result.clientes = 8;
      result.reputacao = 4;
      result.equipe = -8;
      result.inovacao = 7;
      result.xp = 9;

      result.text =
        "A empresa cresceu, mas a expansão aumentou fortemente a pressão sobre a equipe.";
    }

    if (
      previousCrisis === "reagir" &&
      ![
        "critical",
        "financialPressure",
        "lowCash"
      ].includes(situation)
    ) {
      result.clientes += 2;
      result.inovacao += 1;

      result.text +=
        " A reação ativa adotada durante a crise também favoreceu a continuidade do crescimento.";
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
      "#adm360R15Style"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "adm360R15Style";

  style.textContent = `
    .adm360-r15 {
      display:grid;
      gap:14px;
      margin-top:14px;
    }

    .adm360-r15-badge {
      display:inline-flex;
      width:fit-content;
      padding:6px 11px;
      border-radius:999px;
      border:1px solid rgba(63,210,150,.45);
      background:rgba(63,210,150,.10);
      color:#aef4d6;
      font-size:.72rem;
      font-weight:950;
    }

    .adm360-r15-main {
      padding:16px;
      border-radius:15px;
      border:1px solid rgba(63,210,150,.25);
      background:
        linear-gradient(
          135deg,
          rgba(63,210,150,.08),
          rgba(255,255,255,.025)
        );
    }

    .adm360-r15-main h3 {
      margin:0 0 8px;
      color:#fff;
      font-size:1.04rem;
    }

    .adm360-r15-main p {
      margin:0;
      color:rgba(255,255,255,.76);
      line-height:1.55;
      font-size:.84rem;
    }

    .adm360-r15-box {
      padding:15px;
      border-radius:15px;
      border:1px solid rgba(255,255,255,.09);
      background:rgba(255,255,255,.035);
    }

    .adm360-r15-box h3 {
      margin:0 0 8px;
      color:#fff;
      font-size:1rem;
    }

    .adm360-r15-kpis {
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:8px;
      margin-top:10px;
    }

    .adm360-r15-kpi {
      padding:10px;
      border-radius:11px;
      background:rgba(255,255,255,.04);
      text-align:center;
    }

    .adm360-r15-kpi small {
      display:block;
      color:rgba(255,255,255,.52);
      margin-bottom:4px;
    }

    .adm360-r15-kpi strong {
      color:#fff;
    }

    .adm360-r15-observe {
      display:grid;
      gap:7px;
      margin-top:10px;
    }

    .adm360-r15-observe div {
      padding:9px 11px;
      border-radius:10px;
      background:rgba(255,255,255,.04);
      color:rgba(255,255,255,.78);
      font-size:.80rem;
    }

    .adm360-r15-tip {
      padding:14px;
      border-radius:13px;
      border:1px solid rgba(255,202,66,.38);
      background:rgba(255,202,66,.08);
    }

    .adm360-r15-tip strong {
      display:block;
      color:#ffe294;
      margin-bottom:6px;
      font-size:.82rem;
    }

    .adm360-r15-tip span {
      color:#fff2c9;
      font-size:.84rem;
      line-height:1.5;
    }

    .adm360-r15-history {
      padding:12px;
      border-radius:12px;
      border:1px solid rgba(126,178,255,.25);
      background:rgba(126,178,255,.06);
      color:#d9e8ff;
      font-size:.80rem;
      line-height:1.5;
    }

    .adm360-r15-warning {
      padding:14px;
      border-radius:13px;
      border:1px solid rgba(255,100,100,.34);
      background:rgba(255,100,100,.07);
      color:#ffd0d0;
      line-height:1.5;
    }

    .adm360-r15-options {
      display:grid;
      gap:9px;
      margin-top:10px;
    }

    .adm360-r15-option {
      padding:13px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.025);
      cursor:pointer;
      transition:.16s ease;
    }

    .adm360-r15-option:hover {
      background:rgba(255,255,255,.05);
    }

    .adm360-r15-option.selected {
      border-color:#3fd296;
      background:rgba(63,210,150,.10);
    }

    .adm360-r15-option strong {
      display:block;
      color:#fff;
      margin-bottom:4px;
    }

    .adm360-r15-option span {
      display:block;
      color:rgba(255,255,255,.65);
      font-size:.79rem;
      line-height:1.45;
    }

    .adm360-r15-focus {
      margin-top:7px;
      color:#aef4d6 !important;
      font-size:.72rem !important;
      font-weight:850;
    }

    .adm360-r15-button {
      width:100%;
      min-height:47px;
      margin-top:12px;
      border:1px solid rgba(63,210,150,.68);
      border-radius:12px;
      background:
        linear-gradient(
          135deg,
          #1f9e73,
          #2773c8
        );
      color:#fff;
      font-weight:950;
      cursor:pointer;
    }

    .adm360-r15-button:disabled {
      opacity:.40;
      cursor:not-allowed;
    }

    .adm360-r15-result {
      padding:15px;
      border-radius:13px;
      border:1px solid rgba(71,220,154,.32);
      background:rgba(71,220,154,.07);
      color:#c7f8df;
      line-height:1.55;
    }

    .adm360-r15-result strong {
      color:#fff;
    }

    .adm360-r15-delta {
      display:flex;
      flex-wrap:wrap;
      gap:7px;
      margin-top:10px;
    }

    .adm360-r15-delta span {
      padding:6px 9px;
      border-radius:999px;
      background:rgba(255,255,255,.07);
      font-size:.75rem;
    }

    #adm360R15Toast {
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

    #adm360R15Toast.show {
      display:block;
    }

    @media(max-width:800px) {
      .adm360-r15-kpis {
        grid-template-columns:repeat(2,1fr);
      }
    }

    @media(max-width:520px) {
      .adm360-r15-kpis {
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
   CONFIRMAR DECISÃO FINANCEIRA
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
      "Esta decisão será registrada na R15."
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
    Number(latest.round || 0) !== 15
  ) {
    toast(
      "A Arena não está mais na Rodada 15."
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

  company.round15 =
    company.round15 || {};

  if (
    company.round15.debtDecision
  ) {
    toast(
      "A decisão financeira da R15 já foi registrada."
    );
    return;
  }

  const debts =
    dueDebts(company);

  const due =
    totalDue(company);

  if (!due) {
    company.round15.debtDecision = {
      action: "sem_divida",
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
        ) + 6,
        0,
        100
      );

    company.xp =
      Number(company.xp || 0) +
      12;

    debts.forEach(
      ([id, debt]) => {
        company.debts[id] = {
          ...debt,
          status: "paid",
          paidAt: Date.now(),
          paidRound: 15
        };
      }
    );

    company.financialRestriction = {
      ...(company.financialRestriction || {}),
      active: false,
      resolvedRound: 15,
      resolvedAt: Date.now()
    };

    resultText =
      "A obrigação foi quitada. A empresa entra na fase final sem essa dívida e com maior credibilidade financeira.";
  }


  /* ACORDO FINAL */

  if (
    selectedDebtAction === "acordo_final"
  ) {
    const currentCash =
      Number(company.caixa || 0);

    const payment =
      Math.min(
        currentCash,
        Math.round(due * 0.6)
      );

    if (payment <= 0) {
      toast(
        "A empresa não possui caixa suficiente para realizar o acordo."
      );
      return;
    }

    company.caixa =
      currentCash - payment;

    const remaining =
      Math.max(
        0,
        due - payment
      );

    const finalCost =
      Math.round(
        remaining * 1.15
      );

    debts.forEach(
      ([id, debt]) => {
        company.debts[id] = {
          ...debt,
          status: "settled_agreement",
          settledRound: 15,
          settledAt: Date.now()
        };
      }
    );

    company.finalFinancialAdjustment =
      {
        source:
          "Acordo financeiro R15",
        amount:
          finalCost,
        affectsFinalScore:
          true,
        createdAt:
          Date.now()
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
      6;

    company.financialRestriction = {
      ...(company.financialRestriction || {}),
      active: false,
      resolvedBy:
        "Acordo final R15",
      resolvedRound: 15,
      resolvedAt: Date.now()
    };

    resultText =
      `A empresa pagou ADM$ ${money(payment)} agora e fechou um acordo para o restante. ` +
      `O custo final de ADM$ ${money(finalCost)} será considerado no resultado final da Arena.`;
  }


  /* NÃO PAGAR */

  if (
    selectedDebtAction === "nao_pagar"
  ) {
    debts.forEach(
      ([id, debt]) => {
        company.debts[id] = {
          ...debt,
          status: "overdue",
          overdueRound: 15,
          overdueAt: Date.now()
        };
      }
    );

    company.reputacao =
      clamp(
        Number(
          company.reputacao || 0
        ) - 14,
        0,
        100
      );

    company.clientes =
      clamp(
        Number(
          company.clientes || 0
        ) - 4
      );

    company.xp =
      clamp(
        Number(company.xp || 0) -
        5
      );

    company.financialRestriction = {
      active: true,
      sinceRound: 15,
      amount: due,
      reason:
        "Dívida vencida não quitada na R15"
    };

    resultText =
      "A empresa preservou o caixa, mas entra na fase final com inadimplência e perda de credibilidade.";
  }


  company.round15.debtDecision = {
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
   CONFIRMAR RECUPERAÇÃO
========================================================= */

async function confirmRecoveryAction() {
  if (!selectedRecoveryAction) return;

  const option =
    RECOVERY_ACTIONS.find(
      item =>
        item.id ===
        selectedRecoveryAction
    );

  if (!option) return;

  const ok =
    window.confirm(
      `CONFIRMAR ESTRATÉGIA DE RECUPERAÇÃO?\n\n${option.title}\n\n` +
      "Esta será a principal decisão da empresa na R15."
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
    Number(latest.round || 0) !== 15
  ) {
    toast(
      "A Arena não está mais na Rodada 15."
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

  company.round15 =
    company.round15 || {};

  if (
    needsDebtDecision(company)
  ) {
    toast(
      "Resolva primeiro o compromisso financeiro da R15."
    );
    return;
  }

  if (
    company.round15.recoveryDecision
  ) {
    toast(
      "A estratégia da R15 já foi registrada."
    );
    return;
  }

  const originalSituation =
    companySituation(company);

  const originalTip =
    strategicTip(company);

  const result =
    calculateRecoveryResult(
      company,
      selectedRecoveryAction
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


  if (
    Number(company.caixa || 0) +
      Number(result.caixa || 0) <
    0
  ) {
    toast(
      "O caixa atual não permite essa estratégia. Escolha uma opção compatível com a situação da empresa."
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

  company.inovacao =
    clamp(
      Number(company.inovacao || 0) +
      Number(result.inovacao || 0)
    );

  company.xp =
    clamp(
      Number(company.xp || 0) +
      Number(result.xp || 0)
    );


  company.round15.recoveryDecision = {
    action:
      selectedRecoveryAction,

    title:
      option.title,

    situation:
      originalSituation,

    crisisStrategy:
      crisisStrategy(company),

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
        Number(company.reputacao || 0),

      equipe:
        Number(company.equipe || 0),

      inovacao:
        Number(company.inovacao || 0),

      xp:
        Number(company.xp || 0)
    },

    decidedAt:
      Date.now()
  };


  company.managementDecisions =
    company.managementDecisions || {};

  company.managementDecisions[15] = {
    round: 15,

    roundName:
      "Recuperação e Expansão",

    optionId:
      selectedRecoveryAction,

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


  company.finalRoundReady = true;

  await f.set(
    f.ref(
      f.db,
      `rooms/${roomCode}/companies/${companyId}`
    ),
    company
  );

  selectedRecoveryAction = "";

  toast(
    "Estratégia de recuperação registrada."
  );
}


/* =========================================================
   ETAPA FINANCEIRA
========================================================= */

function renderDebtStage(
  area,
  company
) {
  const due =
    totalDue(company);

  area.innerHTML = `
    <div class="adm360-r15">

      <span class="adm360-r15-badge">
        R15 · COMPROMISSO FINANCEIRO
      </span>

      <div class="adm360-r15-warning">

        <strong>
          ÚLTIMO COMPROMISSO FINANCEIRO
        </strong>

        <br><br>

        Sua empresa possui uma obrigação de

        <strong>
          ADM$ ${money(due)}
        </strong>

        com vencimento nesta rodada.

      </div>


      <div class="adm360-r15-box">

        <h3>
          O QUE VOCÊ PRECISA OBSERVAR
        </h3>

        <div class="adm360-r15-kpis">

          <div class="adm360-r15-kpi">
            <small>CAIXA</small>
            <strong>
              ADM$ ${money(
                company.caixa
              )}
            </strong>
          </div>

          <div class="adm360-r15-kpi">
            <small>DÍVIDA</small>
            <strong>
              ADM$ ${money(due)}
            </strong>
          </div>

          <div class="adm360-r15-kpi">
            <small>REPUTAÇÃO</small>
            <strong>
              ${Number(
                company.reputacao || 0
              )}
            </strong>
          </div>

          <div class="adm360-r15-kpi">
            <small>CLIENTES</small>
            <strong>
              ${Number(
                company.clientes || 0
              )}
            </strong>
          </div>

        </div>

      </div>


      <div class="adm360-r15-tip">

        <strong>
          DICA ESTRATÉGICA
        </strong>

        <span>
          ${escapeHtml(
            debtTip(company)
          )}
        </span>

      </div>


      <div class="adm360-r15-box">

        <h3>
          COMO A EMPRESA VAI RESOLVER?
        </h3>

        <div class="adm360-r15-options">

          ${DEBT_ACTIONS.map(
            option => `
              <div
                class="adm360-r15-option ${
                  selectedDebtAction ===
                  option.id
                    ? "selected"
                    : ""
                }"
                data-r15-debt="${
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
          id="adm360R15DebtConfirm"
          class="adm360-r15-button"
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
      "[data-r15-debt]"
    )
    .forEach(
      card => {
        card.addEventListener(
          "click",
          () => {
            selectedDebtAction =
              card.dataset
                .r15Debt || "";

            render();
          }
        );
      }
    );


  area
    .querySelector(
      "#adm360R15DebtConfirm"
    )
    ?.addEventListener(
      "click",
      confirmDebtAction
    );
}


/* =========================================================
   ETAPA DE RECUPERAÇÃO
========================================================= */

function renderRecoveryStage(
  area,
  company
) {
  const decision =
    company?.round15
      ?.recoveryDecision;


  if (decision) {
    area.innerHTML = `
      <div class="adm360-r15">

        <span class="adm360-r15-badge">
          R15 · RECUPERAÇÃO E EXPANSÃO
        </span>

        <div class="adm360-r15-box">

          <h3>
            ESTRATÉGIA CONCLUÍDA
          </h3>

          <div class="adm360-r15-result">

            <strong>
              ${escapeHtml(
                decision.title
              )}
            </strong>

            <br><br>

            ${escapeHtml(
              decision.result
            )}

            <div class="adm360-r15-delta">
              ${resultDeltas(
                decision.delta || {}
              )}
            </div>

          </div>

        </div>


        <div class="adm360-r15-history">
          Sua empresa concluiu a penúltima rodada e está preparada para o Conselho Final da ADM Arena 360.
        </div>

      </div>
    `;

    return;
  }


  const observations =
    observationItems(company);

  const tip =
    strategicTip(company);

  const history =
    crisisMessage(company);


  area.innerHTML = `
    <div class="adm360-r15">

      <span class="adm360-r15-badge">
        R15 · RECUPERAÇÃO E EXPANSÃO
      </span>


      <div class="adm360-r15-main">

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


      <div class="adm360-r15-history">
        <strong>
          SUA TRAJETÓRIA RECENTE
        </strong>

        <br><br>

        ${escapeHtml(history)}
      </div>


      <div class="adm360-r15-box">

        <h3>
          O QUE VOCÊ PRECISA OBSERVAR
        </h3>

        <div class="adm360-r15-kpis">

          <div class="adm360-r15-kpi">
            <small>CAIXA</small>
            <strong>
              ADM$ ${money(
                company.caixa
              )}
            </strong>
          </div>

          <div class="adm360-r15-kpi">
            <small>CLIENTES</small>
            <strong>
              ${Number(
                company.clientes || 0
              )}
            </strong>
          </div>

          <div class="adm360-r15-kpi">
            <small>REPUTAÇÃO</small>
            <strong>
              ${Number(
                company.reputacao || 0
              )}
            </strong>
          </div>

          <div class="adm360-r15-kpi">
            <small>EQUIPE</small>
            <strong>
              ${Number(
                company.equipe || 0
              )}
            </strong>
          </div>

        </div>


        <div class="adm360-r15-observe">

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


      <div class="adm360-r15-tip">

        <strong>
          DICA ESTRATÉGICA
        </strong>

        <span>
          ${escapeHtml(tip)}
        </span>

      </div>


      <div class="adm360-r15-box">

        <h3>
          QUAL SERÁ O PRÓXIMO PASSO?
        </h3>

        <div class="adm360-r15-options">

          ${RECOVERY_ACTIONS.map(
            option => `
              <div
                class="adm360-r15-option ${
                  selectedRecoveryAction ===
                  option.id
                    ? "selected"
                    : ""
                }"
                data-r15-recovery="${
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

                <span class="adm360-r15-focus">
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
          id="adm360R15RecoveryConfirm"
          class="adm360-r15-button"
          ${
            selectedRecoveryAction
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
      "[data-r15-recovery]"
    )
    .forEach(
      card => {
        card.addEventListener(
          "click",
          () => {
            selectedRecoveryAction =
              card.dataset
                .r15Recovery || "";

            render();
          }
        );
      }
    );


  area
    .querySelector(
      "#adm360R15RecoveryConfirm"
    )
    ?.addEventListener(
      "click",
      confirmRecoveryAction
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
    15
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


  renderRecoveryStage(
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
    15
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
      "Antes da recuperação, sua empresa precisa resolver um compromisso financeiro que vence nesta rodada.";

    return;
  }

  mission.textContent =
    "O mercado começa a se recuperar. Analise sua trajetória, observe a situação atual e escolha como sua empresa vai se preparar para a fase final.";
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
          ) === 15
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
              ) === 15
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
      "ADM Arena 360 — Rodada 15:",
      error
    );
  }
);
