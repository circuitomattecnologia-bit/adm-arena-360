export const rounds = [
  {id:1,name:"Fundação",text:"Definam a estratégia inicial da empresa e confirmem o foco: crescimento, equilíbrio ou segurança."},
  {id:2,name:"Investimentos",text:"Distribuam recursos entre estrutura, pessoas, marketing, tecnologia, estoque e reserva."},
  {id:3,name:"Leilão",text:"Recursos premium do mercado serão disputados. Decidam quanto vale pagar."},
  {id:4,name:"Mercado",text:"Escolham onde competir: preço, qualidade, marketing, pessoas ou inovação."},
  {id:5,name:"Crises",text:"Preparem-se para eventos inesperados. A decisão precisa ser rápida e justificada."},
  {id:6,name:"Negociação",text:"Mercado livre aberto. Enviem propostas e busquem alianças vantajosas."},
  {id:7,name:"Batalha ADM",text:"Rodada de conhecimento, velocidade e argumentação administrativa."},
  {id:8,name:"Boss Final",text:"Crise geral. Salvem a empresa usando tudo o que aprenderam."}
];

export const events = {
  fornecedor:{
    title:"📦 FORNECEDORES +18%",
    text:"O custo dos principais fornecedores aumentou 18%. Sua equipe precisa reagir.",
    options:[
      {label:"Renegociar e buscar alternativas",delta:{caixa:-3000,reputacao:2,xp:10}},
      {label:"Repassar todo o aumento ao cliente",delta:{clientes:-7,reputacao:-4,caixa:4000,xp:4}},
      {label:"Usar parte da reserva e manter preços",delta:{caixa:-8000,reputacao:4,clientes:3,xp:8}}
    ]
  },
  viral:{
    title:"📱 RECLAMAÇÃO VIRAL",
    text:"Uma reclamação contra sua empresa viralizou. Qual será a resposta?",
    options:[
      {label:"Responder com empatia e propor solução",delta:{caixa:-2000,reputacao:10,clientes:3,xp:12}},
      {label:"Ignorar a postagem",delta:{reputacao:-12,clientes:-6,xp:2}},
      {label:"Responder de forma defensiva",delta:{reputacao:-18,clientes:-8,xp:0}}
    ]
  },
  equipe:{
    title:"👥 EQUIPE INSATISFEITA",
    text:"Funcionários reclamam de sobrecarga e falta de reconhecimento.",
    options:[
      {label:"Reorganizar tarefas e ouvir a equipe",delta:{equipe:12,caixa:-2000,reputacao:2,xp:10}},
      {label:"Dar bônus financeiro imediato",delta:{equipe:15,caixa:-9000,xp:7}},
      {label:"Ignorar por enquanto",delta:{equipe:-18,reputacao:-3,xp:1}}
    ]
  },
  boom:{
    title:"📈 BOOM DE VENDAS",
    text:"A procura disparou. Há risco de faltar estoque e cair a qualidade.",
    options:[
      {label:"Expandir com cautela",delta:{caixa:10000,clientes:10,reputacao:5,xp:10}},
      {label:"Aceitar todos os pedidos",delta:{caixa:18000,clientes:12,reputacao:-8,equipe:-8,xp:5}},
      {label:"Manter capacidade atual",delta:{caixa:5000,reputacao:3,xp:6}}
    ]
  },
  logistica:{
    title:"🚚 CRISE LOGÍSTICA",
    text:"Parte das entregas está atrasada. Clientes começaram a reclamar.",
    options:[
      {label:"Contratar apoio emergencial",delta:{caixa:-7000,reputacao:5,xp:9}},
      {label:"Avisar clientes e renegociar prazos",delta:{reputacao:3,clientes:-2,xp:8}},
      {label:"Esperar normalizar",delta:{reputacao:-10,clientes:-6,xp:2}}
    ]
  },
  credito:{
    title:"🏦 CRÉDITO DISPONÍVEL",
    text:"O banco oferece ADM$ 20.000, com pagamento futuro de ADM$ 24.000.",
    options:[
      {label:"Contratar para investir",delta:{caixa:20000,inovacao:6,xp:6}},
      {label:"Recusar e preservar endividamento",delta:{xp:7}},
      {label:"Contratar e guardar no caixa",delta:{caixa:20000,xp:3}}
    ]
  }
};

export function clampCompany(c){
  c.caixa = Math.max(0, c.caixa ?? 100000);
  c.clientes = Math.max(0, c.clientes ?? 50);
  c.reputacao = Math.max(0, Math.min(100, c.reputacao ?? 50));
  c.equipe = Math.max(0, Math.min(100, c.equipe ?? 100));
  c.inovacao = Math.max(0, c.inovacao ?? 0);
  c.xp = Math.max(0, c.xp ?? 0);
  return c;
}
