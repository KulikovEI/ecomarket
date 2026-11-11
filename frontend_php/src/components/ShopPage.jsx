import { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CartContext } from '../context/CartProvider.jsx';
import ProductCard from './ProductCard.jsx';
import '../styles/shopPage.css';

export default function ShopPage() {
    const { vendorId } = useParams();
    const navigate = useNavigate();
    const { products } = useContext(CartContext);

    const [shopInfo, setShopInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const fetchShopData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/shop?vendorId=${vendorId}`);
                if (res.ok) {
                    const data = await res.json();
                    setShopInfo(data);
                } else {
                    setShopInfo(null);
                }
            } catch (err) {
                console.error('Ошибка загрузки витрины магазина:', err);
            } finally {
                setLoading(false);
            }
        };

        if (vendorId) {
            fetchShopData();
        }
    }, [vendorId, API_URL]);

    const shopProducts = useMemo(() => {
        return (products || []).filter(p => Number(p.vendorId) === Number(vendorId));
    }, [products, vendorId]);

    if (loading) {
        return <div className="shop-page-status">Загрузка витрины магазина... 🍃</div>;
    }

    if (!shopInfo) {
        return (
            <div className="shop-page-status">
                <p>Магазин не найден или был закрыт. 🌾</p>
                <button onClick={() => navigate('/')} className="shop-back-btn">
                    ← Вернуться на главную витрину
                </button>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="shop-page-container"
        >
            <button onClick={() => navigate(-1)} className="shop-back-btn">
                ← Назад
            </button>

            <div className="shop-brand-banner">
                <img
                    src={shopInfo.shopAvatar || '/images/default-avatar.png'}
                    alt={shopInfo.shopName}
                    className="shop-brand-avatar"
                />
                <div className="shop-brand-details">
                    <div className="shop-brand-title-row">
                        <h1 className="shop-brand-name">{shopInfo.shopName}</h1>
                        <span className="shop-verified-badge">Проверенный эко-бренд ✓</span>
                    </div>
                    <p className="shop-brand-manifest">{shopInfo.shopDescription}</p>
                    <div className="shop-brand-stats">
                        <span>📦 Товаров в каталоге: <strong>{shopProducts.length}</strong></span>
                    </div>
                </div>
            </div>

            <div className="shop-products-section">
                <h2 className="shop-products-heading">Ассортимент бренда</h2>
                {shopProducts.length === 0 ? (
                    <div className="shop-empty-catalog">
                        У этого продавца пока нет опубликованных товаров. 🌿
                    </div>
                ) : (
                    <div className="products-grid">
                        {shopProducts.map((product, index) => (
                            <ProductCard key={product.id} product={product} index={index} />
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}