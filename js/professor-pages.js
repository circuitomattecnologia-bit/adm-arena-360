/* =========================================================
   ADM ARENA 360
   PAINEL DO PROFESSOR — NAVEGAÇÃO POR TELAS INTERNAS

   DISCIPLINA: PROJETO EMPREENDEDOR
   PROF. LEOPOLDO

   OBJETIVO
   ---------------------------------------------------------
   Transformar os núcleos do Painel do Professor em telas
   internas independentes, evitando a rolagem da página
   principal para localizar informações.

   SEGURANÇA
   ---------------------------------------------------------
   - NÃO lê Firebase.
   - NÃO grava Firebase.
   - NÃO altera sala.
   - NÃO altera rodada.
   - NÃO altera status da Arena.
   - NÃO altera empresas.
   - NÃO altera caixa, clientes, reputação, XP ou recursos.
   - NÃO interfere nas autorizações.
   - Atua somente na navegação e apresentação visual.
========================================================= */

const NUCLEOS = new Set([
  "comando",
  "empresas",
  "mobile",
  "eventos",
  "leilao",
  "negociacoes"
]);

const TITULOS = {
  comando: "Comando",
  empresas: "Empresas",
  mobile: "Mobile",
  eventos: "Eventos",
  leilao: "Leilão",
  negociacoes: "Negociações"
};

iniciarProfessorPages();


/* =========================================================
   INÍCIO
========================================================= */

function iniciarProfessorPages() {

  if (
    !document.querySelector(
      ".teacher-nuclei"
    )
  ) {
    return;
  }

  instalarEstilo();

  document.body.classList.add(
    "adm360-professor-pages"
  );

  prepararPaineis();

  instalarNavegacao();

  instalarHistorico();

  const inicial =
    nucleoDoHash() ||
    nucleoAtivoAtual() ||
    "comando";

  abrirNucleo(
    inicial,
    {
      atualizarHash: false
    }
  );
}


/* =========================================================
   ESTILO
========================================================= */

