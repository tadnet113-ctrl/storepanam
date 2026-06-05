// ==================== api.js - Service API pour Spring Boot Backend ====================

// Configuration de l'API
const API_CONFIG = {
    // URL de base (à adapter selon l'environnement)
    baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8080/api'
        : 'https://api.lepaname.com/api',
    
    version: 'v1',
    timeout: 30000,
    
    // Headers par défaut
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// Clés de stockage localStorage
const STORAGE_KEYS = {
    TOKEN: 'paname_auth_token',
    USER: 'paname_user',
    CART: 'paname_cart',
    WISHLIST: 'paname_wishlist',
    ORDERS: 'paname_orders',
    SESSION: 'paname_session'
};

// ==================== UTILITAIRES ====================

function getAuthToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function showApiNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.log(`[API] ${type.toUpperCase()}: ${message}`);
        return;
    }
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    const icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'exclamation-circle' : 'info-circle');
    notification.innerHTML = `<i class="fas fa-${icon}"></i><div><strong>${type === 'success' ? 'Succès' : 'Erreur'}</strong><p style="font-size:0.75rem;">${message}</p></div><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;"><i class="fas fa-times"></i></button>`;
    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => { notification.classList.remove('show'); setTimeout(() => notification.remove(), 300); }, 5000);
}

async function handleApiResponse(response) {
    if (!response.ok) {
        let errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {}
        
        if (response.status === 401) {
            showApiNotification('Session expirée. Veuillez vous reconnecter.', 'error');
            logout();
        } else if (response.status === 403) {
            showApiNotification('Accès non autorisé.', 'error');
        } else {
            showApiNotification(errorMessage, 'error');
        }
        throw new Error(errorMessage);
    }
    
    if (response.status === 204) return null;
    return response.json();
}

async function apiRequest(endpoint, options = {}) {
    const url = `${API_CONFIG.baseUrl}/${API_CONFIG.version}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...API_CONFIG.headers,
                ...getAuthHeaders(),
                ...options.headers
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return handleApiResponse(response);
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            showApiNotification('La requête a expiré. Veuillez réessayer.', 'error');
            throw new Error('Request timeout');
        }
        showApiNotification(`Erreur de connexion: ${error.message}`, 'error');
        throw error;
    }
}

// ==================== AUTHENTIFICATION ====================

async function login(email, password) {
    try {
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (response.token) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
            showApiNotification('Connexion réussie !', 'success');
            return response;
        }
        throw new Error('Email ou mot de passe incorrect');
    } catch (error) {
        showApiNotification(error.message, 'error');
        throw error;
    }
}

async function register(userData) {
    try {
        const response = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (response.token) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
            showApiNotification('Inscription réussie !', 'success');
            return response;
        }
        return response;
    } catch (error) {
        showApiNotification(error.message, 'error');
        throw error;
    }
}

async function logout() {
    try {
        await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    showApiNotification('Déconnexion réussie', 'success');
    setTimeout(() => window.location.reload(), 1500);
}

function getCurrentUser() {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
}

function isAuthenticated() {
    return !!getAuthToken();
}

function isAdmin() {
    const user = getCurrentUser();
    return user && (user.role === 'ADMIN' || user.role === 'ROLE_ADMIN');
}

// ==================== PRODUITS ====================

async function getAllProducts(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.category) queryParams.append('category', params.category);
    if (params.search) queryParams.append('search', params.search);
    
    const endpoint = `/products${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return apiRequest(endpoint);
}

async function getProductById(id) {
    return apiRequest(`/products/${id}`);
}

async function getProductsByCategory(category) {
    return apiRequest(`/products/category/${category}`);
}

async function searchProducts(query) {
    return apiRequest(`/products/search?q=${encodeURIComponent(query)}`);
}

async function getPromoProducts() {
    return apiRequest('/products/promo');
}

async function getNewProducts() {
    return apiRequest('/products/new');
}

async function getCategories() {
    return apiRequest('/products/categories');
}

// ==================== PANIER ====================

let cachedCart = null;

async function getCart() {
    try {
        if (isAuthenticated()) {
            cachedCart = await apiRequest('/cart');
            return cachedCart;
        } else {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '{"items":[], "total":0}');
        }
    } catch (error) {
        console.warn('Erreur API, utilisation du localStorage:', error);
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '{"items":[], "total":0}');
    }
}

