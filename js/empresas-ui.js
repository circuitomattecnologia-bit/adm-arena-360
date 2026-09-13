/* =========================================================
   ADM ARENA 360
   NÚCLEO EMPRESAS — FICHA GERENCIAL

   DISCIPLINA: PROJETO EMPREENDEDOR
   PROF. LEOPOLDO

   MÓDULO VISUAL / ADMINISTRATIVO

   IMPORTANTE:
   - NÃO LÊ FIREBASE
   - NÃO GRAVA FIREBASE
   - NÃO ALTERA RODADA
   - NÃO ALTERA CAIXA
   - NÃO ALTERA XP
   - NÃO ALTERA CLIENTES
   - NÃO ALTERA REPUTAÇÃO
   - NÃO ALTERA RECURSOS
   - NÃO ALTERA EMPRESAS

   FUNÇÕES:
   1. Ficha Gerencial individual.
   2. Abertura em largura total da linha.
   3. Visão atual da empresa.
   4. Estrutura preparada para histórico futuro.
   5. Proteção forte contra exclusão acidental.
========================================================= */


const IS_PROFESSOR =
  !!document.querySelector("#iniciar");


if (IS_PROFESSOR) {
  iniciarEmpresasUI();
}


/* =========================================================
   ESTILO
========================================================= */

