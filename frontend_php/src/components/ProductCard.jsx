import { memo, useCallback, useContext, useState } from 'react'; 
import { motion, AnimatePresence } from 'framer-motion'; 
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.js';
import { CartContext } from '../context/CartProvider.jsx';
import ProductModal from './ProductModal'; 
import '../styles/productCard.css';

const imageVariants = {
  hover: { scale: 1.05 }
};

const getFootprintColor = (co2) => {
  if (co2 <= 0.1) return '#2e7d32';
  if (co2 <= 0.5) return '#f57c00';
  return '#c62828';
};

const ProductCard = memo(function ProductCard({ product, index, hideDelete = false }) {

  const { user } = useContext(AuthContext); 

  const { handleAddToCart, handleDestroyProduct, setNotification } = useContext(CartContext); 
  
  const canDelete = user?.role === 'admin' || (user?.role === 'vendor' && product.vendorId === user.id);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);

  const handleAddToCartClick = useCallback((e) => {
    
    e.stopPropagation(); 
    if (product) {
      handleAddToCart(product);
    }
  }, [product, handleAddToCart]);

  const handleDeleteProduct = async (e) => {
    e.stopPropagation(); 
    if (!user?.id) return;

    if (!isConfirming) {
        setIsConfirming(true);
        setNotification(`Подтвердите удаление товара "${product.name}" ⚠️`);
        setTimeout(() => setIsConfirming(false), 4000);
    } else {
        const success = await handleDestroyProduct(product.id, user.id);
        if (success) {
            setIsConfirming(false);
        } else {
            setIsConfirming(false);
            setNotification('Ошибка: не удалось удалить товар с сервера ❌');
        }
    }
  };

  const discountPercent = product.oldPrice
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;

  return (
      <>
       <motion.div
            className="product-card"
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, delay: index * 0.04 }}
            whileHover={{ 
                y: -4,
                boxShadow: "0 12px 30px rgba(148, 163, 184, 0.16)"
            }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setIsModalOpen(true)} 
        >
          <div className="product-image-wrap">
            {discountPercent > 0 && (
                <span className="product-discount-tag">-{discountPercent}%</span>
            )}
            <motion.img
                src={product.image}
                alt={product.name}
                className="product-real-image"
                variants={imageVariants}
                transition={{ duration: 0.3 }}
            />
          </div>

          <div className="product-info">
            
           <div className="product-text-content">

                 <div className="product-card-meta-row">
                    <span className="product-category" title={product.category}>
                        {product.category}
                    </span>
                    
                    <Link 
                        to={`/shop/${product.vendorId || 1}`}
                        onClick={(e) => e.stopPropagation()}
                        className="product-vendor-badge product-vendor-link"
                        title={`Перейти на витрину магазина «${product.shopName || 'EcoMarket'}»`}
                    >
                        <img 
                            src={product.shopAvatar || '/images/default-avatar.png'} 
                            alt={product.shopName} 
                            className="product-vendor-avatar"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/images/default-avatar.png';
                            }}
                        />
                        <span className="product-vendor-name">{product.shopName || 'EcoMarket'}</span>
                    </Link>
                </div>
                <h3>{product.name}</h3>
                <p className="product-description">{product.description}</p>
             </div>

            <div className="product-footer-container">
              <div className="product-metrics-row">
                <div className="price-block">
                  {product.oldPrice && (
                      <span className="product-old-price">{product.oldPrice} ₽</span>
                  )}
                  <span className="product-price">{product.price} ₽</span>
                </div>
                <div
                    className="co2-badge"
                    style={{ backgroundColor: getFootprintColor(product.carbonFootprint) }}
                    title="Углеродный след продукта"
                >
                  CO₂: {product.carbonFootprint} кг
                </div>
              </div>
              <motion.button
                  className="addBtn"
                  whileHover={{
                    backgroundColor: '#1b4332',
                    scale: 1.02,
                    boxShadow: "0 4px 10px rgba(45, 106, 79, 0.2)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCartClick}
              >
                Купить 🛒
              </motion.button>
                 {canDelete && !hideDelete && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            localStorage.setItem('edit_product', JSON.stringify(product));
                            window.location.href = '/admin'; 
                        }} 
                        className="role-toggle-btn to-vendor"
                        style={{ marginTop: '8px', width: '100%', padding: '6px', fontSize: '0.8rem', textAlign: 'center' }}
                    >
                        Редактировать ⚙️
                    </button>
                )}
                {canDelete && !hideDelete && (
                    <button 
                        onClick={handleDeleteProduct} 
                        className="cart-delete-btn"
                        style={{ 
                            marginTop: '8px', 
                            width: '100%', 
                            padding: '6px', 
                            fontSize: '0.8rem', 
                            background: isConfirming ? '#ef4444' : '#fee2e2', 
                            color: isConfirming ? '#ffffff' : '#ef4444', 
                            border: 'none', 
                            borderRadius: '8px', 
                            fontWeight: 'bold', 
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isConfirming ? 'Точно удалить? Нажмите еще раз! ❌' : 'Удалить товар 🗑️'}
                    </button>
                )}
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
            {isModalOpen && (
                <ProductModal 
                    product={product} 
                    onClose={(e) => {
                        e.stopPropagation(); 
                        setIsModalOpen(false);
                    }} 
                />
            )}
        </AnimatePresence>
      </>
  );
});

export default ProductCard;