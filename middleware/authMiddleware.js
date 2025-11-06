const jwt = require('jsonwebtoken');

// Verify JWT token from cookie
const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies && req.cookies[process.env.COOKIE_NAME || 'att_token'];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required. Please login.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
    
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }
    return res.status(401).json({ message: 'Invalid authentication token.' });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. ${req.user.role} role does not have permission.` 
      });
    }
    
    next();
  };
};

module.exports = authMiddleware;
module.exports.authorizeRoles = authorizeRoles;
