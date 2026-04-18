import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        refLink: '#1d4ed8',     // solid underline color for <ref>
        termLink: '#b45309',    // dashed underline color for defined terms
      },
    },
  },
  plugins: [],
} satisfies Config;
