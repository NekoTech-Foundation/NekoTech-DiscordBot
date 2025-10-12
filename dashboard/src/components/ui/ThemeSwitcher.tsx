import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../contexts/ThemeContext';

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all duration-200 border border-border hover:border-border/80"
        title="Change theme"
      >
        <FontAwesomeIcon icon={faPalette} className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-xl shadow-black/10 overflow-hidden z-50">
          <div className="py-2">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
              Color Scheme
            </div>
            {themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => {
                  setTheme(themeOption.value);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors duration-200 flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div 
                      className="w-3 h-3 rounded-full border border-border"
                      style={{ backgroundColor: themeOption.colors.primary }}
                    />
                    <div 
                      className="w-3 h-3 rounded-full border border-border"
                      style={{ backgroundColor: themeOption.colors.secondary }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground">
                    {themeOption.label}
                  </span>
                </div>
                {theme === themeOption.value && (
                  <FontAwesomeIcon 
                    icon={faCheck} 
                    className="w-3.5 h-3.5 text-primary" 
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 