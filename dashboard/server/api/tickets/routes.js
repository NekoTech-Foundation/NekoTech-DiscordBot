const auth = require('../../middleware/auth.js');
const Ticket = require('../../../../models/tickets.js');
const express = require('express');
const router = express.Router();
const { getDiscordClient } = require('../../bot');
const { loadConfig } = require('../../lib/config.server.js');
const { WebhookClient } = require('discord.js');
const moment = require('moment-timezone');
const path = require('path');
const { getConfig, getLang, getCommands } = require('../../../../utils/configLoader.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const lang = getLang();

class Cache {
    constructor() {
        this.store = new Map();
        this.TTL = {
            STATS: 300000,  
            TICKETS: 30000,
            TYPES: 3600000
        };
        
        setInterval(() => this.cleanup(), 60000);
        
        this.errors = new Map();
        this.maxErrors = 3;
        this.errorTTL = 300000;
    }

    invalidate(pattern) {
        for (const key of this.store.keys()) {
            if (key.includes(pattern)) {
                this.store.delete(key);
            }
        }
    }

    set(key, value, ttl) {
        if (value === null || value === undefined) {
            return;
        }
        
        const now = Date.now();
        this.store.set(key, {
            value,
            expiry: now + (ttl || this.TTL.TICKETS)
        });

        if (key.includes('tickets:')) {
            this.invalidate('stats:');
            this.invalidate('tickets:');
        }
    }

    get(key) {
        const item = this.store.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expires) {
            this.store.delete(key);
            return null;
        }
        
        return item.value;
    }

    trackError(key) {
        const errorData = this.errors.get(key) || { count: 0, firstError: Date.now() };
        errorData.count++;
        
        if (Date.now() - errorData.firstError > this.errorTTL) {
            errorData.count = 1;
            errorData.firstError = Date.now();
        }
        
        this.errors.set(key, errorData);
        
        if (errorData.count >= this.maxErrors) {
            this.store.delete(key);
            this.errors.delete(key);
        }
    }

    cleanup() {
        const now = Date.now();
        
        for (const [key, item] of this.store.entries()) {
            if (now > item.expires) {
                this.store.delete(key);
            }
        }
        
        for (const [key, errorData] of this.errors.entries()) {
            if (now - errorData.firstError > this.errorTTL) {
                this.errors.delete(key);
            }
        }
    }
}

const cache = new Cache();

const cacheStats = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cacheKey = `stats:${userId}`;
        const cachedStats = cache.get(cacheKey);
        
        if (cachedStats) {
            return res.json(cachedStats);
        }
        
        res.sendResponse = res.json;
        res.json = (data) => {
            cache.set(cacheKey, data, cache.TTL.STATS);
            res.sendResponse(data);
        };
        next();
    } catch (error) {
        console.error('[CACHE] Error in stats cache:', error);
        next();
    }
};

const getTicketTypeName = (typeId) => {
    const config = loadConfig();
    return config.TicketTypes[typeId]?.Name || typeId;
};

const getSupportRolesForType = (ticketType) => {
    const config = loadConfig();
    const type = config.TicketTypes[ticketType];

    let supportRoles = type ?.SupportRole || [];
    if (!Array.isArray(supportRoles)) {
        supportRoles = [supportRoles];
    }


    return supportRoles;
};

const hasSupportRoleForType = async (userId, ticketType) => {
    try {
        const client = getDiscordClient();
        const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
        const member = await guild.members.fetch(userId);
        
        const supportRoles = getSupportRolesForType(ticketType);
        
        return supportRoles.some(roleId => member.roles.cache.has(roleId));
    } catch (error) {
        console.error('[AUTH] Error checking support role:', error);
        return false;
    }
};