function instalarEstilo() {

  if (
    document.querySelector(
      "#adm360EmpresasUiStyle"
    )
  ) {
    return;
  }


  const style =
    document.createElement("style");


  style.id =
    "adm360EmpresasUiStyle";


  style.textContent = `

    /* =====================================================
       BOTÃO
    ===================================================== */

    .adm360-company-details-btn {

      border:
        1px solid
        rgba(92,183,255,.42);

      background:
        linear-gradient(
          135deg,
          rgba(92,183,255,.12),
          rgba(69,113,255,.08)
        );

      color: #e7f6ff;

      border-radius: 11px;

      padding: 9px 13px;

      font-weight: 950;

      cursor: pointer;

      white-space: nowrap;

      margin-right: 7px;

      transition:
        background .18s ease,
        border-color .18s ease,
        transform .18s ease;
    }


    .adm360-company-details-btn:hover {

      background:
        linear-gradient(
          135deg,
          rgba(92,183,255,.22),
          rgba(69,113,255,.15)
        );

      border-color:
        rgba(92,183,255,.65);

      transform:
        translateY(-1px);
    }


    .adm360-company-details-btn.is-open {

      background:
        linear-gradient(
          135deg,
          rgba(92,183,255,.23),
          rgba(69,113,255,.16)
        );

      color: #ffffff;

      border-color:
        rgba(92,183,255,.68);
    }


    /* =====================================================
       FICHA GERENCIAL

       CORREÇÃO PRINCIPAL:
       grid-column: 1 / -1

       Isso obriga a ficha a ocupar TODAS
       as colunas da linha da empresa.
    ===================================================== */

    .adm360-company-detail-panel {

      display: none;

      grid-column:
        1 / -1 !important;

      width:
        100% !important;

      max-width:
        none !important;

      min-width: 0;

      justify-self:
        stretch !important;

      align-self:
        stretch;

      box-sizing:
        border-box;

      margin:
        15px 0 7px;

      padding: 0;

      border-radius: 18px;

      overflow: hidden;

      border:
        1px solid
        rgba(92,183,255,.24);

      background:
        linear-gradient(
          145deg,
          rgba(7,18,42,.98),
          rgba(8,24,55,.96)
        );

      box-shadow:
        0 18px 45px
        rgba(0,0,0,.20);
    }


    .adm360-company-detail-panel.show {
      display: block;
    }


    /* =====================================================
       CABEÇALHO
    ===================================================== */

    .adm360-company-sheet-header {

      width: 100%;

      box-sizing: border-box;

      display: flex;

      align-items: center;

      justify-content: space-between;

      gap: 18px;

      padding:
        18px 20px;

      background:
        linear-gradient(
          90deg,
          rgba(31,104,255,.19),
          rgba(18,219,210,.08)
        );

      border-bottom:
        1px solid
        rgba(92,183,255,.18);
    }


    .adm360-company-sheet-heading {
      min-width: 0;
    }


    .adm360-company-sheet-kicker {

      display: block;

      margin-bottom: 4px;

      color:
        rgba(255,255,255,.58);

      font-size: .72rem;

      font-weight: 900;

      letter-spacing: .09em;

      text-transform: uppercase;
    }


    .adm360-company-sheet-title {

      margin: 0;

      color: #ffffff;

      font-size: 1.18rem;

      font-weight: 950;
    }


    .adm360-company-sheet-status {

      flex: 0 0 auto;

      padding:
        7px 11px;

      border-radius:
        999px;

      border:
        1px solid
        rgba(53,211,170,.34);

      background:
        rgba(53,211,170,.08);

      color:
        #acf4dd;

      font-size:
        .72rem;

      font-weight: 950;

      white-space: nowrap;
    }


    /* =====================================================
       CORPO
    ===================================================== */

    .adm360-company-sheet-body {

      width: 100%;

      box-sizing:
        border-box;

      padding:
        20px;
    }


    .adm360-company-section-title {

      display: flex;

      align-items: center;

      gap: 8px;

      margin:
        2px 0 11px;

      color:
        #dff5ff;

      font-size:
        .82rem;

      font-weight:
        950;

      letter-spacing:
        .04em;

      text-transform:
        uppercase;
    }


    .adm360-company-section-title span {

      width: 8px;

      height: 8px;

      flex:
        0 0 8px;

      border-radius:
        50%;

      background:
        #58dfff;

      box-shadow:
        0 0 12px
        rgba(88,223,255,.45);
    }


    /* =====================================================
       VISÃO ATUAL
    ===================================================== */

    .adm360-company-current {

      width: 100%;

      box-sizing:
        border-box;

      margin-bottom:
        20px;

      padding:
        15px 17px;

      border-radius:
        14px;

      border:
        1px solid
        rgba(92,183,255,.16);

      background:
        rgba(255,255,255,.025);
    }


    .adm360-company-current-text {

      color:
        rgba(255,255,255,.84);

      font-size:
        .88rem;

      line-height:
        1.65;

      white-space:
        pre-line;

      word-break:
        break-word;
    }


    /* =====================================================
       GRADE GERENCIAL
    ===================================================== */

    .adm360-company-management-grid {

      width: 100%;

      display: grid;

      grid-template-columns:
        repeat(
          3,
          minmax(0,1fr)
        );

      gap:
        13px;

      margin-bottom:
        20px;
    }


    .adm360-company-management-card {

      min-width: 0;

      min-height:
        145px;

      box-sizing:
        border-box;

      padding:
        15px 16px;

      border-radius:
        14px;

      border:
        1px solid
        rgba(255,255,255,.09);

      background:
        linear-gradient(
          145deg,
          rgba(255,255,255,.035),
          rgba(255,255,255,.018)
        );
    }


    .adm360-company-management-card h4 {

      margin:
        0 0 8px;

      color:
        #ffffff;

      font-size:
        .84rem;

      font-weight:
        950;

      line-height:
        1.35;
    }


    .adm360-company-management-card p {

      margin: 0;

      color:
        rgba(255,255,255,.61);

      font-size:
        .78rem;

      line-height:
        1.52;
    }


    .adm360-company-no-record {

      display:
        inline-flex;

      margin-top:
        10px;

      padding:
        5px 8px;

      border-radius:
        8px;

      border:
        1px solid
        rgba(255,255,255,.08);

      background:
        rgba(255,255,255,.025);

      color:
        rgba(255,255,255,.52);

      font-size:
        .69rem;

      font-weight:
        850;
    }


    /* =====================================================
       FINALIDADE
    ===================================================== */

    .adm360-company-pedagogical-box {

      width: 100%;

      box-sizing:
        border-box;

      margin-bottom:
        18px;

      padding:
        14px 16px;

      border-radius:
        14px;

      border:
        1px solid
        rgba(255,202,58,.20);

      background:
        rgba(255,202,58,.045);
    }


    .adm360-company-pedagogical-box strong {

      display: block;

      margin-bottom:
        6px;

      color:
        #ffe59a;

      font-size:
        .80rem;

      font-weight:
        950;
    }


    .adm360-company-pedagogical-box p {

      margin: 0;

      color:
        rgba(255,255,255,.67);

      font-size:
        .78rem;

      line-height:
        1.55;
    }


    /* =====================================================
       AÇÕES ADMINISTRATIVAS
    ===================================================== */

    .adm360-company-security-box {

      width: 100%;

      box-sizing:
        border-box;

      padding:
        14px 16px;

      border-radius:
        14px;

      border:
        1px solid
        rgba(255,84,107,.25);

      background:
        rgba(255,84,107,.055);
    }


    .adm360-company-security-box strong {

      display: block;

      color:
        #ffabb7;

      margin-bottom:
        6px;

      font-size:
        .80rem;

      font-weight:
        950;
    }


    .adm360-company-security-box small {

      display: block;

      color:
        rgba(255,255,255,.65);

      line-height:
        1.5;

      margin-bottom:
        12px;
    }


    .adm360-company-delete-area {

      display: flex;

      align-items: center;

      justify-content:
        space-between;

      flex-wrap: wrap;

      gap: 12px;

      padding-top:
        11px;

      border-top:
        1px solid
        rgba(255,84,107,.14);
    }


    .adm360-company-delete-warning {

      max-width:
        760px;

      color:
        #ffbcc5;

      font-size:
        .72rem;

      line-height:
        1.45;

      font-weight:
        800;
    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    .delete-company {
      display:
        none !important;
    }


    .adm360-company-detail-panel.show
    .delete-company {

      display:
        inline-flex !important;
    }


    /* =====================================================
       RESPONSIVO
    ===================================================== */

    @media(max-width:1100px) {

      .adm360-company-management-grid {

        grid-template-columns:
          repeat(
            2,
            minmax(0,1fr)
          );
      }

    }


    @media(max-width:700px) {

      .adm360-company-details-btn {

        width: 100%;

        margin:
          7px 0 0;
      }


      .adm360-company-sheet-header {

        flex-direction:
          column;

        align-items:
          flex-start;
      }


      .adm360-company-management-grid {

        grid-template-columns:
          1fr;
      }


      .adm360-company-sheet-body {

        padding:
          15px;
      }


      .adm360-company-delete-area {

        flex-direction:
          column;

        align-items:
          stretch;
      }

    }

  `;


  document.head.appendChild(
    style
  );
}


