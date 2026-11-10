import { defineConfig } from 'vite';

export default defineConfig({
  // 相対パスで出力する（GitHub Pages や、あとでアプリに包むときにそのまま使えるように）
  base: './',
  server: {
    port: 5173,
    strictPort: true
  },
  test: {
    include: ['tests/**/*.test.js']
  }
});
