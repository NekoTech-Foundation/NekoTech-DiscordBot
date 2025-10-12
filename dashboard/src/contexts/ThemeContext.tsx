import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

export type Theme = 'dark' | 'blue' | 'purple' | 'green' | 'orange' | 'teal' | 'cyberpunk' | 'sunset' | 'corporate';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: { value: Theme; label: string; colors: { primary: string; secondary: string } }[];
  defaultTheme: Theme;
  setDefaultTheme: (theme: Theme) => void;
  isUsingDefault: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themes = [
  {
    value: 'dark' as Theme,
    label: 'Dark',
    colors: { primary: '#3B82F6', secondary: '#1F2937' }
  },
  {
    value: 'blue' as Theme,
    label: 'Ocean Blue',
    colors: { primary: '#0EA5E9', secondary: '#0F172A' }
  },
  {
    value: 'purple' as Theme,
    label: 'Purple',
    colors: { primary: '#8B5CF6', secondary: '#1E1B4B' }
  },
  {
    value: 'green' as Theme,
    label: 'Forest Green',
    colors: { primary: '#10B981', secondary: '#064E3B' }
  },
  {
    value: 'orange' as Theme,
    label: 'Slate Professional',
    colors: { primary: '#64748B', secondary: '#334155' }
  },
  {
    value: 'teal' as Theme,
    label: 'Ocean Teal',
    colors: { primary: '#14B8A6', secondary: '#134E4A' }
  },
  {
    value: 'cyberpunk' as Theme,
    label: 'Cyberpunk',
    colors: { primary: '#EC4899', secondary: '#831843' }
  },
  {
    value: 'sunset' as Theme,
    label: 'Emerald Pro',
    colors: { primary: '#059669', secondary: '#065F46' }
  },
  {
    value: 'corporate' as Theme,
    label: 'Corporate Navy',
    colors: { primary: '#1E40AF', secondary: '#1E3A8A' }
  }
];

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function setCookie(name: string, value: string, days: number = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [defaultTheme, setDefaultTheme] = useState<Theme>('dark');
  const [theme, setTheme] = useState<Theme>('dark');
  const [isUsingDefault, setIsUsingDefault] = useState(true);

  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        let organizationDefaultTheme: Theme = 'dark';

        try {
          const response = await axios.get('/api/settings/theme');
          organizationDefaultTheme = response.data?.defaultTheme || 'dark';
          console.log('Loaded organization default theme from server:', organizationDefaultTheme);
        } catch (serverError) {
          const localDefaultTheme = localStorage.getItem('dashboard-default-theme') as Theme;
          if (localDefaultTheme) {
            organizationDefaultTheme = localDefaultTheme;
            console.log('Using local default theme:', organizationDefaultTheme);
          } else {
            console.log('No server API or local default, using dark theme');
          }
        }
        
        setDefaultTheme(organizationDefaultTheme);
        const userThemeCookie = getCookie('user-theme-preference');

        if (userThemeCookie && userThemeCookie !== 'default') {
          setTheme(userThemeCookie as Theme);
          setIsUsingDefault(false);
          console.log('Using user preference theme:', userThemeCookie);
        } else {
          setTheme(organizationDefaultTheme);
          setIsUsingDefault(true);
          console.log('Using organization default theme:', organizationDefaultTheme);
        }
      } catch (error) {
        console.error('Failed to load theme settings:', error);
        const userThemeCookie = getCookie('user-theme-preference');
        
        if (userThemeCookie && userThemeCookie !== 'default') {
          setTheme(userThemeCookie as Theme);
          setIsUsingDefault(false);
        } else {
          setTheme('dark');
          setIsUsingDefault(true);
        }
      }
    };

    loadThemeSettings();
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboard-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    setCookie('user-theme-preference', newTheme);
    setIsUsingDefault(false);
  };

  const handleSetDefaultTheme = async (newDefaultTheme: Theme) => {
    try {
      localStorage.setItem('dashboard-default-theme', newDefaultTheme);
      setDefaultTheme(newDefaultTheme);

      const userThemeCookie = getCookie('user-theme-preference');
      
      if (!userThemeCookie || userThemeCookie === 'default') {
        setTheme(newDefaultTheme);
        localStorage.setItem('dashboard-theme', newDefaultTheme);
        document.documentElement.setAttribute('data-theme', newDefaultTheme);
        setIsUsingDefault(true);
      }

      try {
        const response = await axios.put('/api/settings/theme', { defaultTheme: newDefaultTheme });
      } catch (serverError) {
      }
      
    } catch (error) {
      console.error('Failed to update default theme:', error);
      throw error;
    }
  };

  const resetToDefault = () => {
    setTheme(defaultTheme);
    setCookie('user-theme-preference', 'default');
    setIsUsingDefault(true);
  };

  const value = {
    theme,
    setTheme: handleSetTheme,
    themes,
    defaultTheme,
    setDefaultTheme: handleSetDefaultTheme,
    isUsingDefault
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 