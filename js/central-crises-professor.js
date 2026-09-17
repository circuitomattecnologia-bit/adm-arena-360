/* ============================================================
   ADM ARENA 360
   CENTRAL DE CRISES, EVENTOS E INTERFERÊNCIAS
   PAINEL DO PROFESSOR — 20 RODADAS

   DISCIPLINA: PROJETO EMPREENDEDOR
   PROF. LEOPOLDO

   SEGURANÇA
   ------------------------------------------------------------
   • Módulo independente.
   • Não altera cronômetro.
   • Não altera Mobile.
   • Não altera rodada automaticamente.
   • Não altera status da Arena.
   • Não apaga empresas.
   • Não altera caixa, XP, clientes ou reputação diretamente.
   • Não interfere nas decisões já registradas.
   • Organiza e acompanha o roteiro estratégico das 20 rodadas.
============================================================ */


const ADM360_CRISIS_EVENTS = [

  {
    round: 1,
    category: "ABERTURA",
    title: "Fundação da Empresa",
    description:
      "Estruturação inicial da empresa e definição das primeiras decisões.",
    level: "normal"
  },

  {
    round: 2,
    category: "MERCADO",
    title: "Primeiros Movimentos do Mercado",
    description:
      "A empresa começa a perceber concorrentes, clientes e oportunidades.",
    level: "normal"
  },

  {
    round: 3,
    category: "GESTÃO",
    title: "Pressão por Resultados",
    description:
      "As primeiras escolhas começam a produzir consequências gerenciais.",
    level: "attention"
  },

  {
    round: 4,
    category: "CONCORRÊNCIA",
    title: "Movimentação dos Concorrentes",
    description:
      "Mudanças competitivas exigem análise antes da próxima decisão.",
    level: "attention"
  },

  {
    round: 5,
    category: "FINANÇAS",
    title: "Pressão Financeira",
    description:
      "O caixa passa a ter peso maior nas decisões estratégicas.",
    level: "attention"
  },

  {
    round: 6,
    category: "CRÉDITO",
    title: "Crédito Empresarial",
    description:
      "Possibilidade de empréstimo empresarial com juros e vencimento futuro.",
    level: "opportunity"
  },

  {
    round: 7,
    category: "FORNECEDORES",
    title: "Conflito Internacional",
    description:
      "Problemas externos afetam fornecedores, preços e planejamento.",
    level: "crisis"
  },

  {
    round: 8,
    category: "LOGÍSTICA",
    title: "Aumento dos Combustíveis",
    description:
      "Custos logísticos pressionam operações e exigem reorganização.",
    level: "crisis"
  },

  {
    round: 9,
    category: "FINANÇAS",
    title: "Vencimento Financeiro",
    description:
      "Compromissos financeiros anteriores passam a exigir atenção.",
    level: "attention"
  },

  {
    round: 10,
    category: "MERCADO",
    title: "Oscilação do Mercado",
    description:
      "O ambiente econômico muda e testa a capacidade de adaptação.",
    level: "attention"
  },

  {
    round: 11,
    category: "NEGOCIAÇÃO",
    title: "Negociação e Oportunidades",
    description:
      "A rodada amplia possibilidades de negociação e recuperação.",
    level: "opportunity"
  },

  {
    round: 12,
    category: "INOVAÇÃO",
    title: "Inovação e Transformação",
    description:
      "Empresas precisam decidir quanto investir em inovação e futuro.",
    level: "opportunity"
  },

  {
    round: 13,
    category: "SOCIAL",
    title: "Responsabilidade Social",
    description:
      "A reputação empresarial passa também pela relação com a sociedade.",
    level: "opportunity"
  },

  {
    round: 14,
    category: "EXPANSÃO",
    title: "Expansão Estratégica",
    description:
      "Crescer exige equilíbrio entre oportunidade, investimento e risco.",
    level: "attention"
  },

  {
    round: 15,
    category: "RECUPERAÇÃO",
    title: "Reposicionamento Empresarial",
    description:
      "Empresas em dificuldade recebem novas possibilidades de reação.",
    level: "opportunity"
  },

  {
    round: 16,
    category: "CRISE",
    title: "CHOQUE DE MERCADO",
    description:
      "Uma mudança brusca testa caixa, clientes, reputação e capacidade de reação.",
    level: "critical"
  },

  {
    round: 17,
    category: "CONCORRÊNCIA",
    title: "GUERRA COMERCIAL",
    description:
      "Concorrentes disputam mercado com estratégias agressivas.",
    level: "critical"
  },

  {
    round: 18,
    category: "CRISE",
    title: "CRISE 360°",
    description:
      "Finanças, mercado, pessoas e estratégia são pressionados simultaneamente.",
    level: "critical"
  },

  {
    round: 19,
    category: "OPORTUNIDADE",
    title: "A GRANDE OPORTUNIDADE",
    description:
      "Última grande possibilidade de crescimento, recuperação e reposicionamento.",
    level: "opportunity"
  },

  {
    round: 20,
    category: "FINAL",
    title: "CONSELHO FINAL — O LEGADO DA EMPRESA",
    description:
      "Avaliação final da gestão construída durante toda a ADM Arena 360.",
    level: "final"
  }

];


