import { useState, useContext, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext.js';
import { CartContext } from '../context/CartProvider.jsx';
import '../styles/authModal.css';

export default function AuthModal({ onClose }) {

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
    const { login, register } = useContext(AuthContext);
    const { setNotification } = useContext(CartContext); 

    const [isSignUp, setIsSignUp] = useState(false);

    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '#e2e8f0' });

    const handlePhoneChange = (e) => {
        let input = e.target.value.replace(/\D/g, '');
        if (input.startsWith('7') || input.startsWith('8')) input = input.substring(1);
        let formatted = '';
        if (input.length > 0) formatted += '+7 (' + input.substring(0, 3);
        if (input.length > 3) formatted += ') ' + input.substring(3, 6);
        if (input.length > 6) formatted += '-' + input.substring(6, 8);
        if (input.length > 8) formatted += '-' + input.substring(8, 10);
        setPhone(formatted.substring(0, 18));
    };

    useEffect(() => {
        if (!password) { 
            setPasswordStrength({ score: 0, text: '', color: '#e2e8f0' }); 
            return; 
        }
        let score = 0;
        if (password.length >= 6) score++;
        if (/[A-Z]/.test(password) || /[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        if (score <= 1) setPasswordStrength({ score, text: 'Слабый ❌', color: '#ef4444' });
        else if (score === 2) setPasswordStrength({ score, text: 'Средний ⚠️', color: '#f57c00' });
        else setPasswordStrength({ score, text: 'Надежный 🔥', color: '#2d6a4f' });
    }, [password]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const cleanEmail = email.trim().toLowerCase();

        if (isSignUp) {
            if (password !== confirmPassword) { setError('Пароли не совпадают!'); return; }
            if (password.length < 6) { setError('Пароль слишком короткий!'); return; }
            if (firstName.trim().length < 3) {
                setError('Имя слишком короткое! Минимальная длина — 3 символа.'); 
                return; 
            }
            if (lastName.trim().length < 3) {
                setError('Фамилия слишком короткая! Минимальная длина — 3 символа.'); 
                return; 
            }
        }

        setLoading(true);

        try {
            if (isSignUp) {
                const result = await register(cleanEmail, password, firstName.trim(), lastName.trim(), phone);
                
                if (result && result.status === 'verification_required') {
                    setPendingEmail(result.email || cleanEmail);
                    setIsVerifying(true);
                    setNotification('Код подтверждения отправлен на вашу почту! 📧');
                    return;
                }

                if (result) {
                    setNotification('Регистрация успешна! 🌱 Добро пожаловать в EcoMarket.');
                    onClose();
                }
            } else {
                const success = await login(cleanEmail, password);
                if (success) {
                    setNotification('Рады видеть вас снова! 🔐 Вход выполнен успешно.');
                    onClose();
                }
            }
        } catch (err) {
            setError(err.message || 'Ошибка сервера.');
        } finally {
            setLoading(false);
        }
    };

     const handleVerifySubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const cleanCode = verificationCode.trim();
        if (cleanCode.length !== 6) {
            setError('Введите 6-значный код из письма!');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: pendingEmail, code: cleanCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Неверный код подтверждения.');
            }

            if (data.user) {
                localStorage.setItem('app_user', JSON.stringify(data.user));
                setNotification('Почта подтверждена! 🌱 Добро пожаловать в EcoMarket.');
                onClose();
                window.location.reload();
            }
        } catch (err) {
            setError(err.message || 'Неверный код подтверждения.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="auth-modal-content market-auth-card"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="market-auth-header">
                    <h2>
                        {isVerifying 
                            ? 'Подтверждение Email 📧' 
                            : isSignUp 
                                ? 'Регистрация профиля 🌱' 
                                : 'Вход в личный кабинет 🔐'}
                    </h2>
                    <p className="market-auth-subtitle">Экомаркет товаров без пластика</p>
                </div>

                {error && <div className="auth-error-badge">{error}</div>}

                {isVerifying ? (
                    <form onSubmit={handleVerifySubmit} className="auth-form market-form">
                        <p style={{ fontSize: '0.88rem', color: '#475569', textAlign: 'center', margin: '0 0 14px 0', lineHeight: '1.4' }}>
                            Мы отправили 6-значный код на адрес <br />
                            <strong style={{ color: '#1b4332' }}>{pendingEmail}</strong>
                        </p>

                        <div className="input-field-wrapper">
                            <label style={{ textAlign: 'center', display: 'block' }}>Код из письма *</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="000000"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                className="auth-input market-input"
                                style={{
                                    textAlign: 'center',
                                    fontSize: '1.6rem',
                                    fontWeight: '800',
                                    letterSpacing: '8px',
                                    padding: '12px'
                                }}
                                required
                                autoFocus
                            />
                        </div>

                        <button type="submit" disabled={loading} className="market-submit-btn">
                            {loading ? 'Проверка...' : 'Подтвердить и войти ✓'}
                        </button>

                        <p className="auth-toggle-text market-toggle-text">
                            Ошибся в адресе?
                            <span 
                                className="auth-link market-link" 
                                onClick={() => {
                                    setIsVerifying(false);
                                    setVerificationCode('');
                                    setError(null);
                                }}
                            >
                                {' '}Вернуться назад
                            </span>
                        </p>
                    </form>
                ) : (
                    <>
                        <form onSubmit={handleSubmit} className="auth-form market-form">
                            {isSignUp && (
                                <div className="admin-form-row" style={{ display: 'flex', gap: '12px', marginBottom: '0' }}>
                                    <div className="input-field-wrapper" style={{ flex: 1 }}>
                                        <label>Имя *</label>
                                        <input
                                            type="text"
                                            placeholder="Иван"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            className="auth-input market-input"
                                            minLength={3}
                                            required
                                        />
                                    </div>
                                    <div className="input-field-wrapper" style={{ flex: 1 }}>
                                        <label>Фамилия *</label>
                                        <input
                                            type="text"
                                            placeholder="Иванов"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            className="auth-input market-input"
                                            minLength={3}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="input-field-wrapper">
                                <label>Электронная почта *</label>
                                <input
                                    type="email"
                                    placeholder="example@mail.ru"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="auth-input market-input"
                                    required
                                />
                            </div>

                            {isSignUp && (
                                <div className="input-field-wrapper">
                                    <label>Номер телефона (опционально)</label>
                                    <input
                                        type="text"
                                        placeholder="+7 (999) 000-00-00"
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        className="auth-input market-input"
                                    />
                                </div>
                            )}

                            <div className="input-field-wrapper">
                                <label>Пароль *</label>
                                <div className="market-password-wrapper" style={{ position: 'relative', width: '100%' }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Минимум 6 символов"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="auth-input market-input"
                                        style={{ paddingRight: '46px', width: '100%', boxSizing: 'border-box' }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-svg-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://w3.org" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                        ) : (
                                            <svg xmlns="http://w3.org" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                        )}
                                    </button>
                                </div>

                                {isSignUp && password && (
                                    <div className="password-strength-meter" style={{ color: passwordStrength.color, textAlign: 'left' }}>
                                        Надежность: <strong>{passwordStrength.text}</strong>
                                        <div className="strength-bar-wrap">
                                            <div className="strength-bar-fill" style={{ width: `${(passwordStrength.score / 3) * 100}%`, backgroundColor: passwordStrength.color }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {isSignUp && (
                                <div className="input-field-wrapper">
                                    <label>Подтверждение пароля *</label>
                                    <div className="market-password-wrapper" style={{ position: 'relative', width: '100%' }}>
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Повторите пароль"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="auth-input market-input"
                                            style={{ paddingRight: '46px', width: '100%', boxSizing: 'border-box' }}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle-svg-btn"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            aria-label={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
                                        >
                                            {showConfirmPassword ? (
                                                <svg xmlns="http://w3.org" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                            ) : (
                                                <svg xmlns="http://w3.org" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button type="submit" disabled={loading} className="market-submit-btn">
                                {loading ? 'Секунду...' : isSignUp ? 'Создать аккаунт' : 'Войти'}
                            </button>
                        </form>

                        <p className="auth-toggle-text market-toggle-text">
                            {isSignUp ? 'Уже есть профиль?' : 'Впервые у нас?'}
                            <span className="auth-link market-link" onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError(null);
                                setPassword('');
                                setConfirmPassword('');
                            }}>
                                {isSignUp ? ' Войти' : ' Зарегистрироваться'}
                            </span>
                        </p>
                    </>
                )}
            </motion.div>
        </div>
    );
}