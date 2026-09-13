// CONFIGURAÇÃO DO FIREBASE
// ADM ARENA 360

export const FIREBASE = {
  enabled: true,

  config: {
    apiKey: "AIzaSyBCfG1SkyLCkWcYwAgVduVHG2x8EtpZ0G",

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
   CARREGAMENTO SEGURO DO CRONÔMETRO

   O módulo é carregado SOMENTE:
   - no painel do professor;
   - na tela da empresa.

   Não é carregado no ranking,
   na capa ou em outras páginas.
========================================================= */

if (
  typeof window !== "undefined"
) {

  const page =
    String(
      window.location.pathname || ""
    )
      .split("/")
      .pop()
      .toLowerCase();


  const timerPages =
    new Set([
      "professor.html",
      "empresa.html"
    ]);


  if (
    timerPages.has(page)
  ) {

    import("./cronometro.js")
      .catch(error => {

        console.error(
          "ADM Arena 360 — cronômetro:",
          error
        );

      });

  }

}
