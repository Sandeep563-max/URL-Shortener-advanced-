import express from 'express';
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  getMe 
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route: POST /api/auth/register
// Purpose: Create a new user account and set the JWT cookie
router.post('/register', registerUser);

// Route: POST /api/auth/login
// Purpose: Verify credentials and set the JWT cookie
router.post('/login', loginUser);

// Route: POST /api/auth/logout
// Purpose: Clear the JWT cookie from the browser
router.post('/logout', logoutUser);

// Route: GET /api/auth/me
// Purpose: Validate the current session when the React app reloads
// Security: Protected by the 'protect' middleware
router.get('/me', protect, getMe);

export default router;