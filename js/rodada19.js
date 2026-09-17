import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360 — RODADA 19
   A GRANDE OPORTUNIDADE

   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   OBJETIVOS
   ---------------------------------------------------------
   - Criar a maior oportunidade estratégica antes da final.
   - Permitir recuperação real de empresas fragilizadas.
   - Exigir análise de caixa, clientes, reputação,
     equipe e inovação.
   - Premiar equilíbrio e boas decisões anteriores.
   - Preparar as empresas para o Conselho Final.

   REGRAS
   ---------------------------------------------------------
   - Só funciona na Rodada 19.
   - Não avança rodada.
   - Não altera o status da Arena.
   - Não interfere nas Rodadas 1–18.
   - Uma decisão por empresa.
   - Sem resultado aleatório.
   - Nenhuma empresa recebe dinheiro gratuitamente.
   - Empresas fragilizadas possuem caminhos de recuperação.
========================================================= */

const ROUND = 19;

const PAGE = String(window.location.pathname || "")
  .split("/")
  .pop()
  .toLowerCase();

if (PAGE === "empresa.html") {
  start();
}

/* =========================================================
   UTILIDADES
========================================================= */

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function clamp(value, min = 0, max = 100) {
  return Math.max(
    min,
    Math.min(max, Number(value || 0))
  );
}

function money(value) {
  return Number(value || 0)
    .toLocaleString("pt-BR");
}

