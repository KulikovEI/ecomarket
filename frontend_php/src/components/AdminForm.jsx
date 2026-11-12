import { memo, useState, useEffect, useContext, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import AdminUsers from '../components/AdminUsers.jsx';
import { AuthContext } from '../context/AuthContext.js';
import { CartContext } from '../context/CartProvider.jsx';
import '../styles/adminForm.css';

const AdminForm = memo(function AdminForm({ categories }) {

const { user } = useContext(AuthContext);

const { 
    handleAddProduct, 
    handleUpdateProduct, 
    handleGetAllOrders, 
    handleUpdateOrderStatus, 
    handleUpdateShopSettings,
    setNotification 
} = useContext(CartContext);


const [editId, setEditId] = useState(null);
const [activeTab, setActiveTab] = useState('products'); 

const [allOrders, setOrders] = useState([]);
const [loadingOrders, setLoadingOrders] = useState(false);

const availableCategories = useMemo(() => {
    return categories?.length > 1
        ? categories.filter(item => item !== 'Все')
        : ['Ванная', 'Кухня', 'Одежда', 'Дом', 'Стиль жизни'];
  }, [categories]);


const [sName, setSName] = useState(user?.shopName || '');
const [sDescription, setSDescription] = useState(user?.shopDescription || '');
const [sAvatar, setSAvatar] = useState(user?.shopAvatar || '/images/default-avatar.png');
const [isShopSuccess, setIsShopSuccess] = useState(false);


const [name, setName] = useState('');
const [category, setCategory] = useState(availableCategories[0]);
const [price, setPrice] = useState('');
const [discount, setDiscount] = useState('');
const [carbonFootprint, setCarbonFootprint] = useState('');
const [image, setImage] = useState('');
const [description, setDescription] = useState('');
const [isSuccess, setIsSuccess] = useState(false);

const [isNewCategoryMode, setIsNewCategoryMode] = useState(false);
const [newCategoryName, setNewCategoryName] = useState('');


const statusOptions = [
    { value: 'pending', text: 'В обработке ⏳' },
    { value: 'processing', text: 'Собирается 📦' },
    { value: 'shipped', text: 'В пути 🚚' },
    { value: 'delivered', text: 'Доставлен 🎉' },
    { value: 'cancelled', text: 'Отменен ↩️' }
];

const loadAllOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    const data = await handleGetAllOrders(user.role, user.id);
    setOrders(data || []);
    setLoadingOrders(false);
};

useEffect(() => {
    if (activeTab === 'orders' && user) {
        loadAllOrders();
}
}, [activeTab, user]);

useEffect(() => {
    const productToEdit = localStorage.getItem('edit_product');
    if (productToEdit) {
        const p = JSON.parse(productToEdit);
        setEditId(p.id);
        setName(p.name);
        setCategory(p.category);
        setPrice(p.oldPrice ? p.oldPrice : p.price); 
        setDiscount(p.discount || '');
        setCarbonFootprint(p.carbonFootprint);
        setImage(p.image);
        setDescription(p.description);
        localStorage.removeItem('edit_product');
    }
}, []);

const handleStatusChange = async (orderId, newStatus) => {
    const success = await handleUpdateOrderStatus(orderId, newStatus);
    if (success) {
        await loadAllOrders(); 
    }
};

useEffect(() => {
    if (availableCategories.length > 0 && !isNewCategoryMode) {
    setCategory(availableCategories[0]);
    }
}, [categories, isNewCategoryMode, availableCategories]);

useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(() => setIsSuccess(false), 3000);
    return () => clearTimeout(timer);
}, [isSuccess]);

const handleShopLogoChange = (e) => {
const file = e.target.files[0];
if (!file) return;

const reader = new FileReader();
reader.onloadend = () => {
    const img = new Image();
    img.src = reader.result;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 150; canvas.height = 150; 
        ctx.drawImage(img, 0, 0, 150, 150);
        const compressedLogo = canvas.toDataURL('image/jpeg', 0.8);
        setSAvatar(compressedLogo);
    };
};
reader.readAsDataURL(file);
};

 const handleProductImageUpload = (e) => {
    const file = e.target.files?.[0];
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
        const MAX_SIZE = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
            if (width > MAX_SIZE) {
                height = Math.round((height * MAX_SIZE) / width);
                width = MAX_SIZE;
            }
        } else {
            if (height > MAX_SIZE) {
                width = Math.round((width * MAX_SIZE) / height);
                height = MAX_SIZE;
            }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setImage(compressedBase64);
        setNotification('Фотография успешно загружена и сжата! 🖼️✨');
    };
};
reader.readAsDataURL(file);
};