/* =========================================================
   INÍCIO
========================================================= */

function iniciarEmpresasUI() {

  instalarEstilo();

  processarEmpresas();


  const observer =
    new MutationObserver(
      () => {
        processarEmpresas();
      }
    );


  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );


  instalarProtecaoExclusao();
}


/* =========================================================
   LOCALIZA A LINHA DA EMPRESA
========================================================= */

function localizarLinhaEmpresa(
  button
) {

  let node =
    button?.parentElement;


  const container =
    document.querySelector(
      "#empresas"
    );


  while (
    node &&
    node !== container &&
    node.parentElement
  ) {

    if (
      node.parentElement ===
      container
    ) {
      return node;
    }


    node =
      node.parentElement;
  }


  return (
    button?.parentElement ||
    null
  );
}


/* =========================================================
   PROCESSA EMPRESAS
========================================================= */

function processarEmpresas() {

  const container =
    document.querySelector(
      "#empresas"
    );


  if (!container) {
    return;
  }


  container
    .querySelectorAll(
      ".delete-company"
    )
    .forEach(
      deleteButton => {

        if (
          deleteButton
            .dataset
            .adm360Protected ===
          "1"
        ) {
          return;
        }


        deleteButton
          .dataset
          .adm360Protected =
          "1";


        const companyId =
          deleteButton
            .dataset
            .companyId ||
          "";


        const companyName =
          deleteButton
            .dataset
            .companyName ||
          "Empresa";


        const row =
          localizarLinhaEmpresa(
            deleteButton
          );


        if (!row) {
          return;
        }


        row.dataset
          .adm360CompanyRow =
          companyId ||
          companyName;


        criarFichaGerencial(
          row,
          deleteButton,
          companyName
        );

      }
    );
}


