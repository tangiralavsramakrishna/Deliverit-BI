/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#13213E', muted: '#71809A', surface: '#F6F7FB',
        accent: { 50:'#F0EFFE', 100:'#E6E4FD', 200:'#CAC6F8', 400:'#8579EF', 500:'#6757DE', 600:'#5948CC', 700:'#493AAA' },
        navy: { 950:'#0C1730', 900:'#121F3B', 800:'#1D2C49' }
      },
      boxShadow: { card: '0 2px 12px rgba(28,39,70,.035)' }
    }
  },
  plugins: []
};