function signed(value) {
  const number = Number(value || 0);

  return number > 0
    ? `+${number}`
    : String(number);
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
    const match = String(value || "")
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

function getVisibleCompany(room) {
  if (!room) return null;

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
      room.companies || {}
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

/* =========================================================
   DIAGNÓSTICO DA EMPRESA
========================================================= */

function companyProfile(company) {
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
    cash < 18000 ||
    clients < 35
  ) {
    return "recovery";
  }

  if (
    reputation < 50 ||
    team < 50
  ) {
    return "rebuild";
  }

  if (
    cash >= 65000 &&
    clients >= 55 &&
    reputation >= 65
  ) {
    return "leader";
  }

  if (innovation >= 65) {
    return "innovative";
  }

  return "balanced";
}

function strategicTip(company) {
  const profile =
    companyProfile(company);

  const tips = {
    recovery:
      "Sua empresa chega a esta oportunidade precisando recuperar força. Crescer é possível, mas uma estratégia que reconstrua mercado e caixa pode ser mais importante que uma expansão muito cara.",

    rebuild:
      "Sua empresa possui pontos que precisam ser fortalecidos. Observe se reputação e equipe conseguem sustentar uma expansão neste momento.",

    leader:
      "Sua empresa chega em posição forte. A oportunidade permite crescer ainda mais, mas investimentos muito agressivos aumentam a exposição antes da rodada final.",

    innovative:
      "A inovação é uma das forças da empresa. Pense em como transformar essa capacidade em mercado, clientes e valor antes do Conselho Final.",

    balanced:
      "Sua empresa possui condições para aproveitar a oportunidade. Compare o retorno esperado com o investimento e os indicadores que ainda precisam melhorar."
  };

  return (
    tips[profile] ||
    tips.balanced
  );
}

/* =========================================================
   CENÁRIO
========================================================= */

const SCENARIO = {
  title:
    "A MAIOR OPORTUNIDADE DA ARENA",

  text:
    "Depois de enfrentar mudanças, concorrência e crises, surge uma oportunidade excepcional de mercado. Um novo ciclo de crescimento está começando e as empresas precisam decidir como participar.",

  challenge:
    "Esta é a última grande decisão estratégica antes do Conselho Final. Sua empresa vai recuperar terreno, crescer de forma equilibrada ou realizar uma grande expansão?"
};

/* =========================================================
   DECISÕES
========================================================= */

const ACTIONS = {
  recuperar: {
    title:
      "Plano de Recuperação Estratégica",

    description:
      "A empresa concentra esforços em recuperar clientes, fortalecer reputação e reorganizar sua posição no mercado.",

    caixa: 6000,
    clientes: 8,
    reputacao: 7,
    equipe: 4,
    inovacao: 2,
    xp: 14
  },

  consolidar: {
    title:
      "Consolidar e Crescer",

    description:
      "A empresa realiza investimento moderado para ampliar mercado sem comprometer excessivamente sua estrutura.",

    caixa: -7000,
    clientes: 10,
    reputacao: 6,
    equipe: 3,
    inovacao: 5,
    xp: 17
  },

  expandir: {
    title:
      "Grande Expansão 360°",

    description:
      "A empresa faz um investimento elevado para ampliar mercado, inovação e presença competitiva antes da rodada final.",

    caixa: -15000,
    clientes: 14,
    reputacao: 5,
    equipe: -2,
    inovacao: 9,
    xp: 21
  }
};

/* =========================================================
   AJUSTE CONTEXTUAL
========================================================= */

function contextualResult(
  company,
  actionId
) {
  const base = {
    ...ACTIONS[actionId]
  };

  const profile =
    companyProfile(company);

  /*
    A opção de recuperação gera caixa por meio
    de reorganização operacional, recuperação
    comercial e redução de perdas — não é
    dinheiro gratuito.
  */

  if (
    actionId === "recuperar" &&
    profile === "recovery"
  ) {
    base.caixa += 4000;
    base.clientes += 3;
    base.reputacao += 2;
    base.xp += 3;
  }

  if (
    actionId === "recuperar" &&
    profile === "leader"
  ) {
    /*
      Retorno menor para empresa já forte.
      Evita vantagem excessiva.
    */
    base.caixa = 3000;
    base.clientes = 4;
    base.reputacao = 3;
    base.equipe = 2;
  }

  if (
    actionId === "consolidar" &&
    profile === "balanced"
  ) {
    base.clientes += 2;
    base.reputacao += 1;
  }

  if (
    actionId === "expandir" &&
    profile === "innovative"
  ) {
    base.clientes += 2;
    base.inovacao += 2;
    base.xp += 2;
  }

  return base;
}

/* =========================================================
   INTERFACE
========================================================= */

function injectInterface(
  company
) {
  if (
    document.querySelector(
      "#adm360R19"
    )
  ) {
    return;
  }

  const host =
    document.querySelector(
      "#decisaoArea"
    );

  if (!host) return;

  const box =
    document.createElement(
      "section"
    );

  box.id =
    "adm360R19";

  box.style.cssText = `
    margin-top:16px;
    padding:20px;
    border:1px solid rgba(255,198,74,.42);
    border-radius:17px;
    background:
      linear-gradient(
        145deg,
        #07162e,
        #10244a
      );
    color:white;
  `;

  box.innerHTML = `
    <div style="
      color:#ffd47a;
      font-size:.76rem;
      font-weight:950;
      letter-spacing:.10em;
    ">
      ADM ARENA 360 • RODADA 19
    </div>

    <h2 style="
      margin:7px 0 10px;
      font-size:1.45rem;
    ">
      ${SCENARIO.title}
    </h2>

    <p style="
      line-height:1.6;
      color:#e7efff;
    ">
      ${SCENARIO.text}
    </p>

    <div style="
      margin:15px 0;
      padding:14px;
      border-radius:12px;
      background:rgba(255,198,74,.08);
      border:1px solid rgba(255,198,74,.22);
    ">
      <strong>
        DESAFIO
      </strong>

      <p style="
        margin-bottom:0;
        line-height:1.5;
      ">
        ${SCENARIO.challenge}
      </p>
    </div>

    <div style="
      margin:15px 0;
      padding:14px;
      border-radius:12px;
      background:rgba(94,164,255,.08);
      border:1px solid rgba(94,164,255,.22);
    ">
      <strong>
        DICA ESTRATÉGICA
      </strong>

      <p style="
        margin-bottom:0;
        line-height:1.5;
      ">
        ${strategicTip(company)}
      </p>
    </div>

    <div style="
      display:grid;
      grid-template-columns:
        repeat(
          auto-fit,
          minmax(120px,1fr)
        );
      gap:8px;
      margin:15px 0;
    ">
      <div>
        <small>CAIXA</small>
        <br>
        <strong>
          ADM$ ${money(company?.caixa)}
        </strong>
      </div>

      <div>
        <small>CLIENTES</small>
        <br>
        <strong>
          ${Number(company?.clientes || 0)}
        </strong>
      </div>

      <div>
        <small>REPUTAÇÃO</small>
        <br>
        <strong>
          ${Number(company?.reputacao || 0)}
        </strong>
      </div>

      <div>
        <small>EQUIPE</small>
        <br>
        <strong>
          ${Number(company?.equipe || 0)}
        </strong>
      </div>

      <div>
        <small>INOVAÇÃO</small>
        <br>
        <strong>
          ${Number(company?.inovacao || 0)}
        </strong>
      </div>
    </div>

    <h3>
      ESCOLHA A DECISÃO
    </h3>

    <div id="r19Options">
      ${Object.entries(ACTIONS)
        .map(
          ([id, action]) => `
            <button
              type="button"
              data-r19="${id}"
              style="
                display:block;
                width:100%;
                margin:9px 0;
                padding:14px;
                border:
                  1px solid
                  rgba(255,255,255,.15);
                border-radius:12px;
                background:
                  rgba(255,255,255,.04);
                color:white;
                text-align:left;
                cursor:pointer;
              "
            >
              <strong>
                ${action.title}
              </strong>

              <span style="
                display:block;
                margin-top:5px;
                opacity:.72;
                line-height:1.4;
              ">
                ${action.description}
              </span>
            </button>
          `
        )
        .join("")}
    </div>

    <div
      id="r19Selected"
      style="
        margin-top:13px;
        padding:13px;
        border-radius:11px;
        background:
          rgba(255,255,255,.045);
      "
    >
      Analise os indicadores e escolha
      uma estratégia.
    </div>

    <button
      type="button"
      id="r19Confirm"
      disabled
      style="
        width:100%;
        min-height:48px;
        margin-top:14px;
        border:0;
        border-radius:12px;
        font-weight:950;
        cursor:pointer;
      "
    >
      CONFIRMAR DECISÃO
    </button>
  `;

  host.appendChild(box);

  let selectedAction = "";

  box.addEventListener(
    "click",
    async event => {
      const option =
        event.target.closest(
          "[data-r19]"
        );

      if (option) {
        selectedAction =
          option.dataset.r19;

        box
          .querySelectorAll(
            "[data-r19]"
          )
          .forEach(button => {
            button.style.borderColor =
              "rgba(255,255,255,.15)";

            button.style.background =
              "rgba(255,255,255,.04)";
          });

        option.style.borderColor =
          "#ffd166";

        option.style.background =
          "rgba(255,209,102,.10)";

        const action =
          ACTIONS[selectedAction];

        box.querySelector(
          "#r19Selected"
        ).innerHTML = `
          <strong>
            ${action.title}
          </strong>

          <br>

          ${action.description}
        `;

        box.querySelector(
          "#r19Confirm"
        ).disabled = false;

        return;
      }

      if (
        event.target.closest(
          "#r19Confirm"
        ) &&
        selectedAction
      ) {
        await confirmDecision(
          selectedAction,
          box
        );
      }
    }
  );
}

/* =========================================================
   CONFIRMAR
========================================================= */

async function confirmDecision(
  actionId,
  box
) {
  const button =
    box.querySelector(
      "#r19Confirm"
    );

  if (
    !button ||
    button.disabled
  ) {
    return;
  }

  button.disabled = true;

  button.textContent =
    "REGISTRANDO DECISÃO...";

  try {
    const f =
      await getFirebase();

    const roomCode =
      detectRoomCode();

    if (!roomCode) {
      throw new Error(
        "Código da Arena não identificado."
      );
    }

    const snapshot =
      await f.get(
        f.ref(
          f.db,
          `rooms/${roomCode}`
        )
      );

    const room =
      snapshot.val();

    if (
      !room ||
      Number(room.round || 0) !==
        ROUND
    ) {
      throw new Error(
        "A Arena não está na Rodada 19."
      );
    }

    if (
      room.status === "Pausado"
    ) {
      throw new Error(
        "A Arena está pausada."
      );
    }

    const visible =
      getVisibleCompany(room);

    if (!visible) {
      throw new Error(
        "Empresa não identificada."
      );
    }

    if (
      visible.company
        ?.round19
        ?.decision
    ) {
      throw new Error(
        "A decisão da Rodada 19 já foi registrada."
      );
    }

    const company = {
      ...visible.company
    };

    const result =
      contextualResult(
        company,
        actionId
      );

    if (!result) {
      throw new Error(
        "Estratégia inválida."
      );
    }

    const newCash =
      Number(company.caixa || 0) +
      Number(result.caixa || 0);

    if (newCash < 0) {
      throw new Error(
        "O caixa atual não permite executar esta estratégia. Escolha outra opção."
      );
    }

    company.caixa =
      newCash;

    company.clientes =
      Math.max(
        0,
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
        )
      );

    company.equipe =
      clamp(
        Number(
          company.equipe || 0
        ) +
        Number(
          result.equipe || 0
        )
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
      Number(company.xp || 0) +
      Number(result.xp || 0);

    company.round19 = {
      decision: {
        action:
          actionId,

        title:
          result.title,

        effects: {
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

        profileBefore:
          companyProfile(
            visible.company
          ),

        decidedAt:
          Date.now()
      }
    };

    await f.set(
      f.ref(
        f.db,
        `rooms/${roomCode}/companies/${visible.id}`
      ),
      company
    );

    box.innerHTML = `
      <div style="
        color:#6ef0b1;
        font-size:.77rem;
        font-weight:950;
        letter-spacing:.08em;
      ">
        DECISÃO REGISTRADA
      </div>

      <h2>
        ${result.title}
      </h2>

      <p style="line-height:1.55;">
        Sua empresa concluiu a
        última grande decisão
