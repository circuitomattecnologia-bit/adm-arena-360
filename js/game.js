export const rounds = [
  {
    id: 1,
    name: "Fundação",
    text: "Definam a estratégia inicial da empresa e confirmem o foco: crescimento, equilíbrio ou segurança."
  },

  {
    id: 2,
    name: "Investimentos",
    text: "Distribuam recursos entre estrutura, pessoas, marketing, tecnologia, estoque e reserva."
  },

  {
    id: 3,
    name: "Leilão",
    text: "Recursos premium do mercado serão disputados. Decidam quanto vale pagar."
  },

  {
    id: 4,
    name: "Mercado",
    text: "Escolham onde competir: preço, qualidade, marketing, pessoas ou inovação."
  },

  {
    id: 5,
    name: "Vendas & Resultado",
    text: "Transformem decisões em resultado: faturamento, custos, lucro ou prejuízo passam a ganhar peso na gestão."
  },

  {
    id: 6,
    name: "Crédito Empresarial",
    text: "Avaliem empréstimos, juros, prazo, vencimento e o impacto do endividamento no fluxo de caixa."
  },

  {
    id: 7,
    name: "Comércio Internacional",
    text: "Mudanças no cenário internacional afetam fornecedores, insumos, matérias-primas, preços e prazos."
  },

  {
    id: 8,
    name: "Crise Logística",
    text: "Combustível, frete, transporte e abastecimento pressionam custos. Protejam a operação sem perder competitividade."
  },

  {
    id: 9,
    name: "Bolsa de Valores",
    text: "Parte do caixa poderá ser destinada a investimentos de mercado. Analise risco, oportunidade e liquidez antes de decidir."
  },

  {
    id: 10,
    name: "Mercado Financeiro",
    text: "Altas e quedas do mercado revelam os resultados dos investimentos e testam a capacidade financeira da empresa."
  },

  {
    id: 11,
    name: "Gestão de Pessoas",
    text: "Salários, capacitação, produtividade, clima e reconhecimento exigem decisões que equilibrem pessoas e resultados."
  },

  {
    id: 12,
    name: "Concorrência Total",
    text: "Preço, qualidade, marketing, inovação e atendimento entram em confronto direto pela preferência do mercado."
  },

  {
    id: 13,
    name: "Responsabilidade Social",
    text: "A empresa decide como contribuir socialmente sem comprometer sua sustentabilidade financeira. Impacto social também faz parte da gestão."
  },

  {
    id: 14,
    name: "Grande Crise",
    text: "Inflação, juros, câmbio, demanda, fornecedores e compromissos financeiros podem se combinar em um grande teste de resistência."
  },

  {
    id: 15,
    name: "Expansão Estratégica",
    text: "É hora de decidir entre crescer, investir, negociar, quitar obrigações, proteger caixa ou preparar a empresa para os desafios finais."
  },

  {
    id: 16,
    name: "Choque de Mercado",
    text: "Uma mudança brusca no mercado altera custos, demanda e comportamento dos consumidores. Reavalie prioridades e proteja a sustentabilidade da empresa."
  },

  {
    id: 17,
    name: "Guerra Comercial",
    text: "A concorrência intensifica a disputa por clientes. Preço, diferenciação, atendimento, reputação e inovação entram no centro da estratégia."
  },

  {
    id: 18,
    name: "Crise 360°",
    text: "Caixa, clientes, reputação e equipe são pressionados simultaneamente. A empresa precisa escolher onde agir primeiro e preservar sua capacidade de recuperação."
  },

  {
    id: 19,
    name: "A Grande Oportunidade",
    text: "Surge a maior oportunidade antes da decisão final. Avalie risco, capacidade financeira e potencial de crescimento para transformar oportunidade em recuperação ou vantagem competitiva."
  },

  {
    id: 20,
    name: "Conselho Final — O Legado da Empresa",
    text: "A última decisão reúne toda a trajetória da empresa. Resultado financeiro, mercado, reputação, pessoas, inovação, estratégia e responsabilidade social definirão a Pontuação Final de Gestão."
  }
];


/* =========================================================
   EVENTOS DA ADM ARENA 360
========================================================= */

