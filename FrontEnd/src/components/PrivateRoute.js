import React from 'react';
import { Navigate } from 'react-router-dom';

const isAuthenticated = () => {
  // This is a basic check for demonstration. You might have more complex logic.
  const token = localStorage.getItem('token');
  return !!token; // Return true if the token exists
};

const PrivateRoute = ({ element: Component }) => {
  // If the user is authenticated, render the requested component
  return isAuthenticated() ? <Component /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
