// Constantes compartilhadas entre a cena e o sintetizador de sons.
// As durações das animações vivem aqui para que os sons nunca as excedam.

export const CARD_SIZE = 120;
export const GAP = 20;
export const COLS = 4;
export const ROWS = 4;
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 640;

// 7 cores = 7 pares + 1 par de coringas = 16 cartas
export const COLORS = [0xe74c3c, 0xf39c12, 0xf1c40f, 0x2ecc71, 0x3498db, 0x9b59b6, 0xe84393];
export const JOKER = 'joker';

// Regras
export const JOKER_FLIPS_TO_RESET = 3;
export const MAX_MOVES = 100;
export const MAX_TIME_SECONDS = 5 * 60;
export const MINUTE_SECONDS = 60;

// Animações (ms)
export const FLIP_HALF_OUT_MS = 200;
export const FLIP_HALF_IN_MS = 150;
export const FLIP_TOTAL_MS = FLIP_HALF_OUT_MS + FLIP_HALF_IN_MS; // 350
export const MATCH_PULSE_MS = 300;
export const MISMATCH_DELAY_MS = 600;
export const END_MESSAGE_FADE_MS = 800;   // vitória / derrota
export const TOAST_FADE_MS = 200;         // mensagens rápidas: entra, segura, sai
export const MINUTE_TOAST_HOLD_MS = 400;  // 200 + 400 + 200 = 800
export const RESET_TOAST_HOLD_MS = 600;   // 200 + 600 + 200 = 1000

// Teto de duração de cada som = duração da animação/mensagem que ele acompanha
export const SOUND_LIMIT_MS = {
  flip: FLIP_TOTAL_MS,
  match: MATCH_PULSE_MS,
  minute: TOAST_FADE_MS * 2 + MINUTE_TOAST_HOLD_MS,
  reset: TOAST_FADE_MS * 2 + RESET_TOAST_HOLD_MS,
  victory: END_MESSAGE_FADE_MS,
  defeat: END_MESSAGE_FADE_MS,
};
