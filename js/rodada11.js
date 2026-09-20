import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360 — RODADA 11
   GESTÃO DE PESSOAS

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
   - Só funciona na Rodada 11.
   - Não avança rodada.
   - Não altera status da Arena.
   - Não interfere nas Rodadas 1–10.
   - Uma decisão por empresa.
   - A dica é automática e contextual.
   - Linguagem adequada aos estudantes.
   - O sistema faz a análise mais complexa.
   - Decisões ruins podem ser recuperadas depois.
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

function toast(text) {
  let box = document.querySelector("#adm360R11Toast");

  if (!box) {
    box = document.createElement("div");
    box.id = "adm360R11Toast";
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
   LEITURA SIMPLES DA SITUAÇÃO DA EMPRESA
========================================================= */

function companySituation(company) {
  const cash = Number(company?.caixa || 0);
  const clients = Number(company?.clientes || 0);
  const reputation = Number(company?.reputacao || 0);
  const team = Number(company?.equipe || 0);

  if (team > 0 && team < 45) {
    return "criticalTeam";
  }

  if (team > 0 && team < 65) {
    return "teamAttention";
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

  if (team >= 80) {
    return "strongTeam";
  }

  return "balanced";
}


/* =========================================================
   DICAS AUTOMÁTICAS
========================================================= */

function strategicTip(company) {
  const situation = companySituation(company);

  const tips = {
    criticalTeam:
      "Sua equipe está bastante pressionada. Pense se buscar resultado imediato pode piorar ainda mais o desempenho das pessoas.",

    teamAttention:
      "A equipe merece atenção. Uma empresa pode ter dinheiro e clientes, mas perder rendimento quando as pessoas estão desmotivadas.",

    lowCash:
      "Seu caixa está limitado. Procure uma decisão que cuide das pessoas sem comprometer demais a situação financeira.",

    lowClients:
      "Sua empresa precisa recuperar clientes. Pense em como uma equipe mais preparada pode melhorar atendimento e vendas.",

    lowReputation:
      "A imagem da empresa merece atenção. O comportamento da equipe também influencia a experiência dos clientes.",

    strongTeam:
      "Sua equipe está em boa condição. Pense em como aproveitar esse momento sem criar pressão excessiva.",

    balanced:
      "Observe pessoas, dinheiro e clientes juntos. Uma boa gestão procura resultado sem esquecer quem faz a empresa funcionar."
  };

  return tips[situation] || tips.balanced;
}


/* =========================================================
   O QUE OBSERVAR
========================================================= */

function observationItems(company) {
  const items = [];

  const team = Number(company?.equipe || 0);
  const cash = Number(company?.caixa || 0);
  const clients = Number(company?.clientes || 0);

  if (team < 50) {
    items.push("A equipe está bastante pressionada.");
  } else if (team < 70) {
    items.push("A equipe precisa de atenção.");
  } else {
    items.push("A equipe está em condição razoável.");
  }

  if (cash < 25000) {
    items.push("O caixa permite poucas despesas novas.");
  } else {
    items.push("Observe quanto a empresa pode investir.");
  }

  if (clients < 45) {
    items.push("O atendimento pode ajudar a recuperar clientes.");
  } else {
    items.push("Clientes satisfeitos dependem também de uma boa equipe.");
  }

  return items.slice(0, 3);
}


/* =========================================================
   CENÁRIO
========================================================= */

const SCENARIO = {
  title: "A EQUIPE ESTÁ SENTINDO A PRESSÃO",

  text:
    "Depois de várias decisões e mudanças no mercado, parte da equipe começou a demonstrar cansaço e queda de motivação. " +
    "A empresa precisa continuar buscando resultados, mas também precisa cuidar das pessoas.",

  challenge:
    "Qual será a decisão da empresa diante dessa situação?"
};


/* =========================================================
   DECISÕES
========================================================= */

const ACTIONS = [
  {
    id: "treinar",
    title: "Investir em treinamento e desenvolvimento",
    description:
      "A empresa utiliza parte do caixa para preparar melhor a equipe e melhorar o desempenho."
  },

  {
    id: "reconhecer",
    title: "Criar ação de reconhecimento e motivação",
    description:
      "A empresa procura valorizar a equipe com reconhecimento, organização e melhoria do ambiente."
  },

  {
    id: "pressionar",
    title: "Cobrar mais resultados sem novos investimentos",
    description:
      "A empresa preserva o caixa e aumenta a cobrança para tentar melhorar os resultados rapidamente."
  }
];


/* =========================================================
   CONSEQUÊNCIAS
========================================================= */

function calculateResult(company, actionId) {
  const situation = companySituation(company);

  if (actionId === "treinar") {
    let result = {
      caixa: -9000,
      clientes: 3,
      reputacao: 3,
      equipe: 10,
      inovacao: 2,
      xp: 10,
      text:
        "O treinamento exigiu investimento, mas a equipe ficou mais preparada e o atendimento melhorou."
    };

    if (
      situation === "criticalTeam" ||
      situation === "teamAttention"
    ) {
      result.equipe = 14;
      result.clientes = 4;
      result.xp = 12;
      result.text =
        "O treinamento chegou em um momento importante. A equipe recuperou confiança e melhorou seu desempenho."
    }

    if (situation === "lowCash") {
      result.caixa = -11000;
      result.equipe = 9;
      result.xp = 8;
      result.text =
        "O treinamento trouxe melhoria para a equipe, mas pesou bastante no caixa da empresa."
    }

    return result;
  }

  if (actionId === "reconhecer") {
    let result = {
      caixa: -4000,
      clientes: 2,
      reputacao: 4,
      equipe: 8,
      inovacao: 0,
      xp: 9,
      text:
        "A equipe se sentiu mais valorizada. O ambiente melhorou e isso refletiu positivamente no atendimento."
    };

    if (
      situation === "criticalTeam" ||
      situation === "teamAttention"
    ) {
      result.equipe = 11;
      result.reputacao = 5;
      result.text =
        "O reconhecimento ajudou a reduzir a pressão e melhorou o clima da equipe."
    }

    if (situation === "lowCash") {
      result.caixa = -3000;
      result.equipe = 7;
      result.xp = 10;
      result.text =
        "A empresa conseguiu melhorar a motivação sem comprometer tanto o caixa."
    }

    return result;
  }

  if (actionId === "pressionar") {
    let result = {
      caixa: 7000,
      clientes: 1,
      reputacao: -3,
      equipe: -10,
      inovacao: 0,
      xp: 4,
      text:
        "A empresa preservou dinheiro e conseguiu resultado imediato, mas a pressão reduziu a motivação da equipe."
    };

    if (
      situation === "criticalTeam" ||
      situation === "teamAttention"
    ) {
      result.caixa = 5000;
      result.clientes = -3;
      result.reputacao = -6;
      result.equipe = -15;
      result.xp = 2;
      result.text =
        "A equipe já estava pressionada e a cobrança piorou o clima. O resultado imediato não compensou totalmente as perdas."
    }

    if (situation === "strongTeam") {
      result.equipe = -7;
      result.reputacao = -2;
      result.xp = 5;
      result.text =
        "A equipe suportou melhor a cobrança por estar em boa condição, mas houve desgaste."
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
  if (document.querySelector("#adm360R11Style")) return;

  const style = document.createElement("style");
  style.id = "adm360R11Style";

  style.textContent = `
    .adm360-r11 {
      display:grid;
      gap:14px;
      margin-top:14px;
    }

    .adm360-r11-badge {
      display:inline-flex;
      width:fit-content;
      padding:6px 11px;
      border-radius:999px;
      border:1px solid rgba(139,107,255,.45);
      background:rgba(139,107,255,.10);
      color:#d6caff;
      font-size:.72rem;
      font-weight:950;
    }

    .adm360-r11-box {
      padding:15px;
      border-radius:15px;
      border:1px solid rgba(255,255,255,.09);
      background:rgba(255,255,255,.035);
    }

    .adm360-r11-box h3 {
      margin:0 0 8px;
      color:#fff;
      font-size:1rem;
    }

    .adm360-r11-box p {
      color:rgba(255,255,255,.72);
      line-height:1.55;
      font-size:.84rem;
    }

    .adm360-r11-kpis {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:8px;
      margin-top:10px;
    }

    .adm360-r11-kpi {
      padding:10px;
      border-radius:11px;
      background:rgba(255,255,255,.04);
      text-align:center;
    }

    .adm360-r11-kpi small {
      display:block;
      color:rgba(255,255,255,.52);
      margin-bottom:4px;
    }

    .adm360-r11-kpi strong {
      color:#fff;
    }

    .adm360-r11-observe {
      display:grid;
      gap:7px;
      margin-top:10px;
    }

    .adm360-r11-observe div {
      padding:9px 11px;
      border-radius:10px;
      background:rgba(255,255,255,.04);
      color:rgba(255,255,255,.78);
      font-size:.80rem;
    }

    .adm360-r11-tip {
      padding:14px;
      border-radius:13px;
      border:1px solid rgba(255,202,66,.38);
      background:rgba(255,202,66,.08);
    }

    .adm360-r11-tip strong {
      display:block;
      color:#ffe294;
      margin-bottom:6px;
      font-size:.82rem;
    }

    .adm360-r11-tip span {
      color:#fff2c9;
      font-size:.84rem;
      line-height:1.5;
    }

    .adm360-r11-options {
      display:grid;
      gap:9px;
      margin-top:10px;
    }

    .adm360-r11-option {
      padding:13px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.025);
      cursor:pointer;
      transition:.16s ease;
    }

    .adm360-r11-option:hover {
      background:rgba(255,255,255,.05);
    }

    .adm360-r11-option.selected {
      border-color:#9278ff;
      background:rgba(146,120,255,.11);
    }

    .adm360-r11-option strong {
      display:block;
      color:#fff;
      margin-bottom:4px;
    }

    .adm360-r11-option span {
      color:rgba(255,255,255,.65);
      font-size:.79rem;
      line-height:1.45;
    }

    .adm360-r11-button {
      width:100%;
      min-height:47px;
      margin-top:12px;
      border:1px solid rgba(146,120,255,.70);
      border-radius:12px;
      background:linear-gradient(135deg,#735bd8,#a13bd4);
      color:#fff;
      font-weight:950;
      cursor:pointer;
    }

    .adm360-r11-button:disabled {
      opacity:.40;
      cursor:not-allowed;
    }

    .adm360-r11-result {
      padding:15px;
      border-radius:13px;
      border:1px solid rgba(71,220,154,.32);
      background:rgba(71,220,154,.07);
      color:#c7f8df;
      line-height:1.55;
    }

    .adm360-r11-result strong {
      color:#fff;
    }

    .adm360-r11-delta {
      display:flex;
      flex-wrap:wrap;
      gap:7px;
      margin-top:10px;
    }

    .adm360-r11-delta span {
      padding:6px 9px;
      border-radius:999px;
      background:rgba(255,255,255,.07);
      font-size:.75rem;
    }

    #adm360R11Toast {
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

    #adm360R11Toast.show {
      display:block;
    }

    @media(max-width:700px) {
      .adm360-r11-kpis {
        grid-template-columns:1fr;
      }
    }
  `;

  document.head.appendChild(style);
}


/* =========================================================
   FORMATAÇÃO
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

  if (result.inovacao) {
    parts.push(
      `<span>Inovação: ${signed(result.inovacao)}</span>`
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
   CONFIRMAR DECISÃO
========================================================= */

async function confirmAction() {
  if (!selectedAction) return;

  const option = ACTIONS.find(
    item => item.id === selectedAction
  );

  if (!option) return;

  const ok = window.confirm(
    `CONFIRMAR DECISÃO?\n\n${option.title}\n\n` +
    "Depois de confirmada, a decisão será registrada para a R11."
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

  if (Number(latest.round || 0) !== 11) {
    toast("A Arena não está mais na Rodada 11.");
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

  if (company?.round11?.decision) {
    toast("A decisão da R11 já foi registrada.");
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
    caixa: Number(company.caixa || 0),
    clientes: Number(company.clientes || 0),
    reputacao: Number(company.reputacao || 0),
    equipe: Number(company.equipe || 0),
    inovacao: Number(company.inovacao || 0),
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

  company.inovacao = clamp(
    Number(company.inovacao || 0) +
      Number(result.inovacao || 0)
  );

  company.xp = clamp(
    Number(company.xp || 0) +
      Number(result.xp || 0)
  );

  company.round11 = {
    decision: {
      action: selectedAction,
      title: option.title,
      situation: originalSituation,
      tipShown: originalTip,
      result: result.text,

      delta: {
        caixa: result.caixa,
        clientes: result.clientes,
        reputacao: result.reputacao,
        equipe: result.equipe,
        inovacao: result.inovacao,
        xp: result.xp
      },

      before,

      after: {
        caixa: Number(company.caixa || 0),
        clientes: Number(company.clientes || 0),
        reputacao: Number(company.reputacao || 0),
        equipe: Number(company.equipe || 0),
        inovacao: Number(company.inovacao || 0),
        xp: Number(company.xp || 0)
      },

      decidedAt: Date.now()
    }
  };

  company.managementDecisions =
    company.managementDecisions || {};

  company.managementDecisions[11] = {
    round: 11,
    roundName: "Gestão de Pessoas",
    optionId: selectedAction,
    optionTitle: option.title,

    totalDelta: {
      caixa: result.caixa,
      clientes: result.clientes,
      reputacao: result.reputacao,
      equipe: result.equipe,
      inovacao: result.inovacao,
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

  if (Number(roomData.round || 0) !== 11) return;

  const area =
    document.querySelector("#decisaoArea");

  if (!area) return;

  const visible =
    getVisibleCompany();

  if (!visible) return;

  const company =
    visible.company;

  const decision =
    company?.round11?.decision;

  if (decision) {
    area.innerHTML = `
      <div class="adm360-r11">

        <span class="adm360-r11-badge">
          R11 · GESTÃO DE PESSOAS
        </span>

        <div class="adm360-r11-box">

          <h3>DECISÃO CONCLUÍDA</h3>

          <div class="adm360-r11-result">

            <strong>
              ${escapeHtml(decision.title)}
            </strong>

            <br><br>

            ${escapeHtml(decision.result)}

            <div class="adm360-r11-delta">
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
    <div class="adm360-r11">

      <span class="adm360-r11-badge">
        R11 · GESTÃO DE PESSOAS
      </span>


      <div class="adm360-r11-box">

        <h3>
          ${escapeHtml(SCENARIO.title)}
        </h3>

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


      <div class="adm360-r11-box">

        <h3>O QUE VOCÊ PRECISA OBSERVAR</h3>

        <div class="adm360-r11-kpis">

          <div class="adm360-r11-kpi">
            <small>EQUIPE</small>
            <strong>
              ${Number(company.equipe || 0)}
            </strong>
          </div>

          <div class="adm360-r11-kpi">
            <small>CAIXA</small>
            <strong>
              ADM$ ${money(company.caixa)}
            </strong>
          </div>

          <div class="adm360-r11-kpi">
            <small>CLIENTES</small>
            <strong>
              ${Number(company.clientes || 0)}
            </strong>
          </div>

        </div>

        <div class="adm360-r11-observe">

          ${observations
            .map(
              text =>
                `<div>${escapeHtml(text)}</div>`
            )
            .join("")}

        </div>

      </div>


      <div class="adm360-r11-tip">

        <strong>
          DICA ESTRATÉGICA
        </strong>

        <span>
          ${escapeHtml(tip)}
        </span>

      </div>


      <div class="adm360-r11-box">

        <h3>
          QUAL SERÁ A DECISÃO DA EMPRESA?
        </h3>

        <div class="adm360-r11-options">

          ${ACTIONS.map(
            option => `
              <div
                class="adm360-r11-option ${
                  selectedAction === option.id
                    ? "selected"
                    : ""
                }"
                data-r11-action="${escapeHtml(option.id)}"
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
          id="adm360R11Confirm"
          class="adm360-r11-button"
          ${selectedAction ? "" : "disabled"}
        >
          CONFIRMAR DECISÃO DA EMPRESA
        </button>

      </div>

    </div>
  `;

  area
    .querySelectorAll("[data-r11-action]")
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          selectedAction =
            card.dataset.r11Action || "";

          render();

        }
      );

    });

  area
    .querySelector("#adm360R11Confirm")
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
    Number(roomData?.round || 0) !== 11
  ) {
    return;
  }

  const mission =
    document.querySelector("#missaoTexto");

  if (!mission) return;

  mission.textContent =
    "A empresa precisa cuidar dos resultados e das pessoas. Observe a situação da equipe, leia a dica estratégica e escolha como agir.";
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
    new MutationObserver(() => {

      if (
        Number(roomData?.round || 0) === 11
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
              Number(roomData.round || 0) === 11
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
  bindRound11Actions();

  await connectRoom();
}

start().catch(
  error => {

    console.error(
      "ADM Arena 360 — Rodada 11:",
      error
    );

  }
);
