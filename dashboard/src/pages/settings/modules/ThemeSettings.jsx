import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette, faCheck } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../../contexts/ThemeContext';

function ThemeSettings() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingTheme, setLoadingTheme] = useState(null);
  const { themes, defaultTheme, setDefaultTheme } = useTheme();

  const handleSave = async (selectedTheme) => {
    if (selectedTheme === defaultTheme) return; // Don't do anything if already selected
    
    setLoadingTheme(selectedTheme);
    try {
      await setDefaultTheme(selectedTheme);
      toast.success('Default theme updated successfully');
    } catch (error) {
      console.error('Theme update error:', error);
      toast.error('Failed to update default theme');
    } finally {
      setLoadingTheme(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between hover:bg-secondary/30 transition-colors duration-200 rounded-lg"
      >
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-xl">
            <FontAwesomeIcon icon={faPalette} className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Theme Settings</h2>
        </div>
        <svg
          className={`w-4 h-4 text-muted-foreground transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-3">Default Theme</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select the default theme that will be applied to all users when they first visit the dashboard.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => handleSave(theme.value)}
                  disabled={loadingTheme === theme.value}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                    defaultTheme === theme.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-card'
                  } ${loadingTheme ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full border-2 border-white/20"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border-2 border-white/20"
                        style={{ backgroundColor: theme.colors.secondary }}
                      />
                    </div>
                    {defaultTheme === theme.value && !loadingTheme && (
                      <FontAwesomeIcon 
                        icon={faCheck} 
                        className="w-4 h-4 text-primary" 
                      />
                    )}
                    {loadingTheme === theme.value && (
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    )}
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-foreground">{theme.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {theme.value === 'dark' && 'Classic dark theme'}
                      {theme.value === 'blue' && 'Ocean-inspired blue theme'}
                      {theme.value === 'purple' && 'Rich purple theme'}
                      {theme.value === 'green' && 'Natural green theme'}
                      {theme.value === 'orange' && 'Warm sunset orange theme'}
                      {theme.value === 'teal' && 'Cool ocean teal theme'}
                      {theme.value === 'cyberpunk' && 'Futuristic cyberpunk theme'}
                      {theme.value === 'sunset' && 'Golden sunset theme'}
                      {theme.value === 'corporate' && 'Professional corporate theme'}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-muted rounded-xl">
              <h4 className="font-medium text-foreground mb-2">How it works</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• New users will see the default theme when they first visit</li>
                <li>• Users can override the default in their personal settings</li>
                <li>• Existing users with custom themes won't be affected</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default ThemeSettings; 