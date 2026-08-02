/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6750A4',
          on: '#FFFFFF',
          container: '#EADDFF',
          onContainer: '#21005D',
        },
        secondary: {
          DEFAULT: '#625B71',
          on: '#FFFFFF',
          container: '#E8DEF8',
          onContainer: '#1D192B',
        },
        tertiary: {
          DEFAULT: '#7D5260',
          on: '#FFFFFF',
          container: '#FFD8E4',
          onContainer: '#31111D',
        },
        error: {
          DEFAULT: '#B3261E',
          on: '#FFFFFF',
          container: '#F9DEDC',
          onContainer: '#410E0B',
        },
        surface: {
          DEFAULT: '#FEF7FF',
          on: '#1D1B20',
          variant: '#E7E0EC',
          onVariant: '#49454F',
        },
        outline: '#79747E',
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
