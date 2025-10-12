const requireRoles = (getRolesFunction) => {
    return async (req, res, next) => {
        try {
            let allowedRoles = [];
            try {
                allowedRoles = typeof getRolesFunction === 'function' 
                    ? getRolesFunction()
                    : (Array.isArray(getRolesFunction) ? getRolesFunction : []);
            } catch (error) {
                console.error('[ROLES] Error getting allowed roles:', error);
            }


            if (!req.user) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const userRoles = req.user.roles || [];
            
            if (!allowedRoles || allowedRoles.length === 0) {
                return res.status(403).json({ 
                    error: 'No roles configured for this action. Please configure roles in config.yml under Dashboard.Permissions.Dashboard.Settings' 
                });
            }

            const hasRequiredRole = userRoles.some(role => allowedRoles.includes(role));
            
            if (!hasRequiredRole) {
                return res.status(403).json({ 
                    error: 'You do not have permission to perform this action',
                    details: {
                        requiredRoles: allowedRoles,
                        userRoles: userRoles
                    }
                });
            }

            next();
        } catch (error) {
            console.error('[ROLES] Role verification error:', {
                error: error.message,
                stack: error.stack,
                path: req.path,
                userId: req.user?.id
            });
            res.status(500).json({ error: 'Failed to verify permissions' });
        }
    };
};

module.exports = requireRoles; 