const formatDate = (date) => {
    try {
        if (!date) return null;
        const config = loadConfig();
        const timezone = config?.TIMEZONE || 'America/New_York';
        const momentDate = moment(new Date(date));
        if (!momentDate.isValid()) {
            console.error('[TICKETS] Invalid date:', date);
            return null;
        }
        return momentDate.tz(timezone).format('MMM D, YYYY, hh:mm A z');
    } catch (error) {
        console.error('[TICKETS] Error formatting date:', error);
        return date ? new Date(date).toLocaleString() : null;
    }
};

const buildBaseQuery = (userId, userRoles, config) => {
    const query = { guildId: process.env.DISCORD_GUILD_ID };
    
    let isSupport = false;
    for (const [_, ticketType] of Object.entries(config.TicketTypes)) {
        if (ticketType.SupportRole) {
            const matches = ticketType.SupportRole.filter(roleId => userRoles.includes(roleId));
            if (matches.length > 0) {
                isSupport = true;
                break;
            }
        }
    }

    if (!isSupport) {
        query.userId = userId;
    }

    return query;
};

const calculateSatisfactionRate = async (baseQuery) => {
    const ratedTickets = await Ticket.find({
        ...baseQuery,
        status: { $in: ['closed', 'deleted'] },
        rating: { $regex: /⭐.*\(\d\/5\)$/ }
    });

    if (ratedTickets.length === 0) return 0;

    const goodRatings = ratedTickets.filter(ticket => {
        const ratingMatch = ticket.rating.match(/\((\d)\/5\)$/);
        if (!ratingMatch) return false;
        
        const rating = parseInt(ratingMatch[1]);
        const isGood = rating >= 4;
        return isGood;
    }).length;

    return Math.round((goodRatings / ratedTickets.length) * 100 * 100) / 100;
};

