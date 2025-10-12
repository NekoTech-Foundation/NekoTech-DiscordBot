const express = require('express');
const router = express.Router();
const UserSettings = require('../../../../models/UserSettings');
const auth = require('../../middleware/auth');

router.get('/', auth, async (req, res) => {
    try {
        let settings = await UserSettings.findOne({ userId: req.user.id });
        
        if (!settings) {
            settings = new UserSettings({ userId: req.user.id });
            await settings.save();
        }
        
        res.json(settings);
    } catch (error) {
        console.error('Error fetching user settings:', error);
        res.status(500).json({ error: 'Failed to fetch user settings' });
    }
});

router.patch('/', auth, async (req, res) => {
    try {
        const { ticketPreferences, theme, notifications } = req.body;
        
        let settings = await UserSettings.findOne({ userId: req.user.id });
        
        if (!settings) {
            settings = new UserSettings({ userId: req.user.id });
        }
        
        if (ticketPreferences) {
            if (ticketPreferences.statusOrder) {
                settings.ticketPreferences = {
                    ...settings.ticketPreferences,
                    statusOrder: ticketPreferences.statusOrder
                };
            } else {
                settings.ticketPreferences = {
                    ...settings.ticketPreferences,
                    ...ticketPreferences
                };
            }
        }
        
        if (theme) {
            settings.theme = theme;
        }
        
        if (notifications) {
            settings.notifications = {
                ...settings.notifications,
                ...notifications
            };
        }
        
        await settings.save();
        res.json(settings);
    } catch (error) {
        console.error('Error updating user settings:', error);
        res.status(500).json({ error: 'Failed to update user settings' });
    }
});

module.exports = router; 