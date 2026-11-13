import Phaser from 'phaser';

const CARD_SIZE = 120;
const GAP = 20;
const COLS = 4;
const ROWS = 4;
const GAME_WIDTH = 640;
const GAME_HEIGHT = 640;

// 8 cores = 8 pares = 16 cartas
const COLORS = [0xe74c3c, 0xf39c12, 0xf1c40f, 0x2ecc71, 0x1abc9c, 0x3498db, 0x9b59b6, 0xe84393];

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    // Sem arquivos de imagem: desenhamos com Graphics e "congelamos" em texturas.
    this.createCardTextures();
  }

  create() {
    this.cards = [];
    this.selected = [];      // cartas viradas na jogada atual (0, 1 ou 2)
    this.locked = false;     // true enquanto uma checagem está em andamento
    this.moves = 0;
    this.matchedPairs = 0;

    this.movesText = this.add
      .text(GAME_WIDTH / 2, 24, 'Jogadas: 0', { fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5);

    // Baralho: cada índice de face aparece 2x, embaralhado (Fisher-Yates)
    const deck = COLORS.flatMap((_, i) => [i, i]);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Phaser.Math.Between(0, i);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const { x, y } = this.getCardPosition(row, col);
        const card = this.add.image(x, y, 'card-back');

        // Estado da carta vive no próprio objeto (via setData/getData).
        card.setData({ faceIndex: deck[this.cards.length], faceUp: false, matched: false });

        card.setInteractive({ useHandCursor: true });
        card.on('pointerdown', () => this.onCardClicked(card));

        this.cards.push(card);
      }
    }
  }

  /**
   * Vira a carta com animação: encolhe scaleX até 0, troca a textura
   * (verso <-> frente) e expande de volta a 1, simulando uma rotação.
   */
  flipCard(card) {
    
    this.tweens.add({
      targets: card,
      scaleX: 0,
      duration: 200,
      ease: 'linear',
      onComplete: () => {
        const faceUp = !card.getData('faceUp');
        card.setData('faceUp', faceUp);
        
        if (faceUp) {
          card.setTexture(`card-face-${card.getData('faceIndex')}`);
        } else {
          card.setTexture('card-back');
        }
        this.tweens.add({
          targets: card,
          scaleX: 1,
          duration: 150,
          ease: 'Linear',
        });
      }
    });

  }

  /** Clique do jogador: valida, vira e, com 2 cartas, chama a checagem. */
  onCardClicked(card) {
    if (this.locked) return;                        // checagem em andamento
    if (card.getData('matched')) return;            // par já encontrado
    if (this.selected.includes(card)) return;       // mesma carta clicada de novo

    this.selected.push(card);
    this.flipCard(card);

    if (this.selected.length === 2) {
      this.moves++;
      this.movesText.setText(`Jogadas: ${this.moves}`);
      this.checkMatch();
    }
  }

  /** Chamado quando todos os pares foram encontrados. */
  showVictory() {
    const msg = this.add
    .text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      `Você venceu em ${this.moves} jogadas!\nClique para reiniciar`,
      {
        fontSize: '48px',
        color: '#ffffff',
        align: 'center',
      }
    )
    .setOrigin(0.5)
    .setDepth(10)
    .setAlpha(0); // para o fade-in opcional
  this.tweens.add({
    targets: msg,
    alpha: 1,
    duration: 400,
    ease: 'Linear',
  });
  this.time.delayedCall(500, () => {
    this.input.once('pointerdown', () => this.scene.restart());
  });
  }

  /**
   * Compara as duas cartas em this.selected.
   * Ao terminar, SEMPRE deve esvaziar this.selected e liberar this.locked.
   */
  checkMatch() {
    this.locked = true;
  const [a, b] = this.selected;
  if (a.getData('faceIndex') === b.getData('faceIndex')) {
    a.setData('matched', true);
    b.setData('matched', true);
    this.matchedPairs++;
    this.selected = [];
    this.locked = false;
    if (this.matchedPairs === COLORS.length) this.showVictory();
  } else {
    this.time.delayedCall(600, () => {
      this.flipCard(a);
      this.flipCard(b);
      this.selected = [];
      this.locked = false;
    });
  }
  }

  /**
   * Retorna o centro (x, y) da carta na linha `row` e coluna `col`.
   * As imagens usam origem 0.5, então x e y devem ser o CENTRO da carta.
   * Dica: calcule o tamanho total da grade e o deslocamento que a centraliza.
   */
  getCardPosition(row, col) {
    
const gridWidth = CARD_SIZE * COLS + GAP * (COLS - 1);
const gridHeight = CARD_SIZE * ROWS + GAP * (ROWS - 1);

const offsetX = (GAME_WIDTH - gridWidth) / 2;
const offsetY = (GAME_HEIGHT - gridHeight) / 2;

const x = offsetX + col * (CARD_SIZE + GAP) + CARD_SIZE / 2;
const y = offsetY + row * (CARD_SIZE + GAP) + CARD_SIZE / 2;

    return { x, y };
  }

  createCardTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Verso da carta
    g.fillStyle(0x34495e).fillRoundedRect(0, 0, CARD_SIZE, CARD_SIZE, 14);
    g.lineStyle(4, 0x7f8c8d).strokeRoundedRect(2, 2, CARD_SIZE - 4, CARD_SIZE - 4, 12);
    g.generateTexture('card-back', CARD_SIZE, CARD_SIZE);

    // Frente de cada carta (uma cor por par)
    COLORS.forEach((color, i) => {
      g.clear();
      g.fillStyle(color).fillRoundedRect(0, 0, CARD_SIZE, CARD_SIZE, 14);
      g.generateTexture(`card-face-${i}`, CARD_SIZE, CARD_SIZE);
    });

    g.destroy();
  }
}
