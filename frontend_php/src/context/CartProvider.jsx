import { useState, useEffect, useCallback, useMemo, useContext, createContext } from 'react';
import { AuthContext } from './AuthContext.js';

export const CartContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export function CartProvider({ children }) {
    const { user } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [notification, setNotification] = useState('');

    const loadProducts = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/products`);
            if (response.ok) {
                const data = await response.json();
                setProducts(data || []);
            }
        } catch (err) {
            console.error('Ошибка при загрузке каталога с сервера:', err);
        }
    }, []);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const fetchCloudCart = useCallback(async (userId) => {
        try {
            const response = await fetch(`${API_URL}/cart/${userId}`);
            if (response.ok) {
                const data = await response.json();
                setCart(data || []);
            }
        } catch (err) {
            console.error('Ошибка при получении корзины с бэкенда:', err);
        }
    }, []);

    useEffect(() => {
        const syncCartWithServer = async () => {
            if (!user) {
                const savedCart = localStorage.getItem('eco_cart');
                setCart(savedCart ? JSON.parse(savedCart) : []);
            } else {
                try {
                    const savedCart = localStorage.getItem('eco_cart');
                    const localItems = savedCart ? JSON.parse(savedCart) : [];

                    const response = await fetch(`${API_URL}/cart/${user.id}`);
                    const currentCloudCart = response.ok ? await response.json() : [];

                    const mergedCart = [...currentCloudCart];
                    for (const item of localItems) {
                        const exists = mergedCart.find(c => c.id === item.id);
                        if (exists) {
                            exists.quantity = (exists.quantity || 1) + (item.quantity || 1);
                        } else {
                            mergedCart.push(item);
                        }
                    }

                    await fetch(`${API_URL}/cart/${user.id}/sync`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(mergedCart.map(item => ({ id: item.id, quantity: item.quantity })))
                    });

                    localStorage.removeItem('eco_cart');
                } catch (syncError) {
                    console.error('Ошибка слияния корзин:', syncError);
                }
                await fetchCloudCart(user.id);
            }
        };

        syncCartWithServer();
    }, [user, fetchCloudCart]);

    useEffect(() => {
        if (!notification) return;
        const timer = setTimeout(() => setNotification(''), 3000);
        return () => clearTimeout(timer);
    }, [notification]);

    const handleAddProduct = useCallback(async (newProduct) => {
        try {
            const response = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProduct)
            });

            if (response.ok) {
                await loadProducts();
            }
        } catch (err) {
            console.error('Ошибка при создании товара на сервере:', err);
        }
    }, [loadProducts]);

    const handleUpdateProduct = useCallback(async (productId, updatedData) => {
        try {
            const response = await fetch(`${API_URL}/products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });

            if (response.ok) {
                setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updatedData } : p));
                setNotification('Изменения успешно сохранены в каталоге! 📝');
                await loadProducts(); 
                return true;
            }
        } catch (err) {
            console.error('Ошибка редактирования товара:', err);
        }
        return false;
    }, [API_URL, setNotification, loadProducts]);
    
    const handleAddToCart = useCallback(async (product) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find(item => item.id === product.id);
            let updated;

            if (existingItem) {
                updated = prevCart.map(item =>
                    item.id === product.id ? { ...item, quantity: (item.quantity || 1) + 1 } : item
                );
            } else {
                updated = [...prevCart, {
                    ...product,
                    cartItemId: "cart-item-" + Date.now() + Math.random().toString(36).slice(2, 6),
                    quantity: 1
                }];
            }

            if (!user) {
                localStorage.setItem('eco_cart', JSON.stringify(updated));
            } else {
                fetch(`${API_URL}/cart/${user.id}/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updated.map(item => ({ id: item.id, quantity: item.quantity })))
                }).catch(console.error);
            }
            return updated;
        });
        setNotification(`Товар «${product.name}» добавлен в корзину!`);
    }, [user]);

    const handleRemoveFromCart = useCallback(async (cartItemId) => {
        setCart((prevCart) => {
            const updated = prevCart.filter((item) => item.cartItemId !== cartItemId);

            if (!user) {
                localStorage.setItem('eco_cart', JSON.stringify(updated));
            } else {
                fetch(`${API_URL}/cart/${user.id}/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updated.map(item => ({ id: item.id, quantity: item.quantity })))
                }).catch(console.error);
            }
            return updated;
        });
    }, [user]);

    const handleClearCart = useCallback(async () => {
        setCart([]);
        if (!user) {
            localStorage.removeItem('eco_cart');
        } else {
            try {
                await fetch(`${API_URL}/cart/${user.id}/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify([])
                });
            } catch (err) {
                console.error('Ошибка при очистке корзины на сервере:', err);
            }
        }
    }, [user]);

// Orders
const handleCheckout = useCallback(async (orderData) => {
try {
    const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
});
    if (response.ok) {
        const result = await response.json();
        const savedUser = localStorage.getItem('app_user');
        if (savedUser) {
            localStorage.setItem('app_user', savedUser);
        }

        setCart([]); 
        localStorage.removeItem('eco_cart'); 
        
        setNotification('Заказ успешно оформлен! 🎉 Проверьте историю в личном кабинете.');
        return result;
    } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Ошибка при оформлении заказа');
    }
} catch (err) {
    console.error('Ошибка checkout:', err);
    throw err;
}
}, [API_URL, setCart, setNotification]);

const handleGetUserOrders = useCallback(async (userId) => {
    try {
        const response = await fetch(`${API_URL}/user/orders?userId=${userId}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (err) {
        console.error('Ошибка получения истории заказов:', err);
    }
    return [];
}, [API_URL]);

const handleCancelOrder = useCallback(async (orderId, userId) => {
    try {
        const response = await fetch(`${API_URL}/orders/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, userId })
        });

        if (response.ok) {
            setNotification('Заказ успешно отменен! ↩️');
            return true;
        } else {
            const errData = await response.json();
            setNotification(`Ошибка: ${errData.error} ⚠️`);
        }
    } catch (err) {
        console.error('Ошибка при отмене заказа:', err);
        setNotification('Сетевой сбой при отмене заказа ❌');
    }
    return false;
}, [API_URL, setNotification]);

// Reviews
const fetchReviews = useCallback(async (productId) => {
try {
    const response = await fetch(`${API_URL}/reviews?productId=${productId}`);
    if (response.ok) {
        return await response.json();
    }
} catch (err) {
    console.error("Ошибка загрузки отзывов с сервера:", err);
}
return [];
}, [API_URL]);

const handleAddReview = useCallback(async (reviewData) => {
    try {
        const response = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reviewData)
        });
        return response.ok;
    } catch (err) {
        console.error("Ошибка при отправке отзыва на сервер:", err);
        return false;
    }
}, [API_URL]);

const handleUpdateShopSettings = useCallback(async (userId, shopData) => {
    try {
        const response = await fetch(`${API_URL}/vendor/update-shop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, ...shopData })
        });

        if (response.ok) {
            const result = await response.json();
            
            const savedUser = localStorage.getItem('app_user');
            if (savedUser) {
                const currentUser = JSON.parse(savedUser);
                currentUser.shopName = result.shopName;
                currentUser.shopDescription = result.shopDescription;
                currentUser.shopAvatar = result.shopAvatar;
                localStorage.setItem('app_user', JSON.stringify(currentUser));
            }
            setNotification('Настройки эко-маркета успешно сохранены! 🏪✨');
            return true;
        }
    } catch (err) {
        console.error('Ошибка сохранения настроек маркета:', err);
    }
    return false;
}, [API_URL, setNotification]);

