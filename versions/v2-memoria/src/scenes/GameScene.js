import Phaser from 'phaser';
import SoundManager from '../audio/SoundManager.js';
import {
  CARD_SIZE, GAP, COLS, ROWS, GAME_WIDTH, GAME_HEIGHT,
  COLORS, JOKER, JOKER_FLIPS_TO_RESET, MAX_MOVES, MAX_TIME_SECONDS, MINUTE_SECONDS,
  FLIP_HALF_OUT_MS, FLIP_HALF_IN_MS, FLIP_TOTAL_MS, MATCH_PULSE_MS, MISMATCH_DELAY_MS,
  END_MESSAGE_FADE_MS, TOAST_FADE_MS, MINUTE_TOAST_HOLD_MS, RESET_TOAST_HOLD_MS,
} from '../constants.js';

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
    this.locked = false;     // true enquanto uma checagem/animação está em andamento
    this.over = false;       // true após vitória ou derrota
    this.moves = 0;
    this.matchedPairs = 0;
    this.jokerFlips = 0;     // quantas vezes uma carta coringa foi virada
    this.elapsed = 0;        // segundos de jogo; NÃO é zerado pelo coringa

    this.sfx = new SoundManager(this.sound);
    this.events.once('shutdown', () => this.sfx.stopCurrent());

    const hud = { fontSize: '22px', color: '#ffffff' };
    this.movesText = this.add.text(20, 24, '', hud).setOrigin(0, 0.5);
    this.timeText = this.add.text(GAME_WIDTH - 20, 24, '', hud).setOrigin(1, 0.5);
    this.jokerText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 22, '', hud).setOrigin(0.5);
    this.updateHud();

    const deck = this.buildDeck();
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

    // Cronômetro da partida: tick de 1s, vive na cena (reiniciar a cena o recria).
    this.timer = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.onTick() });
  }

  /** Baralho: 7 pares de cores + 1 par de coringas, embaralhado (Fisher-Yates). */
  buildDeck() {
    const deck = [...COLORS.flatMap((_, i) => [i, i]), JOKER, JOKER];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Phaser.Math.Between(0, i);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  // ---------------------------------------------------------------- HUD / tempo

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  updateHud() {
    this.movesText.setText(`Jogadas: ${this.moves}/${MAX_MOVES}`);
    this.timeText
      .setText(`Tempo: ${this.formatTime(this.elapsed)}/${this.formatTime(MAX_TIME_SECONDS)}`)
      .setColor(MAX_TIME_SECONDS - this.elapsed <= 30 ? '#ff6b6b' : '#ffffff');
    this.jokerText.setText(`Coringa: ${this.jokerFlips}/${JOKER_FLIPS_TO_RESET}`);
  }

  onTick() {
    if (this.over) return;
    this.elapsed++;
    this.updateHud();

    if (this.elapsed >= MAX_TIME_SECONDS) {
      this.showDefeat('Tempo esgotado!');
    } else if (this.elapsed % MINUTE_SECONDS === 0) {
      this.sfx.play('minute');
      this.showToast(`${this.elapsed / MINUTE_SECONDS} min de jogo`, MINUTE_TOAST_HOLD_MS, 60);
    }
  }

  // ---------------------------------------------------------------- cartas

  /**
   * Vira a carta com animação: encolhe scaleX até 0, troca a textura
   * (verso <-> frente) e expande de volta a 1, simulando uma rotação.
   * Duração total: FLIP_TOTAL_MS. `silent` evita o som (virada em lote).
   */
  flipCard(card, silent = false) {
    if (!silent) this.sfx.play('flip');
    this.tweens.add({
      targets: card,
      scaleX: 0,
      duration: FLIP_HALF_OUT_MS,
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
          duration: FLIP_HALF_IN_MS,
          ease: 'Linear',
        });
      },
    });
  }

  /** Clique do jogador: valida, vira e, com 2 cartas, chama a checagem. */
  onCardClicked(card) {
    if (this.over || this.locked) return;           // fim de jogo ou checagem em andamento
    if (card.getData('matched')) return;            // par já encontrado
    if (this.selected.includes(card)) return;       // mesma carta clicada de novo

    this.selected.push(card);
    this.flipCard(card);

    if (card.getData('faceIndex') === JOKER) {
      this.jokerFlips++;
      this.updateHud();
      if (this.jokerFlips >= JOKER_FLIPS_TO_RESET) {
        this.locked = true;
        // Deixa o jogador ver o coringa terminar de virar antes de reiniciar.
        this.time.delayedCall(FLIP_TOTAL_MS + 150, () => this.resetBoard());
        return;
      }
    }

    if (this.selected.length === 2) {
      this.moves++;
      this.updateHud();
      this.checkMatch();
    }
  }

  /**
   * Compara as duas cartas em this.selected.
   * Coringas nunca formam par: contam como erro e viram de volta.
   * Ao terminar, SEMPRE deve esvaziar this.selected e liberar this.locked
   * (exceto em fim de jogo).
   */
  checkMatch() {
    this.locked = true;
    const [a, b] = this.selected;
    const isPair =
      a.getData('faceIndex') !== JOKER && a.getData('faceIndex') === b.getData('faceIndex');

    if (isPair) {
      // Espera a 2ª carta terminar de virar para o som de acerto não cortar o de virada.
      this.time.delayedCall(FLIP_TOTAL_MS, () => {
        if (this.over) return;
        a.setData('matched', true);
        b.setData('matched', true);
        this.matchedPairs++;
        this.selected = [];

        if (this.matchedPairs === COLORS.length) {
          this.showVictory();
          return;
        }
        if (this.moves >= MAX_MOVES) {
          this.showDefeat(`Limite de ${MAX_MOVES} jogadas atingido!`);
          return;
        }
        this.sfx.play('match');
        this.tweens.add({
          targets: [a, b], scale: 1.1, yoyo: true, duration: MATCH_PULSE_MS / 2, ease: 'Sine.easeInOut',
        });
        this.locked = false;
      });
    } else {
      this.time.delayedCall(MISMATCH_DELAY_MS, () => {
        if (this.over) return;
        this.flipCard(a);
        this.flipCard(b, true);
        this.selected = [];
        if (this.moves >= MAX_MOVES) {
          this.showDefeat(`Limite de ${MAX_MOVES} jogadas atingido!`);
          return;
        }
        this.locked = false;
      });
    }
  }

  /**
   * Coringa virado 3 vezes: desvira tudo, reembaralha e zera jogadas/pares/coringas.
   * O cronômetro (this.elapsed / this.timer) NÃO é tocado.
   */
  resetBoard() {
    if (this.over) return;
    this.sfx.play('reset');
    this.showToast('Coringa! Tabuleiro reiniciado', RESET_TOAST_HOLD_MS, 100);

    this.cards.forEach((card) => {
      if (card.getData('faceUp')) this.flipCard(card, true);
    });

    // Quando todas já estão de costas, redistribui as faces e zera o estado.
    this.time.delayedCall(FLIP_TOTAL_MS, () => {
      if (this.over) return;
      const deck = this.buildDeck();
      this.cards.forEach((card, i) => {
        card.setData({ faceIndex: deck[i], faceUp: false, matched: false });
      });
      this.selected = [];
      this.moves = 0;
      this.matchedPairs = 0;
      this.jokerFlips = 0;
      this.updateHud();
    });

    // Libera o jogo quando a mensagem termina.
    this.time.delayedCall(TOAST_FADE_MS * 2 + RESET_TOAST_HOLD_MS, () => {
      if (!this.over) this.locked = false;
    });
  }

  // ---------------------------------------------------------------- mensagens

  /** Mensagem rápida: entra, segura e sai (duração total = 2*fade + hold). */
  showToast(text, holdMs, y) {
    const toast = this.add
      .text(GAME_WIDTH / 2, y, text, {
        fontSize: '28px', color: '#ffffff', stroke: '#000000', strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0);
    this.tweens.add({
      targets: toast,
      alpha: 1,
      yoyo: true,
      hold: holdMs,
      duration: TOAST_FADE_MS,
      onComplete: () => toast.destroy(),
    });
  }

  /** Mensagem final: escurece o tabuleiro, faz fade-in e espera clique para reiniciar. */
  endGame(text, sound) {
    this.over = true;
    this.locked = true;
    this.timer.remove();
    this.sfx.play(sound);

    const shade = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setOrigin(0).setDepth(9).setAlpha(0);
    const msg = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `${text}\nClique para reiniciar`, {
        fontSize: '40px', color: '#ffffff', align: 'center',
      })
      .setOrigin(0.5).setDepth(10).setAlpha(0);
    this.tweens.add({ targets: [shade, msg], alpha: 1, duration: END_MESSAGE_FADE_MS, ease: 'Linear' });

    this.time.delayedCall(500, () => {
      this.input.once('pointerdown', () => this.scene.restart());
    });
  }

  /** Chamado quando todos os pares foram encontrados. */
  showVictory() {
    this.endGame(`Você venceu em ${this.moves} jogadas\ne ${this.formatTime(this.elapsed)}!`, 'victory');
  }

  showDefeat(reason) {
    this.endGame(`Você perdeu!\n${reason}`, 'defeat');
  }

  // ---------------------------------------------------------------- layout / texturas

  /**
   * Retorna o centro (x, y) da carta na linha `row` e coluna `col`.
   * As imagens usam origem 0.5, então x e y são o CENTRO da carta.
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

    // Coringa: fundo roxo escuro com borda dourada e uma estrela de 5 pontas
    g.clear();
    g.fillStyle(0x2c1654).fillRoundedRect(0, 0, CARD_SIZE, CARD_SIZE, 14);
    g.lineStyle(4, 0xf1c40f).strokeRoundedRect(2, 2, CARD_SIZE - 4, CARD_SIZE - 4, 12);
    const c = CARD_SIZE / 2;
    const outer = CARD_SIZE * 0.34;
    const inner = outer * 0.45;
    const star = [];
    for (let k = 0; k < 10; k++) {
      const r = k % 2 === 0 ? outer : inner;
      const ang = -Math.PI / 2 + (k * Math.PI) / 5;
      star.push({ x: c + r * Math.cos(ang), y: c + r * Math.sin(ang) });
    }
    g.fillStyle(0xf1c40f).fillPoints(star, true);
    g.generateTexture(`card-face-${JOKER}`, CARD_SIZE, CARD_SIZE);

    g.destroy();
  }
}
