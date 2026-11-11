import { useState, useMemo, useContext } from 'react';
import { Routes, Route, NavLink, Link, Navigate, useNavigate } from 'react-router-dom'; 
import { motion,AnimatePresence } from 'framer-motion';

import ProductCard from './components/ProductCard';
import AdminForm from './components/AdminForm';
import Cart from './components/Cart';
import Footer from './components/Footer';
import Notification from './components/Notifications';
import AuthModal from './components/AuthModal';
import Profile from './components/Profile';
import ShopPage from './components/ShopPage';

import { CartContext } from './context/CartProvider.jsx';
import { AuthContext } from './context/AuthContext.js';
import './App.css';

export default function App() {
    
    const navigate = useNavigate();

    const [isAuthOpen, setIsAuthOpen] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState('Все');
    const [searchQuery, setSearchQuery] = useState('');

    const [sortBy, setSortBy] = useState('default'); 
    const [onlyDiscount, setOnlyDiscount] = useState(false);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });

    const { products, cart, notification } = useContext(CartContext);
    const { user, logout } = useContext(AuthContext);

   const isSeller = user?.role === 'admin' || user?.role === 'vendor'; 

    const categories = useMemo(() => {
        return ['Все', ...new Set(products.map(p => p.category))];
    }, [products]);

    const totalCartItemsCount = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    }, [cart]);

    const filteredProducts = useMemo(() => {
    const currentProducts = products || [];

    // 1. Фильтрация по категории, поиску, скидке и диапазону цен
    const filtered = currentProducts.filter(p => {
        const matchesCategory = selectedCategory === 'Все' || p.category === selectedCategory;
        
        const matchesSearch = 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesDiscount = !onlyDiscount || (p.oldPrice !== null && p.oldPrice > 0);

        const minPrice = priceRange.min !== '' ? Number(priceRange.min) : 0;
        const maxPrice = priceRange.max !== '' ? Number(priceRange.max) : Infinity;
        const matchesPrice = p.price >= minPrice && p.price <= maxPrice;

        return matchesCategory && matchesSearch && matchesDiscount && matchesPrice;
    });

    // 2. Сортировка отфильтрованного списка (создаём копию массива через [...filtered])
    return [...filtered].sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'co2-asc') return Number(a.carbonFootprint) - Number(b.carbonFootprint);
        if (sortBy === 'discount-desc') return (b.discount || 0) - (a.discount || 0);
        return 0; // По умолчанию (порядок из БД)
    });
    }, [products, selectedCategory, searchQuery, onlyDiscount, priceRange, sortBy]);

    const resetFilters = () => {
        setSelectedCategory('Все');
        setSearchQuery('');
        setSortBy('default');
        setOnlyDiscount(false);
        setPriceRange({ min: '', max: '' });
    };

    return (
        <div className="app-container">
            <AnimatePresence>
                {notification && <Notification message={notification} />}
            </AnimatePresence>
            <AnimatePresence>
                {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
            </AnimatePresence>

            <div className="top-notice-bar">
                <span>🔥 Эко-распродажа 9.9 началась! Получите скидки на товары до 90%</span>
                <div className="top-notice-links">
                     <span>Режим работы: 24/7</span>
                </div>
            </div>

            <div className="content-wrap">
                <div className="eco-header">
                    <div className="eco-logo-zone">
                        <Link to="/" style={{ textDecoration: 'none' }}>
                            <h1 className="eco-logo">EcoMarket</h1>
                        </Link>
                    </div>

                    <div className="eco-search-bar">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Найдите товар вашей эко-мечты..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="eco-nav-actions">
                        <NavLink to="/" className="tab-btn">🍃 Витрина</NavLink>
                        {isSeller && <NavLink to="/admin" className="tab-btn admin-nav-btn">🛠️ Панель управления</NavLink>}
                        <NavLink to="/cart" className="tab-btn cart-action">
                            🛒 <span className="cart-count-badge">{totalCartItemsCount}</span>
                        </NavLink>

                       {user ? (
                            <div className="auth-profile-block">
                                <Link 
                                    to="/profile" 
                                    className="tab-btn" 
                                >
                                    <div style={{ 
                                        width: '28px', 
                                        height: '28px', 
                                        borderRadius: '50%', 
                                        overflow: 'hidden', 
                                        border: '1.5px solid #2d6a4f',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#f8fafc'
                                    }}>
                                        <img 
                                            src={user.avatar || '/images/default-avatar.png'} 
                                            alt="Профиль" 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                        />
                                    </div>
                                    <span style={{ fontWeight: 700 }}>{user.firstName}</span>
                                </Link>
                                <button 
                                onClick={() => {
                                    navigate('/', { replace: true }); 
                                    setTimeout(() => {
                                        logout(); 
                                    }, 50); 
                                }} 
                                className="logout-action-btn"
                            >
                                Выйти 🚪
                            </button>
                            </div>
                        ) : (
                            <button onClick={() => setIsAuthOpen(true)} className="login-action-btn">Войти 🔐</button>
                        )}
                    </div>
                </div>
                
                <Routes>
                    <Route path="/" element={
                                         <div className="showcase-page">
                                            <div className="eco-hero-slider">
                                                <div className="hero-slider-text">
                                                    <h2 className="hero-slider-title">Здоровый выбор<br />С эко-скидками 9.9</h2>
                                                    <div className="hero-slider-badge-row">
                                                        <div className="green-percent-badge">90%</div>
                                                        <p className="hero-slider-sub">На все эко-товары!<br /><small>Действует до 10 сентября 2026 г.</small></p>
                                                    </div>
                                                    <button
                                                        className="hero-slider-btn"
                                                        onClick={() => {
                                                            const saleSection = document.querySelector('.discount-sale-section');
                                                            if (saleSection) {
                                                                saleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                            }
                                                        }}
                                                    >
                                                        Купить сейчас ➔
                                                    </button>
                                                </div>
                                                <div className="hero-slider-graphic">
                                                    <div className="mascot-avatar-wrap">
                                                        <img 
                                                            src="/images/eco-label.png" 
                                                            alt="Маскот EcoMarket" 
                                                            className="hero-mascot-img" 
                                                        />
                                                    </div>
                                               </div>
                                                <div className="slider-dots-indicator">
                                                    <span className="dot active"></span>
                                                    <span className="dot"></span>
                                                    <span className="dot"></span>
                                                </div>
                                            </div>
                                           
                                             {products.filter(p => p.oldPrice).length > 0 && (
                                                 <section className="homepage-section discount-sale-section">
                                                     <div className="section-header-zone">
                                                         <h3 className="section-main-title">Green Sale 9.9 ⚡</h3>
                                                      <span 
                                                        className="view-all-link" 
                                                        onClick={() => {
                                                            setOnlyDiscount(true);
                                                            const gridSection = document.querySelector('.catalog-filters-panel');
                                                            if (gridSection) {
                                                                gridSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                            }
                                                        }}
                                                    >
                                                        Показать все
                                                    </span>
                                                    </div>

                                                    <div className="discount-horizontal-scroll">
                                                        {products.filter(p => p.oldPrice).map((product, index) => (
                                                            <div className="discount-scroll-item" key={product.id}>
                                                                {/* ИСПРАВЛЕНО: Добавлен флаг hideDelete строго для слайдера скидок */}
                                                                <ProductCard product={product} index={index} hideDelete={true} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                 </section>
                                             )}
                                             <section className="homepage-section">
                                                <div className="section-header-zone">
                                                    <h3 className="section-main-title">Категории для вас</h3>
                                                </div>
                                                <div className="circular-categories-container">
                                                    {[
                                                        { name: 'Показать все', match: 'Все', icon: '🍃' },
                                                        { name: 'Личная гигиена', match: 'Ванная', icon: '🧴' },
                                                        { name: 'Кухня и эко-быт', match: 'Кухня', icon: '🪵' },
                                                        { name: 'Одежда из хлопка', match: 'Одежда', icon: '🥦' },
                                                        { name: 'Уютный дом', match: 'Дом', icon: '📦' },
                                                        { name: 'Стиль жизни', match: 'Стиль жизни', icon: '🍹' }
                                                    ].map((cat, i) => (
                                                        <div
                                                            key={i}
                                                            className={`circle-category-item ${selectedCategory === cat.match ? 'active' : ''}`}
                                                            onClick={() => {
                                                                setSelectedCategory(cat.match);
                                                                setSearchQuery('');
                                                            }}
                                                        >
                                                            <div className="circle-icon-wrap">{cat.icon}</div>
                                                            <span>{cat.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                            <section className="homepage-section" style={{ marginBottom: '60px' }}>
                                                <div className="section-header-zone">
                                                    <h3 className="section-main-title">
                                                        Зеленая витрина {selectedCategory !== 'Все' && `› ${selectedCategory}`}
                                                    </h3>
                                                    <span className="catalog-found-count">Найдено: {filteredProducts.length} шт.</span>
                                                </div>

                                                {/* ПАНЕЛЬ УМНОЙ ФИЛЬТРАЦИИ И СОРТИРОВКИ */}
                                                <div className="catalog-filters-panel">
                                                    <div className="filter-control-group">
                                                        <label className="filter-label">Сортировка:</label>
                                                        <select 
                                                            value={sortBy} 
                                                            onChange={(e) => setSortBy(e.target.value)}
                                                            className="filter-select"
                                                        >
                                                            <option value="default">По популярности</option>
                                                            <option value="price-asc">Сначала дешевле 📉</option>
                                                            <option value="price-desc">Сначала дороже 📈</option>
                                                            <option value="co2-asc">Минимальный CO₂ след 🌱</option>
                                                            <option value="discount-desc">По размеру скидки 🔥</option>
                                                        </select>
                                                    </div>

                                                    <div className="filter-control-group">
                                                        <label className="filter-label">Цена (₽):</label>
                                                        <div className="price-range-inputs">
                                                            <input 
                                                                type="number" 
                                                                min="0"
                                                                placeholder="От" 
                                                                value={priceRange.min}
                                                                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                                                                className="price-range-field"
                                                            />
                                                            <span className="price-range-dash">—</span>
                                                            <input 
                                                                type="number" 
                                                                min="0"
                                                                placeholder="До" 
                                                                value={priceRange.max}
                                                                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                                                                className="price-range-field"
                                                            />
                                                        </div>
                                                    </div>

                                                    <label className="discount-checkbox-label">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={onlyDiscount}
                                                            onChange={(e) => setOnlyDiscount(e.target.checked)}
                                                            className="discount-checkbox-input"
                                                        />
                                                        <span>Только со скидкой 🏷️</span>
                                                    </label>

                                                    {(sortBy !== 'default' || onlyDiscount || priceRange.min !== '' || priceRange.max !== '' || selectedCategory !== 'Все' || searchQuery !== '') && (
                                                        <button type="button" onClick={resetFilters} className="reset-filters-btn">
                                                            Сбросить ✕
                                                        </button>
                                                    )}
                                                </div>

                                                <main className="products-grid" style={{ position: 'relative' }}>
                                                    <AnimatePresence mode="popLayout">
                                                        {filteredProducts.length > 0 ? (
                                                            filteredProducts.map((product, index) => (
                                                                <ProductCard key={product.id} product={product} index={index} />
                                                            ))
                                                        ) : (
                                                            <motion.div 
                                                                key="no-products"
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                className="catalog-empty-state"
                                                                style={{ gridColumn: '1 / -1' }}
                                                            >
                                                                <p>Товары по заданным параметрам не найдены. 🌾</p>
                                                                <button type="button" onClick={resetFilters} className="reset-filters-btn">
                                                                    Сбросить фильтры
                                                                </button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </main>
                                            </section>
                                        </div>
                                    } />
                     {isSeller && <Route path="/admin" element={<AdminForm categories={categories} />} />}
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/shop/:vendorId" element={<ShopPage />} />
                </Routes>
            </div>
            <Footer />
        </div>
    );
}