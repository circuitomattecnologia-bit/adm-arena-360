import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360
   CENTRAL MOBILE — INTELIGÊNCIA ESTRATÉGICA
   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   PROFESSOR
   - Empresas / celulares vinculados
   - Banco de mensagens das 16 rodadas
   - Seleção de uma, várias ou todas
   - Envio manual
   - Histórico

   EMPRESA / MOBILE
   - Somente mensagens destinadas à empresa
   - Tarja ROSA "NOVA INFORMAÇÃO ESTRATÉGICA"
   - Som curto
   - Registro de leitura

   SEGURANÇA
   - NÃO altera rodada
   - NÃO altera status
   - NÃO altera caixa
   - NÃO altera XP
   - NÃO altera clientes
   - NÃO altera reputação
   - NÃO altera recursos
   - NÃO envia decisões
========================================================= */

const IS_PROFESSOR =
  !!document.querySelector("#iniciar");

const IS_EMPRESA =
  !!document.querySelector("#nomeEmpresa");

let mobileRoomCode = "";
let mobileRoom = null;
let mobileUnsubscribe = null;
let lastMessageNotice = "";

const MESSAGE_BANK = {

  1: [
    ["mercado", "Leitura inicial do mercado",
      "Observe atentamente o comportamento dos clientes antes de definir sua estratégia. Nem toda oportunidade aparente produz resultado sustentável."],
    ["oportunidade", "Primeiros movimentos",
      "Empresas que compreenderem rapidamente seu posicionamento poderão construir vantagem para as próximas rodadas."],
    ["estrategia", "Decisão com propósito",
      "Antes de investir, identifique qual problema sua decisão pretende resolver e qual resultado espera alcançar."],
    ["alerta", "Cuidado com decisões impulsivas",
      "O início da Arena pode estimular gastos rápidos. Preserve capacidade financeira para reagir aos próximos cenários."],
    ["confidencial", "Sinal estratégico inicial",
      "Há indícios de que flexibilidade financeira e capacidade de adaptação serão importantes nas próximas etapas."]
  ],

  2: [
    ["mercado", "Clientes começam a comparar",
      "O mercado está mais atento à relação entre preço, qualidade e confiança. Diferenciação pode ganhar importância."],
    ["oportunidade", "Fortaleça sua presença",
      "Uma comunicação bem direcionada pode ampliar a percepção de valor da empresa."],
    ["estrategia", "Conheça seu público",
      "Reavalie quem é seu cliente principal e se suas decisões realmente conversam com esse público."],
    ["alerta", "Crescimento sem controle",
      "Aumentar presença no mercado sem acompanhar custos pode pressionar o caixa."],
    ["confidencial", "Movimento da concorrência",
      "Algumas empresas parecem preparar ações mais agressivas de mercado. Antecipar cenários pode ser uma vantagem."]
  ],

  3: [
    ["mercado", "Recursos ganham valor",
      "Recursos estratégicos podem se tornar decisivos. Avalie utilidade, preço e momento antes de disputar."],
    ["oportunidade", "Aquisição estratégica",
      "Um recurso bem escolhido pode gerar vantagem maior que uma simples economia imediata."],
    ["estrategia", "Defina seu limite",
      "Antes de entrar em uma disputa, estabeleça o valor máximo que sua empresa aceita comprometer."],
    ["alerta", "Não transforme disputa em vaidade",
      "Vencer uma disputa pagando além do valor estratégico pode significar perder na gestão."],
    ["confidencial", "Valor não é preço",
      "O recurso mais caro não necessariamente será o mais importante para sua empresa."]
  ],

  4: [
    ["mercado", "Mercado em observação",
      "Os resultados acumulados começam a revelar diferenças entre as estratégias das empresas. Compare desempenho sem copiar decisões."],
    ["oportunidade", "Hora de corrigir rota",
      "Ainda há espaço para ajustar decisões antes das fases mais complexas da Arena."],
    ["estrategia", "Proteja sua capacidade de reação",
      "Caixa, clientes, reputação e recursos devem ser analisados em conjunto. Evite administrar apenas um indicador."],
    ["alerta", "Atenção aos desequilíbrios",
      "Um indicador forte pode esconder fragilidades em outras áreas da empresa."],
    ["confidencial", "Próxima fase exigirá leitura",
      "As próximas rodadas aumentarão a importância de interpretar informações antes de agir."]
  ],

  5: [
    ["mercado", "Pressão por resultados comerciais",
      "O mercado começa a cobrar maior eficiência em vendas e conversão de oportunidades em clientes."],
    ["oportunidade", "Demanda em movimento",
      "Há sinais de crescimento de demanda. Empresas preparadas comercialmente podem aproveitar melhor o cenário."],
    ["estrategia", "Venda com margem",
      "Crescer em vendas sem observar resultado financeiro pode criar uma falsa sensação de sucesso."],
    ["alerta", "Volume não é lucro",
      "Mais clientes não garantem melhor desempenho se os custos crescerem de forma descontrolada."],
    ["confidencial", "Janela comercial",
      "Existe uma possibilidade de aceleração temporária da procura. Avalie se sua estrutura consegue responder."]
  ],

  6: [
    ["mercado", "Crédito entra no jogo",
      "Novas possibilidades de financiamento surgem, mas o custo do dinheiro precisa entrar na decisão."],
    ["oportunidade", "Capital para expansão",
      "Crédito pode antecipar investimentos importantes quando existe capacidade futura de pagamento."],
    ["estrategia", "Analise prazo e retorno",
      "Compare o prazo da dívida com o tempo necessário para o investimento produzir resultado."],
    ["alerta", "Endividamento exige controle",
      "Dinheiro disponível por meio de crédito não deve ser confundido com lucro."],
    ["confidencial", "Sinal sobre taxas",
      "Há indícios de mudança nas condições de financiamento. Avalie cuidadosamente o momento de assumir obrigações."]
  ],

  7: [
    ["mercado", "Fronteiras comerciais",
      "O comércio internacional amplia oportunidades, mas também expõe a empresa a novas variáveis."],
    ["oportunidade", "Mercado externo",
      "Novos compradores podem surgir fora do mercado tradicional da empresa."],
    ["estrategia", "Avalie câmbio e risco",
      "Uma operação internacional deve considerar preço, custos, prazo e possíveis mudanças cambiais."],
    ["alerta", "Cenário externo instável",
      "Mudanças internacionais podem transformar rapidamente uma boa oportunidade em uma operação arriscada."],
    ["confidencial", "Movimento internacional",
      "Informações de mercado indicam possível alteração nas condições externas. Empresas flexíveis poderão reagir melhor."]
  ],

  8: [
    ["mercado", "Logística sob pressão",
      "Custos de transporte e energia começam a influenciar mais fortemente a operação."],
    ["oportunidade", "Eficiência operacional",
      "Empresas que reduzirem desperdícios podem proteger margens mesmo em ambiente adverso."],
    ["estrategia", "Mapeie dependências",
      "Identifique quais atividades da empresa são mais vulneráveis a energia, transporte e fornecedores."],
    ["alerta", "Risco de interrupção",
      "Problemas logísticos podem afetar atendimento e reputação. Prepare alternativas."],
    ["confidencial", "Sinal de pressão nos custos",
      "Há indícios de aumento em custos operacionais. Antecipar ajustes pode reduzir impactos."]
  ],

  9: [
    ["mercado", "Mercado de capitais",
      "Expectativas e desempenho passam a influenciar a percepção de valor das empresas."],
    ["oportunidade", "Investimento com análise",
      "Movimentos de mercado podem abrir oportunidades, desde que sustentados por informações e estratégia."],
    ["estrategia", "Não siga apenas a tendência",
      "Uma valorização recente não garante desempenho futuro. Observe fundamentos e risco."],
    ["alerta", "Volatilidade",
      "Decisões baseadas apenas em euforia podem gerar perdas quando o mercado mudar de direção."],
    ["confidencial", "Expectativa dos investidores",
      "Há sinais de mudança na percepção de risco. Empresas consistentes podem ganhar confiança."]
  ],

  10: [
    ["mercado", "Oscilação de mercado",
      "Demanda, custos e expectativas estão mais instáveis. Estratégias rígidas podem perder eficiência."],
    ["oportunidade", "Adaptação rápida",
      "Empresas capazes de ajustar prioridades podem transformar volatilidade em oportunidade."],
    ["estrategia", "Trabalhe com cenários",
      "Considere um cenário favorável, um intermediário e um adverso antes de decidir."],
    ["alerta", "Evite apostar tudo",
      "Concentrar recursos em uma única previsão aumenta a exposição da empresa."],
    ["confidencial", "Mudança de tendência",
      "Indicadores sugerem que o comportamento recente do mercado pode não se manter."]
  ],

  11: [
    ["mercado", "Pessoas fazem diferença",
      "Produtividade, clima e capacidade da equipe passam a ter maior peso na gestão."],
    ["oportunidade", "Desenvolvimento da equipe",
      "Investir em pessoas pode melhorar execução, inovação e qualidade das decisões."],
    ["estrategia", "Equilibre custo e talento",
      "Reduzir despesas com pessoas pode aliviar o caixa, mas comprometer capacidade futura."],
    ["alerta", "Sinais de desgaste",
      "Equipes pressionadas continuamente podem apresentar queda de desempenho e reputação."],
    ["confidencial", "Talentos observam o mercado",
      "Profissionais valorizados podem buscar ambientes que ofereçam melhores perspectivas e reconhecimento."]
  ],

  12: [
    ["mercado", "Concorrência intensificada",
      "As empresas estão mais maduras e a disputa por clientes e posicionamento tende a aumentar."],
    ["oportunidade", "Diferenciação",
      "Uma proposta clara de valor pode ser mais eficiente do que simplesmente acompanhar concorrentes."],
    ["estrategia", "Conheça seus diferenciais",
      "Identifique o que sua empresa faz melhor e quais vantagens consegue sustentar."],
    ["alerta", "Guerra de preços",
      "Reduzir preço sem estratégia pode destruir margem e comprometer a sustentabilidade."],
    ["confidencial", "Concorrentes se movimentam",
      "Há sinais de reposicionamento no mercado. Observe tendências antes de responder."]
  ],

  13: [
    ["mercado", "Responsabilidade gera percepção",
      "Clientes e sociedade observam cada vez mais como as empresas se relacionam com a comunidade."],
    ["oportunidade", "Empresa que transforma",
      "Uma ação social coerente com os valores da empresa pode gerar impacto positivo e fortalecer reputação."],
    ["estrategia", "Impacto com sustentabilidade",
      "Responsabilidade social deve considerar benefício real, capacidade financeira e continuidade."],
    ["alerta", "Ação social não é propaganda vazia",
      "Uma iniciativa sem coerência ou impacto pode produzir efeito contrário na reputação."],
    ["confidencial", "Comunidade atenta",
      "Há maior sensibilidade social neste momento. Decisões responsáveis podem ganhar reconhecimento."]
  ],

  14: [
    ["mercado", "Grande crise",
      "O ambiente empresarial enfrenta forte instabilidade. Decisões anteriores agora mostram suas consequências."],
    ["oportunidade", "Crise também seleciona",
      "Empresas preparadas podem encontrar oportunidades justamente quando concorrentes estão fragilizados."],
    ["estrategia", "Priorize sobrevivência e continuidade",
      "Proteja atividades essenciais, caixa e capacidade de atender clientes."],
    ["alerta", "Decisão tardia custa caro",
      "Ignorar sinais de crise pode reduzir drasticamente as opções de reação."],
    ["confidencial", "Possível agravamento",
      "Há indícios de que a instabilidade ainda pode aumentar antes de ocorrer recuperação."]
  ],

  15: [
    ["mercado", "Recuperação e expansão",
      "O mercado começa a apresentar sinais de recuperação após o período de maior pressão."],
    ["oportunidade", "Momento de reconstruir",
      "Empresas financeiramente organizadas podem retomar investimentos e ampliar presença."],
    ["estrategia", "Cresça com memória",
      "Use as lições da crise para evitar repetir vulnerabilidades durante a expansão."],
    ["alerta", "Recuperação não elimina risco",
      "Retomar investimentos rapidamente demais pode recriar problemas financeiros."],
    ["confidencial", "Sinal de retomada",
      "Alguns indicadores apontam melhora gradual. Quem estiver preparado poderá reagir antes."]
  ],

 16: [
  ["mercado", "Choque de Mercado",
    "O mercado sofreu uma mudança brusca. Custos, demanda e comportamento dos consumidores podem mudar rapidamente."],
  ["oportunidade", "Reposicionamento",
    "Momentos de ruptura também criam espaço para empresas que conseguem ajustar sua estratégia antes da concorrência."],
  ["estrategia", "Proteja o essencial",
    "Observe caixa, clientes, reputação e capacidade operacional. Identifique qual indicador não pode sofrer nova pressão."],
  ["alerta", "Não reaja por impulso",
    "Uma mudança forte no mercado pode induzir decisões precipitadas. Analise o impacto financeiro antes de comprometer recursos."],
  ["confidencial", "O mercado ainda está se ajustando",
    "Os sinais indicam que esta não será a última pressão competitiva. Preserve capacidade de reação para as próximas rodadas."]
],

17: [
  ["mercado", "Guerra Comercial",
    "A disputa por clientes aumentou. Concorrentes podem usar preço, diferenciação, atendimento e inovação para ampliar participação."],
  ["oportunidade", "Conquiste sem destruir margem",
    "Há espaço para ganhar mercado, mas crescimento sustentável exige equilíbrio entre aquisição de clientes e resultado financeiro."],
  ["estrategia", "Escolha sua vantagem",
    "Defina claramente onde sua empresa pretende competir: fidelização, diferenciação ou ofensiva comercial."],
  ["alerta", "Cuidado com guerra de preços",
    "Reduzir preços ou gastar excessivamente para conquistar clientes pode produzir crescimento aparente e fragilidade financeira."],
  ["confidencial", "Concorrentes estão se movimentando",
    "Algumas empresas podem assumir posições mais agressivas. Uma estratégia coerente pode ser mais eficiente do que simplesmente imitá-las."]
],

18: [
  ["mercado", "Crise 360°",
    "A pressão agora atinge várias dimensões da empresa ao mesmo tempo. Caixa, clientes, reputação e equipe precisam ser analisados conjuntamente."],
  ["oportunidade", "Recuperação direcionada",
    "Mesmo durante uma crise ampla, identificar corretamente a maior fragilidade pode produzir uma recuperação importante."],
  ["estrategia", "Priorize",
    "Não tente resolver todos os problemas simultaneamente. Identifique o indicador mais crítico e proteja a continuidade da empresa."],
  ["alerta", "Desequilíbrio perigoso",
    "Um caixa aparentemente confortável pode esconder perda de clientes, desgaste da equipe ou deterioração da reputação."],
  ["confidencial", "A crise pode abrir espaço",
    "Empresas que atravessarem esta fase preservando capacidade de decisão poderão encontrar uma oportunidade relevante logo adiante."]
],

19: [
  ["mercado", "A Grande Oportunidade",
    "Uma janela especial surgiu no mercado. Esta pode ser a maior oportunidade de recuperação ou crescimento antes do Conselho Final."],
  ["oportunidade", "Hora de transformar posição",
    "Empresas que ficaram para trás ainda podem recuperar competitividade por meio de uma decisão estratégica bem calculada."],
  ["estrategia", "Risco e capacidade",
    "Compare o potencial de ganho com o caixa disponível, a situação dos clientes e a capacidade da empresa de sustentar a decisão."],
  ["alerta", "Oportunidade não significa dinheiro fácil",
    "Uma decisão agressiva sem estrutura pode criar um novo problema justamente antes da etapa final."],
  ["confidencial", "Última grande janela",
    "Esta é a principal oportunidade de reposicionamento antes da avaliação global da trajetória empresarial."]
],

20: [
  ["mercado", "Conselho Final — O Legado da Empresa",
    "Chegou o momento de demonstrar a qualidade global da gestão construída durante toda a ADM Arena 360."],
  ["oportunidade", "Valorize sua trajetória",
    "Resultados importam, mas recuperação, consistência, escolhas estratégicas e capacidade de adaptação também revelam qualidade de gestão."],
  ["estrategia", "Visão integrada",
    "Analise conjuntamente finanças, clientes, reputação, pessoas, inovação, estratégia e responsabilidade social."],
  ["alerta", "Caixa não decide sozinho",
    "Uma empresa não será avaliada apenas pelo dinheiro acumulado. O equilíbrio da gestão e a trajetória construída também serão considerados."],
  ["confidencial", "Última inteligência da Arena",
    "O Conselho Final observará não apenas onde sua empresa chegou, mas as decisões que construíram esse resultado."]
]
};