/* ============================================================
   INICIALIZAÇÃO
============================================================ */

startCrisisCenter();


function startCrisisCenter() {

  if (
    document.body.dataset.adm360CrisisCenter ===
    "ready"
  ) {
    return;
  }

  document.body.dataset.adm360CrisisCenter =
    "ready";


  installCrisisCenterStyles();

  createCrisisCenter();

  startCrisisCenterSync();

}


/* ============================================================
   ESTILOS
============================================================ */

function installCrisisCenterStyles() {

  if (
    document.getElementById(
      "adm360CrisisCenterStyles"
    )
  ) {
    return;
  }


  const style =
    document.createElement("style");


  style.id =
    "adm360CrisisCenterStyles";


  style.textContent = `

    #adm360CrisisCenter {
      margin-top: 18px;
      padding: 20px;
      border-radius: 22px;
      border: 1px solid rgba(255,255,255,.12);
      background:
        linear-gradient(
          145deg,
          rgba(8,24,49,.96),
          rgba(15,17,42,.96)
        );
      box-shadow:
        0 18px 50px rgba(0,0,0,.25);
    }


    .adm360-crisis-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 18px;
      margin-bottom: 18px;
    }


    .adm360-crisis-header h2 {
      margin: 4px 0;
      font-size: 1.35rem;
    }


    .adm360-crisis-header p {
      margin: 5px 0 0;
      opacity: .72;
      max-width: 760px;
      line-height: 1.5;
    }


    .adm360-crisis-round {
      min-width: 125px;
      padding: 12px 15px;
      border-radius: 16px;
      text-align: center;
      border: 1px solid rgba(108,174,255,.30);
      background: rgba(46,134,255,.10);
    }


    .adm360-crisis-round span {
      display: block;
      font-size: .68rem;
      opacity: .65;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: .06em;
    }


    .adm360-crisis-round strong {
      display: block;
      margin-top: 3px;
      font-size: 1.25rem;
    }


    .adm360-crisis-current {
      padding: 18px;
      margin-bottom: 18px;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.045);
    }


    .adm360-crisis-current-label {
      font-size: .72rem;
      opacity: .64;
      text-transform: uppercase;
      font-weight: 900;
      letter-spacing: .07em;
    }


    .adm360-crisis-current h3 {
      margin: 7px 0 5px;
      font-size: 1.2rem;
    }


    .adm360-crisis-current p {
      margin: 0;
      opacity: .78;
      line-height: 1.5;
    }


    .adm360-crisis-badge {
      display: inline-block;
      margin-top: 12px;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: .72rem;
      font-weight: 900;
      letter-spacing: .04em;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.06);
    }


    .adm360-crisis-grid {
      display: grid;
      grid-template-columns:
        repeat(4, minmax(0,1fr));
      gap: 10px;
    }


    .adm360-crisis-card {
      padding: 13px;
      min-height: 118px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,.09);
      background: rgba(255,255,255,.035);
      transition:
        transform .15s ease,
        border-color .15s ease,
        background .15s ease;
    }


    .adm360-crisis-card:hover {
      transform: translateY(-2px);
      border-color: rgba(122,180,255,.35);
      background: rgba(255,255,255,.06);
    }


    .adm360-crisis-card.current {
      border-color: rgba(95,170,255,.70);
      background:
        linear-gradient(
          145deg,
          rgba(46,134,255,.18),
          rgba(221,53,154,.10)
        );
      box-shadow:
        0 0 22px rgba(46,134,255,.12);
    }


    .adm360-crisis-card.past {
      opacity: .58;
    }


    .adm360-crisis-card-round {
      font-size: .67rem;
      opacity: .64;
      font-weight: 900;
      letter-spacing: .06em;
    }


    .adm360-crisis-card strong {
      display: block;
      margin: 5px 0;
      line-height: 1.25;
      font-size: .87rem;
    }


    .adm360-crisis-card small {
      display: block;
      opacity: .64;
      line-height: 1.35;
    }


    .adm360-crisis-card-category {
      display: inline-block;
      margin-top: 7px;
      padding: 4px 7px;
      border-radius: 999px;
      background: rgba(255,255,255,.055);
      font-size: .60rem;
      font-weight: 900;
      letter-spacing: .04em;
    }


    .adm360-crisis-footer {
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid rgba(255,255,255,.08);
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: center;
      font-size: .75rem;
      opacity: .68;
    }


    @media(max-width:1100px) {

      .adm360-crisis-grid {
        grid-template-columns:
          repeat(3,minmax(0,1fr));
      }

    }


    @media(max-width:760px) {

      .adm360-crisis-grid {
        grid-template-columns:
          repeat(2,minmax(0,1fr));
      }


      .adm360-crisis-header {
        flex-direction: column;
      }

    }

  `;


  document.head.appendChild(style);

}


