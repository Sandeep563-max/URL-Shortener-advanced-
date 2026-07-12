import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

export const registerUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ email, password });

    if (user) {
      const token = generateToken(user._id);

      res.cookie('token', token, {
        httpOnly: true,
        secure: true,       // Required for cross-site cookies
        sameSite: 'none',   // Allows cookie to be sent across different domains
        maxAge: 7 * 24 * 60 * 60 * 1000, 
      });

      res.status(201).json({ _id: user._id, email: user.email });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      const token = generateToken(user._id);

      res.cookie('token', token, {
        httpOnly: true,
        secure: true,       // Required for cross-site cookies
        sameSite: 'none',   // Allows cookie to be sent across different domains
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ _id: user._id, email: user.email });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logoutUser = async (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

export const getMe = async (req, res) => {
  res.status(200).json(req.user);
};