/* =========================================================
   CRIA FICHA GERENCIAL
========================================================= */

function criarFichaGerencial(
  row,
  deleteButton,
  companyName
) {

  if (
    row.querySelector(
      ".adm360-company-details-btn"
    )
  ) {
    return;
  }


  const button =
    document.createElement(
      "button"
    );


  button.type =
    "button";


  button.className =
    "adm360-company-details-btn";


  button.textContent =
    "FICHA GERENCIAL";


  /* =======================================================
     CAPTURA APENAS DADOS JÁ VISÍVEIS

     Não consulta banco.
     Não cria valores.
  ======================================================= */

  const currentText =
    capturarResumoAtual(
      row
    );


  const panel =
    document.createElement(
      "div"
    );


  panel.className =
    "adm360-company-detail-panel";


  panel.innerHTML = `

    <div
      class="adm360-company-sheet-header"
    >

      <div
        class="adm360-company-sheet-heading"
      >

        <span
          class="adm360-company-sheet-kicker"
        >
          ADM ARENA 360 • FICHA GERENCIAL
        </span>

        <h3
          class="adm360-company-sheet-title"
        >
          🏢 ${escapeHtml(
            companyName
          )}
        </h3>

      </div>


      <div
        class="adm360-company-sheet-status"
      >
        ACOMPANHAMENTO GERENCIAL
      </div>

    </div>


    <div
      class="adm360-company-sheet-body"
    >

      <div
        class="adm360-company-section-title"
      >
        <span></span>
        VISÃO ATUAL DA EMPRESA
      </div>


      <div
        class="adm360-company-current"
      >

        <div
          class="adm360-company-current-text"
        >
          ${
            currentText
              ? escapeHtml(
                  currentText
                )
              : (
                "Dados atuais não " +
                "identificados."
              )
          }
        </div>

      </div>


      <div
        class="adm360-company-section-title"
      >
        <span></span>
        HISTÓRICO E ANÁLISE GERENCIAL
      </div>


      <div
        class="adm360-company-management-grid"
      >

        <article
          class="adm360-company-management-card"
        >

          <h4>
            💰 FINANCEIRO
          </h4>

          <p>
            Evolução do caixa,
            investimentos, empréstimos,
            dívidas e compromissos
            financeiros da empresa.
          </p>

          <div
            class="adm360-company-no-record"
          >
            Ainda não há histórico registrado
          </div>

        </article>


        <article
          class="adm360-company-management-card"
        >

          <h4>
            🎯 DECISÕES POR RODADA
          </h4>

          <p>
            Decisões estratégicas adotadas
            pela equipe e resultados
            produzidos ao longo da Arena.
          </p>

          <div
            class="adm360-company-no-record"
          >
            Ainda não há histórico registrado
          </div>

        </article>


        <article
          class="adm360-company-management-card"
        >

          <h4>
            📈 MERCADO E CLIENTES
          </h4>

          <p>
            Evolução dos clientes,
            posicionamento comercial,
            mercado e negociações.
          </p>

          <div
            class="adm360-company-no-record"
          >
            Ainda não há histórico registrado
          </div>

        </article>


        <article
          class="adm360-company-management-card"
        >

          <h4>
            🏆 REPUTAÇÃO E PESSOAS
          </h4>

          <p>
            Impactos das decisões
            sobre reputação, equipe
            e relacionamento com
            o mercado.
          </p>

          <div
            class="adm360-company-no-record"
          >
            Ainda não há histórico registrado
          </div>

        </article>


        <article
          class="adm360-company-management-card"
        >

          <h4>
            🚨 EVENTOS E CRISES
          </h4>

          <p>
            Ocorrências enfrentadas,
            respostas adotadas
            e consequências produzidas
            durante a competição.
          </p>

          <div
            class="adm360-company-no-record"
          >
            Ainda não há histórico registrado
          </div>

        </article>


        <article
          class="adm360-company-management-card"
        >

          <h4>
            💡 INOVAÇÃO E RESPONSABILIDADE SOCIAL
          </h4>

          <p>
            Investimentos em inovação,
            ações sociais e resultados
            relacionados à gestão
            sustentável.
          </p>

          <div
            class="adm360-company-no-record"
          >
            Ainda não há histórico registrado
          </div>

        </article>

      </div>


      <div
        class="adm360-company-pedagogical-box"
      >

        <strong>
          FINALIDADE DA FICHA GERENCIAL
        </strong>

        <p>
          A ficha será ampliada conforme
          novas rodadas e novos registros
          gerenciais forem implementados.
          O objetivo é permitir ao professor
          compreender não apenas o resultado
          atual, mas também quais decisões
          levaram a empresa ao seu desempenho.
        </p>

      </div>


      <div
        class="adm360-company-security-box"
      >

        <strong>
          🔐 AÇÕES ADMINISTRATIVAS
        </strong>

        <small>
          A exclusão não faz parte
          da gestão normal da empresa.
          É uma operação crítica
          e permanece protegida por
          três etapas de confirmação.
        </small>


        <div
          class="adm360-company-delete-area"
        >

          <div
            class="adm360-company-delete-warning"
          >
            EXCLUSÃO PROTEGIDA:
            utilize somente quando
            uma empresa realmente
            precisar ser removida
            da Arena.
          </div>

        </div>

      </div>

    </div>

  `;


  /* =======================================================
     POSICIONA BOTÃO
  ======================================================= */

  const originalParent =
    deleteButton
      .parentElement;


  if (originalParent) {

    originalParent
      .insertBefore(
        button,
        deleteButton
      );

  }


  /* =======================================================
     INSERE FICHA

     A ficha fica dentro da linha da empresa,
     porém CSS grid-column: 1 / -1 faz com que
     ocupe a linha inteira.
  ======================================================= */

  row.appendChild(
    panel
  );


  /* =======================================================
     MANTÉM BOTÃO ORIGINAL DE EXCLUSÃO
  ======================================================= */

  const deleteArea =
    panel.querySelector(
      ".adm360-company-delete-area"
    );


  if (deleteArea) {

    deleteArea
      .appendChild(
        deleteButton
      );

  }


  /* =======================================================
     ABRIR / FECHAR
  ======================================================= */

  button.addEventListener(

    "click",

    event => {

      event.preventDefault();

      event.stopPropagation();


      fecharOutrasFichas(
        panel,
        button
      );


      const open =
        panel.classList
          .toggle(
            "show"
          );


      button.classList
        .toggle(
          "is-open",
          open
        );


      button.textContent =
        open
          ? "FECHAR FICHA"
          : "FICHA GERENCIAL";

    }

  );
}