function instalarEstilo() {

  if (
    document.querySelector(
      "#adm360ProfessorPagesStyle"
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "adm360ProfessorPagesStyle";

  style.textContent = `

    /* =====================================================
       CENTRAL DE NAVEGAÇÃO
    ===================================================== */

    body.adm360-professor-pages
    .teacher-nuclei {

      position: sticky;

      top: 8px;

      z-index: 60;

      margin-bottom: 14px;
    }


    /* =====================================================
       TELAS
    ===================================================== */

    body.adm360-professor-pages
    .teacher-nucleus-panel {

      display:
        none !important;

      width:
        100%;

      min-width:
        0;

      box-sizing:
        border-box;

      animation:
        none !important;
    }


    body.adm360-professor-pages
    .teacher-nucleus-panel.active {

      display:
        block !important;

      height:
        calc(100vh - 185px);

      min-height:
        520px;

      max-height:
        calc(100vh - 185px);

      overflow-y:
        auto;

      overflow-x:
        hidden;

      overscroll-behavior:
        contain;

      scrollbar-gutter:
        stable;

      padding:
        2px 8px 24px 2px;

      box-sizing:
        border-box;
    }


    /* =====================================================
       BARRA DE ROLAGEM DA TELA INTERNA
    ===================================================== */

    body.adm360-professor-pages
    .teacher-nucleus-panel.active
    ::-webkit-scrollbar {

      width: 10px;
    }


    body.adm360-professor-pages
    .teacher-nucleus-panel.active::-webkit-scrollbar {

      width: 10px;
    }


    body.adm360-professor-pages
    .teacher-nucleus-panel.active::-webkit-scrollbar-track {

      background:
        rgba(
          255,
          255,
          255,
          .025
        );

      border-radius:
        999px;
    }


    body.adm360-professor-pages
    .teacher-nucleus-panel.active::-webkit-scrollbar-thumb {

      background:
        rgba(
          120,
          174,
          255,
          .30
        );

      border-radius:
        999px;

      border:
        2px solid
        rgba(
          5,
          14,
          30,
          .55
        );
    }


    body.adm360-professor-pages
    .teacher-nucleus-panel.active::-webkit-scrollbar-thumb:hover {

      background:
        rgba(
          120,
          174,
          255,
          .48
        );
    }


    /* =====================================================
       CABEÇALHO DA TELA ATIVA
    ===================================================== */

    body.adm360-professor-pages
    .teacher-panel-heading {

      position:
        sticky;

      top:
        0;

      z-index:
        12;

      backdrop-filter:
        blur(14px);

      background:
        linear-gradient(
          135deg,
          rgba(
            8,
            25,
            56,
            .97
          ),
          rgba(
            22,
            16,
            50,
            .95
          )
        );

      box-shadow:
        0 10px 28px
        rgba(
          0,
          0,
          0,
          .18
        );
    }


    /* =====================================================
       BOTÃO ATIVO
    ===================================================== */

    body.adm360-professor-pages
    .teacher-nucleus-btn.active {

      box-shadow:
        0 0 0 1px
        rgba(
          116,
          176,
          255,
          .18
        ),
        0 0 24px
        rgba(
          46,
          134,
          255,
          .20
        );
    }


    /* =====================================================
       ELEMENTOS INTERNOS
    ===================================================== */

    body.adm360-professor-pages
    .teacher-nucleus-panel.active
    > * {

      max-width:
        100%;

      box-sizing:
        border-box;
    }


    body.adm360-professor-pages
    .teacher-nucleus-panel.active
    .adm360-company-detail-panel.show {

      margin-bottom:
        18px;
    }


    /* =====================================================
       MOBILE / TELA PEQUENA
    ===================================================== */

    @media(
      max-width:
      900px
    ) {

      body.adm360-professor-pages
      .teacher-nucleus-panel.active {

        height:
          auto;

        min-height:
          0;

        max-height:
          none;

        overflow:
          visible;

        padding-right:
          0;
      }


      body.adm360-professor-pages
      .teacher-panel-heading {

        position:
          static;
      }

    }

  `;

  document.head.appendChild(
    style
  );
}


/* =========================================================
   PREPARA OS PAINÉIS
========================================================= */

function prepararPaineis() {

  document
    .querySelectorAll(
      ".teacher-nucleus-panel[data-panel]"
    )
    .forEach(
      panel => {

        panel.setAttribute(
          "role",
          "region"
        );

        panel.setAttribute(
          "tabindex",
          "-1"
        );

        const nome =
          normalizarNucleo(
            panel.dataset.panel
          );

        if (nome) {

          panel.setAttribute(
            "aria-label",
            `Tela ${
              TITULOS[nome] ||
              nome
            }`
          );

        }

      }
    );


  document
    .querySelectorAll(
      ".teacher-nucleus-btn[data-nucleus]"
    )
    .forEach(
      button => {

        button.setAttribute(
          "aria-pressed",
          button
            .classList
            .contains(
              "active"
            )
            ? "true"
            : "false"
        );

      }
    );
}


/* =========================================================
   NAVEGAÇÃO

   IMPORTANTE:
   CAPTURE impede o código antigo
   de executar window.scrollTo().
========================================================= */

function instalarNavegacao() {

  document.addEventListener(

    "click",

    event => {

      const button =
        event.target.closest(
          ".teacher-nucleus-btn[data-nucleus]"
        );


      if (!button) {
        return;
      }


      const nome =
        normalizarNucleo(
          button
            .dataset
            .nucleus
        );


      if (!nome) {
        return;
      }


      event.preventDefault();

      event.stopPropagation();

      event.stopImmediatePropagation();


      abrirNucleo(
        nome,
        {
          atualizarHash:
            true
        }
      );

    },

    true

  );
}


/* =========================================================
   ABRE UMA TELA
========================================================= */

function abrirNucleo(
  nome,
  {
    atualizarHash =
      true
  } = {}
) {

  nome =
    normalizarNucleo(
      nome
    );


  if (!nome) {
    return;
  }


  /* =======================================================
     BOTÕES
  ======================================================= */

  document
    .querySelectorAll(
      ".teacher-nucleus-btn[data-nucleus]"
    )
    .forEach(
      button => {

        const ativo =
          button
            .dataset
            .nucleus ===
          nome;


        button.classList.toggle(
          "active",
          ativo
        );


        button.setAttribute(
          "aria-pressed",
          ativo
            ? "true"
            : "false"
        );

      }
    );


  /* =======================================================
     PAINÉIS
  ======================================================= */

  let painelAtivo =
    null;


  document
    .querySelectorAll(
      ".teacher-nucleus-panel[data-panel]"
    )
    .forEach(
      panel => {

        const ativo =
          panel
            .dataset
            .panel ===
          nome;


        panel.classList.toggle(
          "active",
          ativo
        );


        panel.hidden =
          !ativo;


        if (ativo) {
          painelAtivo =
            panel;
        }

      }
    );


  /* =======================================================
     CADA TELA COMEÇA DO TOPO
  ======================================================= */

  if (painelAtivo) {

    painelAtivo.scrollTop =
      0;


    requestAnimationFrame(
      () => {

        painelAtivo.scrollTop =
          0;

      }
    );

  }


  /* =======================================================
     ENDEREÇO
  ======================================================= */

  if (atualizarHash) {

    atualizarEndereco(
      nome
    );

  }


  /* =======================================================
     TÍTULO
  ======================================================= */

  document.title =
    `ADM Arena 360 — ${
      TITULOS[nome]
    } | Professor`;
}


/* =========================================================
   ENDEREÇO

   replaceState evita salto automático
   do navegador.
========================================================= */

function atualizarEndereco(
  nome
) {

  const url =
    new URL(
      window.location.href
    );


  url.hash =
    nome;


  window.history.replaceState(

    {
      ...(
        window
          .history
          .state ||
        {}
      ),

      adm360Nucleo:
        nome
    },

    "",

    url
  );
}


/* =========================================================
   HASH
========================================================= */

function instalarHistorico() {

  window.addEventListener(

    "hashchange",

    () => {

      const nome =
        nucleoDoHash();


      if (!nome) {
        return;
      }


      abrirNucleo(

        nome,

        {
          atualizarHash:
            false
        }

      );

    }

  );
}


/* =========================================================
   UTILIDADES
========================================================= */

function nucleoDoHash() {

  return normalizarNucleo(

    String(
      window
        .location
        .hash ||
      ""
    )
      .replace(
        /^#/,
        ""
      )
      .trim()
      .toLowerCase()

  );
}


function nucleoAtivoAtual() {

  const ativo =
    document.querySelector(
      ".teacher-nucleus-btn.active[data-nucleus]"
    );


  return normalizarNucleo(
    ativo
      ?.dataset
      ?.nucleus
  );
}


function normalizarNucleo(
  value
) {

  const nome =
    String(
      value ||
      ""
    )
      .trim()
      .toLowerCase();


  return NUCLEOS.has(
    nome
  )
    ? nome
    : null;
}
