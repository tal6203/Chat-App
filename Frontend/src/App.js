import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import VerificationEmail from './components/verificationEmail';
import RestPassword from './components/resetPassword'; 
import Chat from './components/Chat';
import PrivateRoute from './components/PrivateRoute';
import NotFound from './components/NotFound';
import { useDarkMode } from './DarkModeContext';
import './App.css';


const App = () => {

  const { isDarkMode } = useDarkMode();

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  return (

    <Router>
      <div className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verification-email" element={<VerificationEmail />} />
          <Route path="/reset-password" element={<RestPassword />} /> 
          <Route path="/chat" element={<PrivateRoute element={Chat} />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>

  );
}

export default App;
