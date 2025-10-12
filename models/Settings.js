const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  botActivity: {
    type: String,
    default: ''
  },
  dashboardSettings: {
    navName: {
      type: String,
      default: 'DrakoBot'
    },
    favicon: {
      type: String,
      default: 'None'
    },
    tabName: {
      type: String,
      default: 'DrakoBot Dashboard'
    },
    defaultTheme: {
      type: String,
      enum: ['dark', 'blue', 'purple', 'green', 'orange', 'teal', 'cyberpunk', 'slate-professional', 'emerald-pro'],
      default: 'dark'
    },
    customNavItems: [{
      name: { type: String, required: true },
      href: { type: String, required: true },
      iconName: String,
      isExternal: { type: Boolean, default: false },
      id: String
    }],
    navCategories: {
      navigation: { type: String, default: 'Navigation' },
      custom: { type: String, default: 'Custom Links' },
      addons: { type: String, default: 'Addons' }
    }
  }
});

module.exports = mongoose.model('Settings', settingsSchema); 