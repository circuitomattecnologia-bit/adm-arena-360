import {
  getFirebase,
  demoGet
} from "./firebase-service.js";


/* =========================================================
   ADM ARENA 360 — RANKING OFICIAL DINÂMICO

   PROJETO EMPREENDEDOR
   PROF. ADILSON LEOPOLDO DOS SANTOS

   FUNCIONAMENTO
   ---------------------------------------------------------
   R1–R15
   → classificação operacional por XP

   R16
   → classificação pela Pontuação Final de Gestão

   MOVIMENTAÇÃO VISUAL
   ---------------------------------------------------------
   ▲ SUBIU
   ▼ CAIU
   — MANTEVE

   Os cards utilizam animação FLIP:
   a mudança de posição acontece visualmente,
   sem alterar nenhum dado da empresa.

   CAMPEÃ
   ---------------------------------------------------------
   Só será proclamada quando TODAS as empresas
   concluírem a Rodada 16.
========================================================= */


const $ = selector =>
  document.querySelector(selector);


const params =
  new URLSearchParams(
    window.location.search
  );


const code =
  String(
    params.get("sala") || ""
  )
    .trim()
    .toUpperCase();


/* =========================================================
   MEMÓRIA VISUAL DO RANKING
========================================================= */

const previousOrder = {
  operational: new Map(),
  final: new Map()
};


let previousLeader = {
  operational: "",
  final: ""
};


let currentMode = "";


/* =========================================================
   UTILIDADES
========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function score(value) {
  return Number(value || 0)
    .toFixed(1);
}


function companyKey(company) {
  return String(
    company?.id ||
    company?.companyId ||
    company?.name ||
    ""
  )
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}


function getCompanies(room) {
  return Object.values(
    room?.companies || {}
  );
}


function isFinalPhase(room) {
  return (
    Number(
      room?.round || 0
    ) >= 16
  );
}


function companyCompleted(company) {
  return (
    company?.arenaCompleted === true &&
    Number(
      company?.completedRound || 0
    ) >= 16 &&
    Number.isFinite(
      Number(
        company?.finalScore
      )
    )
  );
}


function allCompaniesCompleted(
  companies
) {
  return (
    companies.length > 0 &&
    companies.every(
      company =>
        companyCompleted(
          company
        )
    )
  );
}


/* =========================================================
   ORDENAÇÃO OPERACIONAL
========================================================= */

function operationalRanking(
  companies
) {
  return [...companies]
    .sort(
      (a, b) => {

        const xpDiff =
          Number(
            b?.xp || 0
          ) -
          Number(
            a?.xp || 0
          );

        if (xpDiff !== 0) {
          return xpDiff;
        }


        const reputationDiff =
          Number(
            b?.reputacao || 0
          ) -
          Number(
            a?.reputacao || 0
          );

        if (
          reputationDiff !== 0
        ) {
          return reputationDiff;
        }


        const clientsDiff =
          Number(
            b?.clientes || 0
          ) -
          Number(
            a?.clientes || 0
          );

        if (
          clientsDiff !== 0
        ) {
          return clientsDiff;
        }


        return String(
          a?.name || ""
        ).localeCompare(
          String(
            b?.name || ""
          ),
          "pt-BR"
        );

      }
    );
}


/* =========================================================
   ORDENAÇÃO FINAL
========================================================= */

function finalRanking(
  companies
) {
  return [...companies]
    .sort(
      (a, b) => {

        const aCompleted =
          companyCompleted(a);

        const bCompleted =
          companyCompleted(b);


        if (
          aCompleted !==
          bCompleted
        ) {
          return aCompleted
            ? -1
            : 1;
        }


        const finalDiff =
          Number(
            b?.finalScore || 0
          ) -
          Number(
            a?.finalScore || 0
          );

        if (
          finalDiff !== 0
        ) {
          return finalDiff;
        }


        const reputationDiff =
          Number(
            b?.reputacao || 0
          ) -
          Number(
            a?.reputacao || 0
          );

        if (
          reputationDiff !== 0
        ) {
          return reputationDiff;
        }


        const clientsDiff =
          Number(
            b?.clientes || 0
          ) -
          Number(
            a?.clientes || 0
          );

        if (
          clientsDiff !== 0
        ) {
          return clientsDiff;
        }


        const xpDiff =
          Number(
            b?.xp || 0
          ) -
          Number(
            a?.xp || 0
          );

        if (
          xpDiff !== 0
        ) {
          return xpDiff;
        }


        return String(
          a?.name || ""
        ).localeCompare(
          String(
            b?.name || ""
          ),
          "pt-BR"
        );

      }
    );
}


