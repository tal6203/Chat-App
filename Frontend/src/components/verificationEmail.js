import { useState } from 'react';
import axios from 'axios';
import config from './config/default.json';
import Swal from 'sweetalert2';
import './VerificationEmail.css';

const VerificationEmail = () => {
    const [email, setEmail] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);


    const handleSendEmailRestPass = async (event) => {
        event.preventDefault();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || !emailRegex.test(email)) {
            setErrorMessage("A valid email is required.");
            return;
        }
        setLoading(true);

        try {
            const response = await axios.post(`${config.URL_CONNECT}/auth/verification-email`, {
                email
            });

            if (response.status === 200) {
                setLoading(false);
                Swal.fire({
                    title: "Password Reset Email Sent!",
                    text: "Please check your email for instructions to reset your password.",
                    icon: "success"
                }).then(() => {
                    // Redirect after SweetAlert is closed
                    window.location.href = '/login';
                });
            }

        }
        catch (error) {
            setLoading(false);
            setErrorMessage(error.response?.data?.error || 'Internal Server Error');
        }
    }

    return (
        <div className="forget-pass-container">
            <form onSubmit={handleSendEmailRestPass}>
                <div className="card">
                    <div className="logo">Chat</div>
                    <h2>Verify your email</h2>
                    {errorMessage && <p className="error-message">{errorMessage}</p>}
                    <div className="input-group-forget-pass">
                        <i className="bi bi-envelope-fill input-icon"></i>
                        <input
                            type="text"
                            autoComplete="email"
                            className='register-email'
                            name="email"
                            placeholder="Email Verification"
                            value={email}
                            onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
                        />
                    </div>
                    <button disabled={loading} className='btn-forget-pass' type="submit">
                        {!loading ?
                            (<span>
                                Send <i className="bi bi-send"></i>
                            </span>
                            ) : (<>
                                <i className="bi bi-arrow-clockwise spin-icon"></i>
                            </>)}
                    </button>
                    <div style={{ marginTop: '10px', fontSize: '0.9em' }}>
                        <span style={{ color: '#666' }}>Back to</span>
                        <a href="/login" className="signup-link"> Login</a>
                    </div>
                </div>
            </form >
        </div >
    );
};

export default VerificationEmail;
