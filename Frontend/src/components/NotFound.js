import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css'; // Custom CSS for the NotFound component

const NotFound = () => {
    return (
        <div className="not-found-container">
            <div className="logo">404</div>
            <h1 className="header-not-found">Page Not Found</h1>
            <p className='body-not-found'>Sorry, the page you're looking for doesn't exist.</p>
            <Link to="/" className="btn-back-home">Go back to Home</Link>
        </div>
    );
};

export default NotFound;
