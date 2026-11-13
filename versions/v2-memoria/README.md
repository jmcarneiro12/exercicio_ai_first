# Jogo da Memória V2 (Phaser 3): sons + coringa

Evolução da V1. Mesmo jogo 4x4 com **Phaser 3** e **Vite**, sem arquivos de imagem ou áudio (cartas e sons são gerados por código).

## O que mudou em relação à V1

- **Sons** (Web Audio): virar carta, acerto, vitória, derrota, reinício por coringa e um aviso a cada minuto de jogo.
- **Par de coringas** (estrela dourada em fundo roxo): coringas nunca formam par. Ao virar uma carta coringa pela **3ª vez** na partida, o tabuleiro é reembaralhado e jogadas, pares e contador de coringas voltam a zero. **O cronômetro não é zerado.**
- **Condições de derrota**: 100 jogadas ou 5 minutos.
- O baralho tem 7 pares de cores + 1 par de coringas (16 cartas).
- HUD com jogadas, tempo e contador de coringas.

## Regras de áudio

- Uma única voz por vez, com prioridade: `flip < acerto/minuto < reinício < vitória/derrota`. O som mais importante corta o atual; um menos importante é descartado enquanto outro mais importante toca.
- Cada som é limitado à duração da animação/mensagem que acompanha (`SOUND_LIMIT_MS` em `src/constants.js`).

## Rodar localmente

```bash
npm install
npm run dev
```

## Estrutura

```
index.html
src/main.js                  configuração do Phaser.Game
src/constants.js             layout, regras e durações de animação/som
src/audio/SoundManager.js    sintetizador de sons com prioridade
src/scenes/GameScene.js      lógica do jogo
```