async function addToCart(productId, quantity = 1) {
    try {
        if (isAuthenticated()) {
            const response = await apiRequest('/cart/add', {
                method: 'POST',
                body: JSON.stringify({ productId, quantity })
            });
            await syncCart();
            return response;
        } else {
            const cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '{"items":[], "total":0}');
            const existingItem = cart.items.find(item => item.productId === productId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.items.push({ productId, quantity });
            }
            cart.total = cart.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
            localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
            showApiNotification('Produit ajouté au panier (mode hors ligne)', 'success');
            return cart;
        }
    } catch (error) {
        console.warn('Erreur API:', error);
        const cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '{"items":[], "total":0}');
        const existingItem = cart.items.find(item => item.productId === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({ productId, quantity });
        }
        localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
        showApiNotification('Produit ajouté au panier (mode hors ligne)', 'success');
        return cart;
    }
}

async function updateCartItem(productId, quantity) {
    try {
        if (isAuthenticated()) {
            const response = await apiRequest(`/cart/update/${productId}`, {
                method: 'PUT',
                body: JSON.stringify({ quantity })
            });
            await syncCart();
            return response;
        } else {
            const cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '{"items":[], "total":0}');
            const item = cart.items.find(item => item.productId === productId);
            if (item) {
                if (quantity <= 0) {
                    cart.items = cart.items.filter(item => item.productId !== productId);
                } else {
                    item.quantity = quantity;
                }
            }
            localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
            return cart;
        }
    } catch (error) {
        console.warn('Erreur API:', error);
        throw error;
    }
}

async function removeFromCart(productId) {
    try {
        if (isAuthenticated()) {
            const response = await apiRequest(`/cart/remove/${productId}`, {
                method: 'DELETE'
            });
            await syncCart();
            return response;
        } else {
            const cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '{"items":[], "total":0}');
            cart.items = cart.items.filter(item => item.productId !== productId);
            localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
            showApiNotification('Produit retiré du panier', 'success');
            return cart;
        }
    } catch (error) {
        console.warn('Erreur API:', error);
        throw error;
    }
}

async function clearCart() {
    try {
        if (isAuthenticated()) {
            const response = await apiRequest('/cart/clear', { method: 'DELETE' });
            await syncCart();
            return response;
        } else {
            localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify({ items: [], total: 0 }));
            return { items: [], total: 0 };
        }
    } catch (error) {
        console.warn('Erreur API:', error);
        throw error;
    }
}

async function syncCart() {
    if (isAuthenticated()) {
        const localCart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '{"items":[]}');
        if (localCart.items.length > 0) {
            for (const item of localCart.items) {
                await addToCart(item.productId, item.quantity);
            }
            localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify({ items: [], total: 0 }));
        }
        const serverCart = await getCart();
        return serverCart;
    }
    return null;
}

// ==================== COMMANDES ====================

async function createOrder(orderData) {
    return apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
    });
}

async function getOrders() {
    return apiRequest('/orders');
}

async function getOrderById(id) {
    return apiRequest(`/orders/${id}`);
}

async function cancelOrder(id) {
    return apiRequest(`/orders/${id}/cancel`, { method: 'POST' });
}

async function getOrderStatus(id) {
    return apiRequest(`/orders/${id}/status`);
}

// ==================== LISTE DE SOUHAITS ====================

async function getWishlist() {
    try {
        if (isAuthenticated()) {
            return await apiRequest('/wishlist');
        } else {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.WISHLIST) || '[]');
        }
    } catch (error) {
        console.warn('Erreur API, utilisation du localStorage:', error);
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.WISHLIST) || '[]');
    }
}

async function addToWishlist(productId) {
    try {
        if (isAuthenticated()) {
            return await apiRequest('/wishlist/add', {
                method: 'POST',
                body: JSON.stringify({ productId })
            });
        } else {
            const wishlist = JSON.parse(localStorage.getItem(STORAGE_KEYS.WISHLIST) || '[]');
            if (!wishlist.includes(productId)) {
                wishlist.push(productId);
                localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlist));
            }
            return wishlist;
        }
    } catch (error) {
        console.warn('Erreur API:', error);
        const wishlist = JSON.parse(localStorage.getItem(STORAGE_KEYS.WISHLIST) || '[]');
        if (!wishlist.includes(productId)) {
            wishlist.push(productId);
            localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlist));
        }
        return wishlist;
    }
}

