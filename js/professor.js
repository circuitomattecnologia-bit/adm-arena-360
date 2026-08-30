import { FIREBASE } from "./firebase-config.js";

import {
  getFirebase,
  demoGet,
  demoSet,
  roomCode
} from "./firebase-service.js";

import {
  rounds,
  events
} from "./game.js";


/* ============================================================
   ADM ARENA 360
   DISCIPLINA: PROJETO EMPREENDEDOR
   PROF. LEOPOLDO

   PAINEL DO PROFESSOR
   VERSÃO CONSOLIDADA

   REGRA DE ACESSO
   ------------------------------------------------------------
   • PRIMEIRO acesso exige autorização.
   • TODA nova entrada exige autorização.
   • Celular/Mobile também exige autorização.
   • Autorização vale somente para aquela entrada.
   • Professor pode AUTORIZAR ou NEGAR.
   • Divergência de senha só é corrigida se o professor autorizar.
   • Progresso da empresa nunca é apagado ao sair.
   ============================================================ */


let currentRoom = null;
let roomData = null;
let unsubscribe = null;


/* ============================================================
   LEILÕES
   ============================================================ */

const AUCTION_ITEMS = [

  {
    id: "pesquisa",
    title: "🔍 Pesquisa de Mercado Premium",
    description:
      "Entrega 1 Pesquisa de Mercado ao inventário da empresa vencedora.",
    field: "pesquisa",
    qty: 1,
    minBid: 5000
  },

  {
    id: "escudo",
    title: "🛡️ Escudo Financeiro",
    description:
      "Entrega 1 Escudo Financeiro ao inventário da empresa vencedora.",
    field: "escudo",
    qty: 1,
    minBid: 6000
  },

  {
    id: "campanha",
    title: "📣 Campanha Viral",
    description:
      "Entrega 1 Campanha Viral. Os benefícios são recebidos somente quando a empresa ativar a campanha.",
    field: "campanha",
    qty: 1,
    minBid: 7000
  }

];


/* ============================================================
   UTILIDADES
   ============================================================ */

const $ = selector =>
  document.querySelector(selector);


