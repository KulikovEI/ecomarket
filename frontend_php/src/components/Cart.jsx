import { memo, useMemo,useState,useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CartContext } from '../context/CartProvider.jsx';
import CheckoutModal from '../components/CheckoutModal.jsx';
import '../styles/cart.css';

const Cart = memo(function Cart() {

    const navigate = useNavigate();
    const { cart: cartItems, handleRemoveFromCart, handleClearCart } = useContext(CartContext);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    const { totalPrice, totalCo2, totalItemsCount } = useMemo(() => {
        let price = 0;
        let co2 = 0;
        let count = 0;

        cartItems.forEach((item) => {
            const currentQty = item.quantity || 1;
            price += item.price * currentQty;
            co2 += Number(item.carbonFootprint || 0) * currentQty;
            count += currentQty;
        });

        return {
            totalPrice: price,
            totalCo2: co2.toFixed(2),
            totalItemsCount: count
        };
    }, [cartItems]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="cart-page-container"
        >
            <h2 className="cart-main-title">Ваша корзина 🛒</h2>
            <AnimatePresence>
                {isCheckoutOpen && (
                    <CheckoutModal
                        onClose={() => setIsCheckoutOpen(false)}
                        totalPrice={totalPrice}
                        totalCo2={totalCo2}
                        cartItems={cartItems}
                    />
                )}
            </AnimatePresence>

            {cartItems.length === 0 ? (
                <div className="cart-empty-state">
                    <p className="cart-empty-text">В корзине пока ничего нет.</p>
                    <button className="tab-btn active" onClick={() => navigate('/')}>
                        Перейти к покупкам
                    </button>
                </div>
            ) : (
                <div className="cart-layout">
                    <div className="cart-items-list">
                        <AnimatePresence mode="popLayout">
                            {cartItems.map((item) => (
                                <motion.div
                                    key={item.cartItemId}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.2 } }}
                                    className="cart-item-row"
                                >
                                    <div className="cart-img-wrapper">
                                        <img src={item.image} alt={item.name} className="product-real-image" />
                                    </div>
                                    <div className="cart-item-main-info">
                                        <span className="product-category">{item.category}</span>
                                        <h3>{item.name}</h3>
                                        <p className="product-description">{item.description}</p>
                                        <div className="cart-item-quantity-badge">
                                            Количество: <strong>{item.quantity || 1} шт.</strong>
                                            {item.quantity > 1 && ` (${item.price} ₽ / шт.)`}
                                        </div>
                                    </div>
                                    <div className="cart-item-meta-zone">
                                        <span className="product-price">
                                            {item.price * (item.quantity || 1)} ₽
                                        </span>
                                        <span className="co2-badge" style={{ backgroundColor: Number(item.carbonFootprint) <= 0.1 ? '#2e7d32' : '#f57c00' }}>
                                            CO₂: {(Number(item.carbonFootprint) * (item.quantity || 1)).toFixed(2)} кг
                                        </span>

                                        <button
                                            onClick={() => handleRemoveFromCart(item.cartItemId)}
                                            className="cart-delete-btn"
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    <div className="cart-summary-card">
                        <h3 className="cart-summary-title">Сводка экологичности</h3>
                        <div className="cart-summary-row">
                            <span>Всего эко-товаров:</span>
                            <strong>{totalItemsCount} шт.</strong>
                        </div>
                        <div className="cart-summary-row">
                            <span>Общий углеродный след:</span>
                            <strong className="cart-summary-co2-value">{totalCo2} кг CO₂</strong>
                        </div>
                        <div className="cart-summary-row">
                            <span className="cart-summary-total-label">Итого к оплате:</span>
                            <strong className="cart-summary-total-price">{totalPrice} ₽</strong>
                        </div>

                        <button className="cart-checkout-btn" onClick={() => setIsCheckoutOpen(true)}>
                            Оформить заказ
                        </button>

                        <button className="cart-clear-link" onClick={handleClearCart}>
                            Очистить корзину полностью
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
});

export default Cart;