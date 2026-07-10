import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  // 1. Check if the token exists in the incoming cookies
  if (req.cookies && req.cookies.token) {
    try {
      token = req.cookies.token;

      // 2. Cryptographically verify the token using your secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Find the user in the database based on the ID inside the token
      // We use .select('-password') to ensure we DON'T attach the hashed password to the request
      req.user = await User.findById(decoded.id).select('-password');

      // 4. Pass the baton to the next function (the actual route controller)
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const optionalAuth = async (req, res, next) => {
  if (req.cookies && req.cookies.token) {
    try {
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // If token is expired/invalid, treat them as a guest
      req.user = null; 
    }
  } else {
    req.user = null; // No token, treat as guest
  }
  next();
};