/* =========================================================
   MOVIMENTAÇÃO
========================================================= */

function buildPositionMap(
  companies
) {
  const map =
    new Map();

  companies.forEach(
    (company, index) => {
      map.set(
        companyKey(company),
        index
      );
    }
  );

  return map;
}


function movementFor(
  company,
  newIndex,
  mode
) {
  const key =
    companyKey(company);

  const oldMap =
    previousOrder[mode];

  if (
    !oldMap ||
    !oldMap.has(key)
  ) {
    return {
      type: "same",
      label: "— MANTEVE"
    };
  }


  const oldIndex =
    oldMap.get(key);


  if (
    newIndex < oldIndex
  ) {
    return {
      type: "up",
      label:
        `▲ SUBIU ${
          oldIndex - newIndex
        }`
    };
  }


  if (
    newIndex > oldIndex
  ) {
    return {
      type: "down",
      label:
        `▼ CAIU ${
          newIndex - oldIndex
        }`
    };
  }


  return {
    type: "same",
    label: "— MANTEVE"
  };
}


/* =========================================================
   FLIP — CAPTURA POSIÇÃO ANTIGA
========================================================= */

function capturePositions() {
  const positions =
    new Map();

  document
    .querySelectorAll(
      "#ranking [data-company-key]"
    )
    .forEach(
      element => {

        const key =
          element.dataset
            .companyKey;

        if (!key) return;


        positions.set(
          key,
          element
            .getBoundingClientRect()
        );

      }
    );

  return positions;
}


/* =========================================================
   FLIP — ANIMA POSIÇÃO NOVA
========================================================= */

function animatePositions(
  oldPositions
) {
  document
    .querySelectorAll(
      "#ranking [data-company-key]"
    )
    .forEach(
      element => {

        const key =
          element.dataset
            .companyKey;

        if (
          !key ||
          !oldPositions.has(key)
        ) {
          return;
        }


        const oldRect =
          oldPositions.get(key);

        const newRect =
          element
            .getBoundingClientRect();


        const deltaX =
          oldRect.left -
          newRect.left;

        const deltaY =
          oldRect.top -
          newRect.top;


        if (
          Math.abs(deltaX) < 1 &&
          Math.abs(deltaY) < 1
        ) {
          return;
        }


        element.style.transition =
          "none";

        element.style.transform =
          `translate(${deltaX}px, ${deltaY}px)`;

        element.style.zIndex =
          "10";


        requestAnimationFrame(
          () => {

            requestAnimationFrame(
              () => {

                element.style.transition =
                  "transform .70s cubic-bezier(.2,.85,.2,1), box-shadow .35s ease, border-color .35s ease, background .35s ease";

                element.style.transform =
                  "translate(0,0)";


                setTimeout(
                  () => {

                    element.style.zIndex =
                      "";

                  },
                  760
                );

              }
            );

          }
        );

      }
    );
}


/* =========================================================
   DESTAQUE DE NOVA LIDERANÇA
========================================================= */

function highlightNewLeader(
  ranking,
  mode
) {
  if (!ranking.length) return;


  const newLeader =
    companyKey(
      ranking[0]
    );


  const oldLeader =
    previousLeader[mode];


  if (
    oldLeader &&
    newLeader &&
    oldLeader !== newLeader
  ) {

    const leaderCard =
      document.querySelector(
        `#ranking [data-company-key="${CSS.escape(
          newLeader
        )}"]`
      );


    if (leaderCard) {

      leaderCard
        .classList
        .remove(
          "new-leader"
        );


      void leaderCard.offsetWidth;


      leaderCard
        .classList
        .add(
          "new-leader"
        );


      setTimeout(
        () => {
          leaderCard
            .classList
            .remove(
              "new-leader"
            );
        },
        1700
      );

    }

  }


  previousLeader[mode] =
    newLeader;
}


