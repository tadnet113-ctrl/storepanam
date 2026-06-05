// ==================== orders.js - Gestion des commandes ====================

let orders = [];
let currentOrder = null;

const ordersListeners = [];

function addOrdersListener(callback) {
    ordersListeners.push(callback);
}

function notifyOrdersListeners() {
    ordersListeners.forEach(callback => callback(orders));
}

// Chargement des commandes
async function loadOrders() {
    try {
        if (API.isAuthenticated()) {
            orders = await API.getOrders();
        } else {
            const savedOrders = localStorage.getItem(API.storageKeys.ORDERS);
            orders = savedOrders ? JSON.parse(savedOrders) : [];
        }
        notifyOrdersListeners();
        return orders;
    } catch (error) {
        console.error('Erreur chargement commandes:', error);
        const savedOrders = localStorage.getItem(API.storageKeys.ORDERS);
        orders = savedOrders ? JSON.parse(savedOrders) : [];
        notifyOrdersListeners();
        return orders;
    }
}

// Création d'une commande
async function createNewOrder(orderData) {
    try {
        const newOrder = await API.createOrder(orderData);
        orders.unshift(newOrder);
        
        if (!API.isAuthenticated()) {
            localStorage.setItem(API.storageKeys.ORDERS, JSON.stringify(orders));
        }
        
        notifyOrdersListeners();
        showNotification('Commande créée avec succès !', 'success');
        return newOrder;
    } catch (error) {
        console.error('Erreur création commande:', error);
        // Mode hors ligne
        const offlineOrder = {
            id: 'OFFLINE_' + Date.now(),
            ...orderData,
            status: 'pending',
            createdAt: new Date().toISOString(),
            isOffline: true
        };
        orders.unshift(offlineOrder);
        localStorage.setItem(API.storageKeys.ORDERS, JSON.stringify(orders));
        notifyOrdersListeners();
        showNotification('Commande enregistrée localement', 'success');
        return offlineOrder;
    }
}

// Détails d'une commande
async function getOrderDetails(orderId) {
    try {
        if (API.isAuthenticated()) {
            currentOrder = await API.getOrderById(orderId);
        } else {
            currentOrder = orders.find(o => o.id === orderId);
        }
        return currentOrder;
    } catch (error) {
        console.error('Erreur chargement commande:', error);
        currentOrder = orders.find(o => o.id === orderId);
        return currentOrder;
    }
}

// Annulation d'une commande
async function cancelExistingOrder(orderId) {
    try {
        if (API.isAuthenticated()) {
            await API.cancelOrder(orderId);
            const order = orders.find(o => o.id === orderId);
            if (order) order.status = 'cancelled';
        } else {
            const order = orders.find(o => o.id === orderId);
            if (order) order.status = 'cancelled';
            localStorage.setItem(API.storageKeys.ORDERS, JSON.stringify(orders));
        }
        notifyOrdersListeners();
        showNotification('Commande annulée', 'success');
        return true;
    } catch (error) {
        console.error('Erreur annulation:', error);
        return false;
    }
}

// Statistiques des commandes
function getOrdersStats() {
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    
    return {
        totalOrders,
        totalAmount,
        pendingOrders,
        deliveredOrders,
        cancelledOrders,
        averageOrderValue: totalOrders > 0 ? totalAmount / totalOrders : 0
    };
}

// Commandes par mois
function getOrdersByMonth() {
    const months = {};
    orders.forEach(order => {
        const date = new Date(order.createdAt || order.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (!months[monthKey]) {
            months[monthKey] = { count: 0, total: 0 };
        }
        months[monthKey].count++;
        months[monthKey].total += order.total || 0;
    });
    return months;
}

// Mise à jour du statut (Admin)
async function updateOrderStatus(orderId, newStatus) {
    try {
        if (API.isAuthenticated() && API.isAdmin()) {
            await API.updateOrderStatus(orderId, newStatus);
            const order = orders.find(o => o.id === orderId);
            if (order) order.status = newStatus;
            notifyOrdersListeners();
            showNotification(`Statut de la commande mis à jour: ${newStatus}`, 'success');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erreur mise à jour statut:', error);
        return false;
    }
}

// Export
window.Orders = {
    load: loadOrders,
    create: createNewOrder,
    getDetails: getOrderDetails,
    cancel: cancelExistingOrder,
    getStats: getOrdersStats,
    getByMonth: getOrdersByMonth,
    updateStatus: updateOrderStatus,
    getAll: () => orders,
    addListener: addOrdersListener
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
});

console.log('📦 Orders Service - Gestion des commandes');