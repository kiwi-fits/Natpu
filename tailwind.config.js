/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-outfit)', 'Outfit', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      colors: {
        // iOS System Colors
        background: '#F2F2F7',
        card: '#FFFFFF',
        primary: {
          DEFAULT: '#1C1C1E',
          foreground: '#FFFFFF',
        },
        ios: {
          blue: '#007AFF',
          green: '#34C759',
          red: '#FF3B30',
          orange: '#FF9500',
          yellow: '#FFCC00',
          purple: '#AF52DE',
          pink: '#FF2D55',
          teal: '#5AC8FA',
          gray: '#8E8E93',
          'gray2': '#AEAEB2',
          'gray3': '#C7C7CC',
          'gray4': '#D1D1D6',
          'gray5': '#E5E5EA',
          'gray6': '#F2F2F7',
        },
        success: {
          DEFAULT: '#34C759',
          light: '#E8FAE8',
          foreground: '#1B5E20',
        },
        warning: {
          DEFAULT: '#FF9500',
          light: '#FFF3E0',
          foreground: '#7A4100',
        },
        danger: {
          DEFAULT: '#FF3B30',
          light: '#FFEBEE',
          foreground: '#B71C1C',
        },
        accent: {
          DEFAULT: '#007AFF',
          light: '#E3F2FD',
          foreground: '#0055CC',
        },
        border: 'rgba(0,0,0,0.08)',
        muted: {
          DEFAULT: '#F2F2F7',
          foreground: '#8E8E93',
        },
      },
      borderRadius: {
        'ios': '14px',
        'xl': '14px',
        '2xl': '16px',
        '3xl': '20px',
      },
      fontSize: {
        // iOS Typography scale
        'ios-title1': ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'ios-title2': ['22px', { lineHeight: '28px', fontWeight: '700' }],
        'ios-title3': ['20px', { lineHeight: '25px', fontWeight: '600' }],
        'ios-headline': ['17px', { lineHeight: '22px', fontWeight: '600' }],
        'ios-body': ['17px', { lineHeight: '22px', fontWeight: '400' }],
        'ios-callout': ['16px', { lineHeight: '21px', fontWeight: '400' }],
        'ios-subhead': ['15px', { lineHeight: '20px', fontWeight: '400' }],
        'ios-footnote': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'ios-caption1': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'ios-caption2': ['11px', { lineHeight: '13px', fontWeight: '400' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'card': '0 0.5px 1px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
        'modal': '0 25px 60px rgba(0,0,0,0.25)',
        'ios': '0 0.5px 0 rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}
