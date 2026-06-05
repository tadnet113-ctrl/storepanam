// ==================== cart.js - Gestion complète du panier d'achat ====================

// État du panier
let cartState = {
    items: [],
    subtotal: 0,
    total: 0,
    count: 0,
    deliveryFee: 0,
    discount: 0,
    promoCode: null,
    loading: false
};

// Écouteurs d'événements du panier
const cartListeners = [];

// ==================== ÉCOUTEURS ====================

function addCartListener(callback) {
    if (typeof callback === 'function') {
        cartListeners.push(callback);
    }
}

function removeCartListener(callback) {
    const index = cartListeners.indexOf(callback);
    if (index > -1) cartListeners.splice(index, 1);
}

function notifyCartListeners() {
    cartListeners.forEach(callback => {
        try {
            callback(cartState);
        } catch (e) {
            console.error('Erreur dans listener cart:', e);
        }
    });
}

// ==================== CHARGEMENT ====================

async function loadCart() {
    cartState.loading = true;
    notifyCartListeners();
    
    try {
        let cartData;
        
        // Chargement depuis l'API ou localStorage
        if (window.API && window.API.isAuthenticated && window.API.isAuthenticated()) {
            cartData = await window.API.getCart();
        } else {
            cartData = loadCartFromLocal();
        }
        
        if (cartData && cartData.items) {
            cartState.items = cartData.items;
            calculateTotals();
        } else {
            cartState.items = [];
            calculateTotals();
        }
        
        cartState.loading = false;
        notifyCartListeners();
        updateCartUI();
        
        return cartState;
    } catch (error) {
        console.error('Erreur chargement panier:', error);
        cartState.items = loadCartFromLocal().items || [];
        calculateTotals();
        cartState.loading = false;
        notifyCartListeners();
        return cartState;
    }
}

function loadCartFromLocal() {
    const savedCart = localStorage.getItem('paname_cart');
    if (savedCart) {
        try {
            return JSON.parse(savedCart);
        } catch (e) {
            return { items: [], total: 0 };
        }
    }
    return { items: [], total: 0 };
}

function saveCartToLocal() {
    localStorage.setItem('paname_cart', JSON.stringify({
        items: cartState.items,
        total: cartState.total
    }));
}

// ==================== CALCULS ====================

function calculateTotals() {
    // Sous-total
    cartState.subtotal = cartState.items.reduce((sum, item) => {
        const price = item.price || item.productPrice || 0;
        const quantity = item.quantity || 1;
        return sum + (price * quantity);
    }, 0);
    
    // Nombre d'articles
    cartState.count = cartState.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    // Frais de livraison (gratuit dès 5000 Fcfa)
    cartState.deliveryFee = cartState.subtotal >= 5000 ? 0 : 1500;
    
    // Application de la réduction
    let afterDiscount = cartState.subtotal - cartState.discount;
    if (afterDiscount < 0) afterDiscount = 0;
    
    // Total
    cartState.total = afterDiscount + cartState.deliveryFee;
    
    saveCartToLocal();
}

// ==================== AJOUT AU PANIER ====================

async function addToCart(product, quantity = 1) {
    cartState.loading = true;
    notifyCartListeners();
    
    try {
        const productId = product.id || product.productId;
        const productName = product.name || product.productName;
        const productPrice = product.price || product.productPrice || 0;
        
        // Vérifier si le produit existe déjà
        const existingItem = cartState.items.find(item => 
            (item.id === productId || item.productId === productId)
        );
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cartState.items.push({
                id: productId,
                productId: productId,
                name: productName,
                price: productPrice,
                quantity: quantity,
                image: product.image || null,
                category: product.category || null
            });
        }
        
        calculateTotals();
        
        // Synchronisation avec l'API si connecté
        if (window.API && window.API.isAuthenticated && window.API.isAuthenticated()) {
            try {
                await window.API.addToCart(productId, quantity);
            } catch (e) {
                console.warn('Erreur synchro API:', e);
            }
        }
        
        cartState.loading = false;
        notifyCartListeners();
        updateCartUI();
        
        Utils.showNotification(`${productName} ajouté au panier`, 'success');
        return { success: true, cart: cartState };
    } catch (error) {
        cartState.loading = false;
        notifyCartListeners();
        Utils.showNotification('Erreur lors de l\'ajout au panier', 'error');
        return { success: false, error: error.message };
    }
}

// ==================== MISE À JOUR QUANTITÉ ====================

