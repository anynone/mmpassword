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
        // === shadcn/ui semantic colors ===
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
          // MD3 extended tokens
          container: 'rgb(var(--md-primary-container) / <alpha-value>)',
          fixed: 'rgb(var(--md-primary-fixed) / <alpha-value>)',
          'fixed-dim': 'rgb(var(--md-primary-fixed-dim) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
          container: 'rgb(var(--md-secondary-container) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive) / <alpha-value>)',
          foreground: 'rgb(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--popover) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },

        // === MD3 tokens (kept for gradual migration) ===
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
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'ambient': '0px 12px 32px rgba(0, 28, 55, 0.06)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
