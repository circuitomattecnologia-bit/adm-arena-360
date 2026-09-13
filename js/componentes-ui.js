/* =========================================================
   ADM ARENA 360
   INTERFACE COMPACTA — GESTÃO DOS COMPONENTES

   SOMENTE VISUAL.
   NÃO LÊ NEM GRAVA FIREBASE.
   NÃO ALTERA EMPRESAS, COMPONENTES OU PROGRESSO.
========================================================= */

const IS_PROFESSOR =
  !!document.querySelector("#iniciar");

if (IS_PROFESSOR) {
  iniciarGestaoCompacta();
}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

function iniciarGestaoCompacta() {

  const style =
    document.createElement("style");

  style.textContent = `

    #adm360ComponentsCompactBar {
      margin-top: 18px;
      border:
        1px solid
        rgba(68,220,255,.28);
      border-radius: 18px;
      padding: 16px 18px;
      background:
        linear-gradient(
          135deg,
          rgba(15,38,72,.94),
          rgba(19,25,48,.96)
        );
      box-shadow:
        0 14px 38px
        rgba(0,0,0,.14);
    }

    #adm360ComponentsCompactBar.pending {
      border-color:
        rgba(255,205,75,.55);
      box-shadow:
        0 0 0 1px
        rgba(255,205,75,.08),
        0 14px 38px
        rgba(0,0,0,.14);
    }

    .adm360-components-compact-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .adm360-components-compact-title {
      font-weight: 950;
      font-size: 1.05rem;
      color: #fff;
      margin-bottom: 5px;
    }

    .adm360-components-compact-summary {
      color:
        rgba(255,255,255,.76);
      font-size: .9rem;
      line-height: 1.45;
    }

    .adm360-components-compact-summary
    strong {
      color: #4de2ff;
    }

    #adm360ComponentsCompactBar.pending
    .adm360-components-compact-summary
    strong {
      color: #ffd75e;
    }

    #adm360ComponentsToggle {
      min-width: 220px;
      border:
        1px solid
        rgba(77,226,255,.38);
      border-radius: 12px;
      padding: 11px 16px;
      background:
        rgba(77,226,255,.09);
      color: #fff;
      font-weight: 900;
      cursor: pointer;
    }

    #adm360ComponentsToggle:hover {
      background:
        rgba(77,226,255,.15);
    }

    #adm360ComponentsClose {
      width: 100%;
      margin-top: 14px;
      border:
        1px solid
        rgba(255,255,255,.16);
      border-radius: 12px;
      padding: 11px 16px;
      background:
        rgba(255,255,255,.055);
      color: #fff;
      font-weight: 900;
      cursor: pointer;
    }

    #adm360ComponentsClose:hover {
      background:
        rgba(255,255,255,.09);
    }

  `;

  document.head.appendChild(style);

  localizarPainel();

}


/* =========================================================
   LOCALIZA O PAINEL CRIADO PELO abertura.js
========================================================= */