async function updateQuantity(productId, quantity) {
    cartState.loading = true;
    notifyCartListeners();
    
    try {
        const item = cartState.items.find(item => 
            item.id === productId || item.productId === productId
        );
        
        if (item) {
            if (quantity <= 0) {
                // Supprimer l'article
                cartState.items = cartState.items.filter(i => 
                    (i.id !== productId && i.productId !== productId)
                );
                Utils.showNotification(`${item.name} retiré du panier`, 'success');
            } else {
                item.quantity = quantity;
            }
            
            calculateTotals();
            
            // Synchronisation avec l'API
            if (window.API && window.API.isAuthenticated && window.API.isAuthenticated()) {
                try {
                    await window.API.updateCartItem(productId, quantity);
                } catch (e) {
                    console.warn('Erreur synchro API:', e);
                }
            }
        }
        
        cartState.loading = false;
        notifyCartListeners();
        updateCartUI();
        
        return { success: true, cart: cartState };
    } catch (error) {
        cartState.loading = false;
        notifyCartListeners();
        return { success: false, error: error.message };
    }
}

// ==================== SUPPRESSION D'ARTICLE ====================

async function removeFromCart(productId) {
    return updateQuantity(productId, 0);
}

// ==================== VIDAGE DU PANIER ====================

async function clearCart() {
    cartState.loading = true;
    notifyCartListeners();
    
    try {
        cartState.items = [];
        cartState.discount = 0;
        cartState.promoCode = null;
        calculateTotals();
        
        // Synchronisation avec l'API
        if (window.API && window.API.isAuthenticated && window.API.isAuthenticated()) {
            try {
                await window.API.clearCart();
            } catch (e) {
                console.warn('Erreur synchro API:', e);
            }
        }
        
        cartState.loading = false;
        notifyCartListeners();
        updateCartUI();
        
        Utils.showNotification('Panier vidé', 'success');
        return { success: true };
    } catch (error) {
        cartState.loading = false;
        notifyCartListeners();
        return { success: false, error: error.message };
    }
}

// ==================== CODE PROMO ====================

function applyPromoCode(code) {
    const promo = Utils.validatePromoCode(code);
    
    if (!promo) {
        Utils.showNotification('Code promo invalide', 'error');
        return { success: false };
    }
    
    const discountResult = Utils.calculateDiscount(cartState.subtotal, code);
    
    cartState.discount = discountResult.discount;
    cartState.promoCode = promo;
    calculateTotals();
    
    notifyCartListeners();
    updateCartUI();
    
    Utils.showNotification(`Code promo appliqué: ${discountResult.promo.description}`, 'success');
    return { success: true, discount: discountResult.discount };
}

function removePromoCode() {
    if (cartState.promoCode) {
        cartState.discount = 0;
        cartState.promoCode = null;
        calculateTotals();
        notifyCartListeners();
        updateCartUI();
        Utils.showNotification('Code promo retiré', 'success');
    }
}

// ==================== MISE À JOUR DE L'INTERFACE ====================

function updateCartUI() {
    // Mise à jour des badges
    const badges = document.querySelectorAll('.cart-badge, .cart-count-badge');
    badges.forEach(badge => {
        badge.textContent = cartState.count;
        badge.style.display = cartState.count > 0 ? 'flex' : 'none';
    });
    
    // Mise à jour du widget panier
    const cartWidget = document.getElementById('cartWidget');
    if (cartWidget) {
        cartWidget.innerHTML = `
            <i class="fas fa-shopping-cart"></i>
            <span class="cart-total">${Utils.formatPrice(cartState.total)}</span>
            <span class="cart-count">(${cartState.count})</span>
        `;
    }
    
    // Mise à jour du résumé panier
    updateCartSummary();
}

