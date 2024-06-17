import React, { Component } from 'react';
import axios from 'axios';
import './Login.css';

class Login extends Component {
  constructor() {
    super();
    this.state = {
      username: '',
      password: '',
      showPassword: false,
      errorMessage: '',
    };
  }

  handleInputChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  togglePasswordVisibility = () => {
    this.setState(prevState => ({ showPassword: !prevState.showPassword }));
  };


  handleLogin = async (e) => {
    e.preventDefault();
    const username = this.state.username.trim();  
    const password = this.state.password.trim();
    try {
      const response = await axios.post('http://localhost:8080/auth/login', {
        username,
        password,
      });

      const { user, token } = response.data;


      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Redirect to chat page
      window.location.href = '/chat';
    } catch (error) {
      this.setState({
        errorMessage: error.response?.data?.error || 'Failed to login. Please try again.'
      });
    }
  };

  handleGuestLogin = async () => {
    try {
      const response = await axios.post('http://localhost:8080/auth/guest');

      const { user, token } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Redirect to chat page
      window.location.href = '/chat';
    } catch (error) {
      this.setState({
        errorMessage: error.response?.data?.error || 'Failed to login as guest. Please try again.'
      });
    }
  };

  render() {
    const { username, password, showPassword, errorMessage } = this.state;
    return (
      <div className="login-container">

        <div className="card">
          <div className="logo">Chat</div>
          <h2>Welcome Back</h2>
          <form className="form" onSubmit={this.handleLogin}>
            <div className="input-group">
              <input
                type="text"
                name="username"
                placeholder="Username"
                className='login-username'
                value={username}
                onChange={this.handleInputChange}
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
                onChange={this.handleInputChange}
                autoComplete="current-password"
                required
              />
              <button
                onClick={this.togglePasswordVisibility}
                className="toggle-password"
                type='button'
              >
                {showPassword ? <i className="bi bi-eye-slash"></i> : <i className="bi bi-eye"></i>}
              </button>
            </div>
            <button className='btn-login' type="submit">Sign In <i className="bi bi-send"></i></button>
          </form>
          <button className='btn-login-guest' onClick={this.handleGuestLogin}>Login as Guest <i className="bi bi-person"></i></button>
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
  }
}

export default Login;
