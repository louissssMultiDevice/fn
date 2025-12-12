const express = require('express');
const router = express.Router();
const Database = require('../database/database');
const db = new Database();

// Middleware untuk API Key
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.MINECRAFT_API_KEY) {
        return res.status(401).json({ error: 'Invalid API Key' });
    }
    next();
};

// Update player stats
router.post('/update-stats', authenticate, async (req, res) => {
    try {
        const { username, stats } = req.body;
        
        if (!username || !stats) {
            return res.status(400).json({ error: 'Username and stats are required' });
        }
        
        const updatedStats = await minecraftHandler.updatePlayerStatsFromAPI(username, stats);
        
        res.json({
            success: true,
            message: 'Stats updated successfully',
            stats: updatedStats
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get player stats
router.get('/player/:username', authenticate, async (req, res) => {
    try {
        const { username } = req.params;
        const stats = db.getMinecraftStats(username);
        
        if (!stats || !stats.firstJoin) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get leaderboard
router.get('/leaderboard/:category', authenticate, async (req, res) => {
    try {
        const { category } = req.params;
        const { limit = 10 } = req.query;
        
        const leaderboard = db.getLeaderboard(category, parseInt(limit));
        
        res.json({
            success: true,
            category,
            leaderboard
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Link account
router.post('/link-account', authenticate, async (req, res) => {
    try {
        const { whatsappId, minecraftUsername } = req.body;
        
        if (!whatsappId || !minecraftUsername) {
            return res.status(400).json({ error: 'whatsappId and minecraftUsername are required' });
        }
        
        const success = db.linkAccount(whatsappId, minecraftUsername);
        
        res.json({
            success: true,
            message: 'Account linked successfully'
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