function updateCartSummary() {
    const summaryContainer = document.getElementById('cartSummary');
    if (!summaryContainer) return;
    
    if (cartState.items.length === 0) {
        summaryContainer.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-cart"></i>
                <p>Votre panier est vide</p>
                <a href="index.html" class="btn">Continuer mes achats</a>
            </div>
        `;
        return;
    }
    
    summaryContainer.innerHTML = `
        <div class="cart-items-list">
            ${cartState.items.map(item => `
                <div class="cart-item" data-id="${item.id || item.productId}">
                    <div class="cart-item-image">
                        <img src="${item.image || 'https://placehold.co/80x80?text=Product'}" alt="${item.name}">
                    </div>
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <div class="cart-item-price">${Utils.formatPrice(item.price)}</div>
                        <div class="cart-item-quantity">
                            <button class="qty-btn minus" onclick="Cart.decrementQuantity('${item.id || item.productId}')">-</button>
                            <span class="qty-value">${item.quantity}</span>
                            <button class="qty-btn plus" onclick="Cart.incrementQuantity('${item.id || item.productId}')">+</button>
                        </div>
                    </div>
                    <div class="cart-item-total">${Utils.formatPrice(item.price * item.quantity)}</div>
                    <button class="cart-item-remove" onclick="Cart.removeFromCart('${item.id || item.productId}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `).join('')}
        </div>
        <div class="cart-summary-details">
            <div class="summary-row"><span>Sous-total</span><span>${Utils.formatPrice(cartState.subtotal)}</span></div>
            <div class="summary-row"><span>Livraison</span><span>${cartState.deliveryFee === 0 ? 'Gratuite' : Utils.formatPrice(cartState.deliveryFee)}</span></div>
            ${cartState.discount > 0 ? `<div class="summary-row discount"><span>Réduction</span><span>-${Utils.formatPrice(cartState.discount)}</span></div>` : ''}
            <div class="summary-row total"><span>Total</span><span>${Utils.formatPrice(cartState.total)}</span></div>
            ${cartState.promoCode ? `<div class="promo-applied">Code promo: ${cartState.promoCode.code} <button onclick="Cart.removePromoCode()">Retirer</button></div>` : ''}
            <div class="promo-input">
                <input type="text" id="promoCodeInput" placeholder="Code promo">
                <button onclick="Cart.applyPromoCode(document.getElementById('promoCodeInput').value)">Appliquer</button>
            </div>
            <button class="btn-checkout" onclick="Cart.checkout()">Passer commande</button>
        </div>
    `;
}

// ==================== FONCTIONS UTILITAIRES ====================

function incrementQuantity(productId) {
    const item = cartState.items.find(i => (i.id === productId || i.productId === productId));
    if (item) {
        updateQuantity(productId, item.quantity + 1);
    }
}

function decrementQuantity(productId) {
    const item = cartState.items.find(i => (i.id === productId || i.productId === productId));
    if (item) {
        if (item.quantity <= 1) {
            removeFromCart(productId);
        } else {
            updateQuantity(productId, item.quantity - 1);
        }
    }
}

function getCartCount() {
    return cartState.count;
}

function getCartTotal() {
    return cartState.total;
}

function getCartItems() {
    return [...cartState.items];
}

function checkout() {
    if (cartState.items.length === 0) {
        Utils.showNotification('Votre panier est vide', 'error');
        return;
    }
    
    // Sauvegarde des données pour la page checkout
    localStorage.setItem('checkout_cart_data', JSON.stringify({
        items: cartState.items,
        subtotal: cartState.subtotal,
        deliveryFee: cartState.deliveryFee,
        discount: cartState.discount,
        total: cartState.total,
        promoCode: cartState.promoCode
    }));
    
    window.location.href = 'checkout.html';
}

// ==================== SYNCHRONISATION ====================

async function syncCartWithServer() {
    if (window.API && window.API.isAuthenticated && window.API.isAuthenticated()) {
        cartState.loading = true;
        notifyCartListeners();
        
        try {
            // Envoyer le panier local au serveur
            for (const item of cartState.items) {
                await window.API.addToCart(item.productId || item.id, item.quantity);
            }
            
            // Récupérer le panier du serveur
            const serverCart = await window.API.getCart();
            if (serverCart && serverCart.items) {
                cartState.items = serverCart.items;
                calculateTotals();
            }
            
            cartState.loading = false;
            notifyCartListeners();
            updateCartUI();
            
            Utils.showNotification('Panier synchronisé avec le serveur', 'success');
        } catch (error) {
            console.error('Erreur synchronisation:', error);
            cartState.loading = false;
            notifyCartListeners();
        }
    }
}

// ==================== INITIALISATION ====================

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    
    // Écouter les changements d'authentification
    if (window.Auth) {
        window.Auth.addListener(() => {
            if (window.Auth.isAuthenticated()) {
                syncCartWithServer();
            }
        });
    }
});

// ==================== EXPORT ====================

window.Cart = {
    // État
    getState: () => cartState,
    getItems: getCartItems,
    getCount: getCartCount,
    getTotal: getCartTotal,
    getSubtotal: () => cartState.subtotal,
    getDeliveryFee: () => cartState.deliveryFee,
    
    // Actions
    load: loadCart,
    add: addToCart,
    updateQuantity,
    remove: removeFromCart,
    clear: clearCart,
    incrementQuantity,
    decrementQuantity,
    
    // Promo
    applyPromoCode,
    removePromoCode,
    
    // Checkout
    checkout,
    
    // Synchronisation
    sync: syncCartWithServer,
    
    // Listeners
    addListener: addCartListener,
    removeListener: removeCartListener,
    
    // UI
    updateUI: updateCartUI
};

console.log('🛒 Cart Service - Gestion du panier initialisée');