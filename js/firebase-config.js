// CONFIGURAÇÃO DO FIREBASE
// ADM ARENA 360

export const FIREBASE = {
  enabled: true,

  config: {
    apiKey:
      "AIzaSyBCfG1SkyLCkWcYwAgVduVHG2x8EtpZ0G",

    authDomain:
      "adm-arena-360.firebaseapp.com",

    databaseURL:
      "https://adm-arena-360-default-rtdb.firebaseio.com",

    projectId:
      "adm-arena-360",

    storageBucket:
      "adm-arena-360.firebasestorage.app",

    messagingSenderId:
      "736682262723",

    appId:
      "1:736682262723:web:5046de8973355d29f26276"
  }
};


/* =========================================================
   ADM ARENA 360
   CARREGAMENTO SEGURO DOS MÓDULOS COMPLEMENTARES
========================================================= */

if (
  typeof window !==
  "undefined"
) {

  const page =
    String(
      window.location.pathname ||
      ""
    )
      .split("/")
      .pop()
      .toLowerCase();


  /* =======================================================
     CRONÔMETRO
  ======================================================= */

  const timerPages =
    new Set([
      "professor.html",
      "empresa.html"
    ]);


  if (
    timerPages.has(
      page
    )
  ) {

    import(
      "./cronometro.js"
    )
      .catch(
        error => {

          console.error(
            "ADM Arena 360 — cronômetro:",
            error
          );

        }
      );

  }


  /* =======================================================
     INTELIGÊNCIA MOBILE
  ======================================================= */

  const mobilePages =
    new Set([
      "professor.html",
      "empresa.html"
    ]);


  if (
    mobilePages.has(
      page
    )
  ) {

    import(
      "./mobile-inteligencia.js"
    )
      .catch(
        error => {

          console.error(
            "ADM Arena 360 — Inteligência Mobile:",
            error
          );

        }
      );

  }


  /* =======================================================
     EMPRESA
  ======================================================= */

  if (
    page ===
    "empresa.html"
  ) {

    import(
      "./gestao-avancada.js"
    )
      .catch(
        error => {

          console.error(
            "ADM Arena 360 — Gestão Avançada:",
            error
          );

        }
      );


    import(
      "./rodada9.js"
    )
      .catch(
        error => {

          console.error(
            "ADM Arena 360 — Rodada 9:",
            error
          );

        }
      );


    import(
      "./rodada10.js"
    )
      .catch(
        error => {

          console.error(
            "ADM Arena 360 — Rodada 10:",
            error
          );

        }
      );


    import(
      "./rodada11.js"
    )
      .catch(
        error => {

          console.error(
            "ADM Arena 360 — Rodada 11:",
            error
          );

        }
      );


    import(
      "./rodada12.js"
    )
      .catch(
        error => {

          console.error(
            "ADM Arena 360 — Rodada 12:",
            error
          );

        }
      );


    import(
      "./rodada13.js"
    )
      .catch(
        error => {

          console.error(
            "ADM Arena 360 — Rodada 13:",
            error
          );

        }
      );


    import(
      "./rodada14.js"
    )
      .catch(
        error => {

          console.error(
            "ADM Arena 360 — Rodada 14:",
            error
          );

        }
      );

  }


  /* =======================================================
     PROFESSOR
  ======================================================= */

  if (
    page ===
    "professor.html"
  ) {

    import(
      "./professor-pages.js"
    )
      .catch(
        error => {

          console.error(
            "ADM Arena 360 — telas do professor:",
            error
          );

        }
      );


    import(
      "./componentes-ui.js"
    )
      .catch(
        error => {

          console.error(
            "ADM Arena 360 — interface de componentes:",
            error
          );

        }
      );


    import(
      "./empresas-ui.js"
    )
      .catch(
        error => {

          console.error(
            "ADM Arena 360 — interface de empresas:",
            error
          );

        }
      );


    import(
      "./mobile-cleanup.js"
    )
      .catch(
        error => {

          console.error(
            "ADM Arena 360 — organização do Mobile:",
            error
          );

        }
      );


    import(
      "./professor-gestao-avancada.js"
    )
      .catch(
        error => {

          console.error(
            "ADM Arena 360 — acompanhamento Gestão Avançada:",
            error
          );

        }
      );

  }

}
