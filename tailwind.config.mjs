/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'court-page': '#0a1929',
        'court-dark': '#0d1117',
        'court-bg': '#1a2035',
        'court-card': '#1e2a45',
        'court-sidebar': '#121b2e',
        'court-border': '#2a3a54',
        'court-accent': '#5ab4ff',
        'court-text': '#8fa3c1',
        'gold': '#FFD700',
      },
    },
  },
  plugins: [],
};
