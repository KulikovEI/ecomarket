import { useState, useEffect, useContext } from 'react';
import { CartContext } from '../context/CartProvider.jsx';
import '../styles/adminUsers.css'; 

export default function AdminUsers() {

    const { API_URL, setNotification } = useContext(CartContext);
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);

    const [shopNames, setShopNames] = useState({});

    const loadUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/admin/users`);
            if (response.ok) {
                const data = await response.json();
                setUsersList(data || []);
            }
        } catch (err) {
            console.error('Ошибка загрузки пользователей:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleShopNameChange = (userId, value) => {
        setShopNames(prev => ({ ...prev, [userId]: value }));
    };

    const handleToggleVendor = async (targetUser) => {
        const isCurrentlyVendor = targetUser.role === 'vendor';
        
        const inputShopName = shopNames[targetUser.id]?.trim() || '';

        if (!isCurrentlyVendor && !inputShopName) {
            setNotification(`Ошибка: введите название магазина для пользователя ${targetUser.firstName}! ⚠️`);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/admin/update-role`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUserId: targetUser.id,
                    role: isCurrentlyVendor ? 'client' : 'vendor',
                    shopName: isCurrentlyVendor ? null : inputShopName
                })
            });

            if (response.ok) {
                setShopNames(prev => {
                    const updated = { ...prev };
                    delete updated[targetUser.id];
                    return updated;
                });
                setNotification(isCurrentlyVendor ? 'Права продавца отозваны ↩' : 'Новый продавец успешно одобрен! 🌱');
                loadUsers(); 
            }
        } catch (err) {
            console.error('Ошибка изменения роли:', err);
        }
    };

    if (loading) return <div className="admin-users-loading">Загрузка списка пользователей...</div>;

    return (
        <div className="admin-users-card">
            <h3>Управление партнерами и продавцами 👥</h3>
            <div className="table-responsive-wrapper">
                <table className="admin-users-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Пользователь</th>
                            <th>Email</th>
                            <th>Текущий статус</th>
                            <th>Название магазина</th>
                            <th style={{ textAlign: 'center' }}>Действие</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usersList.filter(u => u.role !== 'admin').map((u) => (
                            <tr key={u.id}>
                                <td className="user-id-cell">#{u.id}</td>
                                <td className="user-name-cell">{u.firstName} {u.lastName}</td>
                                <td className="user-email-cell">{u.email}</td>
                                <td>
                                    <span className={`status-badge ${u.role === 'vendor' ? 'vendor' : 'client'}`}>
                                        {u.role === 'vendor' ? 'Продавец 🏪' : 'Покупатель 👤'}
                                    </span>
                                </td>
                                <td className="user-shop-cell" style={{ minWidth: '200px', textAlign:"center" }}>
                                    {u.role === 'vendor' ? (
                                        <strong>{u.shopName}</strong>
                                    ) : (
                                        <input 
                                            type="text"
                                            placeholder="Название магазина..."
                                            value={shopNames[u.id] || ''}
                                            onChange={(e) => handleShopNameChange(u.id, e.target.value)}
                                            style={{
                                                padding: '4px 8px',
                                                border: '1.5px solid #cbd5e1',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                width: '100%',
                                                maxWidth: '200 px',
                                                outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    )}
                                </td>
                                <td className="action-cell" style={{ textAlign: 'left' }}>
                                    <button 
                                        onClick={() => handleToggleVendor(u)}
                                        className={`role-toggle-btn ${u.role === 'vendor' ? 'to-client' : 'to-vendor'}`}
                                    >
                                        {u.role === 'vendor' ? 'Забрать права' : 'Сделать продавцом'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}