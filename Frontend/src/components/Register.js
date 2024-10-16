import React, { useState } from 'react';
import axios from 'axios';
import './Register.css';
import config from './config/default.json';
import { sha1 } from 'crypto-hash';
import Swal from 'sweetalert2';



const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profilePicture, setProfilePicture] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const [uploadedPublicId, setUploadedPublicId] = useState('');
    const [uploading, setUploading] = useState(false);
    const [passwordsMatch, setPasswordsMatch] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPopover, setShowPopover] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
    const [passwordCriteria, setPasswordCriteria] = useState({
        length: false,
        upper: false,
        lower: false,
        special: false,
        number: false,
    });



    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let modifiedValue = value.replace(/\s/g, '');

        if (name === 'username') setUsername(modifiedValue);
        if (name === 'email') setEmail(modifiedValue);
        if (name === 'password') {
            setPassword(modifiedValue);
            validatePassword(modifiedValue);
        }
        if (name === 'confirmPassword') {
            setConfirmPassword(modifiedValue);
            setConfirmPasswordTouched(true);
            checkPasswordsMatch(modifiedValue, password);
        }
    };

    const checkPasswordsMatch = (password, confirmPassword) => {
        const match = password === confirmPassword;
        setPasswordsMatch(match);
    };

    const validatePassword = (password) => {
        setPasswordCriteria({
            length: password.length >= 6,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            special: /[\W_]/.test(password),
            number: /\d/.test(password),
        });
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', config.uploadPreset);

        try {
            const response = await axios.post(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, formData);
            setProfilePicture(response.data.secure_url);
            setImagePreviewUrl(response.data.secure_url);
            setUploadedPublicId(response.data.public_id);
            setUploading(false);
        } catch (error) {
            setUploading(false);
            let errorMessage = 'Failed to upload file.';
            if (error.response && error.response.data && error.response.data.error.message.includes('File size too large')) {
                const maxAllowedSize = (10485760 / 1024 / 1024).toFixed(1);
                errorMessage = `The file size is too large. The maximum allowed size is ${maxAllowedSize} MB.`;
            }
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: errorMessage,
            });
        }
    };

    const handleCancelImage = async () => {
        const fileInput = document.getElementById("profilePicture");
        if (fileInput) {
            fileInput.value = '';  // Reset the file input value
        }

        const publicId = uploadedPublicId;
        if (!publicId) return;

        const timestamp = new Date().getTime();
        const string = `public_id=${publicId}&timestamp=${timestamp}${config.YOUR_CLOUDINARY_API_SECRET}`;
        const signature = await sha1(string);
        const formData = new FormData();
        formData.append("public_id", publicId);
        formData.append("signature", signature);
        formData.append("api_key", config.API_KEY);
        formData.append("timestamp", timestamp);
        await axios.post(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, formData);
        setProfilePicture('');
        setImagePreviewUrl('');
        setUploadedPublicId('');
    };

    const handleRegister = async (event) => {
        event.preventDefault();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match.');
            return;
        }

        if (username.length < 4) {
            setErrorMessage('Username must be at least 4 characters long.');
            return;
        }

        if (!email || !emailRegex.test(email)) {
            setErrorMessage("A valid email is required.");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${config.URL_CONNECT}/auth/register`, {
                username,
                email,
                password,
                profilePicture,
            });

            if (response.status === 201) {
                setLoading(false);
                Swal.fire({
                    title: "User registered successfully!",
                    text: "Welcome to Chat-App, registered successfully!",
                    icon: "success"
                }).then(() => {
                    window.location.href = '/login';
                });
            }

        } catch (error) {
            setLoading(false);
            setErrorMessage(error.response?.data?.error || 'Internal Server Error');
        }
    };

    const renderPasswordCriteriaPopover = () => {
        const { length, upper, lower, special, number } = passwordCriteria;
        const allValid = length && upper && lower && special && number;

        if (allValid) {
            return null;
        }

        return (
            <div className="popover">
                <ul className="password-criteria">
                    <li className={length ? 'valid' : 'invalid'}>At least 6 characters {length ? '✓' : '✗'}</li>
                    <li className={upper ? 'valid' : 'invalid'}>At least one uppercase letter {upper ? '✓' : '✗'}</li>
                    <li className={lower ? 'valid' : 'invalid'}>At least one lowercase letter {lower ? '✓' : '✗'}</li>
                    <li className={special ? 'valid' : 'invalid'}>At least one special character {special ? '✓' : '✗'}</li>
                    <li className={number ? 'valid' : 'invalid'}>At least one number {number ? '✓' : '✗'}</li>
                </ul>
            </div>
        );
    };

    return (
        <div className="register-container">
            <form onSubmit={handleRegister}>
                <div className="logo">Chat</div>
                <h2>Register</h2>
                {errorMessage && <p className="error-message">{errorMessage}</p>}
                <div className="input-group-register">
                    <i className="bi bi-person-fill input-icon"></i>
                    <input
                        type="text"
                        autoComplete="username"
                        className='register-username'
                        name="username"
                        placeholder="Username"
                        value={username}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="input-group-register">
                    <i className="bi bi-envelope-fill input-icon"></i>
                    <input
                        type="text"
                        autoComplete="email"
                        className='register-email'
                        name="email"
                        placeholder="Email"
                        value={email}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="input-group-register">
                    <i className="bi bi-lock-fill input-icon"></i>
                    <input
                        type={showPassword ? "text" : "password"}
                        className={`register-password ${confirmPasswordTouched ? (passwordsMatch ? 'input-valid' : 'input-invalid') : ''}`}
                        name="password"
                        placeholder="Password"
                        value={password}
                        onChange={handleInputChange}
                        onFocus={() => setShowPopover(true)}
                        onBlur={() => {
                            setShowConfirmPassword(false);
                            setPasswordsMatch(password === confirmPassword);
                        }}
                        autoComplete="new-password"
                    />
                    <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="toggle-password"
                    >
                        {showPassword ? <i className="bi bi-eye-slash"></i> : <i className="bi bi-eye"></i>}
                    </button>
                    {showPopover && renderPasswordCriteriaPopover()}
                </div>

                <div className="input-group-register" >
                    <i className="bi bi-lock-fill input-icon"></i>
                    <input
                        className={`register-password ${confirmPasswordTouched ? (passwordsMatch ? 'input-valid' : 'input-invalid') : ''}`}
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={handleInputChange}
                        onFocus={() => setShowPopover(true)}
                        onBlur={() => {
                            setShowConfirmPassword(false);
                            setPasswordsMatch(password === confirmPassword);
                        }}
                        autoComplete="new-password"
                    />
                    <button
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="toggle-password"
                    >
                        {showConfirmPassword ? <i className="bi bi-eye-slash"></i> : <i className="bi bi-eye"></i>}
                    </button>
                </div>
                <div className="input-group-register file-input">
                    {imagePreviewUrl ? (
                        <div className="image-preview" style={{ position: 'relative', display: 'block', marginBottom: '10px', width: '100px' }}>
                            <img src={imagePreviewUrl} alt="Profile Preview" onClick={() => window.open(imagePreviewUrl, '_blank')} />
                            <button style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                padding: '5px 10px',
                                border: 'none',
                                borderRadius: '0 5px 0 0', // rounded corners only on the top right
                                backgroundColor: '#dc3545',
                                color: 'white',
                                cursor: 'pointer'
                            }} type='button' onClick={handleCancelImage}><i className="bi bi-trash3"></i></button>
                        </div>
                    ) : (
                        <>
                            <button
                                className={uploading ? 'reload-button' : 'upload-button'}
                                type='button'
                                onClick={() => document.getElementById('profilePicture').click()}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    maxWidth: '200px'
                                }}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <i className="bi bi-arrow-clockwise spin-icon"></i>
                                ) : (<span>
                                    <i className="bi bi-cloud-upload-fill"></i> Upload Profile Picture
                                </span>
                                )}
                            </button>
                            <input
                                type="file"
                                id="profilePicture"
                                onChange={handleImageChange}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                        </>
                    )}
                </div>
                <button type="submit" className='btn-register' disabled={uploading || loading}>
                    {!loading ?
                        (<>
                            Register
                        </>
                        ) : (<>
                            <i className="bi bi-arrow-clockwise spin-icon"></i>
                        </>)}
                </button>
            </form>
            <footer className="footer-register">
                <span style={{ fontSize: '16px' }}>
                    You have already registered?
                    <a href="/login"> Login here</a>
                </span>
            </footer>
        </div>
    );
};

export default Register;
