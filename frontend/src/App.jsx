import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Auth from './Pages/Auth';
import Home from './Pages/Home';

function App() {
  const { user, loading } = useContext(AuthContext);

  // Show a quick loading screen while checking for the secure HTTP-Only cookie
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-base-200">Loading Application...</div>;

  return (
    <Router>
      <Routes>
        {/* Route 1: The Hybrid Dashboard - Anyone (Guest or User) can visit this! */}
        <Route 
          path="/" 
          element={<Home />} 
        />

        {/* Route 2: The Auth Page - Only guests should see this. If logged in, redirect to Dashboard */}
        <Route 
          path="/auth" 
          element={user ? <Navigate to="/" /> : <Auth />} 
        />
      </Routes>
    </Router>
  );
}

export default App;