async function removeFromWishlist(productId) {
    try {
        if (isAuthenticated()) {
            return await apiRequest(`/wishlist/remove/${productId}`, { method: 'DELETE' });
        } else {
            const wishlist = JSON.parse(localStorage.getItem(STORAGE_KEYS.WISHLIST) || '[]');
            const newWishlist = wishlist.filter(id => id !== productId);
            localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(newWishlist));
            return newWishlist;
        }
    } catch (error) {
        console.warn('Erreur API:', error);
        throw error;
    }
}

// ==================== UTILISATEURS (Admin) ====================

async function getAllUsers() {
    return apiRequest('/admin/users');
}

async function getUserById(id) {
    return apiRequest(`/admin/users/${id}`);
}

async function updateUser(id, userData) {
    return apiRequest(`/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
    });
}

async function deleteUser(id) {
    return apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
}

async function getProfile() {
    return apiRequest('/user/profile');
}

async function updateProfile(profileData) {
    const response = await apiRequest('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
    });
    if (response.user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
    }
    return response;
}

// ==================== PAIEMENTS ====================

async function createPaymentIntent(paymentData) {
    return apiRequest('/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify(paymentData)
    });
}

async function confirmPayment(paymentIntentId) {
    return apiRequest(`/payments/confirm/${paymentIntentId}`, { method: 'POST' });
}

async function getPaymentMethods() {
    return apiRequest('/payments/methods');
}

// ==================== CONTACT & NEWSLETTER ====================

async function sendContactMessage(messageData) {
    return apiRequest('/contact', {
        method: 'POST',
        body: JSON.stringify(messageData)
    });
}

async function subscribeNewsletter(email) {
    return apiRequest('/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email })
    });
}

// ==================== SERVICES (Wedding, Event, etc.) ====================

async function requestQuote(quoteData) {
    return apiRequest('/services/quote', {
        method: 'POST',
        body: JSON.stringify(quoteData)
    });
}

async function getServices() {
    return apiRequest('/services');
}

async function getTestimonials() {
    return apiRequest('/testimonials');
}

// ==================== ADMIN PRODUITS ====================

async function createProduct(productData) {
    const formData = new FormData();
    for (const key in productData) {
        if (productData[key] !== undefined && productData[key] !== null) {
            formData.append(key, productData[key]);
        }
    }
    return apiRequest('/admin/products', {
        method: 'POST',
        headers: {},
        body: formData
    });
}

async function updateProduct(id, productData) {
    const formData = new FormData();
    for (const key in productData) {
        if (productData[key] !== undefined && productData[key] !== null) {
            formData.append(key, productData[key]);
        }
    }
    return apiRequest(`/admin/products/${id}`, {
        method: 'PUT',
        headers: {},
        body: formData
    });
}

async function deleteProduct(id) {
    return apiRequest(`/admin/products/${id}`, { method: 'DELETE' });
}

async function updateStock(id, stock) {
    return apiRequest(`/admin/products/${id}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ stock })
    });
}

// ==================== EXPORT ====================

window.API = {
    // Auth
    login, register, logout, getCurrentUser, isAuthenticated, isAdmin,
    // Products
    getAllProducts, getProductById, getProductsByCategory, searchProducts, getPromoProducts, getNewProducts, getCategories,
    // Cart
    getCart, addToCart, updateCartItem, removeFromCart, clearCart, syncCart,
    // Orders
    createOrder, getOrders, getOrderById, cancelOrder, getOrderStatus,
    // Wishlist
    getWishlist, addToWishlist, removeFromWishlist,
    // Users
    getAllUsers, getUserById, updateUser, deleteUser, getProfile, updateProfile,
    // Payments
    createPaymentIntent, confirmPayment, getPaymentMethods,
    // Contact
    sendContactMessage, subscribeNewsletter,
    // Services
    requestQuote, getServices, getTestimonials,
    // Admin Products
    createProduct, updateProduct, deleteProduct, updateStock,
    // Config
    config: API_CONFIG,
    storageKeys: STORAGE_KEYS
};

console.log('📡 API Service prêt - Connexion au backend Spring Boot');
console.log('🔗 URL de l\'API:', API_CONFIG.baseUrl);