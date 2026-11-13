import { defineConfig } from 'vite';

// base './' gera caminhos relativos: o build funciona em qualquer subpasta,
// como https://usuario.github.io/nome-do-repositorio/
export default defineConfig({
  base: './',
});
