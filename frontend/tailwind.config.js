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
        background: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        'surface-hover': 'var(--color-surface-hover)',
        border: 'var(--color-border)',
        'border-light': 'var(--color-border-light)',
        'text-base': 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
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
