const express = require('express');
const router = express.Router();

const authRoutes = require('./auth/routes');
const suggestionsRoutes = require('./suggestions/routes');
const userSettingsRoutes = require('./user/settings');

router.use('/auth', authRoutes);
router.use('/suggestions', suggestionsRoutes);
router.use('/user/settings', userSettingsRoutes);

module.exports = router; 