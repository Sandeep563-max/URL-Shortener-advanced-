import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Auth from './Pages/Auth';
import Home from './Pages/Home';

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-base-200">Loading Application...</div>;

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={<Home />} 
        />
        <Route 
          path="/auth" 
          element={user ? <Navigate to="/" /> : <Auth />} 
        />
      </Routes>
    </Router>
  );
}

export default App;