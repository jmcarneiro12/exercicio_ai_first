# Jogo da Memória (Phaser 3)

Exercício de aprendizado: um jogo da memória 4x4 feito com **Phaser 3** e **Vite**, sem imagens externas (as cartas são texturas geradas por código).

## Conceitos praticados

- Configuração do jogo e ciclo de vida da Scene (`preload`, `create`)
- GameObjects, origem e posicionamento de uma grade
- Texturas geradas com `Graphics.generateTexture`
- Input por objeto (`setInteractive`, `pointerdown`)
- Tweens encadeados (animação de virar a carta)
- Estado no objeto (`setData`/`getData`) e controle de turno (`selected`, `locked`)
- Timers da cena (`time.delayedCall`) e reinício de cena (`scene.restart`)

## Rodar localmente

```bash
npm install
npm run dev
```

## Estrutura

```
index.html
src/main.js              configuração do Phaser.Game
src/scenes/GameScene.js  toda a lógica do jogo
```