/* =========================================================
   POSIÇÃO FINAL
========================================================= */

function positionLabel(
  index,
  completedAll
) {
  if (!completedAll) {
    return `${index + 1}º`;
  }


  if (index === 0) {
    return "CAMPEÃ";
  }


  if (index === 1) {
    return "2º LUGAR";
  }


  if (index === 2) {
    return "3º LUGAR";
  }


  return `${index + 1}º`;
}


function medal(index) {
  if (index === 0) {
    return "🏆";
  }

  if (index === 1) {
    return "🥈";
  }

  if (index === 2) {
    return "🥉";
  }

  return "";
}


/* =========================================================
   CABEÇALHO
========================================================= */

function renderHeader(
  room,
  companies
) {
  const sub =
    $("#sub");

  const status =
    $("#rankingStatus");


  if (!room) {

    if (sub) {
      sub.textContent =
        "Informe uma Arena no endereço.";
    }


    if (status) {
      status.innerHTML = `
        <strong>
          AGUARDANDO ARENA
        </strong>

        <span>
          Nenhuma sala carregada.
        </span>
      `;
    }

    return;
  }


  const round =
    Number(
      room.round || 0
    );


  if (sub) {
    sub.textContent =
      `${room.className || "ADM ARENA 360"} • ` +
      `${room.status || ""} • ` +
      `Rodada ${round}/16`;
  }


  if (!status) return;


  if (round < 16) {

    status.innerHTML = `
      <strong>
        RANKING DA ARENA
      </strong>

      <span>
        Classificação operacional por XP
      </span>
    `;

    return;
  }


  const completed =
    companies
      .filter(
        companyCompleted
      )
      .length;


  if (
    allCompaniesCompleted(
      companies
    )
  ) {

    status.innerHTML = `
      <strong>
        RESULTADO FINAL OFICIAL
      </strong>

      <span>
        ${companies.length}
        de
        ${companies.length}
        empresas concluíram o Conselho Final
      </span>
    `;

    return;
  }


  status.innerHTML = `
    <strong>
      CONSELHO FINAL EM ANDAMENTO
    </strong>

    <span>
      ${completed}
      de
      ${companies.length}
      empresas concluíram a R16
    </span>
  `;
}


/* =========================================================
   CAMPEÃ OFICIAL
========================================================= */

function renderChampion(
  company
) {
  const area =
    $("#championArea");

  if (!area) return;


  area.classList.remove(
    "hidden"
  );


  area.innerHTML = `
    <div class="adm-champion">

      <div class="adm-champion-crown">
        🏆
      </div>

      <small>
        CAMPEÃ OFICIAL
      </small>

      <h2>
        ${escapeHtml(
          company?.name ||
          "Empresa"
        )}
      </h2>

      <p>
        ${escapeHtml(
          company?.segment ||
          ""
        )}
      </p>

      <strong>
        ${score(
          company?.finalScore
        )}
        pontos
      </strong>

      <span>
        ${escapeHtml(
          company
            ?.finalManagementLevel ||
          "Gestão concluída"
        )}
      </span>

    </div>
  `;
}


/* =========================================================
   DETALHAMENTO DO RESULTADO FINAL
========================================================= */

function finalDetails(
  company
) {
  const details =
    company?.finalScoreDetails ||
    company?.round16
      ?.finalScore ||
    {};


  const weighted =
    details?.weighted || {};


  const penalty =
    Number(
      details?.penalty || 0
    );


  return `
    <div class="adm-final-details">

      <span>
        Financeiro
        <strong>
          ${score(
            weighted.financeiro
          )}
        </strong>
      </span>


      <span>
        Mercado
        <strong>
          ${score(
            weighted.mercado
          )}
        </strong>
      </span>


      <span>
        Reputação
        <strong>
          ${score(
            weighted.reputacao
          )}
        </strong>
      </span>


      <span>
        Pessoas
        <strong>
          ${score(
            weighted.pessoas
          )}
        </strong>
      </span>


      <span>
        Inovação
        <strong>
          ${score(
            weighted.inovacao
          )}
        </strong>
      </span>


      <span>
        Estratégia
        <strong>
          ${score(
            weighted.estrategia
          )}
        </strong>
      </span>


      <span>
        Social
        <strong>
          ${score(
            weighted.social
          )}
        </strong>
      </span>


      <span>
        Penalidades
        <strong>
          -${score(
            penalty
          )}
        </strong>
      </span>

    </div>
  `;
}


