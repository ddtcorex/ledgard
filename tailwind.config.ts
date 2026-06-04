import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#f9f9fa",
        "surface-dim": "#d9dadb",
        "surface-bright": "#f9f9fa",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f4f5",
        "surface-container": "#edeeef",
        "surface-container-high": "#e7e8e9",
        "surface-container-highest": "#e1e2e4",
        "on-surface": "#191c1d",
        "on-surface-variant": "#40484b",
        "inverse-surface": "#2e3132",
        "inverse-on-surface": "#f0f1f2",
        outline: "#70787c",
        "outline-variant": "#c0c8cb",
        "surface-tint": "#306576",
        primary: "#003441",
        "on-primary": "#ffffff",
        "primary-container": "#0f4c5c",
        "on-primary-container": "#87bbce",
        secondary: "#006a61",
        "on-secondary": "#ffffff",
        "secondary-container": "#86f2e4",
        "on-secondary-container": "#006f66",
        tertiary: "#482700",
        "on-tertiary": "#ffffff",
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "success-emerald": "#10B981",
        "danger-crisp": "#E11D48",
        "warning-orange": "#F59E0B",
        "surface-muted": "#F8FAFC",
        "border-subtle": "#E2E8F0"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        "data-mono": ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      fontSize: {
        "display-kpi": ["48px", { lineHeight: "56px", fontWeight: "700", letterSpacing: "0" }],
        "display-kpi-mobile": ["36px", { lineHeight: "44px", fontWeight: "700", letterSpacing: "0" }],
        "headline-lg": ["30px", { lineHeight: "38px", fontWeight: "600", letterSpacing: "0" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600", letterSpacing: "0" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400", letterSpacing: "0" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400", letterSpacing: "0" }],
        "data-mono": ["14px", { lineHeight: "20px", fontWeight: "500", letterSpacing: "0" }],
        "label-caps": ["12px", { lineHeight: "16px", fontWeight: "700", letterSpacing: "0.05em" }]
      },
      spacing: {
        "container-max": "1280px",
        gutter: "1.5rem",
        "margin-mobile": "1rem",
        "stack-sm": "0.5rem",
        "stack-md": "1rem",
        "stack-lg": "2rem"
      },
      maxWidth: {
        "container-max": "1280px"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem"
      },
      boxShadow: {
        soft: "0 10px 25px rgba(15, 76, 92, 0.05)"
      }
    }
  },
  plugins: []
};

export default config;
