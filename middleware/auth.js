const jwt = require('jsonwebtoken');

const getJwtSecret = () => (
    process.env.JWT_SECRET ||
    process.env.ACCESS_TOKEN_SECRET ||
    'vialifecoach_default_jwt_secret_change_in_production'
);

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, getJwtSecret(), (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }

        req.user = user;
        next();
    });
};

module.exports = { authenticateToken };