const handleShopSubmit = async (e) => {
    e.preventDefault();
    if (!sName.trim()) return;
    
    const success = await handleUpdateShopSettings(user.id, {
        shopName: sName.trim(),
        shopDescription: sDescription.trim(),
        shopAvatar: sAvatar
    });
    if (success) {
        setIsShopSuccess(true);
        setTimeout(() => setIsShopSuccess(false), 3000);
    }
};

const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanImage = image.trim();
    const cleanDescription = description.trim();
    const numPrice = Number(price);
    const numDiscount = discount !== '' ? Number(discount) : null;
    const numCo2 = Number(carbonFootprint);
    const finalCategory = isNewCategoryMode ? newCategoryName.trim() : category;

    if (cleanName.length < 3 || cleanName.length > 100) {
        setNotification('Ошибка: Название товара должно быть от 3 до 100 символов! ⚠️');
        return;
    }

    if (!finalCategory || finalCategory.length < 3) {
        setNotification('Ошибка: Укажите корректную категорию товара! ⚠️');
        return;
    }

    if (!cleanImage || (!cleanImage.startsWith('/') && !cleanImage.startsWith('http') && !cleanImage.startsWith('data:image/'))) {
        setNotification('Ошибка: Укажите корректную ссылку на изображение (/images/... или https://)! ⚠️');
        return;
    }

    if (isNaN(numPrice) || numPrice < 10 || numPrice > 1000000) {
        setNotification('Ошибка: Цена товара должна быть от 10 до 1 000 000 ₽! ⚠️');
        return;
    }

    if (numDiscount !== null && (isNaN(numDiscount) || numDiscount < 1 || numDiscount > 90)) {
        setNotification('Ошибка: Скидка должна составлять от 1% до 90%! ⚠️');
        return;
    }

    if (carbonFootprint === '' || isNaN(numCo2) || numCo2 <= 0 || numCo2 > 500) {
        setNotification('Ошибка: CO₂ след должен быть больше 0 и не превышать 500 кг! ⚠️');
        return;
    }

    if (cleanDescription.length < 10) {
        setNotification('Ошибка: Описание товара должно содержать минимум 10 символов! ⚠️');
        return;
    }

    const productData = {
        name: cleanName,
        category: finalCategory,
        price: Math.round(numPrice),
        carbonFootprint: Number(numCo2.toFixed(2)),
        image: cleanImage,
        description: cleanDescription,
        discount: numDiscount !== null ? Math.round(numDiscount) : null,
        vendorId: user?.id  
    };

    if (editId) {
        const success = await handleUpdateProduct(editId, productData);
        if (success) {
            setIsSuccess(true);
            setEditId(null);
            setName(''); setPrice(''); setDiscount(''); setCarbonFootprint(''); setImage(''); setDescription('');
        }
    } else {
        await handleAddProduct(productData);
        setIsSuccess(true);
        setName(''); setPrice(''); setDiscount(''); setCarbonFootprint(''); setImage(''); setDescription('');
    }
};

