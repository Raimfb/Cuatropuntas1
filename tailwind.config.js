/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.html"],
  theme: {
    extend: {
      colors: {
        primary: '#1a202c',
        secondary: '#c05621',
        accent: '#f7fafc',
        'legal-gold': '#b7791f',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      }
    }
  },
  plugins: [],
}