/* =========================================================
   UTILIDADES
========================================================= */

function normalizeCode(value) {

  const match =
    String(value || "")
      .toUpperCase()
      .match(/\bADM-\d{4}\b/);

  if (!match) return "";

  return match[0] === "ADM-0000"
    ? ""
    : match[0];
}


function normalizeName(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}


function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function detectRoomCode() {

  const url =
    new URL(location.href);

  const candidates = [
    url.searchParams.get("sala"),
    url.searchParams.get("room"),
    url.searchParams.get("codigo"),
    document.querySelector("#codigo")?.value,
    document.querySelector("#codigoExistente")?.value,
    document.querySelector("#salaPill")?.textContent,
    document.querySelector("#salaCodigo")?.textContent,
    localStorage.getItem("adm360:openingRoomCode"),
    localStorage.getItem("admArena360Room"),
    localStorage.getItem("admArenaRoom"),
    localStorage.getItem("admArenaRoomCode")
  ];

  for (const item of candidates) {

    const code =
      normalizeCode(item);

    if (code) return code;
  }

  return "";
}


async function firebaseSafe() {

  const f =
    await getFirebase();

  if (!f) {
    throw new Error(
      "Firebase indisponível."
    );
  }

  return f;
}


function companies() {

  return Object.entries(
    mobileRoom?.companies || {}
  );
}