return (
    <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-form-container"
        
    >
    <h2 className="admin-form-title">
        {user?.role === 'admin' ? 'Панель администратора 🛠️' : 'Панель продавца 🏪'}
    </h2>
    <p className="admin-form-subtitle">
        {user?.role === 'admin' 
            ? 'Управление эко-платформой маркетплейса' 
            : `Управление товарами эко-магазина "${user?.shopName || 'Eco-Vendor'}"`}
    </p>
    
        <div className="circular-categories-container">
        <button 
            type="button"
            className={`category-toggle-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
        >
            📦 Добавление товаров
        </button>
        
        <button 
            type="button"
            className={`category-toggle-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
        >
            🛒 Заказы покупателей
        </button>
        
        
        {user?.role === 'vendor' && (
            <button 
                type="button"
                className={`category-toggle-btn ${activeTab === 'shop-settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('shop-settings')}
            >
                🏪 Мой магазин
            </button>
        )}

        
        {user?.role === 'admin' && (
            <button 
                type="button"
                className={`category-toggle-btn ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
            >
                👥 Модерация продавцов
            </button>
        )}
    </div>

    {activeTab === 'products' && (
        <form onSubmit={handleSubmit} className="admin-form" noValidate>
            <AnimatePresence>
            {isSuccess && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="admin-form-success-badge"
                >
                    {editId ? 'Изменения успешно сохранены! 📝' : 'Товар успешно добавлен в каталог! 🍃'}
                </motion.div>
            )}
            </AnimatePresence>

            <div className="admin-form-input-group">
            <label className="admin-form-label">Название товара:</label>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Бамбуковая кружка"
                className="admin-form-input"
            />
            </div>

            <div className="admin-form-input-group">
                <div className="admin-image-label-row">
                    <label className="admin-form-label">Фотография товара (ссылка или файл):</label>
                    <label className="admin-upload-file-btn">
                        📁 Загрузить с устройства
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleProductImageUpload}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>

                <input
                    type="text"
                    value={image.startsWith('data:image/') ? '✅ Файл загружен с устройства' : image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="Ссылка на фото или файл выше ↑"
                    className="admin-form-input"
                />

                {image && (
                    <div className="admin-image-preview-box">
                        <img
                            src={image}
                            alt="Предпросмотр товара"
                            className="admin-image-preview-img"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setImage('')}
                            className="admin-clear-image-btn"
                            title="Очистить фото"
                        >
                            ✕ Убрать
                        </button>
                    </div>
                )}
              </div>

            <div className="admin-form-row">
            <div className="admin-form-input-group flex-1">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label className="admin-form-label" style={{ margin: 0 }}>Категория:</label>
                <button
                    type="button"
                    className="admin-toggle-cat-btn"
                    onClick={() => setIsNewCategoryMode(!isNewCategoryMode)}
                >
                    {isNewCategoryMode ? 'Выбрать из списка' : '+ Создать новую'}
                </button>
                </div>

                {isNewCategoryMode ? (
                    <motion.input
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Введите название новой категории..."
                        className="admin-form-input"
                    />
                ) : (
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="admin-form-select"
                    >
                    {availableCategories.map(item => (
                        <option key={item} value={item}>{item}</option>
                    ))}
                    </select>
                )}
            </div>
            </div>

        <div className="admin-form-row" style={{ display: 'flex', gap: '12px', marginBottom: '15px' }}>
        <div className="admin-form-input-group flex-1" style={{ flex: 1, textAlign: 'left' }}>
            <label className="admin-form-label">Обычная цена (₽):</label>
            <input
                type="number"
                min="10"
                max="1000000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="500"
                className="admin-form-input"
            />
        </div>

        <div className="admin-form-input-group flex-1" style={{ flex: 1, textAlign: 'left' }}>
            <label className="admin-form-label">Скидка (%):</label>
            <input
                type="number"
                min="1"
                max="90"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="Например: 20"
                className="admin-form-input"
            />
        </div>

        <div className="admin-form-input-group flex-1" style={{ flex: 1, textAlign: 'left' }}>
            <label className="admin-form-label">CO₂ след (кг):</label>
            <input
                type="number"
                step="0.01"
                min="0.01"
                max="500"
                value={carbonFootprint}
                onChange={(e) => setCarbonFootprint(e.target.value)}
                placeholder="0.25"
                className="admin-form-input"
            />
        </div>
        </div>

              <div className="admin-form-input-group" style={{ textAlign: 'left', marginBottom: '15px' }}>
                <label className="admin-form-label">Описание товара:</label>
                <textarea
                    rows="3"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Опишите экологические свойства продукта..."
                    className="admin-form-textarea"
                    style={{ width: '100%', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '10px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <button type="submit" className="admin-form-submit-btn" style={{ width: '100%' }}>
                {editId ? 'Сохранить изменения 📝' : 'Опубликовать товар'}
              </button>
            </form>
        )}

        {activeTab === 'orders' && (
            <div className="admin-orders-tab-zone">
                <h3 className="admin-orders-section-title">Менеджмент заказов покупателей 🧺</h3>
                
                {loadingOrders ? (
                    <p className="admin-orders-loading-text">Загрузка данных СУБД...</p>
                ) : allOrders.length === 0 ? (
                    <p className="admin-orders-empty-text">На платформе пока нет оформленных заказов. 🌾</p>
                ) : (
                    <div className="admin-orders-list-wrapper">
                        {allOrders.map(order => (
                            <div key={order.id} className="admin-order-management-card">

                                <div className="admin-order-management-header">
                                    <div className="admin-order-info-meta">
                                        <strong className="admin-order-number-lbl">Заказ №{order.id}</strong>
                                        <span className="admin-order-date-lbl">
                                            {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                                        </span>
                                    </div>
                                    
                                    <select 
                                        value={order.status} 
                                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                        className="admin-order-status-selector"
                                    >
                                        {statusOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.text}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="admin-order-customer-details">
                                    👤 <strong>Покупатель:</strong> {order.firstName} {order.lastName} ({order.email}) <br />
                                    📍 <strong>Доставка:</strong> {order.deliveryMethod === 'pickup' ? 'Пункт выдачи' : 'Курьер'} | {order.deliveryAddress}
                                </div>

                                <div className="admin-order-items-mini-list">
                                    {order.items?.map((item, idx) => (
                                        <div key={idx} className="admin-order-single-product-row">
                                            <span className="admin-order-item-name">
                                                • {item.name} <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>×&nbsp;{item.quantity}&nbsp;шт.</span>
                                            </span>
                                            <span className="admin-order-item-subtotal">{item.price * item.quantity} ₽</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="admin-order-management-footer">
                                    <span className="admin-order-total-co2">🌱 CO₂: {order.totalCo2} кг</span>
                                    <span className="admin-order-final-price">Сумма: {order.totalPrice} ₽</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'shop-settings' && user?.role === 'vendor' && (
            <form onSubmit={handleShopSubmit} className="vendor-shop-settings-form">
                <div className="vendor-shop-header-row">
                    <h4 className="vendor-shop-settings-title">⚙️ Настройки вашего эко-маркета</h4>
                    <Link 
                        to={`/shop/${user.id}`} 
                        className="vendor-open-storefront-btn"
                        title="Посмотреть, как витрину видят покупатели"
                    >
                        Открыть мою витрину ↗
                    </Link>
                </div>
                
                <div className="vendor-shop-avatar-container">
                    <label className="vendor-shop-logo-label" title="Нажмите, чтобы изменить логотип">
                        <img src={sAvatar} alt="Shop Logo" className="vendor-shop-logo-img" />
                        <div className="vendor-shop-logo-overlay">Изм.</div>
                        <input type="file" accept="image/*" onChange={handleShopLogoChange} style={{ display: 'none' }} />
                    </label>
                    
                    <div className="vendor-shop-inputs-wrap">
                        <div className="vendor-shop-field-group">
                            <label className="vendor-shop-field-label">Название магазина:</label>
                            <input 
                                type="text" 
                                placeholder="Официальное название магазина..." 
                                value={sName}
                                onChange={(e) => setSName(e.target.value)}
                                className="vendor-shop-name-input"
                                required
                            />
                        </div>

                        <div className="vendor-shop-field-group">
                            <label className="vendor-shop-field-label">Описание / манифест бренда:</label>
                            <textarea 
                                rows="3"
                                placeholder="Манифест бренда (например: Продукция из 100% органического хлопка...)" 
                                value={sDescription}
                                onChange={(e) => setSDescription(e.target.value)}
                                className="vendor-shop-desc-textarea"
                            />
                        </div>
                    </div>
                </div>
                
                <button type="submit" className="vendor-shop-save-btn">
                    {isShopSuccess ? 'Сохранено! 🏪✨' : 'Сохранить настройки магазина'}
                </button>
            </form>
        )}
        {activeTab === 'users' && user?.role === 'admin' && <AdminUsers />}
      </motion.div>
  );
});

export default AdminForm;