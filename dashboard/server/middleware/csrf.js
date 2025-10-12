const crypto = require('crypto');
const { STATIC_FILE_PATTERN, PUBLIC_PATHS, getCookieSettings, isPublicPath } = require('./shared');

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function isSecureConnection(req) {
    return req.secure || (req.headers['x-forwarded-proto'] === 'https');
}

function verifyCsrfToken(req, res, next) {
    if (!isSecureConnection(req)) {
        return next();
    }

    if (STATIC_FILE_PATTERN.test(req.path)) {
        return next();
    }

    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    if (isPublicPath(req.path) || req.path.startsWith('/api/auth/')) {
        return next();
    }

    if (!req.session) {
        return res.status(403).json({
            error: 'Session required',
            message: 'Valid session required',
            status: 403,
            statusText: 'Forbidden'
        });
    }

    const token = req.headers['x-xsrf-token'] || req.headers['x-csrf-token'];
    const sessionToken = req.session?.csrfToken;

    if (!token || !sessionToken || token !== sessionToken) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    next();
}

function setCsrfToken(req, res, next) {
    if (!isSecureConnection(req)) {
        return next();
    }

    if (STATIC_FILE_PATTERN.test(req.path) || !req.path.startsWith('/api/')) {
        return next();
    }

    if (isPublicPath(req.path)) {
        return next();
    }

    if (req.csrfSet) {
        return next();
    }

    if (!req.session) {
        return next();
    }

    const existingCookieToken = req.cookies['XSRF-TOKEN'];
    
    if (!req.session.csrfToken && existingCookieToken) {
        return next();
    }
    
    if (!req.session.csrfToken) {
        const newToken = generateToken();
        req.session.csrfToken = newToken;
        
        req.session.save((err) => {
            if (err) {
                return next(err);
            }
            
            const cookieSettings = getCookieSettings(
                process.env.NODE_ENV === 'production',
                process.env.DOMAIN,
                req
            );
            
            res.cookie('XSRF-TOKEN', newToken, {
                ...cookieSettings,
                httpOnly: false
            });
        
            req.csrfSet = true;
            next();
        });
    } else {
        if (!existingCookieToken) {
            const cookieSettings = getCookieSettings(
                process.env.NODE_ENV === 'production',
                process.env.DOMAIN,
                req
            );
            
            res.cookie('XSRF-TOKEN', req.session.csrfToken, {
                ...cookieSettings,
                httpOnly: false
            });
        
        }
        
        req.csrfSet = true;
        next();
    }
}

module.exports = {
    verifyCsrfToken,
    setCsrfToken
}; 