/* =========================================================
   CAPTURA RESUMO ATUAL
========================================================= */

function capturarResumoAtual(
  row
) {

  if (!row) {
    return "";
  }


  const clone =
    row.cloneNode(
      true
    );


  clone
    .querySelectorAll(
      [
        ".adm360-company-details-btn",
        ".adm360-company-detail-panel",
        ".delete-company"
      ].join(",")
    )
    .forEach(
      element => {
        element.remove();
      }
    );


  return String(
    clone.innerText ||
    ""
  )
    .replace(
      /FICHA GERENCIAL/gi,
      ""
    )
    .replace(
      /FECHAR FICHA/gi,
      ""
    )
    .replace(
      /DETALHES/gi,
      ""
    )
    .replace(
      /EXCLUIR/gi,
      ""
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}


/* =========================================================
   FECHA OUTRAS FICHAS

   Somente uma empresa aberta por vez.
========================================================= */

function fecharOutrasFichas(
  currentPanel,
  currentButton
) {

  document
    .querySelectorAll(
      ".adm360-company-detail-panel.show"
    )
    .forEach(
      panel => {

        if (
          panel ===
          currentPanel
        ) {
          return;
        }


        panel.classList
          .remove(
            "show"
          );


        const row =
          panel.closest(
            "[data-adm360-company-row]"
          );


        const button =
          row?.querySelector(
            ".adm360-company-details-btn"
          );


        if (
          button &&
          button !==
          currentButton
        ) {

          button.classList
            .remove(
              "is-open"
            );


          button.textContent =
            "FICHA GERENCIAL";

        }

      }
    );
}


/* =========================================================
   PROTEÇÃO CONTRA EXCLUSÃO ACIDENTAL
========================================================= */

function instalarProtecaoExclusao() {

  document.addEventListener(

    "click",

    event => {

      const button =
        event.target.closest(
          ".delete-company"
        );


      if (!button) {
        return;
      }


      /* ===================================================
         CLIQUE JÁ AUTORIZADO

         Libera apenas uma execução
         para o professor.js.
      =================================================== */

      if (
        button.dataset
          .adm360DeleteConfirmed ===
        "1"
      ) {

        delete button.dataset
          .adm360DeleteConfirmed;

        return;
      }


      /* ===================================================
         BLOQUEIA CLIQUE ORIGINAL
      =================================================== */

      event.preventDefault();

      event.stopPropagation();

      event.stopImmediatePropagation();


      const companyName =
        button.dataset
          .companyName ||
        "esta empresa";


      /* ===================================================
         CONFIRMAÇÃO 1
      =================================================== */

      const first =
        window.confirm(

          `ATENÇÃO\n\n` +

          `Você está prestes a excluir ` +
          `"${companyName}".\n\n` +

          `Esta ação pode remover a empresa ` +
          `da Arena e não deve ser utilizada ` +
          `durante a partida por engano.\n\n` +

          `Deseja continuar?`

        );


      if (!first) {
        return;
      }


      /* ===================================================
         CONFIRMAÇÃO 2
      =================================================== */

      const typed =
        window.prompt(

          `CONFIRMAÇÃO DE SEGURANÇA\n\n` +

          `Para liberar a exclusão de ` +
          `"${companyName}", ` +
          `digite exatamente:\n\n` +

          `EXCLUIR`

        );


      if (
        String(
          typed ||
          ""
        )
          .trim()
          .toUpperCase() !==
        "EXCLUIR"
      ) {

        window.alert(
          "Exclusão cancelada. " +
          "Nenhuma alteração foi realizada."
        );

        return;
      }


      /* ===================================================
         CONFIRMAÇÃO 3
      =================================================== */

      const finalConfirm =
        window.confirm(

          `ÚLTIMA CONFIRMAÇÃO\n\n` +

          `Excluir definitivamente ` +
          `"${companyName}"?\n\n` +

          `Confirme somente se esta remoção ` +
          `for realmente necessária.`

        );


      if (!finalConfirm) {
        return;
      }


      /* ===================================================
         LIBERA UMA EXECUÇÃO DO BOTÃO ORIGINAL
      =================================================== */

      button.dataset
        .adm360DeleteConfirmed =
        "1";


      button.click();

    },

    true

  );
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}