router.get('/list', auth, async(req, res) => {
    try {
        const { status, priority, type, search, sortBy = 'newest', page = 1, limit = 10 } = req.query;
        const userId = req.user.id;
        const userRoles = req.user.roles || [];
        const config = loadConfig();

        const baseQuery = buildBaseQuery(userId, userRoles, config);
        const query = { ...baseQuery };

        if (status && status !== 'all') query.status = status;
        if (priority && priority !== 'all') query.priority = priority;
        if (type && type !== 'all') query.ticketType = type;

        if (search && search.length >= 2) {
            if (search.startsWith('@')) {
                const username = search.slice(1);
                if (username.length >= 2) {
                    const searchRegex = new RegExp(username, 'i');
                    
                    const client = getDiscordClient();
                    try {
                        const guildMembers = await client.guilds.cache.get(process.env.DISCORD_GUILD_ID).members.fetch();
                        const matchingMembers = Array.from(guildMembers.values())
                            .filter(member => 
                                member.user.username.match(searchRegex) || 
                                member.displayName.match(searchRegex) ||
                                member.user.globalName?.match(searchRegex)
                            )
                            .map(member => member.id);

                        if (matchingMembers.length > 0) {
                            query.$or = [
                                { userId: { $in: matchingMembers } },
                                { claimedBy: { $in: matchingMembers } }
                            ];
                        } else {
                            query.userId = 'no-matches';
                        }
                    } catch (error) {
                        console.error('[SEARCH] Error fetching Discord users:', error);
                        query.$or = [
                            { userId: searchRegex },
                            { claimedBy: searchRegex }
                        ];
                    }
                }
            } else {
                const searchRegex = new RegExp(search, 'i');
                query.$or = [
                    { userId: searchRegex },
                    { ticketType: searchRegex },
                    { channelName: searchRegex },
                    { 'messages.content': searchRegex }
                ];
                
                if (/^\d+$/.test(search)) {
                    query.$or.push({ ticketId: parseInt(search) });
                }

                try {
                    const textSearchQuery = { ...query };
                    textSearchQuery.$text = { $search: search };
                    const testSearch = await Ticket.findOne(textSearchQuery);
                    
                    if (testSearch) {
                        query.$text = { $search: search };
                        delete query.$or;
                    }
                } catch (error) {
                    console.log('[SEARCH] Text search not available, using regex search');
                }
            }
        }

        const cacheKey = search 
            ? `tickets:${userId}:search:${search}:${page}:${limit}`
            : `tickets:${userId}:${status || 'all'}:${priority || 'all'}:${type || 'all'}:${page}:${limit}`;

        const cacheTTL = search ? cache.TTL.TICKETS / 2 : cache.TTL.TICKETS;

        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const totalCount = await Ticket.countDocuments(query);

        const sort = {};
        if (sortBy === 'newest') sort.createdAt = -1;
        else if (sortBy === 'oldest') sort.createdAt = 1;
        else if (sortBy === 'priority') {
            sort.priority = -1;
            sort.createdAt = -1;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const pipeline = [
            { $match: query },
            { $sort: sort },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
                $project: {
                    ticketId: 1,
                    userId: 1,
                    status: 1,
                    priority: 1,
                    ticketType: 1,
                    createdAt: 1,
                    claimed: 1,
                    claimedBy: 1,
                    channelName: 1,
                    messages: { $slice: ['$messages', 1] },
                    _id: 1
                }
            }
        ];

        const tickets = await Ticket.aggregate(pipeline);

        const statsKey = `stats:${userId}`;
        let stats = cache.get(statsKey);
        
        if (!stats) {
            const [totalStats] = await Ticket.aggregate([
                { $match: baseQuery },
                {
                    $group: {
                        _id: null,
                        totalTickets: { $sum: 1 },
                        openTickets: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'open'] }, 1, 0]
                            }
                        },
                        avgResponseTime: {
                            $avg: {
                                $cond: [
                                    { $gt: [{ $size: '$messages' }, 1] },
                                    {
                                        $subtract: [
                                            { $arrayElemAt: ['$messages.timestamp', 1] },
                                            '$createdAt'
                                        ]
                                    },
                                    null
                                ]
                            }
                        }
                    }
                }
            ]);

            stats = {
                totalTickets: totalStats?.totalTickets || 0,
                openTickets: totalStats?.openTickets || 0,
                avgResponseTime: totalStats?.avgResponseTime ? Math.round(totalStats.avgResponseTime / (1000 * 60)) : 0
            };

            cache.set(statsKey, stats, cache.TTL.STATS);
        }

        const formattedTickets = tickets.map(ticket => ({
            id: ticket.ticketId.toString(),
            title: `Ticket #${ticket.ticketId}`,
            description: ticket.messages?.[0]?.content || 'No description',
            status: ticket.status?.toLowerCase() || 'open',
            priority: ticket.priority?.toLowerCase() || 'medium',
            type: ticket.ticketType,
            typeName: getTicketTypeName(ticket.ticketType),
            creator: ticket.userId || 'Unknown',
            assignee: ticket.claimedBy || null,
            claimed: ticket.claimed || false,
            claimedBy: ticket.claimedBy || null,
            createdAt: formatDate(ticket.createdAt) || 'Unknown Date',
            updatedAt: formatDate(ticket.createdAt) || 'Unknown Date',
            date: formatDate(ticket.createdAt) || 'Unknown Date'
        }));

        const response = {
            tickets: formattedTickets,
            pagination: {
                page: parseInt(page),
                pages: Math.ceil(totalCount / parseInt(limit)),
                total: totalCount
            },
            stats
        };

        cache.set(cacheKey, response, cacheTTL);
        res.json(response);
    } catch (error) {
        console.error('[TICKETS] Error fetching tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

router.get('/dashboard', auth, cacheStats, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRoles = req.user.roles || [];
        const config = loadConfig();
        const baseQuery = buildBaseQuery(userId, userRoles, config);
        
        const now = Date.now();
        const timeRanges = {
            day: new Date(now - 24 * 60 * 60 * 1000),
            week: new Date(now - 7 * 24 * 60 * 60 * 1000),
            month: moment().subtract(30, 'days').toDate(),
            threeMonths: new Date(now - 90 * 24 * 60 * 60 * 1000),
            year: new Date(now - 365 * 24 * 60 * 60 * 1000)
        };

        const client = getDiscordClient();
        const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
        const currentMemberCount = guild.memberCount;

        const simulateHistoricalMemberCount = (count, variance = 0.1) => {
            const minChange = Math.floor(count * (1 - variance));
            const maxChange = Math.ceil(count * (1 + variance));
            return Math.floor(Math.random() * (maxChange - minChange) + minChange);
        };

        const [stats] = await Ticket.aggregate([
            { $match: baseQuery },
            {
                $facet: {
                    recentTickets: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 5 },
                        {
                            $project: {
                                ticketId: 1,
                                status: 1,
                                userId: 1,
                                createdAt: 1,
                                ticketType: 1,
                                priority: 1,
                                claimed: 1,
                                claimedBy: 1,
                                messages: { $slice: ['$messages', 1] }
                            }
                        }
                    ],
                    timeMetrics: [
                        {
                            $group: {
                                _id: {
                                    $cond: [
                                        { $gte: ['$createdAt', timeRanges.day] },
                                        'day',
                                        {
                                            $cond: [
                                                { $gte: ['$createdAt', timeRanges.week] },
                                                'week',
                                                {
                                                    $cond: [
                                                        { $gte: ['$createdAt', timeRanges.month] },
                                                        'month',
                                                        'older'
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                count: { $sum: 1 },
                                openCount: {
                                    $sum: {
                                        $cond: [{ $eq: ['$status', 'open'] }, 1, 0]
                                    }
                                }
                            }
                        }
                    ],
                    typeDistribution: [
                        {
                            $group: {
                                _id: '$ticketType',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    satisfactionStats: [
                        {
                            $match: {
                                status: { $in: ['closed', 'deleted'] },
                                rating: { $regex: /⭐.*\(\d\/5\)$/ }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalRated: { $sum: 1 },
                                goodRatings: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $gte: [
                                                    {
                                                        $toInt: {
                                                            $arrayElemAt: [
                                                                { $split: [{ $arrayElemAt: [{ $split: ['$rating', '('] }, 1] }, '/'] },
                                                                0
                                                            ]
                                                        }
                                                    },
                                                    4
                                                ]
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ],
                    responseTimeStats: [
                        {
                            $match: {
                                'messages.1': { $exists: true }
                            }
                        },
                        {
                            $project: {
                                responseTime: {
                                    $let: {
                                        vars: {
                                            firstResponse: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: '$messages',
                                                            as: 'msg',
                                                            cond: { $ne: ['$$msg.authorId', '$userId'] }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        },
                                        in: {
                                            $subtract: ['$$firstResponse.timestamp', '$createdAt']
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                avgResponseTime: { $avg: '$responseTime' }
                            }
                        }
                    ],
                    dailyActivity: [
                        { $match: { createdAt: { $gte: timeRanges.day } } },
                        {
                            $group: {
                                _id: { $hour: '$createdAt' },
                                count: { $sum: 1 },
                                types: { $push: '$ticketType' }
                            }
                        }
                    ],
                    weeklyActivity: [
                        { $match: { createdAt: { $gte: timeRanges.week } } },
                        {
                            $group: {
                                _id: { $dayOfWeek: '$createdAt' },
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    monthlyActivity: [
                        { 
                            $match: { 
                                createdAt: { 
                                    $gte: timeRanges.month,
                                    $lte: new Date(now)
                                } 
                            } 
                        },
                        {
                            $group: {
                                _id: {
                                    day: { $dayOfMonth: '$createdAt' },
                                    month: { $month: '$createdAt' },
                                    year: { $year: '$createdAt' }
                                },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
                    ],
                    threeMonthsActivity: [
                        { $match: { createdAt: { $gte: timeRanges.threeMonths } } },
                        {
                            $group: {
                                _id: {
                                    month: { $month: '$createdAt' },
                                    year: { $year: '$createdAt' }
                                },
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    yearlyActivity: [
                        { $match: { createdAt: { $gte: timeRanges.year } } },
                        {
                            $group: {
                                _id: {
                                    month: { $month: '$createdAt' },
                                    year: { $year: '$createdAt' }
                                },
                                count: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ]);

        const timeMetrics = stats.timeMetrics.reduce((acc, metric) => {
            acc[metric._id] = {
                total: metric.count,
                open: metric.openCount
            };
            return acc;
        }, {});

        const typeDistribution = stats.typeDistribution.map(type => ({
            _id: getTicketTypeName(type._id),
            count: type.count
        }));

        const satisfactionStats = stats.satisfactionStats[0] || { totalRated: 0, goodRatings: 0 };
        const satisfactionRate = satisfactionStats.totalRated > 0
            ? Math.round((satisfactionStats.goodRatings / satisfactionStats.totalRated) * 100 * 100) / 100
            : 0;

        const formattedRecentTickets = stats.recentTickets.map(ticket => ({
            id: ticket.ticketId.toString(),
            title: `Ticket #${ticket.ticketId}`,
            description: ticket.messages?.[0]?.content || 'No description',
            status: ticket.status?.toLowerCase() || 'open',
            priority: ticket.priority?.toLowerCase() || 'medium',
            type: ticket.ticketType,
            typeName: getTicketTypeName(ticket.ticketType),
            creator: ticket.userId || 'Unknown',
            assignee: ticket.claimedBy || null,
            claimed: ticket.claimed || false,
            claimedBy: ticket.claimedBy || null,
            createdAt: formatDate(ticket.createdAt) || 'Unknown Date',
            updatedAt: formatDate(ticket.createdAt) || 'Unknown Date',
            date: formatDate(ticket.createdAt) || 'Unknown Date'
        }));

        const chartData = {
            '1D': Array.from({ length: 24 }, (_, hour) => {
                const entry = stats.dailyActivity.find(d => d._id === hour) || { count: 0, types: [] };
                return {
                    hour,
                    count: entry.count,
                    types: entry.types.reduce((acc, type) => {
                        const typeName = getTicketTypeName(type);
                        acc[typeName] = (acc[typeName] || 0) + 1;
                        return acc;
                    }, {}),
                    users: simulateHistoricalMemberCount(currentMemberCount)
                };
            }),
            '1W': stats.weeklyActivity.map(day => ({
                day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day._id - 1],
                count: day.count,
                users: simulateHistoricalMemberCount(currentMemberCount)
            })),
            '1M': Array.from({ length: 30 }, (_, i) => {
                const date = moment().subtract(29 - i, 'days');
                const matchingDay = stats.monthlyActivity.find(stat => 
                    stat._id.day === date.date() && 
                    stat._id.month === date.month() + 1 && 
                    stat._id.year === date.year()
                );
                return {
                    date: date.format('MMM D'),
                    count: matchingDay?.count || 0,
                    users: simulateHistoricalMemberCount(currentMemberCount)
                };
            }),
            '3M': stats.threeMonthsActivity.map(month => ({
                month: moment().month(month._id.month - 1).format('MMM'),
                count: month.count,
                users: simulateHistoricalMemberCount(currentMemberCount)
            })),
            '1Y': stats.yearlyActivity.map(month => ({
                month: moment().month(month._id.month - 1).format('MMM'),
                count: month.count,
                users: simulateHistoricalMemberCount(currentMemberCount)
            }))
        };

        const avgResponseTime = stats.responseTimeStats[0]?.avgResponseTime
            ? Math.round(stats.responseTimeStats[0].avgResponseTime / (1000 * 60))
            : 0;

        res.json({
            recentTickets: formattedRecentTickets,
            timeMetrics,
            typeDistribution,
            satisfactionRate: Number.isFinite(satisfactionRate) ? satisfactionRate : 0,
            totalTickets: timeMetrics.day?.total || 0,
            openTickets: timeMetrics.day?.open || 0,
            avgResponseTime: Number.isFinite(avgResponseTime) ? avgResponseTime : 0,
            chartData
        });
    } catch (error) {
        console.error('[DASHBOARD] Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

router.get('/:id/transcript', auth, async(req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        
        if (isNaN(ticketId)) {
            return res.status(400).json({ 
                error: 'Invalid ticket ID',
                messages: [],
                questions: [],
                id: req.params.id,
                type: null,
                status: null,
                priority: null,
                creator: null,
                claimer: null,
                created: null,
                closed: null,
                rating: null,
                feedback: null,
                closeReason: null
            });
        }

        const ticket = await Ticket.findOne({ ticketId });

        if (!ticket) {
            return res.status(404).json({ 
                error: 'Ticket not found',
                messages: [],
                questions: [],
                id: req.params.id,
                type: null,
                status: null,
                priority: null,
                creator: null,
                claimer: null,
                created: null,
                closed: null,
                rating: null,
                feedback: null,
                closeReason: null
            });
        }

        const userId = req.user.id;
        const hasSupport = await hasSupportRoleForType(userId, ticket.ticketType);
        
        if (ticket.userId !== userId && !hasSupport) {
            return res.status(403).json({ 
                error: 'Access denied',
                message: 'You do not have permission to view this ticket'
            });
        }

        const messages = ticket.messages.map(msg => ({
            author: msg.author,
            authorId: msg.authorId,
            content: msg.content,
            timestamp: formatDate(msg.timestamp),
            attachments: msg.attachments?.map(att => ({
                url: att.url,
                name: att.name,
                contentType: att.contentType,
                binaryData: att.binaryData ? att.binaryData.toString('base64') : null,
                width: att.width,
                height: att.height,
                size: att.size,
                compressed: att.compressed
            })) || [],
            avatarUrl: null
        }));

        res.json({
            id: ticket.ticketId.toString(),
            type: ticket.ticketType,
            typeName: getTicketTypeName(ticket.ticketType),
            status: ticket.status,
            priority: ticket.priority || 'Low',
            creator: ticket.userId,
            claimer: ticket.claimedBy || 'Unclaimed',
            created: formatDate(ticket.createdAt),
            closed: ticket.closedAt ? formatDate(ticket.closedAt) : null,
            rating: ticket.rating || 'No Rating',
            feedback: ticket.reviewFeedback || '',
            questions: ticket.questions?.map(q => ({
                question: q.question,
                answer: q.answer
            })) || [],
            messages: messages,
            closeReason: ticket.closeReason || ticket.customCloseReason || '',
            canSendMessages: hasSupport
        });
    } catch (error) {
        console.error('[TICKETS] Error fetching transcript:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch transcript',
            messages: [],
            questions: [],
            id: req.params.id,
            type: null,
            status: null,
            priority: null,
            creator: null,
            claimer: null,
            created: null,
            closed: null,
            rating: null,
            feedback: null,
            closeReason: null
        });
    }
});

router.get('/user/:userId', auth, async(req, res) => {
    try {
        const { userId } = req.params;

        if (!userId || userId === 'undefined' || userId === 'null') {
            return res.status(400).json({
                id: null,
                username: 'Unknown User',
                discriminator: '0000',
                avatar: null,
                global_name: 'Unknown User'
            });
        }

        const client = getDiscordClient();
        if (!client) {
            console.error('[TICKETS] Discord client not initialized');
            return res.status(500).json({ 
                id: userId,
                username: 'Unknown User',
                discriminator: '0000',
                avatar: null,
                global_name: 'System'
            });
        }

        try {
            const user = await client.users.fetch(userId);
            return res.json({
                id: user.id,
                username: user.username || 'Unknown User',
                discriminator: user.discriminator || '0000',
                avatar: user.avatar,
                global_name: user.globalName || user.username || 'Unknown User'
            });
        } catch (discordError) {
            console.error('[TICKETS] Discord API error:', discordError);
            return res.status(404).json({
                id: userId,
                username: 'Unknown User',
                discriminator: '0000',
                avatar: null,
                global_name: `User#${userId}`
            });
        }
    } catch (error) {
        console.error('[TICKETS] Error fetching Discord user:', error);
        return res.status(500).json({
            id: userId || null,
            username: 'Unknown User',
            discriminator: '0000',
            avatar: null,
            global_name: 'System User'
        });
    }
});

router.post('/:ticketId/send-message', auth, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const hasPermission = await hasSupportRoleForType(userId, ticket.ticketType);
        if (!hasPermission) {
            return res.status(403).json({ error: 'You do not have permission to send messages in this ticket' });
        }

        const client = getDiscordClient();
        const channel = await client.channels.fetch(ticket.channelId);
        if (!channel) {
            return res.status(404).json({ error: 'Ticket channel not found' });
        }

        const webhook = await channel.createWebhook({
            name: req.user.username,
            avatar: req.user.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${req.user.avatar}.png` : undefined
        });

        await webhook.send({
            content,
            username: req.user.username,
            avatarURL: req.user.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${req.user.avatar}.png` : undefined
        });

        await webhook.delete();

        ticket.messages.push({
            content,
            author: req.user.username,
            authorId: userId,
            timestamp: new Date().toISOString()
        });
        await ticket.save();

        res.json({ success: true });
    } catch (error) {
        console.error('[TICKETS] Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

router.post('/claim/:ticketId', auth, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const userId = req.user.id;
        const userRoles = req.user.roles || [];
        const config = loadConfig();

        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticketType = config.TicketTypes[ticket.ticketType];
        if (!ticketType || !ticketType.Claiming || !ticketType.Claiming.Enabled) {
            return res.status(400).json({ error: 'Ticket is not claimable' });
        }

        const hasSupportRole = ticketType.SupportRole.some(roleId => userRoles.includes(roleId));
        if (!hasSupportRole) {
            return res.status(403).json({ error: 'You do not have permission to claim tickets' });
        }

        let action;
        let announcement;

        const client = getDiscordClient();
        const channel = await client.channels.fetch(ticket.channelId);
        if (!channel) {
            return res.status(404).json({ error: 'Ticket channel not found' });
        }

        const messages = await channel.messages.fetch({ limit: 100 });
        const ticketMessage = messages.find(m => m.id === ticket.firstMessageId);

        if (ticket.claimed) {
            if (ticket.claimedBy === userId) {
                await Ticket.findOneAndUpdate(
                    { ticketId },
                    { 
                        claimed: false,
                        claimedBy: null,
                        processingClaim: false
                    }
                );

                action = 'unclaimed';
                announcement = lang.Tickets.Claim.Announcements.Unclaimed.replace('{user}', `<@${userId}>`);

                if (ticketMessage) {
                    const row = new ActionRowBuilder();
                    const components = ticketMessage.components[0].components.map(c => {
                        if (c.data.custom_id?.startsWith('ticketclaim')) {
                            return new ButtonBuilder()
                                .setCustomId(c.data.custom_id)
                                .setLabel(ticketType.Claiming.Button.Name || "Claim Ticket")
                                .setStyle(ButtonStyle[ticketType.Claiming.Button.Style] || ButtonStyle.Secondary)
                                .setEmoji(ticketType.Claiming.Button.Emoji || '🎫');
                        }
                        return ButtonBuilder.from(c.data);
                    });
                    row.addComponents(components);
                    await ticketMessage.edit({ components: [row] });
                }

                if (ticketType.Claiming.AnnounceClaim) {
                    await channel.send({
                        embeds: [{
                            color: 0xFF0000,
                            description: announcement
                        }]
                    });
                }
            } else {
                return res.status(400).json({ 
                    error: `Ticket is already claimed by <@${ticket.claimedBy}>`
                });
            }
        } else {
            await Ticket.findOneAndUpdate(
                { ticketId },
                { 
                    claimed: true,
                    claimedBy: userId,
                    processingClaim: false
                }
            );

            action = 'claimed';
            announcement = lang.Tickets.Claim.Announcements.Claimed.replace('{user}', `<@${userId}>`);

            if (ticketMessage) {
                const member = await channel.guild.members.fetch(userId);
                const row = new ActionRowBuilder();
                const components = ticketMessage.components[0].components.map(c => {
                    if (c.data.custom_id?.startsWith('ticketclaim')) {
                        return new ButtonBuilder()
                            .setCustomId(c.data.custom_id)
                            .setLabel(`Claimed by ${member.user.username}`)
                            .setStyle(ButtonStyle[ticketType.Claiming.Button.Style] || ButtonStyle.Secondary)
                            .setEmoji(ticketType.Claiming.Button.Emoji || '🎫');
                    }
                    return ButtonBuilder.from(c.data);
                });
                row.addComponents(components);
                await ticketMessage.edit({ components: [row] });
            }

            if (ticketType.Claiming.AnnounceClaim) {
                await channel.send({
                    embeds: [{
                        color: 0x00FF00,
                        description: announcement
                    }]
                });
            }
        }

        const updatedTicket = await Ticket.findOne({ ticketId });

        return res.json({ 
            success: true, 
            action,
            announcement,
            ticket: {
                claimed: updatedTicket.claimed,
                claimedBy: updatedTicket.claimedBy,
                assignee: updatedTicket.claimedBy
            }
        });
    } catch (error) {
        console.error('Error claiming ticket:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

router.post('/close/:ticketId', auth, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;
        const userRoles = req.user.roles || [];
        const config = loadConfig();

        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        if (ticket.status === 'deleting' || ticket.status === 'deleted') {
            return res.status(400).json({ error: 'Ticket is already being deleted' });
        }

        const ticketType = config.TicketTypes[ticket.ticketType];
        if (!ticketType) {
            return res.status(400).json({ error: 'Invalid ticket type' });
        }

        const hasSupportRole = ticketType.SupportRole.some(roleId => userRoles.includes(roleId));
        if (!hasSupportRole && ticket.userId !== userId) {
            return res.status(403).json({ error: 'You do not have permission to close this ticket' });
        }

        const client = getDiscordClient();
        const channel = await client.channels.fetch(ticket.channelId);
        if (!channel) {
            return res.status(404).json({ error: 'Ticket channel not found' });
        }

        const mockInteraction = {
            client,
            guild: channel.guild,
            channel,
            user: await client.users.fetch(userId),
            member: await channel.guild.members.fetch(userId),
            replied: false,
            deferred: false,
            isCommand: () => false,
            isButton: () => true,
            customId: `ticketclose-${ticketId}`,
            reply: async (msg) => {
                mockInteraction.replied = true;
                return channel.send(msg);
            },
            deferReply: async () => {
                mockInteraction.deferred = true;
                return Promise.resolve();
            },
            followUp: async (msg) => channel.send(msg),
            editReply: async (msg) => channel.send(msg),
            options: {
                getString: (name) => {
                    if (name === 'reason') return reason;
                    if (name === 'custom_reason') return null;
                    return null;
                }
            }
        };

        const { handleTicketClose } = require('../../../../events/interactionCreate.js');

        await handleTicketClose(client, mockInteraction, ticketId, null, reason);

        return res.json({ success: true });
    } catch (error) {
        console.error('Error closing ticket:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/permissions/:type', auth, async (req, res) => {
    try {
        const { type } = req.params;
        const userId = req.user.id;
        const userRoles = req.user.roles || [];
        const config = loadConfig();

        const ticketType = config.TicketTypes[type];
        if (!ticketType) {
            return res.json({ hasSupport: false });
        }

        const hasSupportRole = ticketType.SupportRole.some(roleId => userRoles.includes(roleId));
        
        res.json({ hasSupport: hasSupportRole });
    } catch (error) {
        console.error('[TICKETS] Error checking permissions:', error);
        res.status(500).json({ error: 'Failed to check permissions' });
    }
});

module.exports = router;