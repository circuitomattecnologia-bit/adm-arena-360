/* =========================================================
   ADM ARENA 360
   LIMPEZA VISUAL DO NÚCLEO MOBILE — PROFESSOR

   OBJETIVO
   ---------------------------------------------------------
   O formulário Mobile antigo continua existente no projeto,
   mas fica oculto.

   Na tela MOBILE permanecem somente:
   - Cabeçalho oficial;
   - Novo sistema de Inteligência Estratégica;
   - Celulares / empresas;
   - Mensagens por rodada;
   - Destinatários;
   - Mensagem personalizada;
   - Histórico.

   SEGURANÇA
   ---------------------------------------------------------
   - NÃO lê Firebase.
   - NÃO grava Firebase.
   - NÃO altera sala.
   - NÃO altera rodada.
   - NÃO altera status.
   - NÃO altera empresas.
   - NÃO altera mensagens.
========================================================= */


function organizarMobileProfessor() {

  const painel =
    document.querySelector(
      '.teacher-nucleus-panel[data-panel="mobile"]'
    );

  if (!painel) {
    return;
  }


  const novoModulo =
    painel.querySelector(
      "#adm360MobileIntelProfessor"
    );


  /*
    Mantém apenas:

    1. Cabeçalho oficial da página MOBILE.
    2. Novo sistema de Inteligência Estratégica.

    O formulário antigo NÃO é apagado.
    Apenas fica visualmente oculto.
  */

  Array.from(
    painel.children
  )
    .forEach(
      elemento => {

        const manter =
          elemento.matches(
            ".teacher-panel-heading"
          ) ||
          elemento.id ===
            "adm360MobileIntelProfessor";


        if (manter) {

          elemento.style.removeProperty(
            "display"
          );

          return;
        }


        elemento.dataset
          .adm360MobileLegacy =
          "1";


        elemento.style.setProperty(
          "display",
          "none",
          "important"
        );

      }
    );


  if (novoModulo) {

    novoModulo.style.width =
      "100%";

    novoModulo.style.boxSizing =
      "border-box";

    novoModulo.style.marginTop =
      "0";

  }

}


/* =========================================================
   ESTILO
========================================================= */

function instalarEstiloMobileLimpo() {

  if (
    document.querySelector(
      "#adm360MobileCleanupStyle"
    )
  ) {
    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "adm360MobileCleanupStyle";


  style.textContent = `

    body.adm360-professor-pages
    .teacher-nucleus-panel[data-panel="mobile"]
    [data-adm360-mobile-legacy="1"] {

      display:
        none !important;

    }


    body.adm360-professor-pages
    .teacher-nucleus-panel[data-panel="mobile"]
    #adm360MobileIntelProfessor {

      width:
        100%;

      margin-top:
        0 !important;

      padding-top:
        0 !important;

      box-sizing:
        border-box;

    }


    body.adm360-professor-pages
    .teacher-nucleus-panel[data-panel="mobile"]
    #adm360MobileIntelProfessor
    > .adm360-mi-card:first-child {

      margin-top:
        0 !important;

    }

  `;


  document.head.appendChild(
    style
  );

}


/* =========================================================
   OBSERVAÇÃO

   mobile-inteligencia.js pode terminar de carregar
   depois deste arquivo.

   Por isso observamos a tela e organizamos assim
   que o novo painel aparecer.
========================================================= */

function instalarObservadorMobile() {

  const observer =
    new MutationObserver(
      () => {

        organizarMobileProfessor();

      }
    );


  observer.observe(
    document.body,
    {
      childList:
        true,

      subtree:
        true
    }
  );

}


/* =========================================================
   INÍCIO
========================================================= */

function iniciarMobileCleanup() {

  instalarEstiloMobileLimpo();

  organizarMobileProfessor();

  instalarObservadorMobile();


  window.addEventListener(
    "hashchange",
    () => {

      requestAnimationFrame(
        organizarMobileProfessor
      );

    }
  );


  document.addEventListener(
    "click",
    event => {

      const botao =
        event.target.closest?.(
          '.teacher-nucleus-btn[data-nucleus="mobile"]'
        );


      if (!botao) {
        return;
      }


      requestAnimationFrame(
        organizarMobileProfessor
      );

    },
    true
  );

}


/* =========================================================
   EXECUÇÃO
========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    iniciarMobileCleanup,
    {
      once:
        true
    }
  );

} else {

  iniciarMobileCleanup();

}
