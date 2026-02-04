/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'jb-bg': '#1e1e1e',
        'jb-sidebar': '#252526',
        'jb-border': '#3c3c3c',
        'jb-text': '#d4d4d4',
        'jb-input': '#3c3c3c',
        'jb-accent': '#0d6efd',
        'jb-success': '#28a745',
        'jb-warning': '#ffc107',
        'jb-error': '#dc3545',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
