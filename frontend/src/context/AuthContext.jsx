import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// 1. Create the Context
export const AuthContext = createContext();

// 2. Set Axios Defaults (CRITICAL FOR COOKIES)
axios.defaults.withCredentials = true;

// Use the environment variable from .env instead of hardcoding localhost
const API_URL = `${import.meta.env.VITE_BACKEND_URL}/api/auth`;

// 3. Create the Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in when the app loads
  useEffect(() => {
    const checkUserLoggedIn = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/me`);
        setUser(data);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUserLoggedIn();
  }, []);

  // Login Function
  const login = async (email, password) => {
    const { data } = await axios.post(`${API_URL}/login`, { email, password });
    setUser(data);
  };

  // Register Function
  const register = async (email, password) => {
    const { data } = await axios.post(`${API_URL}/register`, { email, password });
    setUser(data);
  };

  // Logout Function
  const logout = async () => {
    await axios.post(`${API_URL}/logout`);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};