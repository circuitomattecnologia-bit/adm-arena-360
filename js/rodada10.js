import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360 — RODADA 10
   OSCILAÇÃO DE MERCADO

   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   PADRÃO PEDAGÓGICO
   ---------------------------------------------------------
   CENÁRIO
   → O QUE OBSERVAR
   → DICA ESTRATÉGICA AUTOMÁTICA
   → 3 DECISÕES
   → CONFIRMAÇÃO
   → CONSEQUÊNCIA EXPLICADA

   REGRAS
   ---------------------------------------------------------
   - Só funciona na Rodada 10.
   - Não avança rodada.
   - Não altera o status da Arena.
   - Não interfere nas Rodadas 1–9.
   - Uma decisão por empresa.
   - A dica aparece automaticamente.
   - A dica considera a situação real da empresa.
   - O estudante não precisa fazer cálculos complexos.
   - Decisões anteriores influenciam, mas não condenam.
   - Toda empresa pode se recuperar com boa gestão.
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
  return Number(value || 0).toLocaleString("pt-BR");
}

function clamp(value, min = 0, max = Infinity) {
  return Math.max(
    min,
    Math.min(max, Number(value || 0))
  );
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
    ([, company]) =>
      normalizeName(company?.name) === normalized
  );

  if (!found) return null;

  return {
    id: found[0],
    company: found[1]
  };
}

function hasFinancialRestriction(company) {
  return company?.financialRestriction?.active === true;
}

function openDebts(company) {
  return Object.values(company?.debts || {}).filter(
    debt =>
      debt?.status === "open" ||
      debt?.status === "overdue"
  );
}

function totalOpenDebt(company) {
  return openDebts(company).reduce(
    (sum, debt) =>
      sum + Number(debt?.totalDue || 0),
    0
  );
}

