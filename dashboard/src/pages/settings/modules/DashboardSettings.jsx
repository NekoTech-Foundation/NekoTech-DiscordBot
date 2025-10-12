import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../../lib/api/axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette, faToggleOn, faToggleOff } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-hot-toast';
import { socket } from '../../../socket';

function DashboardSettings() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({
    navName: 'DrakoBot',
    favicon: 'None',
    tabName: 'DrakoBot Dashboard',
    customNavItems: [],
    categories: {
      navigation: 'Navigation',
      custom: 'Custom Links',
      addons: 'Addons'
    }
  });

  useEffect(() => {
    fetchSettings();
    socket.on('dashboardSettingsUpdated', setSettings);
    return () => socket.off('dashboardSettingsUpdated', setSettings);
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings/dashboard');
      setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const processedSettings = {
      ...settings,
      favicon: settings.favicon?.trim() || 'None'
    };

    try {
      const { data } = await api.post('/settings/dashboard', processedSettings);

      if (data.success) {
        setSettings(data.settings);
        toast.success('Settings saved successfully');
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to save settings';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isExpanded) {
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
            <h2 className="text-xl font-semibold text-foreground">Dashboard Customization</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Loading...</span>
            <svg
              className={`w-4 h-4 text-muted-foreground transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        {isExpanded && (
          <div className="mt-6">
            <div className="mt-4 text-foreground">Loading...</div>
          </div>
        )}
      </motion.div>
    );
  }

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
          <h2 className="text-xl font-semibold text-foreground">Dashboard Customization</h2>
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
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Navigation Name</label>
              <input
                type="text"
                value={settings.navName}
                onChange={(e) => setSettings({ ...settings, navName: e.target.value })}
                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter navigation name"
              />
              <p className="mt-2 text-xs text-muted-foreground">This will appear in the side navigation bar</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tab Name</label>
              <input
                type="text"
                value={settings.tabName}
                onChange={(e) => setSettings({ ...settings, tabName: e.target.value })}
                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter tab name"
              />
              <p className="mt-2 text-xs text-muted-foreground">This will appear as the browser tab title</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Favicon URL</label>
              <input
                type="url"
                value={settings.favicon === 'None' ? '' : settings.favicon}
                onChange={(e) => setSettings({ ...settings, favicon: e.target.value || 'None' })}
                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter favicon URL or leave empty for none"
              />
              <p className="mt-2 text-xs text-muted-foreground">This will appear as the browser tab icon</p>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:from-primary/90 hover:to-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all duration-200"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}
    </motion.div>
  );
}

export default DashboardSettings; 