/* =========================================================
   RANKING OPERACIONAL
========================================================= */

function renderOperational(
  companies
) {
  const ranking =
    operationalRanking(
      companies
    );


  const mode =
    "operational";


  const oldPositions =
    capturePositions();


  const html =
    ranking.length
      ? ranking
          .map(
            (
              company,
              index
            ) => {

              const movement =
                movementFor(
                  company,
                  index,
                  mode
                );


              const key =
                companyKey(
                  company
                );


              return `
                <div
                  class="rank-row adm-rank-row"
                  data-company-key="${escapeHtml(
                    key
                  )}"
                >

                  <div class="adm-rank-position">

                    ${index + 1}º

                  </div>


                  <div class="adm-rank-company">

                    <strong>
                      ${escapeHtml(
                        company?.name ||
                        "Empresa"
                      )}
                    </strong>

                    <small>
                      ${escapeHtml(
                        company?.segment ||
                        "Segmento"
                      )}
                    </small>

                    <span
                      class="rank-movement ${movement.type}"
                    >
                      ${movement.label}
                    </span>

                  </div>


                  <div class="adm-rank-operational">

                    <strong>
                      ${Number(
                        company?.xp || 0
                      )}
                      XP
                    </strong>

                    <small>
                      Reputação:
                      ${Number(
                        company?.reputacao ||
                        0
                      )}
                    </small>

                  </div>

                </div>
              `;
            }
          )
          .join("")
      : `
          <div class="rank-row">

            <b>
              —
            </b>

            <span>
              Aguardando empresas
            </span>

            <strong>
              0 XP
            </strong>

          </div>
        `;


  const rankingArea =
    $("#ranking");


  if (rankingArea) {
    rankingArea.innerHTML =
      html;
  }


  $("#championArea")
    ?.classList
    .add(
      "hidden"
    );


  animatePositions(
    oldPositions
  );


  highlightNewLeader(
    ranking,
    mode
  );


  previousOrder[mode] =
    buildPositionMap(
      ranking
    );


  currentMode =
    mode;
}


/* =========================================================
   RANKING FINAL
========================================================= */

function renderFinal(
  companies
) {
  const ranking =
    finalRanking(
      companies
    );


  const mode =
    "final";


  const oldPositions =
    capturePositions();


  const completedAll =
    allCompaniesCompleted(
      companies
    );


  if (
    completedAll &&
    ranking[0]
  ) {

    renderChampion(
      ranking[0]
    );

  } else {

    $("#championArea")
      ?.classList
      .add(
        "hidden"
      );

  }


  const html =
    ranking.length
      ? ranking
          .map(
            (
              company,
              index
            ) => {

              const completed =
                companyCompleted(
                  company
                );


              const movement =
                movementFor(
                  company,
                  index,
                  mode
                );


              const key =
                companyKey(
                  company
                );


              const topClass =
                completedAll &&
                index < 3
                  ? ` podium-${index + 1}`
                  : "";


              return `
                <div
                  class="rank-row adm-rank-row adm-final-row${topClass}"
                  data-company-key="${escapeHtml(
                    key
                  )}"
                >

                  <div class="adm-rank-position">

                    ${
                      completedAll
                        ? `
                          <span class="adm-medal">
                            ${medal(
                              index
                            )}
                          </span>
                        `
                        : ""
                    }

                    ${positionLabel(
                      index,
                      completedAll
                    )}

                  </div>


                  <div class="adm-rank-company">

                    <strong>
                      ${escapeHtml(
                        company?.name ||
                        "Empresa"
                      )}
                    </strong>

                    <small>
                      ${escapeHtml(
                        company?.segment ||
                        "Segmento"
                      )}
                    </small>


                    ${
                      completed
                        ? `
                          <em>
                            ${escapeHtml(
                              company
                                ?.finalManagementLevel ||
                              "Gestão concluída"
                            )}
                          </em>
                        `
                        : `
                          <em class="waiting">
                            Aguardando decisão final
                          </em>
                        `
                    }


                    <span
                      class="rank-movement ${movement.type}"
                    >
                      ${movement.label}
                    </span>

                  </div>


                  <div class="adm-rank-final-score">

                    ${
                      completed
                        ? `
                          <strong>
                            ${score(
                              company
                                ?.finalScore
                            )}
                          </strong>

                          <small>
                            Pontuação Final
                          </small>
                        `
                        : `
                          <strong>
                            —
                          </strong>

                          <small>
                            Não concluída
                          </small>
                        `
                    }

                  </div>


                  ${
                    completed
                      ? finalDetails(
                          company
                        )
                      : ""
                  }

                </div>
              `;
            }
          )
          .join("")
      : `
          <div class="rank-row">

            <b>
              —
            </b>

            <span>
              Aguardando empresas
            </span>

            <strong>
              —
            </strong>

          </div>
        `;


  const rankingArea =
    $("#ranking");


  if (rankingArea) {
    rankingArea.innerHTML =
      html;
  }


  animatePositions(
    oldPositions
  );


  highlightNewLeader(
    ranking,
    mode
  );


  previousOrder[mode] =
    buildPositionMap(
      ranking
    );


  currentMode =
    mode;
}