function toast(text) {
  let box = document.querySelector("#adm360R10Toast");

  if (!box) {
    box = document.createElement("div");
    box.id = "adm360R10Toast";
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
   LEITURA PEDAGÓGICA DA EMPRESA

   O SISTEMA ANALISA.
   O ESTUDANTE RECEBE INFORMAÇÕES SIMPLES.
========================================================= */

function companySituation(company) {
  const cash = Number(company?.caixa || 0);
  const clients = Number(company?.clientes || 0);
  const reputation = Number(company?.reputacao || 0);
  const team = Number(company?.equipe || 0);

  if (
    hasFinancialRestriction(company) ||
    totalOpenDebt(company) >= 30000
  ) {
    return "financial";
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

  if (team > 0 && team < 50) {
    return "teamPressure";
  }

  if (
    cash >= 60000 &&
    reputation >= 70
  ) {
    return "strong";
  }

  return "balanced";
}


/* =========================================================
   DICAS AUTOMÁTICAS

   NÃO ENTREGAM A RESPOSTA.
   AJUDAM O ESTUDANTE A PENSAR.
========================================================= */

function strategicTip(company) {
  const situation = companySituation(company);

  const tips = {
    financial:
      "Sua empresa possui compromissos financeiros importantes. Antes de gastar mais, pense se o caixa consegue suportar a decisão.",

    lowCash:
      "O caixa da empresa merece atenção. Uma decisão pode parecer boa, mas precisa caber no dinheiro disponível.",

    lowClients:
      "Sua quantidade de clientes merece atenção. Pense em como sua decisão pode tornar a empresa mais atrativa para o mercado.",

    lowReputation:
      "A imagem da empresa está em atenção. Uma decisão que preserve a confiança dos clientes pode ser importante neste momento.",

    teamPressure:
      "Uma empresa também depende das pessoas que trabalham nela. Pense se a decisão aumenta ainda mais a pressão sobre a equipe.",

    strong:
      "Sua empresa chegou em boa condição. Isso permite pensar em oportunidades, mas crescer também exige responsabilidade.",

    balanced:
      "Observe caixa, clientes e reputação juntos. Uma boa decisão procura equilíbrio e não apenas ganho imediato."
  };

  return tips[situation] || tips.balanced;
}


/* =========================================================
   O QUE O ESTUDANTE PRECISA OBSERVAR
========================================================= */

function observationItems(company) {
  const items = [];

  const cash = Number(company?.caixa || 0);
  const clients = Number(company?.clientes || 0);
  const reputation = Number(company?.reputacao || 0);

  if (cash < 25000) {
    items.push("Seu caixa está mais apertado.");
  } else {
    items.push("Observe quanto dinheiro a empresa possui para reagir.");
  }

  if (clients < 45) {
    items.push("A quantidade de clientes precisa de atenção.");
  } else {
    items.push("Pense em como os clientes podem reagir às mudanças.");
  }

  if (reputation < 55) {
    items.push("A reputação da empresa precisa ser preservada.");
  } else {
    items.push("A reputação conquistada também tem valor.");
  }

  return items.slice(0, 3);
}


/* =========================================================
   CENÁRIO DA R10
========================================================= */

const SCENARIO = {
  title: "O MERCADO MUDOU",

  text:
    "Os custos de fornecedores aumentaram e os clientes ficaram mais atentos aos preços. " +
    "Sua empresa precisa reagir sem perder o equilíbrio.",

  challenge:
    "Como sua empresa vai enfrentar essa mudança?"
};


/* =========================================================
   TRÊS DECISÕES SIMPLES
========================================================= */

const ACTIONS = [
  {
    id: "reajustar",
    title: "Reajustar preços com cuidado",
    description:
      "A empresa aumenta parte dos preços para compensar os novos custos, tentando preservar sua margem."
  },

  {
    id: "manter",
    title: "Manter preços e reduzir desperdícios",
    description:
      "A empresa evita aumentar preços agora e procura economizar melhor dentro da operação."
  },

  {
    id: "investir",
    title: "Investir para atrair mais clientes",
    description:
      "A empresa usa parte do caixa em divulgação, atendimento e ações para conquistar mercado."
  }
];


/* =========================================================
   CONSEQUÊNCIAS

   SIMPLES PARA O ESTUDANTE.
   CONTEXTUAIS POR TRÁS DO SISTEMA.
========================================================= */

function calculateResult(company, actionId) {
  const situation = companySituation(company);

  if (actionId === "reajustar") {
    let result = {
      caixa: 9000,
      clientes: -3,
      reputacao: -1,
      equipe: 0,
      xp: 7,
      text:
        "O reajuste ajudou o caixa, mas alguns clientes ficaram mais sensíveis ao preço."
    };

    if (situation === "lowReputation") {
      result.reputacao = -4;
      result.clientes = -5;
      result.text =
        "O caixa melhorou, mas como a imagem da empresa já estava fragilizada, parte dos clientes reagiu mal ao aumento.";
    }

    if (
      situation === "financial" ||
      situation === "lowCash"
    ) {
      result.xp = 9;
      result.text =
        "O reajuste ajudou a empresa a proteger o caixa em um momento financeiro delicado, embora alguns clientes tenham reduzido as compras.";
    }

    return result;
  }

  if (actionId === "manter") {
    let result = {
      caixa: 4000,
      clientes: 2,
      reputacao: 3,
      equipe: -2,
      xp: 9,
      text:
        "A empresa protegeu os clientes e encontrou economia interna. A reputação melhorou, mas a equipe sentiu um pouco mais de pressão."
    };

    if (situation === "teamPressure") {
      result.equipe = -6;
      result.reputacao = 1;
      result.text =
        "Manter os preços agradou aos clientes, mas a equipe já estava pressionada e sentiu mais o esforço de reduzir custos.";
    }

    if (situation === "lowClients") {
      result.clientes = 5;
      result.reputacao = 4;
      result.text =
        "A decisão ajudou a recuperar a confiança do mercado e trouxe novos clientes sem exigir um grande investimento.";
    }

    return result;
  }

  if (actionId === "investir") {
    let result = {
      caixa: -8000,
      clientes: 7,
      reputacao: 4,
      equipe: -1,
      xp: 10,
      text:
        "O investimento reduziu o caixa no curto prazo, mas trouxe clientes e fortaleceu a imagem da empresa."
    };

    if (
      situation === "financial" ||
      situation === "lowCash"
    ) {
      result.caixa = -12000;
      result.clientes = 4;
      result.reputacao = 2;
      result.xp = 6;
      result.text =
        "A ação trouxe alguns clientes, mas pesou bastante no caixa porque a empresa já estava financeiramente pressionada.";
    }

    if (situation === "strong") {
      result.caixa = -7000;
      result.clientes = 10;
      result.reputacao = 5;
      result.xp = 12;
      result.text =
        "A boa condição da empresa permitiu aproveitar a oportunidade. O investimento trouxe forte crescimento de clientes.";
    }

    return result;
  }

  return {
    caixa: 0,
    clientes: 0,
    reputacao: 0,
    equipe: 0,
    xp: 0,
    text: ""
  };
}


/* =========================================================
   ESTILO
========================================================= */

function installStyle() {
  if (document.querySelector("#adm360R10Style")) return;

  const style = document.createElement("style");
  style.id = "adm360R10Style";

  style.textContent = `
    .adm360-r10 {
      display:grid;
      gap:14px;
      margin-top:14px;
    }

    .adm360-r10-badge {
      display:inline-flex;
      width:fit-content;
      padding:6px 11px;
      border-radius:999px;
      border:1px solid rgba(64,183,255,.42);
      background:rgba(64,183,255,.10);
      color:#a9ddff;
      font-size:.72rem;
      font-weight:950;
    }

    .adm360-r10-box {
      padding:15px;
      border-radius:15px;
      border:1px solid rgba(255,255,255,.09);
      background:rgba(255,255,255,.035);
    }

    .adm360-r10-box h3 {
      margin:0 0 8px;
      color:#fff;
      font-size:1rem;
    }

    .adm360-r10-box p {
      color:rgba(255,255,255,.72);
      line-height:1.55;
      font-size:.84rem;
    }

    .adm360-r10-observe {
      display:grid;
      gap:7px;
      margin-top:10px;
    }

    .adm360-r10-observe div {
      padding:9px 11px;
      border-radius:10px;
      background:rgba(255,255,255,.04);
      color:rgba(255,255,255,.78);
      font-size:.80rem;
    }

    .adm360-r10-tip {
      padding:14px;
      border-radius:13px;
      border:1px solid rgba(255,202,66,.38);
      background:rgba(255,202,66,.08);
    }

    .adm360-r10-tip strong {
      display:block;
      color:#ffe294;
      margin-bottom:6px;
      font-size:.82rem;
    }

    .adm360-r10-tip span {
      color:#fff2c9;
      font-size:.84rem;
      line-height:1.5;
    }

    .adm360-r10-kpis {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:8px;
      margin-top:10px;
    }

    .adm360-r10-kpi {
      padding:10px;
      border-radius:11px;
      background:rgba(255,255,255,.04);
      text-align:center;
    }

    .adm360-r10-kpi small {
      display:block;
      color:rgba(255,255,255,.52);
      margin-bottom:4px;
    }

    .adm360-r10-kpi strong {
      color:#fff;
    }

    .adm360-r10-options {
      display:grid;
      gap:9px;
      margin-top:10px;
    }

    .adm360-r10-option {
      padding:13px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.025);
      cursor:pointer;
      transition:.16s ease;
    }

    .adm360-r10-option:hover {
      background:rgba(255,255,255,.05);
    }

    .adm360-r10-option.selected {
      border-color:#46baff;
      background:rgba(70,186,255,.10);
    }

    .adm360-r10-option strong {
      display:block;
      color:#fff;
      margin-bottom:4px;
    }

    .adm360-r10-option span {
      color:rgba(255,255,255,.65);
      font-size:.79rem;
      line-height:1.45;
    }

    .adm360-r10-button {
      width:100%;
      min-height:47px;
      margin-top:12px;
      border:1px solid rgba(70,186,255,.70);
      border-radius:12px;
      background:linear-gradient(135deg,#168dd0,#4054d9);
      color:#fff;
      font-weight:950;
      cursor:pointer;
    }

    .adm360-r10-button:disabled {
      opacity:.40;
      cursor:not-allowed;
    }

    .adm360-r10-result {
      padding:15px;
      border-radius:13px;
      border:1px solid rgba(71,220,154,.32);
      background:rgba(71,220,154,.07);
      color:#c7f8df;
      line-height:1.55;
    }

    .adm360-r10-result strong {
      color:#fff;
    }

    .adm360-r10-delta {
      display:flex;
      flex-wrap:wrap;
      gap:7px;
      margin-top:10px;
    }

    .adm360-r10-delta span {
      padding:6px 9px;
      border-radius:999px;
      background:rgba(255,255,255,.07);
      font-size:.75rem;
    }

    #adm360R10Toast {
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

    #adm360R10Toast.show {
      display:block;
    }

    @media(max-width:700px) {
      .adm360-r10-kpis {
        grid-template-columns:1fr;
      }
    }
  `;

  document.head.appendChild(style);
}


/* =========================================================
   FORMATAÇÃO DAS CONSEQUÊNCIAS
========================================================= */

function signed(value) {
  const n = Number(value || 0);

  if (n > 0) return `+${n}`;
  return String(n);
}

function resultDeltas(result) {
  const parts = [];

  if (result.caixa) {
    parts.push(
      `<span>Caixa: ${result.caixa > 0 ? "+" : "-"}ADM$ ${money(Math.abs(result.caixa))}</span>`
    );
  }

  if (result.clientes) {
    parts.push(
      `<span>Clientes: ${signed(result.clientes)}</span>`
    );
  }

  if (result.reputacao) {
    parts.push(
      `<span>Reputação: ${signed(result.reputacao)}</span>`
    );
  }

  if (result.equipe) {
    parts.push(
      `<span>Equipe: ${signed(result.equipe)}</span>`
    );
  }

  if (result.xp) {
    parts.push(
      `<span>XP: ${signed(result.xp)}</span>`
    );
  }

  return parts.join("");
}


/* =========================================================
   CONFIRMAÇÃO DA DECISÃO
========================================================= */

async function confirmAction() {
  if (!selectedAction) return;

  const option = ACTIONS.find(
    item => item.id === selectedAction
  );

  if (!option) return;

  const ok = window.confirm(
    `CONFIRMAR DECISÃO?\n\n${option.title}\n\n` +
    "Depois de confirmada, a empresa seguirá com essa decisão na R10."
  );

  if (!ok) return;

  const f = await getFirebase();

  const snapshot = await f.get(
    f.ref(f.db, `rooms/${roomCode}`)
  );

  const latest = snapshot.val();

  if (!latest) {
    toast("Arena não encontrada.");
    return;
  }

  if (Number(latest.round || 0) !== 10) {
    toast("A Arena não está mais na Rodada 10.");
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

  const companyId = visible.id;
  const company = visible.company;

  if (company?.round10?.decision) {
    toast("A decisão da R10 já foi registrada.");
    return;
  }

  const result = calculateResult(
    company,
    selectedAction
  );

  const before = {
    caixa: Number(company.caixa || 0),
    clientes: Number(company.clientes || 0),
    reputacao: Number(company.reputacao || 0),
    equipe: Number(company.equipe || 0),
    xp: Number(company.xp || 0)
  };

  company.caixa = clamp(
    Number(company.caixa || 0) +
      Number(result.caixa || 0)
  );

  company.clientes = clamp(
    Number(company.clientes || 0) +
      Number(result.clientes || 0)
  );

  company.reputacao = clamp(
    Number(company.reputacao || 0) +
      Number(result.reputacao || 0),
    0,
    100
  );

  company.equipe = clamp(
    Number(company.equipe || 0) +
      Number(result.equipe || 0),
    0,
    100
  );

  company.xp = clamp(
    Number(company.xp || 0) +
      Number(result.xp || 0)
  );

  company.round10 = {
    decision: {
      action: selectedAction,
      title: option.title,
      situation: companySituation(company),
      tipShown: strategicTip(company),
      result: result.text,

      delta: {
        caixa: result.caixa,
        clientes: result.clientes,
        reputacao: result.reputacao,
        equipe: result.equipe,
        xp: result.xp
      },

      before,

      after: {
        caixa: Number(company.caixa || 0),
        clientes: Number(company.clientes || 0),
        reputacao: Number(company.reputacao || 0),
        equipe: Number(company.equipe || 0),
        xp: Number(company.xp || 0)
      },

      decidedAt: Date.now()
    }
  };

  company.managementDecisions =
    company.managementDecisions || {};

  company.managementDecisions[10] = {
    round: 10,
    roundName: "Oscilação de Mercado",
    optionId: selectedAction,
    optionTitle: option.title,

    totalDelta: {
      caixa: result.caixa,
      clientes: result.clientes,
      reputacao: result.reputacao,
      equipe: result.equipe,
      xp: result.xp
    },

    result: result.text,
    decidedAt: Date.now()
  };

  await f.set(
    f.ref(
      f.db,
      `rooms/${roomCode}/companies/${companyId}`
    ),
    company
  );

  selectedAction = "";

  toast("Decisão registrada com sucesso.");
}


/* =========================================================
   RENDER
========================================================= */

function render() {
  if (!IS_EMPRESA || !roomData) return;

  if (Number(roomData.round || 0) !== 10) return;

  const area = document.querySelector("#decisaoArea");
  if (!area) return;

  const visible = getVisibleCompany();

  if (!visible) return;

  const company = visible.company;
  const decision = company?.round10?.decision;

  if (decision) {
    area.innerHTML = `
      <div class="adm360-r10">

        <span class="adm360-r10-badge">
          R10 · OSCILAÇÃO DE MERCADO
        </span>

        <div class="adm360-r10-box">
          <h3>DECISÃO CONCLUÍDA</h3>

          <div class="adm360-r10-result">
            <strong>
              ${escapeHtml(decision.title)}
            </strong>

            <br><br>

            ${escapeHtml(decision.result)}

            <div class="adm360-r10-delta">
              ${resultDeltas(decision.delta || {})}
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
    <div class="adm360-r10">

      <span class="adm360-r10-badge">
        R10 · OSCILAÇÃO DE MERCADO
      </span>

      <div class="adm360-r10-box">

        <h3>${escapeHtml(SCENARIO.title)}</h3>

        <p>
          ${escapeHtml(SCENARIO.text)}
        </p>

        <strong style="
          display:block;
          margin-top:10px;
          color:#fff;
        ">
          ${escapeHtml(SCENARIO.challenge)}
        </strong>

      </div>


      <div class="adm360-r10-box">

        <h3>O QUE VOCÊ PRECISA OBSERVAR</h3>

        <div class="adm360-r10-kpis">

          <div class="adm360-r10-kpi">
            <small>CAIXA</small>
            <strong>
              ADM$ ${money(company.caixa)}
            </strong>
          </div>

          <div class="adm360-r10-kpi">
            <small>CLIENTES</small>
            <strong>
              ${Number(company.clientes || 0)}
            </strong>
          </div>

          <div class="adm360-r10-kpi">
            <small>REPUTAÇÃO</small>
            <strong>
              ${Number(company.reputacao || 0)}
            </strong>
          </div>

        </div>

        <div class="adm360-r10-observe">
          ${observations
            .map(
              text =>
                `<div>${escapeHtml(text)}</div>`
            )
            .join("")}
        </div>

      </div>


      <div class="adm360-r10-tip">

        <strong>
          DICA ESTRATÉGICA
        </strong>

        <span>
          ${escapeHtml(tip)}
        </span>

      </div>


      <div class="adm360-r10-box">

        <h3>
          QUAL SERÁ A DECISÃO DA EMPRESA?
        </h3>

        <div class="adm360-r10-options">

          ${ACTIONS.map(
            option => `
              <div
                class="adm360-r10-option ${
                  selectedAction === option.id
                    ? "selected"
                    : ""
                }"
                data-r10-action="${escapeHtml(option.id)}"
              >
                <strong>
                  ${escapeHtml(option.title)}
                </strong>

                <span>
                  ${escapeHtml(option.description)}
                </span>
              </div>
            `
          ).join("")}

        </div>

        <button
          type="button"
          id="adm360R10Confirm"
          class="adm360-r10-button"
          ${selectedAction ? "" : "disabled"}
        >
          CONFIRMAR DECISÃO DA EMPRESA
        </button>

      </div>

    </div>
  `;

  area
    .querySelectorAll("[data-r10-action]")
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          selectedAction =
            card.dataset.r10Action || "";

          render();

        }
      );

    });

  area
    .querySelector("#adm360R10Confirm")
    ?.addEventListener(
      "click",
      confirmAction
    );
}


/* =========================================================
   MISSÃO DA RODADA
========================================================= */

function updateMission() {
  if (Number(roomData?.round || 0) !== 10) return;

  const mission =
    document.querySelector("#missaoTexto");

  if (!mission) return;

  mission.textContent =
    "O mercado mudou. Observe a situação da empresa, leia a dica estratégica e escolha como reagir ao aumento dos custos e à mudança no comportamento dos clientes.";
}


/* =========================================================
   RENDERIZAÇÃO SEGURA
========================================================= */

function scheduleRender() {
  clearTimeout(renderTimer);

  renderTimer = setTimeout(
    () => {
      updateMission();
      render();
    },
    70
  );
}

function observePage() {
  const observer =
    new MutationObserver(() => {

      if (
        Number(roomData?.round || 0) === 10
      ) {
        scheduleRender();
      }

    });

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
              Number(roomData.round || 0) === 10
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
      "ADM Arena 360 — Rodada 10:",
      error
    );

  }
);
