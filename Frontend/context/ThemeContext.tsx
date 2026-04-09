import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors as DefaultColors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { useUserId } from '@/hooks/useUserId';
import { API_BASE_URL } from '@/constants/api';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    colors: typeof DefaultColors.light;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Dark mode colors are now handled in constants/theme.ts

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [theme, setThemeState] = useState<Theme>('system');
    const userId = useUserId();

    // Load saved preference
    useEffect(() => {
        const loadTheme = async () => {
            try {
                // First try local storage
                const savedTheme = await AsyncStorage.getItem('theme');
                if (savedTheme) {
                    setThemeState(savedTheme as Theme);
                }

                // Check backend if user logged in
                // Check backend if user logged in
                if (userId) {
                    const token = await AsyncStorage.getItem("token");
                    const res = await fetch(`${API_BASE_URL}/profile/me`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    const json = await res.json();
                    if (json.success && json.data.settings?.theme) {
                        setThemeState(json.data.settings.theme);
                        await AsyncStorage.setItem('theme', json.data.settings.theme);
                    }
                }
            } catch (e) {
                console.error("Failed to load theme", e);
            }
        };
        loadTheme();
    }, [userId]);

    const setTheme = async (newTheme: Theme) => {
        setThemeState(newTheme);
        await AsyncStorage.setItem('theme', newTheme);

        // Sync with backend
        if (userId) {
            try {
                const token = await AsyncStorage.getItem("token");
                await fetch(`${API_BASE_URL}/profile/settings/theme`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ theme: newTheme })
                });
            } catch (e) {
                console.error("Failed to sync theme", e);
            }
        }
    };

    const isDark = theme === 'system' ? systemScheme === 'dark' : theme === 'dark';
    const colors = isDark ? DefaultColors.dark : DefaultColors.light;

    return (
        <ThemeContext.Provider value={{ theme, setTheme, colors, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
