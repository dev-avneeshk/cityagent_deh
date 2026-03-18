/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: '#0d0f14',
          card: '#13161e',
          inner: '#1a1e28',
        },
        primary: {
          DEFAULT: '#e8eaf0',
          muted: '#6b7280',
        },
        semantic: {
          blue: '#3b82f6',
          green: '#22c55e',
          yellow: '#eab308',
          red: '#ef4444',
          orange: '#f97316',
          teal: '#14b8a6',
          purple: '#a855f7',
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      borderRadius: {
        'xl': '12px',
        'lg': '8px',
        'pill': '20px',
      }
    },
  },
  plugins: [],
}
