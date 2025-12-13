// middleware/admin.js
// Allow only admin users for certain routes
module.exports = function (req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'No user' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
};
