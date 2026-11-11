import { useMemo,useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext.js';
import { CartContext } from '../context/CartProvider.jsx';
import '../styles/productModal.css';

export default function ProductModal({ product, onClose }) {

    const { fetchReviews, handleAddReview, handleAddToCart } = useContext(CartContext);
    const { user } = useContext(AuthContext);

    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [hoveredRating, setHoveredRating] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const loadReviews = async () => {
        if (product?.id) {
            const data = await fetchReviews(product.id);
            setReviews(data || []);
        }
    };

    useEffect(() => {
        loadReviews();
    }, [product]);

    const averageRating = useMemo(() => {
        if (reviews.length === 0) return 0;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        return (sum / reviews.length).toFixed(1);
    }, [reviews]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reviewText.trim()) return;

        setSubmitting(true);
        const reviewData = {
            productId: product.id,
            userId: user.id,
            rating: rating,
            text: reviewText.trim()
        };

        const success = await handleAddReview(reviewData);
        if (success) {
            setReviewText('');
            setRating(5);
            loadReviews(); 
        } else {
            alert('Ошибка при публикации отзыва');
        }
        setSubmitting(false);
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="product-detail-card"
                onClick={(e) => e.stopPropagation()}
            >
                <button className="close-modal-x-btn" onClick={onClose}>✖</button>

                <div className="product-modal-layout">

                        <div className="product-modal-image-zone">
                            <img src={product.image} alt={product.name} />
                        </div>

                        <div className="product-modal-info-zone">
                            <div className="modal-category-vendor-row">
                                <span className="product-category">{product.category}</span>
                                <span className="product-vendor-badge">
                                <img 
                                    src={product.shopAvatar || '/images/default-avatar.png'} 
                                    alt={product.shopName} 
                                    className="product-vendor-avatar"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/images/default-avatar.png'; 
                                    }}
                                />
                                МАГАЗИН: {product.shopName || 'EcoMarket'}
                            </span>
                           </div>

                            <h2>{product.name}</h2>

                            {product.shopDescription && (
                                <div className="vendor-modal-manifest-card">
                                    <div className="vendor-manifest-title">
                                        🌱 Описание бренда «{product.shopName}»:
                                    </div>
                                    <p className="vendor-manifest-text">
                                        "{product.shopDescription}"
                                    </p>
                                </div>
                            )}

                            <div className="modal-rating-summary">
                                <span className="rating-star-icon">⭐</span>
                                <strong>{averageRating > 0 ? averageRating : 'Нет оценок'}</strong>
                                <span className="reviews-count-label">({reviews.length} отзывов)</span>
                            </div>

                            <p className="product-modal-description">{product.description}</p>

                            <div className="product-modal-meta-row">
                                <div className="modal-price-wrap">
                                    <span className="product-price">{product.price} ₽</span>
                                </div>
                                <span className="co2-badge" style={{ backgroundColor: product.carbonFootprint <= 0.1 ? '#2e7d32' : '#f57c00' }}>
                                    CO₂: {product.carbonFootprint} кг
                                </span>
                            </div>

                            <button 
                                className="addBtn" 
                                style={{ marginTop: '15px' }}
                                onClick={() => handleAddToCart(product)}
                            >
                                Добавить в корзину 🛒
                            </button>

                        <div className="product-reviews-section">
                            <h3>Отзывы покупателей 💬</h3>

                            {user ? (
                                <form onSubmit={handleSubmit} className="add-review-form">
                                    <div className="rating-selector-stars">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <span
                                                key={star}
                                                className={`star-clickable ${ (hoveredRating || rating) >= star ? 'filled' : '' }`}
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoveredRating(star)}
                                                onMouseLeave={() => setHoveredRating(0)}
                                            >
                                                ★
                                            </span>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input className='input'
                                            type="text" 
                                            placeholder="Впечатления о товаре..."
                                            value={reviewText}
                                            onChange={(e) => setReviewText(e.target.value)}
                                            required
                                        />
                                        <button type="submit" disabled={submitting}>
                                            {submitting ? '...' : '➔'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <p className="login-to-review-notice">Войдите в аккаунт, чтобы оставить отзыв.</p>
                            )}

                            <div className="reviews-scroll-container">
                                {reviews.length === 0 ? (
                                    <p className="no-reviews-yet">Будьте первым, кто оставит отзыв к этому эко-товару! 🌱</p>
                                ) : (
                                    reviews.map((rev) => (
                                        <div key={rev.id} className="user-review-item">
                                            <div className="review-item-header">
                                                <div className="review-author-wrap">
                                                    <div className="review-author-avatar">
                                                        <img src={rev.avatar || '/images/default-avatar.png'} alt="" />
                                                    </div>
                                                    <strong>{rev.firstName}</strong>
                                                </div>
                                                <span className="review-item-stars">{'★'.repeat(rev.rating)}</span>
                                            </div>
                                            <p>{rev.text}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}