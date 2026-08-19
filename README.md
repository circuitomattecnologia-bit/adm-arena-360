# ADM ARENA 360 — Guerra de Gestão

Jogo web competitivo para Chromebook, criado para o Dia do Administrador e turmas de Ensino Médio Técnico em Administração.

## O que já existe nesta versão

- Página inicial do jogo
- Painel Mestre do professor
- Código de sala
- Entrada das empresas
- Indicadores: caixa, clientes, reputação, equipe, inovação e XP
- 8 rodadas
- Decisões com consequências
- Eventos de mercado disparados pelo professor
- Negociações entre empresas
- Ranking/telão
- Modo demonstração sem banco de dados
- Estrutura pronta para Firebase Realtime Database

## Teste rápido — modo demonstração

1. Abra `index.html`.
2. Entre no Painel do Professor e crie uma sala.
3. Copie o código.
4. Em outra aba do MESMO navegador, abra `empresa.html`.
5. Entre usando o código criado.
6. No painel do professor, clique em Iniciar e avance as rodadas.

> O modo demonstração usa o armazenamento do navegador. Ele serve apenas para testar a lógica e o visual. Chromebooks diferentes precisam do Firebase.

## Ativar multiplayer real

1. Crie um projeto no Firebase.
2. Registre um aplicativo Web.
3. Ative o **Realtime Database**.
4. Copie o objeto `firebaseConfig`.
5. Abra `js/firebase-config.js`.
6. Troque `enabled: false` por `enabled: true`.
7. Substitua os valores `COLE_AQUI` pelos valores do seu projeto.

## Regras iniciais do Realtime Database para teste controlado

Para um teste curto em sala, você pode iniciar com regras temporárias de leitura/escrita abertas apenas durante a configuração. Antes do uso real com estudantes, configure regras de segurança adequadas e, idealmente, autenticação.

Não publique senhas reais de professor no banco em texto puro. Esta versão guarda o campo apenas como estrutura de interface; a autenticação segura deve ser a próxima etapa antes do uso definitivo.

## Publicação

O projeto é estático e pode ser publicado em GitHub Pages. O Firebase fica responsável pelos dados em tempo real.

Arquivos principais:

- `index.html`
- `professor.html`
- `empresa.html`
- `ranking.html`
- `css/style.css`
- `js/firebase-config.js`
- `js/firebase-service.js`
- `js/game.js`
- `js/professor.js`
- `js/empresa.js`
- `js/ranking.js`

## Próximos módulos recomendados

- Login seguro do professor
- Aceitar/recusar/contrapropor negociações
- Leilão em tempo real
- Roleta animada
- Cronômetro sincronizado
- Quiz simultâneo completo
- Cartas estratégicas
- Som e efeitos
- Histórico da partida
- Relatório final por empresa
- QR Code/código curto de entrada
