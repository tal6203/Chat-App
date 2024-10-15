import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import config from "./config/default.json";
import './Login.css';


const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();


  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${config.URL_CONNECT}/auth/login`, {
        username: username.trim(),
        password: password.trim(),
      });


      if (response.status === 200) {
        const { user, token } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        navigate('/chat');
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.error || 'Failed to login. Please try again.');
    }
  };

  const handleGuestLogin = async () => {
    try {
      const response = await axios.post(`${config.URL_CONNECT}/auth/guest`);

      const { user, token } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      navigate('/chat');
    } catch (error) {
      setErrorMessage(error.response?.data?.error || 'Failed to login as guest. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <div className="card">
        <div className="logo">Chat</div>
        <h2>Welcome Back</h2>
        <form className="form" onSubmit={handleLogin}>
          <div className="input-group" style={{ marginBottom: '15px' }}>
            <input
              type="text"
              name="username"
              placeholder="Username"
              className='login-username'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
            <i className="bi bi-person-fill input-icon"></i>
          </div>
          <div className="input-group">
            <i className="bi bi-lock-fill input-icon"></i>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              className='login-password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="toggle-password"
              type='button'
            >
              {showPassword ? <i className="bi bi-eye-slash"></i> : <i className="bi bi-eye"></i>}
            </button>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <a href="/verification-email" className="forget-pass">Forget Password</a>
          </div>
          <button className='btn-login' type="submit">Sign In <i className="bi bi-send"></i></button>
        </form>
        <button className='btn-login-guest' onClick={handleGuestLogin}>Login as Guest <i className="bi bi-person"></i></button>
        {errorMessage && <div className="error-message" role="alert">{errorMessage}</div>}
        <footer className="footer">
          <div className="footer-content">
            Need an account?
            <a href="/register" className="signup-link"> Sign up here</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Login;
