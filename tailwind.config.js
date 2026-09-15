/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--md-sys-color-primary)',
          on: 'var(--md-sys-color-on-primary)',
          container: 'var(--md-sys-color-primary-container)',
          onContainer: 'var(--md-sys-color-on-primary-container)',
        },
        secondary: {
          DEFAULT: 'var(--md-sys-color-secondary)',
          on: 'var(--md-sys-color-on-secondary)',
          container: 'var(--md-sys-color-secondary-container)',
          onContainer: 'var(--md-sys-color-on-secondary-container)',
        },
        tertiary: {
          DEFAULT: 'var(--md-sys-color-tertiary)',
          on: 'var(--md-sys-color-on-tertiary)',
          container: 'var(--md-sys-color-tertiary-container)',
          onContainer: 'var(--md-sys-color-on-tertiary-container)',
        },
        error: {
          DEFAULT: 'var(--md-sys-color-error)',
          on: 'var(--md-sys-color-on-error)',
          container: 'var(--md-sys-color-error-container)',
          onContainer: 'var(--md-sys-color-on-error-container)',
        },
        surface: {
          DEFAULT: 'var(--md-sys-color-surface)',
          on: 'var(--md-sys-color-on-surface)',
          variant: 'var(--md-sys-color-surface-variant)',
          onVariant: 'var(--md-sys-color-on-surface-variant)',
          bright: 'var(--md-sys-color-surface-bright)',
          dim: 'var(--md-sys-color-surface-dim)',
          container: {
            DEFAULT: 'var(--md-sys-color-surface-container)',
            low: 'var(--md-sys-color-surface-container-low)',
            high: 'var(--md-sys-color-surface-container-high)',
            lowest: 'var(--md-sys-color-surface-container-lowest)',
            highest: 'var(--md-sys-color-surface-container-highest)',
          }
        },
        outline: {
          DEFAULT: 'var(--md-sys-color-outline)',
          variant: 'var(--md-sys-color-outline-variant)',
        },
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
