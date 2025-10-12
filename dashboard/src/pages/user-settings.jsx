import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette, faCheck, faUndo } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';

function UserSettingsPage() {
  const { theme, setTheme, themes, defaultTheme, isUsingDefault } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleThemeChange = async (selectedTheme) => {
    setLoading(true);
    try {
      setTheme(selectedTheme);
      toast.success('Theme updated successfully');
    } catch (error) {
      toast.error('Failed to update theme');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = () => {
    setTheme(defaultTheme);
    toast.success('Reset to default theme');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-primary/10 p-3 rounded-xl">
          <FontAwesomeIcon icon={faPalette} className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Settings</h1>
          <p className="text-muted-foreground">Customize your dashboard experience</p>
        </div>
      </div>

      {/* Theme Section */}
      <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Theme Preference</h2>
            <p className="text-muted-foreground">
              Choose your preferred color scheme. This will override the default theme.
            </p>
          </div>
          {!isUsingDefault && (
            <button
              onClick={resetToDefault}
              className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground rounded-lg transition-colors duration-200"
            >
              <FontAwesomeIcon icon={faUndo} className="w-4 h-4" />
              Reset to Default
            </button>
          )}
        </div>

        {/* Current Theme Display */}
        <div className="mb-6 p-4 bg-muted rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex space-x-2">
              {themes.find(t => t.value === theme) && (
                <>
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white/20"
                    style={{ backgroundColor: themes.find(t => t.value === theme)?.colors.primary }}
                  />
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white/20"
                    style={{ backgroundColor: themes.find(t => t.value === theme)?.colors.secondary }}
                  />
                </>
              )}
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                Current: {themes.find(t => t.value === theme)?.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isUsingDefault ? `Using default theme (${themes.find(t => t.value === defaultTheme)?.label})` : 'Using custom theme preference'}
              </p>
            </div>
          </div>
        </div>

        {/* Theme Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((themeOption) => (
            <button
              key={themeOption.value}
              onClick={() => handleThemeChange(themeOption.value)}
              disabled={loading}
              className={`p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                theme === themeOption.value
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-border hover:border-primary/50 bg-card'
              } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex space-x-2">
                  <div 
                    className="w-5 h-5 rounded-full border-2 border-white/20"
                    style={{ backgroundColor: themeOption.colors.primary }}
                  />
                  <div 
                    className="w-5 h-5 rounded-full border-2 border-white/20"
                    style={{ backgroundColor: themeOption.colors.secondary }}
                  />
                </div>
                {theme === themeOption.value && (
                  <FontAwesomeIcon 
                    icon={faCheck} 
                    className="w-5 h-5 text-primary" 
                  />
                )}
              </div>
              
              <div className="text-left">
                <h4 className="font-semibold text-foreground mb-2">{themeOption.label}</h4>
                <p className="text-sm text-muted-foreground">
                  {themeOption.value === 'dark' && 'The classic dark theme with blue accents'}
                  {themeOption.value === 'blue' && 'Ocean-inspired deep blue theme'}
                  {themeOption.value === 'purple' && 'Rich purple theme with elegant styling'}
                  {themeOption.value === 'green' && 'Natural green theme with forest vibes'}
                  {themeOption.value === 'orange' && 'Warm sunset orange theme with vibrant energy'}
                  {themeOption.value === 'teal' && 'Cool ocean teal theme with refreshing tones'}
                  {themeOption.value === 'cyberpunk' && 'Futuristic neon pink cyberpunk aesthetic'}
                  {themeOption.value === 'sunset' && 'Golden warm sunset with amber highlights'}
                  {themeOption.value === 'corporate' && 'Professional navy blue corporate theme'}
                </p>
                {themeOption.value === defaultTheme && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                      Default
                    </span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Information Box */}
        <div className="mt-6 p-4 bg-muted rounded-xl">
          <h4 className="font-medium text-foreground mb-2">About Theme Settings</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Your theme preference is saved to your browser and will persist across sessions</li>
            <li>• You can reset to the system default theme at any time</li>
            <li>• Theme changes are applied instantly without requiring a page reload</li>
            <li>• Your preference is independent of other users' settings</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

export default UserSettingsPage; 