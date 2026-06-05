// ==================== utils.js - Fonctions utilitaires ====================

// Formatage des prix
function formatPrice(price) {
    if (price === undefined || price === null) return '0 Fcfa';
    return price.toLocaleString() + ' Fcfa';
}

// Formatage des dates
function formatDate(dateString, format = 'dd/MM/yyyy') {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    switch (format) {
        case 'dd/MM/yyyy':
            return `${day}/${month}/${year}`;
        case 'yyyy-MM-dd':
            return `${year}-${month}-${day}`;
        case 'dd MMM yyyy':
            const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
            return `${day} ${months[date.getMonth()]} ${year}`;
        case 'dd/MM/yyyy HH:mm':
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        default:
            return `${day}/${month}/${year}`;
    }
}

// Validation email
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Validation téléphone Cameroun
function isValidPhone(phone) {
    const regex = /^(6|2)[0-9]{8}$/;
    return regex.test(phone);
}

// Validation code promo
const promoCodes = [
    { code: 'BIENVENUE10', discount: 10, type: 'percentage', description: 'Réduction de 10%' },
    { code: 'LIVRAISON', discount: 1000, type: 'fixed', description: 'Livraison à 1000 Fcfa' },
    { code: 'PROMO20', discount: 20, type: 'percentage', description: 'Réduction de 20%' },
    { code: 'NOEL2024', discount: 15, type: 'percentage', description: 'Réduction de 15%' }
];

function validatePromoCode(code) {
    const promo = promoCodes.find(p => p.code === code.toUpperCase());
    return promo || null;
}

function calculateDiscount(amount, promoCode) {
    const promo = validatePromoCode(promoCode);
    if (!promo) return { discount: 0, finalAmount: amount };
    
    let discountAmount = 0;
    if (promo.type === 'percentage') {
        discountAmount = amount * (promo.discount / 100);
    } else if (promo.type === 'fixed') {
        discountAmount = promo.discount;
    }
    
    return {
        discount: discountAmount,
        finalAmount: amount - discountAmount,
        promo: promo
    };
}

// Gestion du localStorage
function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function loadFromLocalStorage(key, defaultValue = null) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
}

function removeFromLocalStorage(key) {
    localStorage.removeItem(key);
}

// Génération d'ID unique
function generateUniqueId(prefix = 'ID') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Truncation de texte
function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Debounce pour les recherches
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Gestion des erreurs
function handleError(error, context = '') {
    console.error(`Erreur ${context}:`, error);
    showNotification(`Une erreur est survenue: ${error.message}`, 'error');
}

// Affichage des notifications globales
function showNotification(message, type = 'success', duration = 4000) {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.log(`[NOTIFICATION] ${type.toUpperCase()}: ${message}`);
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    const icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'exclamation-circle' : 'info-circle');
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <div><strong>${type === 'success' ? 'Succès' : (type === 'error' ? 'Erreur' : 'Information')}</strong>
        <p style="font-size:0.75rem; margin-top:0.25rem;">${message}</p></div>
        <button onclick="this.parentElement.remove()" style="background:none; border:none; cursor:pointer;"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// Initialisation du conteneur de notifications
function initNotificationContainer() {
    if (!document.getElementById('notificationContainer')) {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
}

// Export
window.Utils = {
    formatPrice,
    formatDate,
    isValidEmail,
    isValidPhone,
    validatePromoCode,
    calculateDiscount,
    saveToLocalStorage,
    loadFromLocalStorage,
    removeFromLocalStorage,
    generateUniqueId,
    truncateText,
    debounce,
    handleError,
    showNotification,
    initNotificationContainer
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initNotificationContainer();
});

console.log('🔧 Utils Service - Fonctions utilitaires chargées');