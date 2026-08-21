/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ercs: {
          red: '#C8102E',
          'red-dark': '#9B0B23',
          'red-light': '#FDF2F4',
          gray: '#F8FAFC',
          dark: '#1E293B',
        }
      }
    },
  },
  plugins: [],
}
