import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext.js';
import { CartContext } from '../context/CartProvider.jsx';
import '../styles/profile.css'; 

export default function Profile() {

    const navigate = useNavigate();
    const fileInputRef = useRef(null); 
    
    const { handleGetUserOrders, handleCancelOrder, setNotification } = useContext(CartContext);
    const { user, logout, updateAvatar } = useContext(AuthContext);

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmingOrderId, setConfirmingOrderId] = useState(null);
    
    const statusMap = {
        pending: { text: 'В обработке ⏳', color: '#f57c00', bg: '#fff3e0' },
        processing: { text: 'Собирается 📦', color: '#0288d1', bg: '#e1f5fe' },
        shipped: { text: 'В пути 🚚', color: '#7b1fa2', bg: '#f3e5f5' },
        delivered: { text: 'Доставлен 🎉', color: '#2e7d32', bg: '#e8f5e9' },
        cancelled: { text: 'Отменен ↩️', color: '#ef4444', bg: '#fee2e2' } 
    };

    const loadOrdersData = async () => {
        if (!user?.id) return;
        setLoading(true);
        const data = await handleGetUserOrders(user.id);
        setOrders(data || []);
        setLoading(false);
    };

    useEffect(() => {
        if (!user) { 
            navigate('/');
            return; 
        }
        loadOrdersData();
    }, [user, navigate, handleGetUserOrders]);

    const onCancelClick = async (orderId) => {
        if (confirmingOrderId !== orderId) {
            setConfirmingOrderId(orderId);
            setNotification(`Внимание: нажмите кнопку еще раз для подтверждения отмены! ⚠️`);
            
            setTimeout(() => setConfirmingOrderId(null), 4000);
        } else {
            const success = await handleCancelOrder(orderId, user.id);
            setConfirmingOrderId(null);
            if (success) {
                await loadOrdersData(); 
            }
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setNotification('Ошибка: Выберите файл изображения (PNG, JPG, WEBP)! ⚠️');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.src = reader.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 150;
                canvas.height = 150;
                ctx.drawImage(img, 0, 0, 150, 150);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                updateAvatar(user.id, compressedBase64); 
            };
        };
        reader.readAsDataURL(file);
    };

    if (!user) return null;
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="profile-page-container"
        >
            <div className="profile-layout">
    
                <div className="profile-info-card">
                    <div className="profile-user-header">     
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                        />
                        <div 
                            className="profile-avatar-circle animate-avatar" 
                            onClick={() => fileInputRef.current.click()} 
                            title="Нажмите, чтобы загрузить фото с компьютера"
                            style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                        >
                            <img 
                                src={user.avatar || '/images/default-avatar.png'} 
                                alt="Аватар" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                            <div className="avatar-edit-overlay">
                                <svg xmlns="http://w3.org" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                            </div>
                        </div>
                        <div className="profile-user-title">
                            <h3>{user.firstName || 'Пользователь'}</h3>
                            <span className="profile-user-role">
                                {user.role === 'admin' 
                                    ? 'Администратор 🛠️' 
                                    : user.role === 'vendor' 
                                        ? 'Продавец 🏪' 
                                        : 'Эко-клиент 🍃'}
                            </span>
                        </div>
                    </div>
                        <div className="profile-data-fields">
                            <div className="profile-field-item"><span className="profile-summary-label">Имя:</span> <strong>{user.firstName}</strong></div>
                            <div className="profile-field-item"><span className="profile-summary-label">Фамилия:</span> <strong>{user.lastName}</strong></div>
                            <div className="profile-field-item"><span className="profile-summary-label">Email:</span> <strong>{user.email}</strong></div>
                            <div className="profile-field-item"><span className="profile-summary-label">Телефон:</span> <strong>{user.phone || 'Не указан'}</strong></div>
                        </div>

                        <button onClick={() => { logout(); navigate('/'); }} className="profile-logout-btn">
                            Выйти из аккаунта
                        </button>
                </div>

                <div className="profile-orders-zone">
                    <h2 className="profile-orders-title">История заказов 📦</h2>

                    {loading ? (
                        <div className="orders-loading-text">Загрузка истории покупок...</div>
                    ) : orders.length === 0 ? (
                        <div className="profile-orders-empty">
                            Вы еще не оформили ни одного заказа. <br /> Самое время сделать планету чище! 🍃
                        </div>
                    ) : (
                         <div className="profile-orders-list">
                            {orders.map((order) => {
                                const currentStatus = statusMap[order.status] || { text: order.status, color: '#64748b', bg: '#f1f5f9' };
                                const isThisConfirming = confirmingOrderId === order.id;
                                return (
                                    <div key={order.id} className="profile-order-card">
                                        
                                        <div className="order-card-header">
                                            <div>
                                                <span className="profile-order-num">Заказ №{order.id}</span>
                                                <span className="profile-order-date">
                                                    {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                                                </span>
                                            </div>
                                            <span 
                                                className="profile-order-status-badge"
                                                style={{ color: currentStatus.color, backgroundColor: currentStatus.bg }}
                                            >
                                                {currentStatus.text}
                                            </span>
                                        </div>

                                          {order.items && order.items.length > 0 && (
                                            <div className="profile-order-items-mini-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #f1f5f9', borderBottom: '1px dashed #e2e8f0', padding: '10px 0', margin: '8px 0', width: '100%' }}>
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                                                        <img 
                                                            src={item.image || '/images/default-product.png'} 
                                                            alt="" 
                                                        />
                                                        
                                                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <strong style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 'bold', display: 'block' }}>
                                                                {item.name || 'Эко-товар 🌾'}
                                                            </strong>
                                                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                                {item.quantity} шт. × {item.price} ₽
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="profile-order-delivery-details">
                                            📍 <strong>Получение:</strong> {order.deliveryMethod === 'pickup' ? 'Пункт выдачи' : 'Доставка курьером'} <br />
                                            🏠 <strong>Адрес:</strong> {order.deliveryAddress}
                                        </div>

                                        <div className="profile-order-footer">
                                            <span className="profile-order-eco-gain">
                                                🌱 Сохранено: {order.totalCo2} кг CO₂
                                            </span>
                                            <strong className="profile-order-total-price">
                                                Сумма: {order.totalPrice} ₽
                                            </strong>
                                        </div>

                                        {order.status === 'pending' && (
                                            <button
                                                onClick={() => onCancelClick(order.id)}
                                                className="order-cancel-btn"
                                            >
                                                {isThisConfirming ? 'Точно отменить заказ? Нажмите еще раз! ❌' : 'Отменить заказ ↩️'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}