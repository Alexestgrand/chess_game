/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chess: {
          dark: '#1e1e1e',
          darker: '#0f0f0f',
          light: '#f0d9b5',
          board: '#b58863',
        },
      },
    },
  },
  plugins: [],
}
