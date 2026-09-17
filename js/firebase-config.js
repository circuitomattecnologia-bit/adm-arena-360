// CONFIGURAÇÃO DO FIREBASE
// ADM ARENA 360

export const FIREBASE = {
  enabled: true,

  config: {
    apiKey: "AIzaSyBCfG1SkyLCkWcYwAgVduVHG2x8EtpZ0G",
    authDomain: "adm-arena-360.firebaseapp.com",
    databaseURL:
      "https://adm-arena-360-default-rtdb.firebaseio.com",
    projectId: "adm-arena-360",
    storageBucket:
      "adm-arena-360.firebasestorage.app",
    messagingSenderId: "736682262723",
    appId:
      "1:736682262723:web:5046de8973355d29f26276"
  }
};


/* =========================================================
   ADM ARENA 360
   CARREGAMENTO SEGURO DOS MÓDULOS COMPLEMENTARES
   EXPANSÃO ATÉ A RODADA 20
========================================================= */

if (typeof window !== "undefined") {

  const page =
    String(window.location.pathname || "")
      .split("/")
      .pop()
      .toLowerCase();


  function safeImport(path, label) {

    import(path).catch(error => {

      console.error(
        `ADM Arena 360 — ${label}:`,
        error
      );

    });
  }


  /* =======================================================
     CRONÔMETRO
  ======================================================= */

  if (
    page === "professor.html" ||
    page === "empresa.html"
  ) {

    safeImport(
      "./cronometro.js",
      "cronômetro"
    );
  }


  /* =======================================================
     INTELIGÊNCIA MOBILE
  ======================================================= */

  if (
    page === "professor.html" ||
    page === "empresa.html"
  ) {

    safeImport(
      "./mobile-inteligencia.js",
      "Inteligência Mobile"
    );
  }


  /* =======================================================
     EMPRESA
  ======================================================= */

  if (page === "empresa.html") {

    safeImport(
      "./gestao-avancada.js",
      "Gestão Avançada"
    );


    safeImport(
      "./rodada9.js",
      "Rodada 9"
    );

    safeImport(
      "./rodada10.js",
      "Rodada 10"
    );

    safeImport(
      "./rodada11.js",
      "Rodada 11"
    );

    safeImport(
      "./rodada12.js",
      "Rodada 12"
    );

    safeImport(
      "./rodada13.js",
      "Rodada 13"
    );

    safeImport(
      "./rodada14.js",
      "Rodada 14"
    );

    safeImport(
      "./rodada15.js",
      "Rodada 15"
    );

    safeImport(
      "./rodada16.js",
      "Rodada 16"
    );


    /* ===============================================
       NOVAS RODADAS DA ARENA
    =============================================== */

    safeImport(
      "./rodada17.js",
      "Rodada 17 — Guerra Comercial"
    );

    safeImport(
      "./rodada18.js",
      "Rodada 18 — Crise 360°"
    );

    safeImport(
      "./rodada19.js",
      "Rodada 19 — A Grande Oportunidade"
    );

    safeImport(
      "./rodada20.js",
      "Rodada 20 — Conselho Final"
    );
  }


  /* =======================================================
     PROFESSOR
  ======================================================= */

  if (page === "professor.html") {

    safeImport(
      "./professor-pages.js",
      "telas do professor"
    );

    safeImport(
      "./componentes-ui.js",
      "interface de componentes"
    );

    safeImport(
      "./empresas-ui.js",
      "interface de empresas"
    );

    safeImport(
      "./mobile-cleanup.js",
      "organização do Mobile"
    );

    safeImport(
      "./professor-gestao-avancada.js",
      "acompanhamento Gestão Avançada"
    );
  }
}