export const events = {

  fornecedor: {
    title: "📦 FORNECEDORES +18%",

    text:
      "O custo dos principais fornecedores aumentou 18%. Sua equipe precisa reagir.",

    options: [

      {
        label:
          "Renegociar e buscar alternativas",

        delta: {
          caixa: -3000,
          reputacao: 2,
          xp: 10
        }
      },

      {
        label:
          "Repassar todo o aumento ao cliente",

        delta: {
          clientes: -7,
          reputacao: -4,
          caixa: 4000,
          xp: 4
        }
      },

      {
        label:
          "Usar parte da reserva e manter preços",

        delta: {
          caixa: -8000,
          reputacao: 4,
          clientes: 3,
          xp: 8
        }
      }
    ]
  },


  viral: {
    title: "📱 RECLAMAÇÃO VIRAL",

    text:
      "Uma reclamação contra sua empresa viralizou. Qual será a resposta?",

    options: [

      {
        label:
          "Responder com empatia e propor solução",

        delta: {
          caixa: -2000,
          reputacao: 10,
          clientes: 3,
          xp: 12
        }
      },

      {
        label:
          "Ignorar a postagem",

        delta: {
          reputacao: -12,
          clientes: -6,
          xp: 2
        }
      },

      {
        label:
          "Responder de forma defensiva",

        delta: {
          reputacao: -18,
          clientes: -8,
          xp: 0
        }
      }
    ]
  },


  equipe: {
    title: "👥 EQUIPE INSATISFEITA",

    text:
      "Funcionários reclamam de sobrecarga e falta de reconhecimento.",

    options: [

      {
        label:
          "Reorganizar tarefas e ouvir a equipe",

        delta: {
          equipe: 12,
          caixa: -2000,
          reputacao: 2,
          xp: 10
        }
      },

      {
        label:
          "Dar bônus financeiro imediato",

        delta: {
          equipe: 15,
          caixa: -9000,
          xp: 7
        }
      },

      {
        label:
          "Ignorar por enquanto",

        delta: {
          equipe: -18,
          reputacao: -3,
          xp: 1
        }
      }
    ]
  },


  boom: {
    title: "📈 BOOM DE VENDAS",

    text:
      "A procura disparou. Há risco de faltar estoque e cair a qualidade.",

    options: [

      {
        label:
          "Expandir com cautela",

        delta: {
          caixa: 10000,
          clientes: 10,
          reputacao: 5,
          xp: 10
        }
      },

      {
        label:
          "Aceitar todos os pedidos",

        delta: {
          caixa: 18000,
          clientes: 12,
          reputacao: -8,
          equipe: -8,
          xp: 5
        }
      },

      {
        label:
          "Manter capacidade atual",

        delta: {
          caixa: 5000,
          reputacao: 3,
          xp: 6
        }
      }
    ]
  },


  logistica: {
    title: "🚚 CRISE LOGÍSTICA",

    text:
      "Parte das entregas está atrasada. Clientes começaram a reclamar.",

    options: [

      {
        label:
          "Contratar apoio emergencial",

        delta: {
          caixa: -7000,
          reputacao: 5,
          xp: 9
        }
      },

      {
        label:
          "Avisar clientes e renegociar prazos",

        delta: {
          reputacao: 3,
          clientes: -2,
          xp: 8
        }
      },

      {
        label:
          "Esperar normalizar",

        delta: {
          reputacao: -10,
          clientes: -6,
          xp: 2
        }
      }
    ]
  },


  credito: {
    title: "🏦 CRÉDITO DISPONÍVEL",

    text:
      "O banco oferece ADM$ 20.000, com pagamento futuro de ADM$ 24.000.",

    options: [

      {
        label:
          "Contratar para investir",

        delta: {
          caixa: 20000,
          inovacao: 6,
          xp: 6
        }
      },

      {
        label:
          "Recusar e preservar endividamento",

        delta: {
          xp: 7
        }
      },

      {
        label:
          "Contratar e guardar no caixa",

        delta: {
          caixa: 20000,
          xp: 3
        }
      }
    ]
  }
};


/* =========================================================
   PROTEÇÃO DOS INDICADORES
========================================================= */

export function clampCompany(c) {

  c.caixa =
    Math.max(
      0,
      c.caixa ?? 100000
    );


  c.clientes =
    Math.max(
      0,
      c.clientes ?? 50
    );


  c.reputacao =
    Math.max(
      0,
      Math.min(
        100,
        c.reputacao ?? 50
      )
    );


  c.equipe =
    Math.max(
      0,
      Math.min(
        100,
        c.equipe ?? 100
      )
    );


  c.inovacao =
    Math.max(
      0,
      c.inovacao ?? 0
    );


  c.xp =
    Math.max(
      0,
      c.xp ?? 0
    );


  return c;
}
