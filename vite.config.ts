import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Project page served from https://geoffcorvera.github.io/flowly/ in production;
  // dev/preview stay at '/'.
  base: command === 'build' ? '/flowly/' : '/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
}))
