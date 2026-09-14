import {
  getFirebase,
  demoGet
} from "./firebase-service.js";


/* =========================================================
   ADM ARENA 360 — RANKING OFICIAL

   REGRAS
   ---------------------------------------------------------
   R1–R15
   → ranking operacional por XP

   R16
   → ranking por Pontuação Final de Gestão

   PROCLAMAÇÃO
   ---------------------------------------------------------
   A Campeã só é proclamada quando TODAS as empresas
   cadastradas tiverem concluído a R16.

   A Pontuação Final já é calculada em rodada16.js:
   25% Financeiro
   20% Clientes / Mercado
   15% Reputação
   15% Pessoas
   10% Inovação
   10% Estratégia / XP
    5% Responsabilidade Social
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


function money(value) {
  return Number(value || 0)
    .toLocaleString("pt-BR");
}


function score(value) {
  return Number(value || 0)
    .toFixed(1);
}


function getCompanies(room) {
  return Object.values(
    room?.companies || {}
  );
}


function isFinalPhase(room) {
  return (
    Number(room?.round || 0) >= 16
  );
}


function companyCompleted(company) {
  return (
    company?.arenaCompleted === true &&
    Number(
      company?.completedRound || 0
    ) >= 16 &&
    Number.isFinite(
      Number(company?.finalScore)
    )
  );
}


function allCompaniesCompleted(companies) {
  return (
    companies.length > 0 &&
    companies.every(
      company =>
        companyCompleted(company)
    )
  );
}


/* =========================================================
   ORDENAÇÃO
========================================================= */

function operationalRanking(companies) {
  return [...companies]
    .sort(
      (a, b) => {

        const xpDiff =
          Number(b?.xp || 0) -
          Number(a?.xp || 0);

        if (xpDiff !== 0) {
          return xpDiff;
        }

        const repDiff =
          Number(
            b?.reputacao || 0
          ) -
          Number(
            a?.reputacao || 0
          );

        if (repDiff !== 0) {
          return repDiff;
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


function finalRanking(companies) {
  return [...companies]
    .sort(
      (a, b) => {

        const aCompleted =
          companyCompleted(a);

        const bCompleted =
          companyCompleted(b);

        if (
          aCompleted !== bCompleted
        ) {
          return aCompleted
            ? -1
            : 1;
        }

        const scoreDiff =
          Number(
            b?.finalScore || 0
          ) -
          Number(
            a?.finalScore || 0
          );

        if (scoreDiff !== 0) {
          return scoreDiff;
        }

        const repDiff =
          Number(
            b?.reputacao || 0
          ) -
          Number(
            a?.reputacao || 0
          );

        if (repDiff !== 0) {
          return repDiff;
        }

        const clientsDiff =
          Number(
            b?.clientes || 0
          ) -
          Number(
            a?.clientes || 0
          );

        if (clientsDiff !== 0) {
          return clientsDiff;
        }

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
   POSIÇÃO / PÓDIO
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
  if (index === 0) return "🏆";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";

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
    sub.textContent =
      "Informe uma Arena no endereço.";

    if (status) {
      status.textContent =
        "Aguardando Arena";
    }

    return;
  }

  const round =
    Number(room.round || 0);

  sub.textContent =
    `${room.className || "ADM ARENA 360"} • ` +
    `${room.status || ""} • ` +
    `Rodada ${round}/16`;

  if (!status) return;


  if (round < 16) {
    status.innerHTML =
      `<strong>RANKING DA ARENA</strong>` +
      `<span>Classificação operacional por XP</span>`;

    return;
  }


  const completed =
    companies.filter(
      companyCompleted
    ).length;


  if (
    allCompaniesCompleted(
      companies
    )
  ) {
    status.innerHTML =
      `<strong>RESULTADO FINAL OFICIAL</strong>` +
      `<span>${companies.length} de ${companies.length} empresas concluíram o Conselho Final</span>`;

    return;
  }


  status.innerHTML =
    `<strong>CONSELHO FINAL EM ANDAMENTO</strong>` +
    `<span>${completed} de ${companies.length} empresas concluíram a R16</span>`;
}


/* =========================================================
   RANKING R1–R15
========================================================= */

function renderOperational(
  companies
) {
  const ranking =
    operationalRanking(
      companies
    );

  $("#ranking").innerHTML =
    ranking.length
      ? ranking
          .map(
            (company, index) => `
              <div class="rank-row adm-rank-row">

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

                </div>

                <div class="adm-rank-operational">

                  <strong>
                    ${Number(
                      company?.xp || 0
                    )} XP
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
            `
          )
          .join("")
      : `
          <div class="rank-row">
            <b>—</b>
            <span>
              Aguardando empresas
            </span>
            <strong>
              0 XP
            </strong>
          </div>
        `;


  $("#championArea")
    ?.classList
    .add("hidden");
}


/* =========================================================
   CAMPEÃ
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
   DETALHAMENTO FINAL
========================================================= */

function finalDetails(company) {
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
          -${score(penalty)}
        </strong>
      </span>

    </div>
  `;
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
      .add("hidden");
  }


  $("#ranking").innerHTML =
    ranking.length
      ? ranking
          .map(
            (company, index) => {

              const completed =
                companyCompleted(
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
                >

                  <div class="adm-rank-position">

                    <span class="adm-medal">
                      ${
                        completedAll
                          ? medal(index)
                          : ""
                      }
                    </span>

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
            <b>—</b>
            <span>
              Aguardando empresas
            </span>
            <strong>
              —
            </strong>
          </div>
        `;
}


/* =========================================================
   PAINEL DE PESOS
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
          Antes do Conselho Final, o telão utiliza XP
          como referência operacional de acompanhamento.
          A classificação oficial será definida somente
          ao término da Rodada 16.
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
          <b>25%</b>
          Financeiro
        </span>

        <span>
          <b>20%</b>
          Clientes / Mercado
        </span>

        <span>
          <b>15%</b>
          Reputação
        </span>

        <span>
          <b>15%</b>
          Pessoas
        </span>

        <span>
          <b>10%</b>
          Inovação
        </span>

        <span>
          <b>10%</b>
          Estratégia / XP
        </span>

        <span>
          <b>5%</b>
          Responsabilidade Social
        </span>

      </div>

      <p>
        Ter muito dinheiro não garante o título.
        A empresa campeã será aquela que apresentar
        a melhor gestão global.
      </p>

    </div>
  `;
}


/* =========================================================
   RENDER PRINCIPAL
========================================================= */

function render(room) {
  const companies =
    getCompanies(room);

  renderHeader(
    room,
    companies
  );

  if (!room) {
    $("#ranking").innerHTML = `
      <div class="rank-row">
        <b>—</b>
        <span>
          Arena não informada
        </span>
        <strong>
          —
        </strong>
      </div>
    `;

    return;
  }


  const finalPhase =
    isFinalPhase(room);

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


start().catch(
  error => {
    console.error(
      "ADM Arena 360 — Ranking:",
      error
    );
  }
);
