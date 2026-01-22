import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    isDarkMode: boolean;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme') as Theme;
            return saved || 'dark';
        }
        return 'dark';
    });

    const [isDarkMode, setIsDarkMode] = useState(true);

    // Update dark mode based on theme
    useEffect(() => {
        const updateDarkMode = () => {
            if (theme === 'system') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setIsDarkMode(prefersDark);
            } else {
                setIsDarkMode(theme === 'dark');
            }
        };

        updateDarkMode();

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', updateDarkMode);

        return () => mediaQuery.removeEventListener('change', updateDarkMode);
    }, [theme]);

    // Apply theme to document
    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
        document.documentElement.classList.toggle('light', !isDarkMode);
    }, [isDarkMode]);

    // Set theme and persist
    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
    }, []);

    // Toggle between light and dark
    const toggleTheme = useCallback(() => {
        setTheme(isDarkMode ? 'light' : 'dark');
    }, [isDarkMode, setTheme]);

    return (
        <ThemeContext.Provider value={{ theme, isDarkMode, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
