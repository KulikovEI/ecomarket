import { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export function AuthProvider({ children }) {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSavedUser = () => {
            try {
                const savedUser = localStorage.getItem('app_user');
                if (savedUser) {
                    setUser(JSON.parse(savedUser));
                }
            } catch (error) {
                console.error("Ошибка при восстановлении сессии:", error);
            } finally {
                setLoading(false);
            }
        };
        checkSavedUser();
    }, []);

    const login = async (email, password) => {
        if (!email || !password) {
            throw new Error("Заполните все поля");
        }
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Неверный Email или пароль');
            }

            const realUser = await response.json();
            setUser(realUser);
            localStorage.setItem('app_user', JSON.stringify(realUser));
            return true;
        } catch (error) {
            console.error("Ошибка сервера при авторизации:", error);
            throw error;
        }
    };

    const register = async (email, password, firstName, lastName, phone) => {
    if (!email || !password || !firstName || !lastName) {
        throw new Error("Пожалуйста, заполните все обязательные поля");
    }

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, firstName, lastName, phone }), 
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка при регистрации');
        }

        if (data.status === 'verification_required') {
            return data; 
        }

        setUser(data);
        localStorage.setItem('app_user', JSON.stringify(data));
        return true;
    } catch (error) {
        console.error("Ошибка при регистрации:", error);
        throw error;
    }
};

const verifyEmail = async (email, code) => {
    if (!email || !code || code.length < 6) {
        throw new Error("Введите 6-значный код из письма");
    }

    try {
        const response = await fetch(`${API_URL}/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Неверный код подтверждения');
        }

        if (data.user) {
            setUser(data.user);
            localStorage.setItem('app_user', JSON.stringify(data.user));
            return true;
        }
        return false;
    } catch (error) {
        console.error("Ошибка при проверке кода:", error);
        throw error;
    }
};


    const logout = async () => {
        setUser(null);
        localStorage.removeItem('app_user');
        localStorage.removeItem('eco_cart');
    };

    const updateAvatar = async (userId, avatarUrl) => {
    try {
        const response = await fetch(`${API_URL}/user/update-avatar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, avatar: avatarUrl })
        });

        if (response.ok) {
            const updatedUser = { ...user, avatar: avatarUrl };
            setUser(updatedUser);
            localStorage.setItem('app_user', JSON.stringify(updatedUser));
            return true;
        }
    } catch (err) {
        console.error("Не удалось сохранить аватар:", err);
    }
    return false;
};

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout,updateAvatar }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}