const handleDestroyProduct = useCallback(async (productId, userId) => {
    try {
        const response = await fetch(`${API_URL}/products/${productId}?userId=${userId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            setProducts(prev => prev.filter(p => p.id !== productId));
            setNotification('Товар успешно удален из каталога! 🗑️');
            return true;
        } else {
            const errData = await response.json();
            alert(`Ошибка удаления на сервере: ${errData.error}`);
        }
    } catch (err) {
        console.error('Ошибка удаления товара на бэкенде:', err);
    }
    return false;
}, [API_URL, setNotification, setProducts]);


const handleGetAllOrders = useCallback(async (role = 'admin', vendorId = 0) => {
    try {
        const response = await fetch(`${API_URL}/admin/orders?role=${role}&vendorId=${vendorId}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (err) {
        console.error('Ошибка получения списка заказов:', err);
    }
    return [];
}, [API_URL]);

const handleUpdateOrderStatus = useCallback(async (orderId, status) => {
    try {
        const response = await fetch(`${API_URL}/admin/update-order-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, status })
        });

        if (response.ok) {
            setNotification('Статус заказа успешно обновлен! 📦🚀');
            return true;
        }
    } catch (err) {
        console.error('Ошибка обновления статуса заказа:', err);
        setNotification('Сетевой сбой при обновлении статуса заказа ❌');
    }
    return false;
}, [API_URL, setNotification]);



    const value = useMemo(() => ({
        API_URL,
        products,
        cart,
        notification,
        setNotification,
        handleAddProduct, 
        handleAddToCart,
        handleRemoveFromCart,
        handleClearCart,
        handleCheckout,
        fetchReviews,
        handleAddReview,
        handleDestroyProduct,
        handleUpdateProduct,
        handleUpdateShopSettings,
        handleGetUserOrders,
        handleCancelOrder,
        handleGetAllOrders,
        handleUpdateOrderStatus 
    }), [API_URL,products, cart, notification, handleAddProduct, handleAddToCart, handleRemoveFromCart, handleClearCart, handleCheckout,fetchReviews,handleAddReview, handleDestroyProduct,handleUpdateProduct,handleUpdateShopSettings,handleGetUserOrders,handleCancelOrder,handleGetAllOrders,handleUpdateOrderStatus]);

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}