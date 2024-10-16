import { useState } from "react";
import axios from "axios";
import config from './config/default.json';
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import './ResetPassword.css';

const RestPassword = () => {
    const [searchParams] = useSearchParams();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showPopover, setShowPopover] = useState(false);
    const [passwordCriteria, setPasswordCriteria] = useState({
        length: false,
        upper: false,
        lower: false,
        special: false,
        number: false,
    });
    const [passwordsMatch, setPasswordsMatch] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
    const [loading, setLoading] = useState(false);

    const validatePassword = (password) => {
        setPasswordCriteria({
            length: password.length >= 6,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            special: /[\W_]/.test(password),
            number: /\d/.test(password),
        });
    };

    const checkPasswordsMatch = (password, confirmPassword) => {
        setPasswordsMatch(password === confirmPassword);
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setNewPassword(value);
        validatePassword(value);
    };

    const handleConfirmPasswordChange = (e) => {
        const value = e.target.value;
        setConfirmPassword(value);
        setConfirmPasswordTouched(true);
        checkPasswordsMatch(newPassword, value);
    };

    const handlePasswordReset = async (event) => {
        event.preventDefault();
        const allCriteriaMet = Object.values(passwordCriteria).every((criterion) => criterion);

        if (!allCriteriaMet) {
            setErrorMessage("Please meet all password criteria.");
            return;
        }

        if (!passwordsMatch) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        const token = searchParams.get("token");
        if (!token) {
            setErrorMessage("Invalid or missing token.");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.put(`${config.URL_CONNECT}/users/reset-password`, {
                token,
                newPassword,
            });

            if (response.status === 200) {
                setLoading(false);
                Swal.fire({
                    title: "Password Reset Successful!",
                    text: "You can now log in with your new password.",
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

        if (allValid) return null;

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
        <div className="reset-password-container">
            <form onSubmit={handlePasswordReset}>
                <div className="logo">Chat</div>
                <h2>Forget Password</h2>
                {errorMessage &&  <p className="error-message">{errorMessage}</p> }
                <div className="input-group-register">
                    <i className="bi bi-lock-fill input-icon"></i>
                    <input
                        type={showPassword ? "text" : "password"}
                        className={`register-password ${confirmPasswordTouched ? (passwordsMatch ? 'input-valid' : 'input-invalid') : ''}`}
                        name="password"
                        placeholder="Password"
                        value={newPassword}
                        onChange={handlePasswordChange}
                        onFocus={() => setShowPopover(true)}
                        onBlur={() => {
                            setShowConfirmPassword(false);
                            setPasswordsMatch(newPassword === confirmPassword);
                        }}
                        autoComplete="new-password"
                    />
                    <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="toggle-password"
                        type="button"
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
                        onChange={handleConfirmPasswordChange}
                        onFocus={() => setShowPopover(true)}
                        onBlur={() => {
                            setShowConfirmPassword(false);
                            setPasswordsMatch(newPassword === confirmPassword);
                        }}
                        autoComplete="new-password"
                    />
                    <button
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="toggle-password"
                        type="button"
                    >
                        {showConfirmPassword ? <i className="bi bi-eye-slash"></i> : <i className="bi bi-eye"></i>}
                    </button>
                </div>
                <button type="submit" disabled={loading} className="btn-reset-password">
                    {!loading ?
                        (<>
                            Reset Password
                        </>
                        ) : (<>
                            <i className="bi bi-arrow-clockwise spin-icon"></i>
                        </>)}
                </button>
            </form>
        </div>
    );
};

export default RestPassword;
