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
        // Material Design 3 颜色系统 - 通过 CSS 变量支持 light/dark
        primary: {
          DEFAULT: 'rgb(var(--md-primary) / <alpha-value>)',
          container: 'rgb(var(--md-primary-container) / <alpha-value>)',
          fixed: 'rgb(var(--md-primary-fixed) / <alpha-value>)',
          'fixed-dim': 'rgb(var(--md-primary-fixed-dim) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--md-secondary) / <alpha-value>)',
          container: 'rgb(var(--md-secondary-container) / <alpha-value>)',
        },
        tertiary: {
          DEFAULT: 'rgb(var(--md-tertiary) / <alpha-value>)',
          container: 'rgb(var(--md-tertiary-container) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--md-surface) / <alpha-value>)',
          dim: 'rgb(var(--md-surface-dim) / <alpha-value>)',
          bright: 'rgb(var(--md-surface-bright) / <alpha-value>)',
          container: 'rgb(var(--md-surface-container) / <alpha-value>)',
          'container-low': 'rgb(var(--md-surface-container-low) / <alpha-value>)',
          'container-high': 'rgb(var(--md-surface-container-high) / <alpha-value>)',
          'container-highest': 'rgb(var(--md-surface-container-highest) / <alpha-value>)',
          'container-lowest': 'rgb(var(--md-surface-container-lowest) / <alpha-value>)',
          variant: 'rgb(var(--md-surface-variant) / <alpha-value>)',
        },
        outline: {
          DEFAULT: 'rgb(var(--md-outline) / <alpha-value>)',
          variant: 'rgb(var(--md-outline-variant) / <alpha-value>)',
        },
        error: {
          DEFAULT: 'rgb(var(--md-error) / <alpha-value>)',
          container: 'rgb(var(--md-error-container) / <alpha-value>)',
        },
        'on-surface': 'rgb(var(--md-on-surface) / <alpha-value>)',
        'on-surface-variant': 'rgb(var(--md-on-surface-variant) / <alpha-value>)',
        'on-primary': 'rgb(var(--md-on-primary) / <alpha-value>)',
        'on-primary-container': 'rgb(var(--md-on-primary-container) / <alpha-value>)',
        'on-secondary': 'rgb(var(--md-on-secondary) / <alpha-value>)',
        'on-tertiary': 'rgb(var(--md-on-tertiary) / <alpha-value>)',
        'on-primary-fixed': 'rgb(var(--md-on-primary-fixed) / <alpha-value>)',
        'on-primary-fixed-variant': 'rgb(var(--md-on-primary-fixed-variant) / <alpha-value>)',
        'on-secondary-fixed': 'rgb(var(--md-on-secondary-fixed) / <alpha-value>)',
        'on-secondary-fixed-variant': 'rgb(var(--md-on-secondary-fixed-variant) / <alpha-value>)',
        'on-tertiary-fixed': 'rgb(var(--md-on-tertiary-fixed) / <alpha-value>)',
        'on-tertiary-fixed-variant': 'rgb(var(--md-on-tertiary-fixed-variant) / <alpha-value>)',
        'on-error': 'rgb(var(--md-on-error) / <alpha-value>)',
        'on-error-container': 'rgb(var(--md-on-error-container) / <alpha-value>)',
        'inverse-surface': 'rgb(var(--md-inverse-surface) / <alpha-value>)',
        'inverse-on-surface': 'rgb(var(--md-inverse-on-surface) / <alpha-value>)',
        'inverse-primary': 'rgb(var(--md-inverse-primary) / <alpha-value>)',
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
