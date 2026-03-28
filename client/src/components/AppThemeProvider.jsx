import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const ThemeProviderContext = createContext({
    theme: 'light',
    setTheme: () => null,
});

const getDesignTokens = (mode) => ({
    palette: {
        mode,
        ...(mode === 'dark' ? {
            primary: { main: '#0ea5a4', light: '#2dd4bf', dark: '#0f766e', contrastText: '#0b0f14' }, // Modern Teal
            secondary: { main: '#64748b', light: '#94a3b8', dark: '#475569', contrastText: '#ffffff' }, // Professional Slate
            background: { default: '#020617', paper: '#0f172a' }, // Deep space slate, pure corporate
            divider: 'rgba(255,255,255,0.08)',
            text: { primary: '#f8fafc', secondary: '#94a3b8' }
        } : {
            primary: { main: '#2563eb', light: '#3b82f6', dark: '#1d4ed8', contrastText: '#ffffff' },
            secondary: { main: '#475569', light: '#64748b', dark: '#334155', contrastText: '#ffffff' },
            background: { default: '#f1f5f9', paper: '#ffffff' },
            divider: 'rgba(0,0,0,0.07)',
            text: { primary: '#0f172a', secondary: '#475569' }
        })
    },
    typography: {
        fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
        // Removed negative letter spacing for clearer, corporate readability
        h1: { fontWeight: 800, letterSpacing: '-0.02em' },
        h2: { fontWeight: 800, letterSpacing: '-0.01em' },
        h3: { fontWeight: 700, letterSpacing: '0' },
        h4: { fontWeight: 700, letterSpacing: '0' },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.02em' },
    },
    shape: { borderRadius: 6 }, // Professional, slightly tight radius (not playful pills)
    components: {
        MuiCssBaseline: {
            styleOverrides: `
                * { box-sizing: border-box; }
                body { transition: background-color 0.1s ease; } /* Faster, snappier transitions */
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 4px; }
                .dark ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
                @keyframes loadingDotsPulse {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.25; }
                    40% { transform: translateY(-4px); opacity: 1; }
                }
            `
        },
        MuiPaper: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: ({ theme }) => ({
                    background: theme.palette.mode === 'dark' ? '#0f172a' : '#ffffff',
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    borderRadius: 10,
                    boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
                })
            }
        },
        MuiCard: {
            styleOverrides: {
                root: ({ theme }) => ({
                    background: theme.palette.mode === 'dark' ? '#0f172a' : '#ffffff',
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    borderRadius: 12,
                    boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.05)',
                })
            }
        },
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: {
                    borderRadius: 6, // Enterprise sharp corners
                    fontWeight: 600,
                    padding: '8px 24px',
                    transition: 'all 0.15s ease'
                },
                containedPrimary: ({ theme }) => ({
                    // Solid, confident brand color. No gradients.
                    background: theme.palette.mode === 'dark' ? '#2563eb' : '#2563eb',
                    '&:hover': {
                        background: '#1d4ed8', // Darker solid blue
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
                    }
                }),
                outlined: {
                    borderWidth: '1.5px',
                    '&:hover': { borderWidth: '1.5px' }
                }
            }
        },
        MuiDataGrid: {
            styleOverrides: {
                root: ({ theme }) => ({
                    border: 'none',
                    borderRadius: 10,
                    background: theme.palette.mode === 'dark' ? '#0f172a' : '#ffffff',
                    '& .MuiDataGrid-columnHeaders': {
                        background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                        borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontSize: '0.75rem',
                        letterSpacing: '0.05em'
                    }
                })
            }
        }
    }
});

export function AppThemeProvider({ children, defaultTheme = "light", storageKey = "vite-ui-theme" }) {
    const [themeName, setThemeName] = useState(() => {
        const stored = localStorage.getItem(storageKey);
        // Migration: if stored theme was 'dark' (old default), reset to light
        if (stored === 'dark') {
            localStorage.setItem(storageKey, 'light');
            return 'light';
        }
        return stored || defaultTheme;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        if (themeName === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            root.classList.add(systemTheme);
        } else {
            root.classList.add(themeName);
        }
    }, [themeName]);

    const activeTheme = useMemo(() => {
        let mode = themeName;
        if (themeName === 'system') {
            mode = window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light';
        }
        return createTheme(getDesignTokens(mode));
    }, [themeName]);

    const value = {
        theme: themeName,
        setTheme: (t) => {
            localStorage.setItem(storageKey, t);
            setThemeName(t);
        },
    };

    return (
        <ThemeProviderContext.Provider value={value}>
            <MuiThemeProvider theme={activeTheme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeProviderContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeProviderContext);
