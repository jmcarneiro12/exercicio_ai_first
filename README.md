# Exercício AI-first: Phaser 3

Site com abas para comparar versões de um jogo da memória feito com **Phaser 3** e **Vite**.

## Estrutura

```
hub/index.html            página principal com as abas
versions/
  v1-memoria/             V1: jogo da memória básico (projeto Vite independente)
.github/workflows/        build e deploy automático no GitHub Pages
```

## Versões

| Aba | Pasta | Descrição |
|-----|-------|-----------|
| V1 · Básica | `versions/v1-memoria` | Grade 4x4, texturas geradas por código, flip com tweens, contador de jogadas |

## Rodar uma versão localmente

```bash
cd versions/v1-memoria
npm install
npm run dev
```

## Adicionar uma nova versão

1. Crie `versions/<nome-da-versao>/` com um projeto Vite (precisa de `npm run build` e `base: './'`).
2. Acrescente uma entrada em `VERSIONS` no `hub/index.html`.
3. Faça push na `main`: o workflow compila todas as pastas de `versions/` e publica cada uma em `/<nome>/`.