function escapeHtml(text) {

  return String(text ?? "")
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


function toast(text, type = "ok") {

  const box =
    $("#toast");

  if (!box) return;

  box.textContent =
    text;

  box.style.borderColor =
    type === "error"
      ? "#ff5b6e"
      : "";

  box.classList.remove(
    "hidden"
  );

  clearTimeout(
    box._timer
  );

  box._timer =
    setTimeout(
      () =>
        box.classList.add(
          "hidden"
        ),
      3500
    );

}


function setBusy(busy) {

  const button =
    $("#criarSala");

  if (!button) return;

  button.disabled =
    busy;

  button.textContent =
    busy
      ? "CRIANDO SALA..."
      : "🚀 CRIAR SALA";

}


function componentsText(company) {

  if (!company) {
    return "Não informados";
  }

  if (
    Array.isArray(
      company.components
    )
  ) {

    return company.components.length
      ? company.components.join(" • ")
      : "Não informados";

  }

  if (
    Array.isArray(
      company.componentes
    )
  ) {

    return company.componentes.length
      ? company.componentes.join(" • ")
      : "Não informados";

  }

  return String(
    company.components ||
    company.componentes ||
    company.members ||
    "Não informados"
  );

}


/* ============================================================
   FIREBASE / SALA
   ============================================================ */

async function saveRoom() {

  if (
    !currentRoom ||
    !roomData
  ) {
    return;
  }

  const f =
    await getFirebase();

  if (f) {

    await f.set(

      f.ref(
        f.db,
        `rooms/${currentRoom}`
      ),

      roomData

    );

  } else {

    demoSet(
      `room:${currentRoom}`,
      roomData
    );

  }

  render();

}


async function getLatestRoom() {

  if (!currentRoom) {
    return roomData;
  }

  const f =
    await getFirebase();

  if (f) {

    const snapshot =
      await f.get(

        f.ref(
          f.db,
          `rooms/${currentRoom}`
        )

      );

    return (
      snapshot.val() ||
      roomData
    );

  }

  return demoGet(
    `room:${currentRoom}`,
    roomData
  );

}


async function listen() {

  const f =
    await getFirebase();

  if (unsubscribe) {

    unsubscribe();

    unsubscribe =
      null;

  }

  if (f) {

    const reference =
      f.ref(
        f.db,
        `rooms/${currentRoom}`
      );

    unsubscribe =
      f.onValue(

        reference,

        snapshot => {

          roomData =
            snapshot.val() ||
            roomData;

          render();

        }

      );

  } else {

    const timer =
      setInterval(

        () => {

          roomData =
            demoGet(
              `room:${currentRoom}`,
              roomData
            );

          render();

        },

        900

      );

    unsubscribe =
      () =>
        clearInterval(timer);

  }

}


/* ============================================================
   EVENTOS JÁ UTILIZADOS
   ============================================================ */

function getUsedEvents() {

  const used = {

    ...(roomData?.usedEvents || {})

  };


  Object.values(
    roomData?.companies || {}
  )
    .forEach(company => {

      Object.values(
        company?.eventResponses || {}
      )
        .forEach(response => {

          if (!response?.eventId) {
            return;
          }

          const eventId =
            response.eventId;

          if (!used[eventId]) {

            used[eventId] = {

              eventId,

              title:
                response.eventTitle ||
                events[eventId]?.title ||
                eventId,

              round:
                Number(
                  response.round || 0
                ),

              usedAt:
                Number(
                  response.answeredAt || 0
                ),

              recoveredFromHistory:
                true

            };

          }

        });

    });


  return used;

}


function renderEventButtons() {

  const usedEvents =
    getUsedEvents();


  document
    .querySelectorAll(
      ".event"
    )
    .forEach(button => {

      const eventId =
        button.dataset.event;

      if (!eventId) return;


      if (
        !button.dataset.originalLabel
      ) {

        button.dataset.originalLabel =
          button.textContent
            .trim();

      }


      const original =
        button.dataset.originalLabel;

      const used =
        usedEvents[eventId];


      if (used) {

        const roundText =
          used.round
            ? ` • R${used.round}`
            : "";


        button.disabled =
          true;

        button.innerHTML =
          `✅ ${escapeHtml(original)}<br>` +
          `<small>UTILIZADO${roundText}</small>`;

        button.classList.add(
          "event-used"
        );

      } else {

        button.disabled =
          false;

        button.textContent =
          original;

        button.classList.remove(
          "event-used"
        );

      }

    });

}


/* ============================================================
   AUTORIZAÇÃO DE ACESSO

   IMPORTANTE:
   A chave da solicitação NÃO é obrigatoriamente o companyId.

   Empresa:
     companyId

   Mobile:
     companyId__mobile
   ============================================================ */

function getPendingAccessRequests() {

  return Object.entries(
    roomData?.accessRequests || {}
  )
    .filter(
      ([, request]) =>
        request?.status ===
        "pending"
    )
    .sort(
      (a, b) =>
        Number(
          a[1]?.requestedAt || 0
        ) -
        Number(
          b[1]?.requestedAt || 0
        )
    );

}


function renderAccessRequests() {

  const box =
    $("#solicitacoesAcesso");

  const counter =
    $("#qtdSolicitacoes");

  if (
    !box ||
    !counter
  ) {
    return;
  }


  const entries =
    getPendingAccessRequests();


  counter.textContent =
    `${entries.length} solicitaç` +
    `${entries.length === 1 ? "ão" : "ões"}`;


  if (!entries.length) {

    box.classList.add(
      "empty"
    );

    box.innerHTML = `
      <div class="access-empty">
        ✅ Nenhuma solicitação de acesso pendente.
      </div>
    `;

    return;
  }


  box.classList.remove(
    "empty"
  );


  box.innerHTML =
    entries
      .map(
        ([requestKey, request]) => {

          const companyId =
            request.companyId ||
            requestKey.replace(
              /__mobile$/,
              ""
            );


          const source =
            request.source ===
            "mobile"
              ? "📱 CENTRAL MOBILE"
              : "💻 EMPRESA";


          const accessType =
            request.firstAccess
              ? "🆕 PRIMEIRO ACESSO"
              : "🔄 NOVA ENTRADA";


          const company =
            roomData?.companies?.[
              companyId
            ];


          const passwordWarning =
            request.passwordMismatch
              ? `
                  <div class="access-password-warning">
                    ⚠️ SENHA DIVERGENTE
                    <small>
                      A senha digitada não corresponde ao registro anterior.
                      Se você autorizar, a senha desta empresa será atualizada
                      para a senha informada nesta solicitação.
                    </small>
                  </div>
                `
              : "";


          return `

            <div
              class="access-request-item"
            >

              <div
                class="access-request-info"
              >

                <strong>
                  🔐 ${escapeHtml(
                    request.companyName ||
                    company?.name ||
                    companyId
                  )}
                </strong>

                <span>
                  ${source}
                </span>

                <span>
                  ${accessType}
                </span>

                <small>
                  👥 ${escapeHtml(
                    request.components ||
                    componentsText(company)
                  )}
                </small>

                <small>
                  🏪 ${escapeHtml(
                    request.segment ||
                    company?.segment ||
                    "Segmento não informado"
                  )}
                </small>

                <small>
                  🎯 Rodada:
                  ${Number(
                    request.round || 0
                  )}
                </small>

                ${passwordWarning}

              </div>


              <div
                class="access-request-actions"
              >

                <button
                  type="button"
                  class="approve-access"
                  data-request-key="${escapeHtml(requestKey)}"
                >
                  ✅ AUTORIZAR
                </button>


                <button
                  type="button"
                  class="deny-access"
                  data-request-key="${escapeHtml(requestKey)}"
                >
                  ❌ NEGAR
                </button>

              </div>

            </div>

          `;

        }
      )
      .join("");


  document
    .querySelectorAll(
      ".approve-access"
    )
    .forEach(button => {

      button.onclick =
        () =>
          respondAccessRequest(
            button.dataset.requestKey,
            "approved"
          );

    });


  document
    .querySelectorAll(
      ".deny-access"
    )
    .forEach(button => {

      button.onclick =
        () =>
          respondAccessRequest(
            button.dataset.requestKey,
            "denied"
          );

    });

}


/* ============================================================
   RESPONDER SOLICITAÇÃO
   ============================================================ */

async function respondAccessRequest(
  requestKey,
  status
) {

  if (
    !currentRoom ||
    !roomData
  ) {
    return;
  }


  try {

    const latest =
      await getLatestRoom();


    latest.accessRequests =
      latest.accessRequests ||
      {};


    const request =
      latest.accessRequests[
        requestKey
      ];


    if (!request) {

      toast(
        "Solicitação não encontrada.",
        "error"
      );

      return;
    }


    const companyId =
      request.companyId ||
      requestKey.replace(
        /__mobile$/,
        ""
      );


    const currentCompany =
      latest.companies?.[
        companyId
      ];


    /* --------------------------------------------------------
       SENHA DIVERGENTE

       Só troca a senha se:
       1. houve divergência;
       2. professor clicou AUTORIZAR;
       3. existe senha solicitada.
       -------------------------------------------------------- */

    if (
      status === "approved" &&
      request.passwordMismatch &&
      request.requestedPassword &&
      currentCompany
    ) {

      currentCompany.accessPassword =
        String(
          request.requestedPassword
        );

      currentCompany.passwordVersion =
        2;

      currentCompany.passwordUpdatedAt =
        Date.now();

      latest.companies[
        companyId
      ] =
        currentCompany;

    }


    request.status =
      status;

    request.updatedAt =
      Date.now();


    if (
      status === "approved"
    ) {

      request.approvedAt =
        Date.now();

      request.approvedBy =
        "Prof. Leopoldo";

      request.sessionAuthorized =
        true;

    } else {

      request.deniedAt =
        Date.now();

      request.deniedBy =
        "Prof. Leopoldo";

      request.sessionAuthorized =
        false;

    }


    /*
      Nunca manter a senha digitada
      dentro da solicitação após
      a decisão do professor.
    */

    delete request.requestedPassword;


    latest.accessRequests[
      requestKey
    ] =
      request;


    roomData =
      latest;


    await saveRoom();


    toast(

      status === "approved"
        ? (
            request.passwordMismatch
              ? `✅ ${request.companyName} autorizada. Senha atualizada e acesso liberado.`
              : `✅ ${request.companyName} autorizada a entrar.`
          )
        : `❌ Entrada de ${request.companyName} negada.`

    );

  } catch (error) {

    console.error(error);

    toast(
      `Erro ao responder solicitação: ${error.message}`,
      "error"
    );

  }

}


/* ============================================================
   INVALIDAR AUTORIZAÇÕES

   Usado quando o professor pausa a Arena.
   Assim uma autorização antiga não volta a funcionar
   automaticamente depois da retomada.
   ============================================================ */

function invalidateApprovedAccesses(
  targetRoom
) {

  targetRoom.accessRequests =
    targetRoom.accessRequests ||
    {};


  Object.keys(
    targetRoom.accessRequests
  )
    .forEach(key => {

      const request =
        targetRoom.accessRequests[
          key
        ];


      if (
        request?.status ===
        "approved"
      ) {

        request.status =
          "expired";

        request.expiredAt =
          Date.now();

        request.sessionAuthorized =
          false;

      }

    });

}


/* ============================================================
   EMPRESAS
   ============================================================ */

async function excluirEmpresa(
  companyId,
  companyName
) {

  if (
    !currentRoom ||
    !roomData
  ) {
    return;
  }


  const confirmar =
    confirm(
      `Excluir a empresa "${companyName}" desta sala?`
    );


  if (!confirmar) {
    return;
  }


  try {

    const latest =
      await getLatestRoom();


    latest.companies =
      latest.companies ||
      {};


    delete latest.companies[
      companyId
    ];


    /*
      Remove TODAS as solicitações da empresa:
      computador, mobile e futuras variantes.
    */

    latest.accessRequests =
      latest.accessRequests ||
      {};


    Object.keys(
      latest.accessRequests
    )
      .forEach(key => {

        const request =
          latest.accessRequests[
            key
          ];


        if (
          request?.companyId ===
            companyId ||
          key === companyId ||
          key ===
            `${companyId}__mobile`
        ) {

          delete latest
            .accessRequests[
              key
            ];

        }

      });


    latest.mobileConnections =
      latest.mobileConnections ||
      {};


    delete latest
      .mobileConnections[
        companyId
      ];


    roomData =
      latest;


    await saveRoom();


    toast(
      `Empresa "${companyName}" excluída.`
    );

  } catch (error) {

    console.error(error);

    toast(
      `Erro ao excluir empresa: ${error.message}`,
      "error"
    );

  }

}


function renderCompanies() {

  const box =
    $("#empresas");

  const counter =
    $("#qtdEmpresas");

  if (
    !box ||
    !counter
  ) {
    return;
  }


  const companies =
    Object.values(
      roomData?.companies || {}
    );


  counter.textContent =
    `${companies.length} empresa${companies.length === 1 ? "" : "s"}`;


  if (!companies.length) {

    box.classList.add(
      "empty"
    );

    box.innerHTML =
      "Nenhuma empresa cadastrada.";

    return;
  }


  box.classList.remove(
    "empty"
  );


  box.innerHTML =
    companies
      .sort(
        (a, b) =>
          Number(
            b.xp || 0
          ) -
          Number(
            a.xp || 0
          )
      )
      .map(company => {

        const components =
          componentsText(company);


        return `

          <div
            class="company-item professor-company-item"
          >

            <div
              class="company-main-info"
            >

              <strong>
                🏢 ${escapeHtml(
                  company.name
                )}
              </strong>

              <small>
                ${escapeHtml(
                  company.segment ||
                  "Segmento não informado"
                )}
              </small>

              <small
                class="company-components"
              >
                👥 ${escapeHtml(
                  components
                )}
              </small>

            </div>


            <span>
              💰 ADM$ ${money(
                company.caixa
              )}
            </span>


            <span>
              👥 ${Number(
                company.clientes || 0
              )}
            </span>


            <span>
              ⭐ ${Number(
                company.reputacao || 0
              )}
            </span>


            <span>
              🏆 ${Number(
                company.xp || 0
              )} XP
            </span>


            <span
              class="resource-summary"
            >

              🛡️ ${Number(
                company.escudo || 0
              )}

              • 🔍 ${Number(
                company.pesquisa || 0
              )}

              • 📣 ${Number(
                company.campanha || 0
              )}

              ${
                company.campaignActive
                  ? " • ATIVA"
                  : ""
              }

            </span>


            <button
              type="button"
              class="delete-company"
              data-company-id="${escapeHtml(company.id)}"
              data-company-name="${escapeHtml(company.name)}"
            >
              🗑️ Excluir
            </button>

          </div>

        `;

      })
      .join("");


  document
    .querySelectorAll(
      ".delete-company"
    )
    .forEach(button => {

      button.onclick =
        () =>
          excluirEmpresa(
            button.dataset.companyId,
            button.dataset.companyName
          );

    });

}


/* ============================================================
   LEILÃO — PAINEL DO PROFESSOR
   ============================================================ */

function renderAuctionTeacher() {

  const panel =
    $("#painelLeilao");

  const content =
    $("#conteudoLeilao");

  const status =
    $("#statusLeilao");


  if (
    !panel ||
    !content ||
    !status
  ) {
    return;
  }


  const auction =
    roomData?.auction;


  if (!auction) {

    status.textContent =
      "Aguardando";

    content.innerHTML = `
      <p class="muted">
        O painel será ativado quando um leilão for aberto.
      </p>
    `;

    return;
  }


  const bids =
    Object.values(
      auction.bids || {}
    )
      .sort(
        (a, b) =>
          Number(
            b.amount || 0
          ) -
          Number(
            a.amount || 0
          )
      );


  status.textContent =
    auction.status === "open"
      ? `🟡 ABERTO • ${bids.length} lance${bids.length === 1 ? "" : "s"}`
      : "✅ ENCERRADO";


  content.innerHTML = `

    <div
      class="auction-summary"
    >

      <h3>
        ${escapeHtml(
          auction.title ||
          "Item em disputa"
        )}
      </h3>

      <p>
        ${escapeHtml(
          auction.description ||
          ""
        )}
      </p>

      <strong>
        Lance mínimo:
        ADM$ ${money(
          auction.minBid
        )}
      </strong>

    </div>


    <div
      class="auction-bids"
    >

      ${
        bids.length
          ? bids
              .map(bid => `

                <div
                  class="auction-bid-item"
                >

                  <strong>
                    🏢 ${escapeHtml(
                      bid.companyName
                    )}
                  </strong>

                  <span>
                    🔒 ADM$ ${money(
                      bid.amount
                    )}
                  </span>

                </div>

              `)
              .join("")
          : `
              <p class="muted">
                Nenhum lance recebido.
              </p>
            `
      }

    </div>


    ${
      auction.status === "open"
        ? `
            <button
              id="encerrarLeilao"
              class="primary auction-close-btn"
            >
              🏆 ENCERRAR LEILÃO E DEFINIR VENCEDOR
            </button>
          `
        : `
            <div
              class="auction-result"
            >

              ${
                auction.winnerName
                  ? `
                      🏆
                      <strong>
                        ${escapeHtml(
                          auction.winnerName
                        )}
                      </strong>

                      venceu por

                      <strong>
                        ADM$ ${money(
                          auction.winningBid
                        )}
                      </strong>
                    `
                  : `
                      Leilão encerrado sem vencedor.
                    `
              }

            </div>
          `
    }

  `;


  $("#encerrarLeilao")
    ?.addEventListener(
      "click",
      closeAuction
    );

}


/* ============================================================
   ENCERRAR LEILÃO
   ============================================================ */

async function closeAuction() {

  if (
    !currentRoom ||
    !roomData?.auction ||
    roomData.auction.status !==
      "open"
  ) {

    toast(
      "Não há leilão aberto.",
      "error"
    );

    return;
  }


  try {

    const latest =
      await getLatestRoom();


    const auction =
      latest.auction ||
      roomData.auction;


    const bids =
      Object.values(
        auction.bids || {}
      )
        .filter(
          bid =>
            Number(
              bid.amount || 0
            ) >=
            Number(
              auction.minBid || 0
            )
        )
        .sort(
          (a, b) =>
            Number(
              b.amount || 0
            ) -
              Number(
                a.amount || 0
              ) ||
            Number(
              a.createdAt || 0
            ) -
              Number(
                b.createdAt || 0
              )
        );


    if (!bids.length) {

      auction.status =
        "closed";

      auction.closedAt =
        Date.now();

      auction.winnerName =
        null;

      auction.winningBid =
        0;


      latest.status =
        "Leilão encerrado — sem lances";

      latest.auction =
        auction;

      roomData =
        latest;


      await saveRoom();


      toast(
        "Leilão encerrado sem lances."
      );

      return;
    }


    let winner =
      null;

    let winnerCompany =
      null;


    for (
      const bid of bids
    ) {

      const candidate =
        latest.companies?.[
          bid.companyId
        ];


      if (
        candidate &&
        Number(
          candidate.caixa || 0
        ) >=
        Number(
          bid.amount || 0
        )
      ) {

        winner =
          bid;

        winnerCompany =
          candidate;

        break;

      }

    }


    if (
      !winner ||
      !winnerCompany
    ) {

      auction.status =
        "closed";

      auction.closedAt =
        Date.now();

      auction.winnerName =
        null;

      auction.winningBid =
        0;


      latest.auction =
        auction;

      latest.status =
        "Leilão encerrado — nenhum lance com saldo suficiente";


      roomData =
        latest;


      await saveRoom();


      toast(
        "Nenhuma empresa possuía caixa suficiente para concluir o lance.",
        "error"
      );

      return;
    }


    const value =
      Number(
        winner.amount || 0
      );


    winnerCompany.caixa =
      Number(
        winnerCompany.caixa || 0
      ) -
      value;


    winnerCompany[
      auction.field
    ] =
      Number(
        winnerCompany[
          auction.field
        ] || 0
      ) +
      Number(
        auction.qty || 1
      );


    if (
      auction.field ===
      "campanha"
    ) {

      winnerCompany.campaignActive =
        false;

      winnerCompany.campaignReceivedAt =
        Date.now();

    }


    auction.status =
      "closed";

    auction.closedAt =
      Date.now();

    auction.winnerId =
      winner.companyId;

    auction.winnerName =
      winner.companyName;

    auction.winningBid =
      value;


    latest.companies[
      winner.companyId
    ] =
      winnerCompany;


    latest.auction =
      auction;


    latest.status =
      `Leilão encerrado — ${winner.companyName} venceu`;


    roomData =
      latest;


    await saveRoom();


    toast(
      `🏆 ${winner.companyName} venceu por ADM$ ${money(value)}!`
    );

  } catch (error) {

    console.error(error);

    toast(
      `Erro ao encerrar leilão: ${error.message}`,
      "error"
    );

  }

}


/* ============================================================
   NEGOCIAÇÕES
   ============================================================ */

function negotiationStatusLabel(
  status
) {

  const map = {

    pending:
      "🟡 PENDENTE",

    accepted:
      "✅ ACEITA",

    refused:
      "❌ RECUSADA",

    rejected:
      "❌ RECUSADA",

    countered:
      "↩️ CONTRAPROPOSTA",

    counteroffer:
      "↩️ CONTRAPROPOSTA"

  };


  return (
    map[status] ||
    String(
      status ||
      "PENDENTE"
    ).toUpperCase()
  );

}


function renderNegotiationsTeacher() {

  const box =
    $("#listaNegociacoes");

  const counter =
    $("#qtdNegociacoes");


  if (
    !box ||
    !counter
  ) {
    return;
  }


  const entries =
    Object.entries(
      roomData?.negotiations || {}
    )
      .sort(
        (a, b) =>
          Number(
            b[1]?.updatedAt ||
            b[1]?.createdAt ||
            0
          ) -
          Number(
            a[1]?.updatedAt ||
            a[1]?.createdAt ||
            0
          )
      );


  counter.textContent =
    `${entries.length} negociaç` +
    `${entries.length === 1 ? "ão" : "ões"}`;


  if (!entries.length) {

    box.classList.add(
      "empty"
    );

    box.innerHTML =
      "Nenhuma negociação registrada.";

    return;
  }


  box.classList.remove(
    "empty"
  );


  box.innerHTML =
    entries
      .slice(0, 30)
      .map(
        ([id, negotiation]) => {

          const type =
            negotiation.type ===
              "venda-campanha"
              ? "📣 Venda de Campanha Viral"
              : "🤝 Acordo / parceria";


          const detail =
            negotiation.type ===
              "venda-campanha"
              ? `ADM$ ${money(
                  negotiation.value
                )}`
              : escapeHtml(
                  negotiation.message ||
                  "Sem descrição"
                );


          return `

            <div
              class="teacher-negotiation-item"
            >

              <div>

                <strong>
                  ${type}
                </strong>

                <small>
                  ${escapeHtml(
                    negotiation.from ||
                    "?"
                  )}
                  →
                  ${escapeHtml(
                    negotiation.to ||
                    "?"
                  )}
                </small>

                <p>
                  ${detail}
                </p>

                ${
                  negotiation.counterMessage
                    ? `
                        <small>
                          ↩️ Contraproposta:
                          ${escapeHtml(
                            negotiation.counterMessage
                          )}
                        </small>
                      `
                    : ""
                }

              </div>


              <span
                class="negotiation-status"
              >
                ${negotiationStatusLabel(
                  negotiation.status
                )}
              </span>

            </div>

          `;

        }
      )
      .join("");

}


/* ============================================================
   CENTRAL ESTRATÉGICA MOBILE
   ============================================================ */

function renderMobileCompaniesSelect() {

  const select =
    $("#mobileDestino");

  if (!select) return;


  const previous =
    select.value;


  const companies =
    Object.values(
      roomData?.companies || {}
    );


  select.innerHTML =
    `
      <option value="all">
        📢 Todas as empresas
      </option>
    ` +
    companies
      .map(
        company => `

          <option
            value="${escapeHtml(company.id)}"
          >
            🏢 ${escapeHtml(company.name)}
          </option>

        `
      )
      .join("");


  if (
    [
      "all",
      ...companies.map(
        c => c.id
      )
    ].includes(previous)
  ) {

    select.value =
      previous;

  }

}


function renderMobileConnections() {

  const box =
    $("#celularesConectados");

  const counter =
    $("#qtdCelulares");


  if (
    !box ||
    !counter
  ) {
    return;
  }


  const connections =
    Object.values(
      roomData?.mobileConnections ||
      {}
    )
      .filter(
        connection =>
          connection?.status ===
          "active"
      );


  counter.textContent =
    `${connections.length} celular${connections.length === 1 ? "" : "es"}`;


  if (!connections.length) {

    box.classList.add(
      "empty"
    );

    box.innerHTML =
      "Nenhum celular estratégico conectado.";

    return;
  }


  box.classList.remove(
    "empty"
  );


  box.innerHTML =
    connections
      .map(
        connection => `

          <div
            class="mobile-connected-item"
          >

            <div>

              <strong>
                📱 ${escapeHtml(
                  connection.companyName
                )}
              </strong>

              <small>
                Código:
                ${escapeHtml(
                  connection.code
                )}
              </small>

            </div>

            <span>
              🟢 ATIVO
            </span>

          </div>

        `
      )
      .join("");

}


/* ============================================================
   ENVIAR MENSAGEM MOBILE
   ============================================================ */

async function sendMobileMessage() {

  if (
    !currentRoom ||
    !roomData
  ) {

    toast(
      "Crie ou acesse uma sala primeiro.",
      "error"
    );

    return;
  }


  const destination =
    $("#mobileDestino")
      ?.value ||
    "all";


  const type =
    $("#mobileTipo")
      ?.value ||
    "alerta";


  const text =
    $("#mobileMensagem")
      ?.value
      .trim();


  if (!text) {

    toast(
      "Digite a informação estratégica.",
      "error"
    );

    $("#mobileMensagem")
      ?.focus();

    return;
  }


  const latest =
    await getLatestRoom();


  latest.mobileMessages =
    latest.mobileMessages ||
    {};


  const id =
    `m-${Date.now()}-${Math.floor(
      Math.random() * 9999
    )}`;


  let companyName =
    "Todas as empresas";


  if (
    destination !==
    "all"
  ) {

    companyName =
      latest.companies?.[
        destination
      ]?.name ||
      destination;

  }


  latest.mobileMessages[
    id
  ] = {

    id,

    target:
      destination === "all"
        ? "all"
        : "company",

    companyId:
      destination === "all"
        ? null
        : destination,

    companyName,

    type,

    text,

    createdAt:
      Date.now(),

    createdBy:
      "Prof. Leopoldo"

  };


  roomData =
    latest;


  await saveRoom();


  if (
    $("#mobileMensagem")
  ) {

    $("#mobileMensagem").value =
      "";

  }


  if (
    $("#mobileProfessorConfirmacao")
  ) {

    $("#mobileProfessorConfirmacao").textContent =
      destination === "all"
        ? "A informação estratégica foi enviada para todas as empresas."
        : `A informação estratégica foi enviada para ${companyName}.`;

  }


  $("#modalProfessorMobile")
    ?.classList.remove(
      "hidden"
    );


  toast(
    destination === "all"
      ? "📲 Informação enviada para todas as empresas."
      : `📲 Informação enviada para ${companyName}.`
  );

}


/* ============================================================
   RENDER GERAL
   ============================================================ */

function render() {

  if (!roomData) {
    return;
  }


  if (
    $("#rodada")
  ) {

    $("#rodada").textContent =
      `${Number(
        roomData.round || 0
      )}/8`;

  }


  if (
    $("#status")
  ) {

    $("#status").textContent =
      roomData.status ||
      "Aguardando";

  }


  renderCompanies();

  renderAccessRequests();

  renderAuctionTeacher();

  renderNegotiationsTeacher();

  renderEventButtons();

  renderMobileCompaniesSelect();

  renderMobileConnections();

}


/* ============================================================
   CRIAR SALA
   ============================================================ */

$("#criarSala")
  ?.addEventListener(
    "click",

    async () => {

      const turma =
        $("#turma")
          ?.value
          .trim();


      const senha =
        $("#senha")
          ?.value
          .trim();


      if (!turma) {

        toast(
          "Digite o nome da turma.",
          "error"
        );

        $("#turma")
          ?.focus();

        return;
      }


      if (!senha) {

        toast(
          "Crie uma senha para o professor.",
          "error"
        );

        $("#senha")
          ?.focus();

        return;
      }


      setBusy(true);


      try {

        currentRoom =
          roomCode();


        roomData = {

          code:
            currentRoom,

          className:
            turma,

          teacherPassword:
            senha,

          createdAt:
            Date.now(),

          status:
            "Aguardando empresas",

          round:
            0,

          currentEvent:
            null,

          usedEvents:
            {},

          companies:
            {},

          negotiations:
            {},

          auction:
            null,

          accessRequests:
            {},

          mobileConnections:
            {},

          mobileMessages:
            {}

        };


        await saveRoom();


        if (
          $("#codigoSala")
        ) {

          $("#codigoSala").textContent =
            currentRoom;

        }


        $("#codigoWrap")
          ?.classList.remove(
            "hidden"
          );


        await listen();


        toast(

          FIREBASE.enabled
            ? `Sala ${currentRoom} criada e conectada ao Firebase!`
            : `Sala ${currentRoom} criada em modo demonstração.`

        );

      } catch (error) {

        console.error(error);


        currentRoom =
          null;

        roomData =
          null;


        toast(
          `Não foi possível criar a sala: ${error.message}`,
          "error"
        );

      } finally {

        setBusy(false);

      }

    }

  );


/* ============================================================
   ACESSAR SALA EXISTENTE
   ============================================================ */

async function acessarSalaExistente() {

  const codigo =
    (
      $("#codigoExistente")
        ?.value ||
      ""
    )
      .trim()
      .toUpperCase();


  const senha =
    (
      $("#senhaExistente")
        ?.value ||
      ""
    )
      .trim();


  if (!codigo) {

    toast(
      "Digite o código da sala.",
      "error"
    );

    $("#codigoExistente")
      ?.focus();

    return;
  }


  if (!senha) {

    toast(
      "Digite a senha do professor.",
      "error"
    );

    $("#senhaExistente")
      ?.focus();

    return;
  }


  try {

    const f =
      await getFirebase();


    let data =
      null;


    if (f) {

      const snapshot =
        await f.get(

          f.ref(
            f.db,
            `rooms/${codigo}`
          )

        );


      data =
        snapshot.val();

    } else {

      data =
        demoGet(
          `room:${codigo}`,
          null
        );

    }


    if (!data) {

      toast(
        "Sala não encontrada.",
        "error"
      );

      return;
    }


    if (
      String(
        data.teacherPassword ||
        ""
      ) !== senha
    ) {

      toast(
        "Senha do professor incorreta.",
        "error"
      );

      return;
    }


    currentRoom =
      codigo;

    roomData =
      data;


    roomData.usedEvents =
      roomData.usedEvents ||
      {};

    roomData.companies =
      roomData.companies ||
      {};

    roomData.negotiations =
      roomData.negotiations ||
      {};

    roomData.accessRequests =
      roomData.accessRequests ||
      {};

    roomData.mobileConnections =
      roomData.mobileConnections ||
      {};

    roomData.mobileMessages =
      roomData.mobileMessages ||
      {};


    roomData.usedEvents =
      getUsedEvents();


    if (
      $("#codigoSala")
    ) {

      $("#codigoSala").textContent =
        currentRoom;

    }


    $("#codigoWrap")
      ?.classList.remove(
        "hidden"
      );


    if (
      $("#turma")
    ) {

      $("#turma").value =
        roomData.className ||
        "";

    }


    await listen();


    render();


    toast(
      `Sala ${currentRoom} recuperada com sucesso.`
    );

  } catch (error) {

    console.error(error);


    toast(
      `Não foi possível acessar a sala: ${error.message}`,
      "error"
    );

  }

}


$("#acessarSala")
  ?.addEventListener(
    "click",
    acessarSalaExistente
  );


/* ============================================================
   COPIAR CÓDIGO
   ============================================================ */

$("#copiarCodigo")
  ?.addEventListener(

    "click",

    async () => {

      if (!currentRoom) {
        return;
      }


      try {

        await navigator
          .clipboard
          .writeText(
            currentRoom
          );


        toast(
          "Código copiado."
        );

      } catch {

        toast(
          `Código da sala: ${currentRoom}`
        );

      }

    }

  );


/* ============================================================
   INICIAR
   ============================================================ */

$("#iniciar")
  ?.addEventListener(

    "click",

    async () => {

      if (!roomData) {

        toast(
          "Crie ou acesse uma sala primeiro.",
          "error"
        );

        return;
      }


      roomData.status =
        "Em andamento";


      if (
        Number(
          roomData.round || 0
        ) < 1
      ) {

        roomData.round =
          1;

      }


      roomData.currentEvent =
        null;


      try {

        await saveRoom();


        toast(
          `▶ Arena em andamento — Rodada ${roomData.round}.`
        );

      } catch (error) {

        toast(
          error.message,
          "error"
        );

      }

    }

  );


/* ============================================================
   PRÓXIMA RODADA
   ============================================================ */

$("#proxima")
  ?.addEventListener(

    "click",

    async () => {

      if (!roomData) {

        toast(
          "Crie ou acesse uma sala primeiro.",
          "error"
        );

        return;
      }


      roomData.round =
        Math.min(
          8,
          Number(
            roomData.round || 0
          ) + 1
        );


      roomData.status =
        rounds[
          roomData.round - 1
        ]?.name ||
        "Final";


      roomData.currentEvent =
        null;


      try {

        await saveRoom();


        toast(
          `⏭ Rodada ${roomData.round}: ${roomData.status}`
        );

      } catch (error) {

        toast(
          error.message,
          "error"
        );

      }

    }

  );


/* ============================================================
   PAUSAR / RETOMAR
   ============================================================ */

$("#pausar")
  ?.addEventListener(

    "click",

    async () => {

      if (!roomData) {

        toast(
          "Crie ou acesse uma sala primeiro.",
          "error"
        );

        return;
      }


      const willPause =
        roomData.status !==
        "Pausado";


      if (willPause) {

        roomData.status =
          "Pausado";


        /*
          Todas as autorizações concedidas
          deixam de ser válidas.
        */

        invalidateApprovedAccesses(
          roomData
        );


      } else {

        roomData.status =
          "Em andamento";

      }


      try {

        await saveRoom();


        toast(

          willPause
            ? "⏸ Arena pausada. Autorizações anteriores foram encerradas."
            : "▶ Arena retomada. Cada empresa deverá solicitar nova autorização para entrar novamente."

        );

      } catch (error) {

        toast(
          error.message,
          "error"
        );

      }

    }

  );


/* ============================================================
   EVENTO ALEATÓRIO
   ============================================================ */

$("#crise")
  ?.addEventListener(

    "click",

    async () => {

      if (!roomData) {

        toast(
          "Crie ou acesse uma sala primeiro.",
          "error"
        );

        return;
      }


      const used =
        getUsedEvents();


      const available =
        Object.keys(
          events
        )
          .filter(
            eventId =>
              !used[eventId]
          );


      if (
        !available.length
      ) {

        toast(
          "Todos os eventos desta partida já foram utilizados.",
          "error"
        );

        return;
      }


      const eventId =
        available[
          Math.floor(
            Math.random() *
            available.length
          )
        ];


      await dispararEvento(
        eventId
      );

    }

  );


/* ============================================================
   DISPARAR EVENTO
   ============================================================ */

async function dispararEvento(
  eventId
) {

  if (!roomData) {

    toast(
      "Crie ou acesse uma sala primeiro.",
      "error"
    );

    return;
  }


  if (
    !events[eventId]
  ) {

    toast(
      "Evento não encontrado.",
      "error"
    );

    return;
  }


  const used =
    getUsedEvents();


  if (
    used[eventId]
  ) {

    const round =
      used[eventId].round;


    toast(

      round
        ? `Este evento já foi utilizado na Rodada ${round}.`
        : "Este evento já foi utilizado nesta partida.",

      "error"

    );


    renderEventButtons();

    return;
  }


  const timestamp =
    Date.now();


  roomData.usedEvents =
    roomData.usedEvents ||
    {};


  roomData.usedEvents[
    eventId
  ] = {

    eventId,

    title:
      events[eventId]?.title ||
      eventId,

    round:
      Number(
        roomData.round || 0
      ),

    usedAt:
      timestamp

  };


  roomData.currentEvent = {

    id:
      eventId,

    nonce:
      timestamp,

    round:
      Number(
        roomData.round || 0
      )

  };


  roomData.status =
    "Evento de mercado";


  try {

    await saveRoom();


    toast(
      `🚨 Evento disparado: ${events[eventId].title}`
    );

  } catch (error) {

    delete roomData.usedEvents[
      eventId
    ];


    toast(
      error.message,
      "error"
    );

  }

}


document
  .querySelectorAll(
    ".event"
  )
  .forEach(button => {

    button.addEventListener(

      "click",

      async () => {

        if (
          button.disabled
        ) {
          return;
        }


        await dispararEvento(
          button.dataset.event
        );

      }

    );

  });


/* ============================================================
   ABRIR LEILÃO
   ============================================================ */

$("#leilao")
  ?.addEventListener(

    "click",

    async () => {

      if (!roomData) {

        toast(
          "Crie ou acesse uma sala primeiro.",
          "error"
        );

        return;
      }


      if (
        roomData.auction &&
        roomData.auction.status ===
          "open"
      ) {

        toast(
          "Já existe um leilão aberto.",
          "error"
        );

        return;
      }


      const item =
        AUCTION_ITEMS[
          Math.floor(
            Math.random() *
            AUCTION_ITEMS.length
          )
        ];


      roomData.round =
        Math.max(
          3,
          Number(
            roomData.round || 0
          )
        );


      roomData.status =
        "Leilão aberto";


      roomData.auction = {

        status:
          "open",

        itemId:
          item.id,

        title:
          item.title,

        description:
          item.description,

        field:
          item.field,

        qty:
          item.qty,

        minBid:
          item.minBid,

        openedAt:
          Date.now(),

        bids:
          {}

      };


      try {

        await saveRoom();


        toast(
          `🔨 Leilão aberto: ${item.title}`
        );

      } catch (error) {

        toast(
          error.message,
          "error"
        );

      }

    }

  );


/* ============================================================
   MERCADO LIVRE
   ============================================================ */

$("#mercado")
  ?.addEventListener(

    "click",

    async () => {

      if (!roomData) {

        toast(
          "Crie ou acesse uma sala primeiro.",
          "error"
        );

        return;
      }


      roomData.status =
        "Mercado de negociações aberto";


      roomData.round =
        Math.max(
          6,
          Number(
            roomData.round || 0
          )
        );


      try {

        await saveRoom();


        toast(
          "🤝 Mercado livre aberto."
        );

      } catch (error) {

        toast(
          error.message,
          "error"
        );

      }

    }

  );


/* ============================================================
   CENTRAL MOBILE
   ============================================================ */

$("#enviarMobile")
  ?.addEventListener(

    "click",

    async () => {

      try {

        await sendMobileMessage();

      } catch (error) {

        console.error(error);


        toast(
          `Não foi possível enviar a informação: ${error.message}`,
          "error"
        );

      }

    }

  );


$("#fecharProfessorMobile")
  ?.addEventListener(

    "click",

    () => {

      $("#modalProfessorMobile")
        ?.classList.add(
          "hidden"
        );

    }

  );


/* ============================================================
   ENTER — ACESSAR SALA
   ============================================================ */

$("#senhaExistente")
  ?.addEventListener(

    "keydown",

    event => {

      if (
        event.key ===
        "Enter"
      ) {

        acessarSalaExistente();

      }

    }

  );


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

console.log(
  "ADM Arena 360 — Projeto Empreendedor — Prof. Leopoldo"
);

console.log(
  "Painel do Professor carregado: toda entrada exige autorização do professor."
);