/* ============================================================
   CRIA A CENTRAL
============================================================ */

function createCrisisCenter() {

  if (
    document.getElementById(
      "adm360CrisisCenter"
    )
  ) {
    return;
  }


  const eventsPanel =
    document.querySelector(
      '.teacher-nucleus-panel[data-panel="eventos"]'
    );


  if (!eventsPanel) {
    return;
  }


  const center =
    document.createElement("section");


  center.id =
    "adm360CrisisCenter";


  center.innerHTML = `

    <div class="adm360-crisis-header">

      <div>

        <div class="eyebrow">
          CENTRAL ESTRATÉGICA DO PROFESSOR
        </div>

        <h2>
          CENTRAL DE CRISES, EVENTOS E INTERFERÊNCIAS
        </h2>

        <p>
          Visão estratégica das 20 rodadas da ADM Arena 360.
          A Central acompanha crises, oportunidades, mercado,
          finanças, pessoas, concorrência, expansão e recuperação
          sem modificar automaticamente os dados das empresas.
        </p>

      </div>


      <div class="adm360-crisis-round">

        <span>
          Rodada da Arena
        </span>

        <strong id="adm360CrisisRound">
          0/20
        </strong>

      </div>

    </div>


    <div
      id="adm360CurrentCrisis"
      class="adm360-crisis-current"
    >
    </div>


    <div
      id="adm360CrisisGrid"
      class="adm360-crisis-grid"
    >
    </div>


    <div class="adm360-crisis-footer">

      <span>
        ADM ARENA 360 • PROJETO EMPREENDEDOR
      </span>

      <span>
        PROF. LEOPOLDO • 20 RODADAS
      </span>

    </div>

  `;


  const oldEventsCard =
    eventsPanel.querySelector(
      ".events-card"
    );


  if (oldEventsCard) {

    oldEventsCard.insertAdjacentElement(
      "afterend",
      center
    );

  } else {

    eventsPanel.appendChild(center);

  }


  renderCrisisCenter();

}


/* ============================================================
   SINCRONIZA COM O PAINEL EXISTENTE
============================================================ */

