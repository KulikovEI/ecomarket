import { useState, useContext } from 'react';
import { motion} from 'framer-motion';
import { CartContext } from '../context/CartProvider.jsx';
import { AuthContext } from '../context/AuthContext.js';
import '../styles/checkoutModal.css';

export default function CheckoutModal({ onClose, totalPrice, totalCo2, cartItems }) {
    const { handleCheckout } = useContext(CartContext);
    const { user } = useContext(AuthContext);

    const [deliveryMethod, setDeliveryMethod] = useState('pickup'); 
    const [address, setDeliveryAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const pickupPoints = [
        'г. Москва, ул. Ленина, д. 10 (Эко-ПВЗ №1) 🍃',
        'г. Москва, пр-кт Вернадского, д. 42 (Центральный хаб) 📦',
        'г. Санкт-Петербург, ул. Зеленая, д. 5 (Зеленая точка) 🌱'
    ];

    const [selectedPickup, setSelectedPickup] = useState(pickupPoints[0]);

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        setError('');

        if (!user) {
            setError('Для оформления заказа необходимо войти в аккаунт!');
            return;
        }

        const finalAddress = deliveryMethod === 'pickup' ? selectedPickup : address.trim();

        if (deliveryMethod === 'courier' && !finalAddress) {
            setError('Пожалуйста, укажите адрес доставки курьером.');
            return;
        }

        setLoading(true);

        const orderData = {
            userId: user.id,
            items: cartItems,
            totalPrice: totalPrice,
            totalCo2: Number(totalCo2),
            deliveryMethod: deliveryMethod,
            deliveryAddress: finalAddress
        };

        try {
            await handleCheckout(orderData);
            onClose();
        } catch (err) {
            setError(err.message || 'Ошибка сервера при создании заказа.');
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
                className="checkout-card" 
                onClick={(e) => e.stopPropagation()}
>
                <div className="market-auth-header">
                    <h2>Оформление эко-заказа 🛒</h2>
                    <p className="market-auth-subtitle">Выберите способ получения и подтвердите покупку</p>
                </div>

                {error && <div className="auth-error-badge">{error}</div>}

                <form onSubmit={handleSubmitOrder} className="market-form">
                
                    <div className="input-field-wrapper">
                        <label>Способ получения</label>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                            <button
                                type="button"
                                className={`category-toggle-btn ${deliveryMethod === 'pickup' ? 'active' : ''}`}
                                style={{ flex: 1, padding: '10px' }}
                                onClick={() => setDeliveryMethod('pickup')}
                            >
                                🏪 Пункт выдачи
                            </button>
                            <button
                                type="button"
                                className={`category-toggle-btn ${deliveryMethod === 'courier' ? 'active' : ''}`}
                                style={{ flex: 1, padding: '10px' }}
                                onClick={() => setDeliveryMethod('courier')}
                            >
                                🚗 Доставка курьером
                            </button>
                        </div>
                    </div>

                    <div className="input-field-wrapper">
                        <label>Адрес получения *</label>
                        {deliveryMethod === 'pickup' ? (
                            <select
                                className="checkout-select" 
                                value={selectedPickup}
                                onChange={(e) => setSelectedPickup(e.target.value)}
                            >
                                {pickupPoints.map((point) => (
                                    <option key={point} value={point}>{point}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder="Укажите город, улицу, дом, квартиру"
                                value={address}
                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                className="auth-input market-input"
                                required
                            />
                        )}
                    </div>

                    <div className="checkout-summary-box">
                        <div className="checkout-summary-row">
                            <span className="checkout-summary-label">Итого к оплате:</span>
                            <strong className="checkout-summary-price">{totalPrice} ₽</strong>
                        </div>
                        <div className="checkout-summary-row">
                            <span className="checkout-summary-label">Будет нейтрализовано:</span>
                            <strong className="checkout-summary-co2">{totalCo2} кг CO₂</strong>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="market-submit-btn">
                        {loading ? 'Секунду, отправляем заказ...' : 'Подтвердить заказ'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}