/* =========================================================
   PAINEL DE CRITÉRIOS
========================================================= */

function renderCriteria(
  finalPhase
) {
  const area =
    $("#criteriaArea");

  if (!area) return;


  if (!finalPhase) {

    area.innerHTML = `
      <div class="adm-ranking-info">

        <strong>
          CLASSIFICAÇÃO DURANTE A ARENA
        </strong>

        <p>
          O ranking acompanha a evolução das empresas
          durante a competição.

          As posições podem mudar a cada rodada
          conforme os resultados obtidos.

          Antes do Conselho Final,
          a classificação utiliza XP
          como referência operacional.

          A classificação oficial será definida
          somente ao término da Rodada 16.
        </p>

      </div>
    `;

    return;
  }


  area.innerHTML = `
    <div class="adm-ranking-info">

      <strong>
        COMO É CALCULADO O RESULTADO FINAL
      </strong>


      <div class="adm-criteria-grid">

        <span>
          <b>
            25%
          </b>
          Financeiro
        </span>


        <span>
          <b>
            20%
          </b>
          Clientes / Mercado
        </span>


        <span>
          <b>
            15%
          </b>
          Reputação
        </span>


        <span>
          <b>
            15%
          </b>
          Pessoas
        </span>


        <span>
          <b>
            10%
          </b>
          Inovação
        </span>


        <span>
          <b>
            10%
          </b>
          Estratégia / XP
        </span>


        <span>
          <b>
            5%
          </b>
          Responsabilidade Social
        </span>

      </div>


      <p>
        Ter muito dinheiro não garante o título.

        A empresa campeã será aquela que apresentar
        a melhor gestão global ao término
        da ADM Arena 360.
      </p>

    </div>
  `;
}


/* =========================================================
   RENDER PRINCIPAL
========================================================= */

function render(room) {
  const companies =
    getCompanies(
      room
    );


  renderHeader(
    room,
    companies
  );


  if (!room) {

    const rankingArea =
      $("#ranking");


    if (rankingArea) {

      rankingArea.innerHTML = `
        <div class="rank-row">

          <b>
            —
          </b>

          <span>
            Arena não informada
          </span>

          <strong>
            —
          </strong>

        </div>
      `;

    }

    return;
  }


  const finalPhase =
    isFinalPhase(
      room
    );


  renderCriteria(
    finalPhase
  );


  if (finalPhase) {

    renderFinal(
      companies
    );

  } else {

    renderOperational(
      companies
    );

  }
}


/* =========================================================
   INÍCIO
========================================================= */

async function start() {
  if (!code) {
    render(null);
    return;
  }


  const f =
    await getFirebase();


  if (f) {

    f.onValue(
      f.ref(
        f.db,
        `rooms/${code}`
      ),
      snapshot => {

        render(
          snapshot.val()
        );

      }
    );

    return;
  }


  setInterval(
    () => {

      render(
        demoGet(
          `room:${code}`,
          null
        )
      );

    },
    800
  );
}


start()
  .catch(
    error => {

      console.error(
        "ADM Arena 360 — Ranking:",
        error
      );

    }
  );
