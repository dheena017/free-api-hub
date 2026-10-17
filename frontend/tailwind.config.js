/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#1F1F1F',
        surface: '#28292A',
        'surface-elevated': '#303134',
        'surface-hover': '#3C4043',
        border: '#3C4043',
        'border-light': '#4D5156',
        accent: {
          DEFAULT: '#8AB4F8',
          hover: '#AECBFA'
        },
        healthy: '#81C995',
        degraded: '#FDD663',
        offline: '#F28B82'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
