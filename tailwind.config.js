/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        display: ['Orbitron', '"Noto Sans SC"', 'sans-serif'],
      },
      colors: {
        // 品牌语义色走 CSS 变量（RGB 三元组 + <alpha-value>）：
        // 明暗主题只需在 index.css 覆盖变量，全站类名（含 /60 之类透明度修饰）自动跟随。
        ink: {
          950: "rgb(var(--cc-ink-950) / <alpha-value>)",
          900: "rgb(var(--cc-ink-900) / <alpha-value>)",
          850: "rgb(var(--cc-ink-850) / <alpha-value>)",
          800: "rgb(var(--cc-ink-800) / <alpha-value>)",
          700: "rgb(var(--cc-ink-700) / <alpha-value>)",
          600: "rgb(var(--cc-ink-600) / <alpha-value>)",
          500: "rgb(var(--cc-ink-500) / <alpha-value>)",
        },
        pcb: {
          600: "rgb(var(--cc-pcb-600) / <alpha-value>)",
          500: "rgb(var(--cc-pcb-500) / <alpha-value>)",
          400: "rgb(var(--cc-pcb-400) / <alpha-value>)",
          300: "rgb(var(--cc-pcb-300) / <alpha-value>)",
        },
        copper: {
          600: "rgb(var(--cc-copper-600) / <alpha-value>)",
          500: "rgb(var(--cc-copper-500) / <alpha-value>)",
          400: "rgb(var(--cc-copper-400) / <alpha-value>)",
          300: "rgb(var(--cc-copper-300) / <alpha-value>)",
        },
        silk: {
          100: "rgb(var(--cc-silk-100) / <alpha-value>)",
          300: "rgb(var(--cc-silk-300) / <alpha-value>)",
          500: "rgb(var(--cc-silk-500) / <alpha-value>)",
          700: "rgb(var(--cc-silk-700) / <alpha-value>)",
        },
        sig: {
          cyan: "rgb(var(--cc-sig-cyan) / <alpha-value>)",
          magenta: "rgb(var(--cc-sig-magenta) / <alpha-value>)",
          amber: "rgb(var(--cc-sig-amber) / <alpha-value>)",
          blue: "rgb(var(--cc-sig-blue) / <alpha-value>)",
        },
        ok: "rgb(var(--cc-ok) / <alpha-value>)",
        warn: "rgb(var(--cc-warn) / <alpha-value>)",
        danger: "rgb(var(--cc-danger) / <alpha-value>)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
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
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}