function startCrisisCenterSync() {

  renderCrisisCenter();


  setInterval(
    renderCrisisCenter,
    700
  );

}


/* ============================================================
   DESCOBRE A RODADA ATUAL
============================================================ */

function getCurrentRound() {

  const roundElement =
    document.querySelector("#rodada");


  if (!roundElement) {
    return 0;
  }


  const text =
    String(
      roundElement.textContent || ""
    );


  const match =
    text.match(/\d+/);


  if (!match) {
    return 0;
  }


  return Math.max(
    0,
    Math.min(
      20,
      Number(match[0]) || 0
    )
  );

}


/* ============================================================
   RENDER
============================================================ */

function renderCrisisCenter() {

  const center =
    document.getElementById(
      "adm360CrisisCenter"
    );


  if (!center) {
    return;
  }


  const round =
    getCurrentRound();


  const roundBox =
    document.getElementById(
      "adm360CrisisRound"
    );


  if (roundBox) {

    roundBox.textContent =
      `${round}/20`;

  }


  renderCurrentCrisis(round);

  renderCrisisGrid(round);

}


/* ============================================================
   SITUAÇÃO ATUAL
============================================================ */

function renderCurrentCrisis(round) {

  const box =
    document.getElementById(
      "adm360CurrentCrisis"
    );


  if (!box) {
    return;
  }


  if (!round) {

    box.innerHTML = `

      <div class="adm360-crisis-current-label">
        SITUAÇÃO ATUAL
      </div>

      <h3>
        Aguardando início da Arena
      </h3>

      <p>
        Quando uma sala estiver ativa,
        esta Central acompanhará automaticamente
        a rodada em andamento.
      </p>

      <span class="adm360-crisis-badge">
        20 RODADAS CONFIGURADAS
      </span>

    `;

    return;

  }


  const event =
    ADM360_CRISIS_EVENTS.find(
      item =>
        item.round === round
    );


  if (!event) {
    return;
  }


  box.innerHTML = `

    <div class="adm360-crisis-current-label">
      RODADA ${event.round} • ${event.category}
    </div>

    <h3>
      ${escapeCrisisHtml(event.title)}
    </h3>

    <p>
      ${escapeCrisisHtml(event.description)}
    </p>

    <span class="adm360-crisis-badge">
      ${getLevelLabel(event.level)}
    </span>

  `;

}


/* ============================================================
   MAPA DAS 20 RODADAS
============================================================ */

function renderCrisisGrid(round) {

  const grid =
    document.getElementById(
      "adm360CrisisGrid"
    );


  if (!grid) {
    return;
  }


  grid.innerHTML =
    ADM360_CRISIS_EVENTS
      .map(event => {

        let stateClass = "";

        if (
          round &&
          event.round < round
        ) {
          stateClass = "past";
        }


        if (
          event.round === round
        ) {
          stateClass = "current";
        }


        return `

          <article
            class="adm360-crisis-card ${stateClass}"
          >

            <div
              class="adm360-crisis-card-round"
            >
              RODADA ${event.round}
            </div>

            <strong>
              ${escapeCrisisHtml(
                event.title
              )}
            </strong>

            <small>
              ${escapeCrisisHtml(
                event.description
              )}
            </small>

            <span
              class="adm360-crisis-card-category"
            >
              ${escapeCrisisHtml(
                event.category
              )}
            </span>

          </article>

        `;

      })
      .join("");

}


/* ============================================================
   NÍVEL
============================================================ */

function getLevelLabel(level) {

  const labels = {

    normal:
      "CENÁRIO EMPRESARIAL",

    attention:
      "ATENÇÃO ESTRATÉGICA",

    crisis:
      "CRISE EMPRESARIAL",

    critical:
      "ALTA PRESSÃO",

    opportunity:
      "OPORTUNIDADE ESTRATÉGICA",

    final:
      "DECISÃO FINAL"

  };


  return (
    labels[level] ||
    "SITUAÇÃO DA ARENA"
  );

}


/* ============================================================
   SEGURANÇA DE TEXTO
============================================================ */

function escapeCrisisHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}
