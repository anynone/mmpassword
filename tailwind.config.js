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
        // Material Design 3 颜色系统
        primary: {
          DEFAULT: '#005ea1',
          container: '#2b78bf',
          fixed: '#d2e4ff',
          'fixed-dim': '#a0caff',
        },
        secondary: {
          DEFAULT: '#49607d',
          container: '#c4dcfe',
        },
        tertiary: {
          DEFAULT: '#7b5500',
          container: '#9a6c00',
        },
        surface: {
          DEFAULT: '#f9f9f9',
          dim: '#dadada',
          bright: '#f9f9f9',
          container: '#eeeeee',
          'container-low': '#f3f3f3',
          'container-high': '#e8e8e8',
          'container-highest': '#e2e2e2',
          'container-lowest': '#ffffff',
        },
        outline: {
          DEFAULT: '#717782',
          variant: '#c1c7d2',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-surface': '#1a1c1c',
        'on-surface-variant': '#414751',
        'on-primary': '#ffffff',
        'on-primary-container': '#fdfcff',
        'on-secondary': '#ffffff',
        'on-tertiary': '#ffffff',
        'on-primary-fixed': '#001c37',
        'on-primary-fixed-variant': '#00497e',
        'on-secondary-fixed': '#011d36',
        'on-secondary-fixed-variant': '#314864',
        'on-tertiary-fixed': '#271900',
        'on-tertiary-fixed-variant': '#5f4100',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
        'inverse-surface': '#2f3131',
        'inverse-on-surface': '#f1f1f1',
        'inverse-primary': '#a0caff',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'ambient': '0px 12px 32px rgba(0, 28, 55, 0.06)',
      },
    },
  },
  plugins: [],
}