function currentCompany() {

  if (!mobileRoom) {
    return null;
  }

  const visibleName =
    document.querySelector("#empresaNome")
      ?.textContent?.trim() ||
    document.querySelector("#nomeEmpresa")
      ?.value?.trim() ||
    "";

  const target =
    normalizeName(visibleName);

  if (!target) {
    return null;
  }

  const found =
    companies().find(
      ([, company]) =>
        normalizeName(company?.name) ===
        target
    );

  if (!found) {
    return null;
  }

  return {
    id: found[0],
    company: found[1]
  };
}


function messageId() {

  return (
    "msg-" +
    Date.now() +
    "-" +
    Math.floor(
      Math.random() * 999999
    )
  );
}


function categoryLabel(type) {

  const labels = {
    mercado: "MERCADO",
    oportunidade: "OPORTUNIDADE",
    estrategia: "ESTRATÉGIA",
    alerta: "ALERTA",
    confidencial: "INFORMAÇÃO CONFIDENCIAL",
    personalizada: "MENSAGEM PERSONALIZADA"
  };

  return (
    labels[type] ||
    "INTELIGÊNCIA ESTRATÉGICA"
  );
}


/* =========================================================
   ESTILO
========================================================= */

function installStyle() {

  if (
    document.querySelector(
      "#adm360MobileIntelStyle"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "adm360MobileIntelStyle";

  style.textContent = `

    #adm360MobileIntelProfessor,
    #adm360MobileIntelCompany {
      width:100%;
      box-sizing:border-box;
      margin-top:16px;
    }

    .adm360-mi-card {
      padding:18px;
      margin-bottom:14px;
      border-radius:18px;
      border:1px solid rgba(90,190,255,.20);
      background:linear-gradient(
        145deg,
        rgba(8,25,54,.96),
        rgba(15,20,45,.96)
      );
    }

    .adm360-mi-title {
      margin:0 0 5px;
      font-size:1.12rem;
      font-weight:950;
      color:#fff;
    }

    .adm360-mi-subtitle {
      margin:0 0 14px;
      color:rgba(255,255,255,.66);
      font-size:.84rem;
      line-height:1.5;
    }

    .adm360-mi-status-grid {
      display:grid;
      grid-template-columns:
        repeat(auto-fit,minmax(220px,1fr));
      gap:9px;
    }

    .adm360-mi-device {
      padding:12px;
      border-radius:12px;
      background:rgba(255,255,255,.035);
      border:1px solid rgba(255,255,255,.08);
    }

    .adm360-mi-device strong {
      display:block;
      color:#fff;
      margin-bottom:5px;
    }

    .adm360-mi-device span,
    .adm360-mi-device small {
      display:block;
      color:rgba(255,255,255,.65);
      line-height:1.45;
    }

    .adm360-mi-round-selector {
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin-bottom:14px;
    }

    .adm360-mi-round-selector button {
      min-width:46px;
      padding:8px 10px;
      border-radius:10px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.045);
      color:#fff;
      font-weight:900;
      cursor:pointer;
    }

    .adm360-mi-round-selector button.active {
      border-color:rgba(255,82,174,.75);
      background:rgba(255,82,174,.18);
      box-shadow:0 0 18px rgba(255,82,174,.14);
    }

    .adm360-mi-future {
      display:none;
      padding:10px 12px;
      margin-bottom:12px;
      border-radius:11px;
      border:1px solid rgba(255,205,70,.25);
      background:rgba(255,205,70,.06);
      color:#ffe39a;
      font-weight:900;
      font-size:.78rem;
    }

    .adm360-mi-future.show {
      display:block;
    }

    .adm360-mi-messages {
      display:grid;
      grid-template-columns:
        repeat(auto-fit,minmax(260px,1fr));
      gap:10px;
    }

    .adm360-mi-message {
      padding:14px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,.09);
      background:rgba(255,255,255,.03);
      cursor:pointer;
    }

    .adm360-mi-message.selected {
      border-color:rgba(255,82,174,.70);
      background:rgba(255,82,174,.09);
    }

    .adm360-mi-message-category {
      display:inline-block;
      margin-bottom:7px;
      padding:4px 7px;
      border-radius:999px;
      background:rgba(255,82,174,.12);
      color:#ff9dd2;
      font-size:.67rem;
      font-weight:950;
    }

    .adm360-mi-message strong {
      display:block;
      color:#fff;
      margin-bottom:7px;
    }

    .adm360-mi-message p {
      margin:0;
      color:rgba(255,255,255,.68);
      font-size:.78rem;
      line-height:1.5;
    }

    .adm360-mi-targets {
      display:grid;
      grid-template-columns:
        repeat(auto-fit,minmax(190px,1fr));
      gap:8px;
      margin:12px 0;
    }

    .adm360-mi-target {
      display:flex;
      align-items:center;
      gap:8px;
      padding:9px 10px;
      border-radius:10px;
      background:rgba(255,255,255,.035);
      border:1px solid rgba(255,255,255,.08);
    }

    .adm360-mi-target input {
      width:auto;
      margin:0;
    }

    .adm360-mi-send {
      width:100%;
      min-height:48px;
      margin-top:8px;
      border-radius:12px;
      border:1px solid rgba(255,82,174,.60);
      background:linear-gradient(
        135deg,
        #d92d8a,
        #a929cf
      );
      color:#fff;
      font-weight:950;
      cursor:pointer;
    }

    .adm360-mi-custom {
      display:grid;
      gap:9px;
    }

    .adm360-mi-custom input,
    .adm360-mi-custom textarea,
    .adm360-mi-custom select {
      width:100%;
      box-sizing:border-box;
    }

    .adm360-mi-history {
      display:grid;
      gap:8px;
    }

    .adm360-mi-history-item {
      padding:11px 12px;
      border-radius:11px;
      border:1px solid rgba(255,255,255,.075);
      background:rgba(255,255,255,.025);
    }

    .adm360-mi-history-item strong {
      color:#fff;
    }

    .adm360-mi-history-item small {
      display:block;
      margin-top:5px;
      color:rgba(255,255,255,.55);
      line-height:1.45;
    }

    /* CELULAR */

    #adm360MobilePinkBanner {
      position:fixed;
      top:14px;
      left:14px;
      right:14px;
      z-index:2147483001;
      display:none;
      padding:17px 20px;
      border-radius:17px;
      text-align:center;
      background:linear-gradient(
        135deg,
        #ff4fa8,
        #d62d92
      );
      border:3px solid #ffb9dc;
      color:#fff;
      font-family:system-ui,sans-serif;
      font-size:clamp(1rem,4vw,1.28rem);
      font-weight:1000;
      box-shadow:0 16px 45px rgba(0,0,0,.38);
    }

    #adm360MobilePinkBanner.show {
      display:block;
    }

    .adm360-mi-inbox-head {
      display:flex;
      justify-content:space-between;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
    }

    .adm360-mi-unread {
      padding:6px 9px;
      border-radius:999px;
      background:rgba(255,82,174,.15);
      border:1px solid rgba(255,82,174,.30);
      color:#ffacd8;
      font-weight:950;
      font-size:.72rem;
    }

    .adm360-mi-company-message {
      margin-top:10px;
      padding:14px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,.09);
      background:rgba(255,255,255,.03);
      cursor:pointer;
    }

    .adm360-mi-company-message.unread {
      border-color:rgba(255,82,174,.55);
      background:rgba(255,82,174,.075);
    }

    .adm360-mi-company-message h4 {
      margin:6px 0;
      color:#fff;
    }

    .adm360-mi-company-message p {
      color:rgba(255,255,255,.72);
      line-height:1.55;
    }

    .adm360-mi-confidential {
      color:#ff9fd2;
      font-weight:950;
      font-size:.72rem;
    }

    @media(max-width:700px) {

      .adm360-mi-messages,
      .adm360-mi-targets,
      .adm360-mi-status-grid {
        grid-template-columns:1fr;
      }
    }
  `;

  document.head.appendChild(
    style
  );
}


/* =========================================================
   PROFESSOR
========================================================= */

function installProfessorPanel() {

  if (
    !IS_PROFESSOR ||
    document.querySelector(
      "#adm360MobileIntelProfessor"
    )
  ) {
    return;
  }

  const mobilePanel =
    document.querySelector(
      '.teacher-nucleus-panel[data-panel="mobile"]'
    );

  if (!mobilePanel) {
    return;
  }

  const section =
    document.createElement("section");

  section.id =
    "adm360MobileIntelProfessor";

  section.innerHTML = `

    <div class="adm360-mi-card">
      <h3 class="adm360-mi-title">
        📱 CELULARES / EMPRESAS VINCULADAS
      </h3>
      <p class="adm360-mi-subtitle">
        A Central Mobile utiliza autorização própria.
        Aqui você acompanha as empresas e seus acessos Mobile.
      </p>
      <div
        id="adm360MiDevices"
        class="adm360-mi-status-grid"
      ></div>
    </div>

    <div class="adm360-mi-card">
      <h3 class="adm360-mi-title">
        📨 CENTRAL DE INTELIGÊNCIA ESTRATÉGICA
      </h3>
      <p
        id="adm360MiCurrentRound"
        class="adm360-mi-subtitle"
      ></p>

      <div
        id="adm360MiRoundSelector"
        class="adm360-mi-round-selector"
      ></div>

      <div
        id="adm360MiFutureWarning"
        class="adm360-mi-future"
      >
        RODADA DIFERENTE DA ATUAL —
        CONSULTA DO PROFESSOR.
        O envio exigirá confirmação.
      </div>

      <div
        id="adm360MiMessages"
        class="adm360-mi-messages"
      ></div>
    </div>

    <div class="adm360-mi-card">
      <h3 class="adm360-mi-title">
        🎯 DESTINATÁRIOS
      </h3>

      <label class="adm360-mi-target">
        <input
          id="adm360MiAll"
          type="checkbox"
        >
        <strong>TODAS AS EMPRESAS</strong>
      </label>

      <div
        id="adm360MiTargets"
        class="adm360-mi-targets"
      ></div>

      <button
        id="adm360MiSend"
        class="adm360-mi-send"
        type="button"
      >
        LIBERAR MENSAGEM SELECIONADA
      </button>
    </div>

    <div class="adm360-mi-card">
      <h3 class="adm360-mi-title">
        ✍️ MENSAGEM PERSONALIZADA
      </h3>
      <p class="adm360-mi-subtitle">
        Recurso complementar para situações
        criadas pelo professor durante a Arena.
      </p>

      <div class="adm360-mi-custom">
        <select id="adm360MiCustomCategory">
          <option value="personalizada">
            Mensagem personalizada
          </option>
          <option value="mercado">
            Mercado
          </option>
          <option value="oportunidade">
            Oportunidade
          </option>
          <option value="estrategia">
            Estratégia
          </option>
          <option value="alerta">
            Alerta
          </option>
          <option value="confidencial">
            Informação confidencial
          </option>
        </select>

        <input
          id="adm360MiCustomTitle"
          type="text"
          maxlength="80"
          placeholder="Título da mensagem"
        >

        <textarea
          id="adm360MiCustomText"
          rows="4"
          maxlength="700"
          placeholder="Digite a informação estratégica..."
        ></textarea>

        <button
          id="adm360MiSendCustom"
          class="adm360-mi-send"
          type="button"
        >
          LIBERAR MENSAGEM PERSONALIZADA
        </button>
      </div>
    </div>

    <div class="adm360-mi-card">
      <h3 class="adm360-mi-title">
        📜 HISTÓRICO DE ENVIOS
      </h3>
      <div
        id="adm360MiHistory"
        class="adm360-mi-history"
      ></div>
    </div>
  `;

  mobilePanel.appendChild(
    section
  );

  buildRoundButtons();

  section
    .querySelector("#adm360MiAll")
    ?.addEventListener(
      "change",
      event => {

        section
          .querySelectorAll(
            ".adm360-mi-target-company"
          )
          .forEach(
            checkbox => {
              checkbox.checked =
                event.target.checked;
            }
          );
      }
    );

  section
    .querySelector("#adm360MiSend")
    ?.addEventListener(
      "click",
      sendSelectedMessage
    );

  section
    .querySelector("#adm360MiSendCustom")
    ?.addEventListener(
      "click",
      sendCustomMessage
    );
}


function buildRoundButtons() {

  const box =
    document.querySelector(
      "#adm360MiRoundSelector"
    );

  if (!box) return;

  box.innerHTML = "";

  for (
    let round = 1;
    round <= 16;
    round++
  ) {

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.dataset.round =
      String(round);

    button.textContent =
      `R${round}`;

    button.addEventListener(
      "click",
      () => {

        box.dataset.selectedRound =
          String(round);

        renderProfessor();
      }
    );

    box.appendChild(
      button
    );
  }
}


function renderProfessor() {

  if (!IS_PROFESSOR) {
    return;
  }

  const panel =
    document.querySelector(
      "#adm360MobileIntelProfessor"
    );

  if (!panel) {
    return;
  }

  const currentRound =
    Math.max(
      1,
      Math.min(
        16,
        Number(
          mobileRoom?.round || 1
        )
      )
    );

  const selector =
    panel.querySelector(
      "#adm360MiRoundSelector"
    );

  if (
    selector &&
    !selector.dataset.selectedRound
  ) {
    selector.dataset.selectedRound =
      String(currentRound);
  }

  const selectedRound =
    Number(
      selector?.dataset
        ?.selectedRound ||
      currentRound
    );

  const currentLabel =
    panel.querySelector(
      "#adm360MiCurrentRound"
    );

  if (currentLabel) {
    currentLabel.textContent =
      `Rodada atual da Arena: ${currentRound}/16 · ` +
      `Banco visualizado: Rodada ${selectedRound}`;
  }

  panel
    .querySelectorAll(
      "#adm360MiRoundSelector button"
    )
    .forEach(
      button => {

        button.classList.toggle(
          "active",
          Number(
            button.dataset.round
          ) === selectedRound
        );
      }
    );

  panel
    .querySelector(
      "#adm360MiFutureWarning"
    )
    ?.classList.toggle(
      "show",
      selectedRound !==
        currentRound
    );

  renderDevices();
  renderTargets();
  renderMessageBank(
    selectedRound
  );
  renderHistory();
}


function renderDevices() {

  const box =
    document.querySelector(
      "#adm360MiDevices"
    );

  if (!box) return;

  const access =
    mobileRoom?.accessRequests ||
    {};

  const rows =
    companies().map(
      ([id, company]) => {

        const request =
          access[
            `${id}__mobile`
          ];

        let status =
          "SEM ACESSO MOBILE";

        if (
          request?.status ===
          "approved"
        ) {
          status =
            "AUTORIZADO";
        } else if (
          request?.status ===
          "pending"
        ) {
          status =
            "AGUARDANDO AUTORIZAÇÃO";
        } else if (
          request?.status ===
          "denied"
        ) {
          status =
            "ACESSO NEGADO";
        } else if (
          request?.status ===
          "expired"
        ) {
          status =
            "SESSÃO ENCERRADA";
        }

        const when =
          Number(
            request?.updatedAt ||
            request?.approvedAt ||
            request?.requestedAt ||
            0
          );

        return `
          <div class="adm360-mi-device">
            <strong>
              📱 ${escapeHtml(
                company?.name || id
              )}
            </strong>

            <span>
              Empresa vinculada:
              ${escapeHtml(
                company?.name || id
              )}
            </span>

            <span>
              Status Mobile:
              <b>${escapeHtml(status)}</b>
            </span>

            <small>
              ${
                when
                  ? "Última movimentação: " +
                    new Date(when)
                      .toLocaleString(
                        "pt-BR"
                      )
                  : "Nenhum acesso Mobile registrado."
              }
            </small>
          </div>
        `;
      }
    );

  box.innerHTML =
    rows.length
      ? rows.join("")
      : `
        <div class="adm360-mi-device">
          Nenhuma empresa cadastrada.
        </div>
      `;
}


function renderTargets() {

  const box =
    document.querySelector(
      "#adm360MiTargets"
    );

  if (!box) return;

  const checked =
    new Set(
      Array.from(
        box.querySelectorAll(
          ".adm360-mi-target-company:checked"
        )
      ).map(
        input =>
          input.value
      )
    );

  box.innerHTML =
    companies()
      .map(
        ([id, company]) => `
          <label class="adm360-mi-target">
            <input
              class="adm360-mi-target-company"
              type="checkbox"
              value="${escapeHtml(id)}"
              ${
                checked.has(id)
                  ? "checked"
                  : ""
              }
            >
            <span>
              ${escapeHtml(
                company?.name || id
              )}
            </span>
          </label>
        `
      )
      .join("");
}


function renderMessageBank(
  round
) {

  const box =
    document.querySelector(
      "#adm360MiMessages"
    );

  if (!box) return;

  const selected =
    box.dataset.selectedIndex;

  const messages =
    MESSAGE_BANK[round] || [];

  box.innerHTML =
    messages
      .map(
        (
          [type, title, text],
          index
        ) => `
          <article
            class="adm360-mi-message ${
              String(index) === selected
                ? "selected"
                : ""
            }"
            data-index="${index}"
          >
            <span
              class="adm360-mi-message-category"
            >
              ${escapeHtml(
                categoryLabel(type)
              )}
            </span>

            <strong>
              ${escapeHtml(title)}
            </strong>

            <p>
              ${escapeHtml(text)}
            </p>
          </article>
        `
      )
      .join("");

  box
    .querySelectorAll(
      ".adm360-mi-message"
    )
    .forEach(
      card => {

        card.addEventListener(
          "click",
          () => {

            box.dataset.selectedIndex =
              card.dataset.index;

            renderMessageBank(
              round
            );
          }
        );
      }
    );
}


function selectedTargets() {

  return Array.from(
    document.querySelectorAll(
      ".adm360-mi-target-company:checked"
    )
  )
    .map(
      input =>
        input.value
    )
    .filter(Boolean);
}


async function sendSelectedMessage() {

  const selector =
    document.querySelector(
      "#adm360MiRoundSelector"
    );

  const round =
    Number(
      selector?.dataset
        ?.selectedRound ||
      mobileRoom?.round ||
      1
    );

  const box =
    document.querySelector(
      "#adm360MiMessages"
    );

  const index =
    Number(
      box?.dataset
        ?.selectedIndex
    );

  const source =
    MESSAGE_BANK[round]?.[
      index
    ];

  if (!source) {

    alert(
      "Selecione uma mensagem."
    );

    return;
  }

  const targets =
    selectedTargets();

  if (!targets.length) {

    alert(
      "Selecione pelo menos uma empresa destinatária."
    );

    return;
  }

  const currentRound =
    Number(
      mobileRoom?.round || 1
    );

  if (
    round !==
    currentRound
  ) {

    const confirmed =
      confirm(
        `ATENÇÃO\n\n` +
        `A Arena está na Rodada ${currentRound}, ` +
        `mas a mensagem pertence à Rodada ${round}.\n\n` +
        `Deseja realmente liberar esta mensagem?`
      );

    if (!confirmed) {
      return;
    }
  }

  const [
    type,
    title,
    text
  ] = source;

  await sendMessage({
    type,
    title,
    text,
    round,
    targets
  });
}


async function sendCustomMessage() {

  const title =
    document.querySelector(
      "#adm360MiCustomTitle"
    )?.value?.trim();

  const text =
    document.querySelector(
      "#adm360MiCustomText"
    )?.value?.trim();

  const type =
    document.querySelector(
      "#adm360MiCustomCategory"
    )?.value ||
    "personalizada";

  const targets =
    selectedTargets();

  if (
    !title ||
    !text
  ) {

    alert(
      "Informe título e mensagem."
    );

    return;
  }

  if (!targets.length) {

    alert(
      "Selecione pelo menos uma empresa destinatária."
    );

    return;
  }

  await sendMessage({
    type,
    title,
    text,
    round:
      Number(
        mobileRoom?.round || 1
      ),
    targets
  });

  document.querySelector(
    "#adm360MiCustomTitle"
  ).value = "";

  document.querySelector(
    "#adm360MiCustomText"
  ).value = "";
}


async function sendMessage({
  type,
  title,
  text,
  round,
  targets
}) {

  if (!mobileRoomCode) {

    alert(
      "Arena não identificada."
    );

    return;
  }

  const f =
    await firebaseSafe();

  const id =
    messageId();

  const targetNames =
    targets.map(
      id =>
        mobileRoom
          ?.companies?.[id]
          ?.name ||
        id
    );

  const message = {
    id,
    type,
    category:
      categoryLabel(type),
    title,
    text,
    round:
      Number(round || 0),
    targets,
    targetNames,
    confidential:
      targets.length === 1,
    sentAt:
      Date.now(),
    sentBy:
      "Prof. Leopoldo",
    status:
      "sent"
  };

  await f.set(
    f.ref(
      f.db,
      `rooms/${mobileRoomCode}/mobileIntelligence/messages/${id}`
    ),
    message
  );

  alert(
    "Mensagem estratégica liberada com sucesso."
  );
}


function renderHistory() {

  const box =
    document.querySelector(
      "#adm360MiHistory"
    );

  if (!box) return;

  const messages =
    Object.values(
      mobileRoom
        ?.mobileIntelligence
        ?.messages ||
      {}
    )
      .sort(
        (a, b) =>
          Number(
            b?.sentAt || 0
          ) -
          Number(
            a?.sentAt || 0
          )
      );

  if (!messages.length) {

    box.innerHTML = `
      <div class="adm360-mi-history-item">
        Ainda não há mensagens enviadas.
      </div>
    `;

    return;
  }

  box.innerHTML =
    messages
      .slice(0, 40)
      .map(
        message => `
          <div class="adm360-mi-history-item">
            <strong>
              ${escapeHtml(
                message?.title ||
                "Mensagem estratégica"
              )}
            </strong>

            <small>
              Rodada:
              ${Number(
                message?.round || 0
              )}
              ·
              ${
                message?.sentAt
                  ? new Date(
                      message.sentAt
                    ).toLocaleString(
                      "pt-BR"
                    )
                  : ""
              }
              <br>
              Destinatários:
              ${escapeHtml(
                (
                  message?.targetNames ||
                  []
                ).join(", ")
              )}
            </small>
          </div>
        `
      )
      .join("");
}


/* =========================================================
   EMPRESA / CELULAR
========================================================= */

function installCompanyPanel() {

  if (
    !IS_EMPRESA ||
    document.querySelector(
      "#adm360MobileIntelCompany"
    )
  ) {
    return;
  }

  const host =
    document.querySelector(
      "#jogo"
    );

  if (!host) {
    return;
  }

  const section =
    document.createElement(
      "section"
    );

  section.id =
    "adm360MobileIntelCompany";

  section.className =
    "adm360-mi-card";

  section.innerHTML = `

    <div class="adm360-mi-inbox-head">
      <div>
        <h3 class="adm360-mi-title">
          📱 CAIXA DE INTELIGÊNCIA
        </h3>

        <p
          id="adm360MiCompanyIdentity"
          class="adm360-mi-subtitle"
        >
          Central Mobile
        </p>
      </div>

      <div
        id="adm360MiUnread"
        class="adm360-mi-unread"
      >
        0 NÃO LIDAS
      </div>
    </div>

    <div
      id="adm360MiCompanyMessages"
    ></div>
  `;

  host.prepend(
    section
  );

  const banner =
    document.createElement(
      "div"
    );

  banner.id =
    "adm360MobilePinkBanner";

  banner.textContent =
    "NOVA INFORMAÇÃO ESTRATÉGICA";

  document.body.appendChild(
    banner
  );
}


function companyMessages() {

  const current =
    currentCompany();

  if (!current) {
    return [];
  }

  return Object.values(
    mobileRoom
      ?.mobileIntelligence
      ?.messages ||
    {}
  )
    .filter(
      message =>
        Array.isArray(
          message?.targets
        ) &&
        message.targets.includes(
          current.id
        )
    )
    .sort(
      (a, b) =>
        Number(
          b?.sentAt || 0
        ) -
        Number(
          a?.sentAt || 0
        )
    );
}


function renderCompany() {

  if (!IS_EMPRESA) {
    return;
  }

  const panel =
    document.querySelector(
      "#adm360MobileIntelCompany"
    );

  if (!panel) {
    return;
  }

  const current =
    currentCompany();

  if (!current) {
    return;
  }

  const identity =
    panel.querySelector(
      "#adm360MiCompanyIdentity"
    );

  if (identity) {

    identity.textContent =
      `${current.company?.name || "Empresa"} · ` +
      `Rodada ${Number(
        mobileRoom?.round || 0
      )}/16 · ` +
      `Dispositivo Mobile autorizado`;
  }

  const messages =
    companyMessages();

  const reads =
    mobileRoom
      ?.mobileIntelligence
      ?.reads?.[
        current.id
      ] ||
    {};

  const unread =
    messages.filter(
      message =>
        !reads[
          message.id
        ]
    );

  const counter =
    panel.querySelector(
      "#adm360MiUnread"
    );

  if (counter) {

    counter.textContent =
      `${unread.length} ` +
      (
        unread.length === 1
          ? "NÃO LIDA"
          : "NÃO LIDAS"
      );
  }

  const box =
    panel.querySelector(
      "#adm360MiCompanyMessages"
    );

  if (!box) {
    return;
  }

  if (!messages.length) {

    box.innerHTML = `
      <div class="adm360-mi-company-message">
        Nenhuma informação estratégica
        recebida até o momento.
      </div>
    `;

    return;
  }

  box.innerHTML =
    messages
      .map(
        message => {

          const read =
            reads[
              message.id
            ];

          return `
            <article
              class="
                adm360-mi-company-message
                ${read ? "" : "unread"}
              "
              data-message-id="${escapeHtml(
                message.id
              )}"
            >

              ${
                message.confidential
                  ? `
                    <div
                      class="adm360-mi-confidential"
                    >
                      CONFIDENCIAL —
                      EXCLUSIVO PARA SUA EMPRESA
                    </div>
                  `
                  : ""
              }

              <span
                class="adm360-mi-message-category"
              >
                ${escapeHtml(
                  message.category ||
                  categoryLabel(
                    message.type
                  )
                )}
              </span>

              <h4>
                ${escapeHtml(
                  message.title
                )}
              </h4>

              <p>
                ${escapeHtml(
                  message.text
                )}
              </p>

              <small>
                Rodada
                ${Number(
                  message.round || 0
                )}
                ·
                ${
                  message.sentAt
                    ? new Date(
                        message.sentAt
                      ).toLocaleString(
                        "pt-BR"
                      )
                    : ""
                }
                <br>
                ${
                  read
                    ? "LIDA em " +
                      new Date(
                        read
                      ).toLocaleString(
                        "pt-BR"
                      )
                    : "NOVA — toque para registrar a leitura"
                }
              </small>

            </article>
          `;
        }
      )
      .join("");

  box
    .querySelectorAll(
      ".adm360-mi-company-message[data-message-id]"
    )
    .forEach(
      card => {

        card.addEventListener(
          "click",
          () =>
            markRead(
              card.dataset.messageId
            )
        );
      }
    );

  notifyNewest(
    unread
  );
}


async function markRead(
  id
) {

  const current =
    currentCompany();

  if (
    !current ||
    !id ||
    !mobileRoomCode
  ) {
    return;
  }

  const alreadyRead =
    mobileRoom
      ?.mobileIntelligence
      ?.reads?.[
        current.id
      ]?.[
        id
      ];

  if (alreadyRead) {
    return;
  }

  const f =
    await firebaseSafe();

  await f.set(
    f.ref(
      f.db,
      `rooms/${mobileRoomCode}/mobileIntelligence/reads/${current.id}/${id}`
    ),
    Date.now()
  );
}


function notifyNewest(
  unread
) {

  if (!unread.length) {
    return;
  }

  const newest =
    unread[0];

  if (
    !newest?.id ||
    newest.id ===
      lastMessageNotice
  ) {
    return;
  }

  const age =
    Date.now() -
    Number(
      newest.sentAt || 0
    );

  /*
    Só toca automaticamente
    para mensagem recém-chegada.
  */

  if (
    age < 30000
  ) {

    lastMessageNotice =
      newest.id;

    showPinkBanner();

    playShortSound();
  }
}


function showPinkBanner() {

  const banner =
    document.querySelector(
      "#adm360MobilePinkBanner"
    );

  if (!banner) return;

  banner.classList.add(
    "show"
  );

  clearTimeout(
    banner._timer
  );

  banner._timer =
    setTimeout(
      () => {
        banner.classList.remove(
          "show"
        );
      },
      5000
    );
}


function playShortSound() {

  try {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContext) {
      return;
    }

    const ctx =
      new AudioContext();

    const oscillator =
      ctx.createOscillator();

    const gain =
      ctx.createGain();

    oscillator.type =
      "sine";

    oscillator.frequency.value =
      760;

    gain.gain.setValueAtTime(
      0.0001,
      ctx.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.16,
      ctx.currentTime + 0.02
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + 0.55
    );

    oscillator.connect(
      gain
    );

    gain.connect(
      ctx.destination
    );

    oscillator.start();

    oscillator.stop(
      ctx.currentTime + 0.58
    );

  } catch (error) {

    console.warn(
      "Som Mobile não pôde ser reproduzido:",
      error
    );
  }
}


/* =========================================================
   SINCRONIZAÇÃO
========================================================= */

async function startMobileIntelligence() {

  installStyle();

  if (IS_PROFESSOR) {
    installProfessorPanel();
  }

  if (IS_EMPRESA) {
    installCompanyPanel();
  }

  const findRoom =
    setInterval(
      async () => {

        const code =
          detectRoomCode();

        if (!code) {
          return;
        }

        clearInterval(
          findRoom
        );

        mobileRoomCode =
          code;

        const f =
          await firebaseSafe();

        const ref =
          f.ref(
            f.db,
            `rooms/${code}`
          );

        if (
          mobileUnsubscribe
        ) {
          mobileUnsubscribe();
        }

        mobileUnsubscribe =
          f.onValue(
            ref,
            snapshot => {

              mobileRoom =
                snapshot?.val?.() ||
                snapshot ||
                {};

              if (IS_PROFESSOR) {
                installProfessorPanel();
                renderProfessor();
              }

              if (IS_EMPRESA) {
                installCompanyPanel();
                renderCompany();
              }
            }
          );

      },
      500
    );
}


startMobileIntelligence()
  .catch(
    error => {

      console.error(
        "ADM Arena 360 — Inteligência Mobile:",
        error
      );
    }
  );
