/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        glass: {
          dark: 'rgba(18, 20, 28, 0.72)',
          darker: 'rgba(12, 14, 20, 0.82)',
          panel: 'rgba(26, 29, 40, 0.65)',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.06)',
        }
      }
    },
  },
  plugins: [],
}