function localizarPainel() {

  const existente =
    document.querySelector(
      "#adm360ProfessorComponents"
    );

  if (existente) {
    instalarCompactacao(existente);
    return;
  }


  const observer =
    new MutationObserver(() => {

      const painel =
        document.querySelector(
          "#adm360ProfessorComponents"
        );

      if (!painel) {
        return;
      }

      observer.disconnect();

      instalarCompactacao(painel);

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
   INSTALA A BARRA COMPACTA
========================================================= */

function instalarCompactacao(painel) {

  if (
    document.querySelector(
      "#adm360ComponentsCompactBar"
    )
  ) {
    return;
  }


  const barra =
    document.createElement("section");

  barra.id =
    "adm360ComponentsCompactBar";


  barra.innerHTML = `

    <div
      class="adm360-components-compact-inner"
    >

      <div>

        <div
          class="adm360-components-compact-title"
        >
          👥 GESTÃO DOS COMPONENTES
        </div>

        <div
          id="adm360ComponentsCompactSummary"
          class="adm360-components-compact-summary"
        >
          Carregando informações...
        </div>

      </div>

      <button
        id="adm360ComponentsToggle"
        type="button"
      >
        GERENCIAR COMPONENTES
      </button>

    </div>

  `;


  painel.parentNode.insertBefore(
    barra,
    painel
  );


  /*
    O painel completo começa recolhido.
    É apenas display visual.
  */

  painel.style.display = "none";


  const toggle =
    barra.querySelector(
      "#adm360ComponentsToggle"
    );


  toggle.addEventListener(
    "click",
    () => {

      const aberto =
        painel.style.display !== "none";

      if (aberto) {

        fecharPainel(
          painel,
          toggle
        );

      } else {

        abrirPainel(
          painel,
          toggle
        );

      }

    }
  );


  garantirBotaoFechar(
    painel,
    toggle
  );


  atualizarResumo(
    painel,
    barra
  );


  /*
    O abertura.js pode atualizar a lista
    quando chegam solicitações.
    Observamos SOMENTE o HTML para atualizar
    o resumo da barra.
  */

  const observer =
    new MutationObserver(() => {

      atualizarResumo(
        painel,
        barra
      );

      garantirBotaoFechar(
        painel,
        toggle
      );

    });


  observer.observe(
    painel,
    {
      childList: true,
      subtree: true,
      characterData: true
    }
  );

}


/* =========================================================
   ABRIR / FECHAR
========================================================= */

function abrirPainel(
  painel,
  toggle
) {

  painel.style.display = "";

  toggle.textContent =
    "FECHAR GESTÃO";

}


function fecharPainel(
  painel,
  toggle
) {

  painel.style.display = "none";

  toggle.textContent =
    "GERENCIAR COMPONENTES";


  const barra =
    document.querySelector(
      "#adm360ComponentsCompactBar"
    );

  if (barra) {

    barra.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });

  }

}


/* =========================================================
   BOTÃO FECHAR NO FINAL DA ÁREA
========================================================= */

function garantirBotaoFechar(
  painel,
  toggle
) {

  if (
    painel.querySelector(
      "#adm360ComponentsClose"
    )
  ) {
    return;
  }


  const botao =
    document.createElement("button");

  botao.id =
    "adm360ComponentsClose";

  botao.type =
    "button";

  botao.textContent =
    "FECHAR GESTÃO DOS COMPONENTES";


  botao.addEventListener(
    "click",
    () => {

      fecharPainel(
        painel,
        toggle
      );

    }
  );


  painel.appendChild(botao);

}


/* =========================================================
   RESUMO
========================================================= */

function atualizarResumo(
  painel,
  barra
) {

  const summary =
    barra.querySelector(
      "#adm360ComponentsCompactSummary"
    );

  if (!summary) {
    return;
  }


  const empresas =
    painel.querySelectorAll(
      ".adm360-company-admin"
    ).length;


  const solicitacoes =
    painel.querySelectorAll(
      ".adm360-component-request"
    ).length;


  if (solicitacoes > 0) {

    barra.classList.add(
      "pending"
    );

  } else {

    barra.classList.remove(
      "pending"
    );

  }


  const textoEmpresas =
    empresas === 1
      ? "1 empresa cadastrada"
      : `${empresas} empresas cadastradas`;


  let textoSolicitacoes = "";

  if (solicitacoes === 0) {

    textoSolicitacoes =
      "Nenhuma solicitação pendente";

  } else if (solicitacoes === 1) {

    textoSolicitacoes =
      "<strong>1 SOLICITAÇÃO PENDENTE</strong>";

  } else {

    textoSolicitacoes =
      `<strong>${solicitacoes} SOLICITAÇÕES PENDENTES</strong>`;

  }


  summary.innerHTML =
    `${textoEmpresas} · ${textoSolicitacoes}`;

}
