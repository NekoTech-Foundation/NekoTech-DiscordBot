const path = require('path');

const PUBLIC_PATHS = [
    '/api/auth/callback',
    '/api/auth/callback/discord',
    '/api/health',
    '/api/memory'
];

const STATIC_FILE_PATTERN = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json|manifest)$/;

const getCookieSettings = (isProduction, domain, req = null) => {
    const isSecure = req ? (req.secure || req.headers['x-forwarded-proto'] === 'https') : false;
    
    const useSecure = isProduction ? isSecure : false;
    
    return {
        secure: useSecure,
        sameSite: useSecure ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
        httpOnly: true,
        domain: isProduction ? domain : undefined
    };
};

const errorHandler = (error, req, res, next) => {
    console.error(`[ERROR] ${error.name}:`, error.message);
    
    if (error.name === 'AuthError') {
        return res.status(error.statusCode || 403).json({
            error: error.message,
            ...(error.details && { details: error.details })
        });
    }

    if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ 
            error: 'You do not have permission to perform this action' 
        });
    }

    if (error.message === 'Discord client not available') {
        return res.status(503).json({ 
            error: 'Service temporarily unavailable' 
        });
    }

    res.status(500).json({ error: 'Internal server error' });
};

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const isStaticFile = (req, res, next) => {
    if (STATIC_FILE_PATTERN.test(req.path)) {
        return next('route');
    }
    next();
};

const isPublicPath = (path) => PUBLIC_PATHS.includes(path);

module.exports = {
    PUBLIC_PATHS,
    STATIC_FILE_PATTERN,
    getCookieSettings,
    errorHandler,
    asyncHandler,
    isStaticFile,
    isPublicPath
}; 