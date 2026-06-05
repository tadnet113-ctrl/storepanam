// ==================== payment.js - Gestion des paiements ====================

// Configuration des moyens de paiement
const PAYMENT_METHODS = {
    ORANGE_MONEY: {
        id: 'orange_money',
        name: 'Orange Money',
        icon: 'fas fa-mobile-alt',
        description: 'Paiement mobile sécurisé',
        pagePath: 'payment/orange-money.html',
        color: '#FF6600',
        minAmount: 100,
        maxAmount: 1000000
    },
    MTN_MONEY: {
        id: 'mtn_money',
        name: 'MTN Mobile Money',
        icon: 'fas fa-mobile-alt',
        description: 'Paiement mobile sécurisé',
        pagePath: 'payment/mtn-money.html',
        color: '#FFCC00',
        minAmount: 100,
        maxAmount: 1000000
    },
    PAYPAL: {
        id: 'paypal',
        name: 'PayPal',
        icon: 'fab fa-paypal',
        description: 'Paiement international sécurisé',
        pagePath: 'payment/paypal.html',
        color: '#003087',
        minAmount: 5,
        maxAmount: 10000,
        currency: 'EUR'
    },
    VISA_MASTERCARD: {
        id: 'card',
        name: 'Carte Bancaire',
        icon: 'fas fa-credit-card',
        description: 'Visa / Mastercard / American Express',
        pagePath: 'payment/visa-mastercard.html',
        color: '#1a1a1a',
        minAmount: 100,
        maxAmount: 5000000
    },
    CASH_ON_DELIVERY: {
        id: 'cod',
        name: 'Paiement à la livraison',
        icon: 'fas fa-money-bill-wave',
        description: 'Payez à la réception de votre commande',
        pagePath: 'payment/cash-on-delivery.html',
        color: '#28a745',
        minAmount: 0,
        maxAmount: 500000
    }
};

let currentTransaction = null;
let paymentListeners = [];

function addPaymentListener(callback) {
    paymentListeners.push(callback);
}

function notifyPaymentListeners() {
    paymentListeners.forEach(callback => callback(currentTransaction));
}

// Initialisation d'un paiement
function initPayment(methodId, amount, orderData = null) {
    const method = PAYMENT_METHODS[methodId.toUpperCase()];
    if (!method) {
        showNotification('Moyen de paiement invalide', 'error');
        return false;
    }
    
    if (amount < method.minAmount) {
        showNotification(`Le montant minimum pour ${method.name} est de ${method.minAmount.toLocaleString()} Fcfa`, 'error');
        return false;
    }
    
    if (amount > method.maxAmount) {
        showNotification(`Le montant maximum pour ${method.name} est de ${method.maxAmount.toLocaleString()} Fcfa`, 'error');
        return false;
    }
    
    currentTransaction = {
        id: 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        method: methodId,
        amount: amount,
        deliveryFee: amount >= 5000 ? 0 : 1500,
        totalAmount: amount + (amount >= 5000 ? 0 : 1500),
        orderData: orderData,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('current_transaction', JSON.stringify(currentTransaction));
    notifyPaymentListeners();
    return true;
}

// Paiement Orange Money
async function processOrangeMoneyPayment(phoneNumber, amount) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const phoneRegex = /^(6|2)[0-9]{8}$/;
            if (!phoneRegex.test(phoneNumber)) {
                reject(new Error('Numéro de téléphone invalide'));
                return;
            }
            
            const transactionCode = 'OM' + Date.now() + Math.floor(Math.random() * 1000);
            const confirmed = confirm(`Confirmez-vous le paiement de ${amount.toLocaleString()} Fcfa via Orange Money ?\nNuméro: ${phoneNumber}\nCode: ${transactionCode}`);
            
            if (confirmed) {
                resolve({
                    success: true,
                    transactionId: transactionCode,
                    message: 'Paiement Orange Money effectué avec succès',
                    receipt: {
                        method: 'Orange Money',
                        amount: amount,
                        phone: phoneNumber,
                        date: new Date().toLocaleString(),
                        transactionId: transactionCode
                    }
                });
            } else {
                reject(new Error('Paiement annulé'));
            }
        }, 1500);
    });
}

// Paiement MTN Money
async function processMTNMoneyPayment(phoneNumber, amount) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const phoneRegex = /^(6|2)[0-9]{8}$/;
            if (!phoneRegex.test(phoneNumber)) {
                reject(new Error('Numéro de téléphone invalide'));
                return;
            }
            
            const transactionCode = 'MTN' + Date.now() + Math.floor(Math.random() * 1000);
            const confirmed = confirm(`Confirmez-vous le paiement de ${amount.toLocaleString()} Fcfa via MTN Mobile Money ?\nNuméro: ${phoneNumber}\nCode: ${transactionCode}`);
            
            if (confirmed) {
                resolve({
                    success: true,
                    transactionId: transactionCode,
                    message: 'Paiement MTN Mobile Money effectué avec succès',
                    receipt: {
                        method: 'MTN Mobile Money',
                        amount: amount,
                        phone: phoneNumber,
                        date: new Date().toLocaleString(),
                        transactionId: transactionCode
                    }
                });
            } else {
                reject(new Error('Paiement annulé'));
            }
        }, 1500);
    });
}

// Paiement PayPal
async function processPayPalPayment(amount, currency = 'EUR') {
    return new Promise((resolve, reject) => {
        const amountInEuro = amount / 655;
        const confirmed = confirm(`Vous allez être redirigé vers PayPal.\nMontant: ${amountInEuro.toFixed(2)} EUR\nConfirmez-vous ?`);
        
        if (confirmed) {
            setTimeout(() => {
                const success = confirm(`Paiement PayPal simulé.\nMontant: ${amountInEuro.toFixed(2)} EUR\nValider le paiement ?`);
                if (success) {
                    resolve({
                        success: true,
                        transactionId: 'PP' + Date.now() + Math.random().toString(36).substr(2, 9),
                        message: 'Paiement PayPal effectué avec succès',
                        receipt: {
                            method: 'PayPal',
                            amount: amount,
                            amountEUR: amountInEuro.toFixed(2),
                            date: new Date().toLocaleString(),
                            transactionId: 'PP-' + Date.now()
                        }
                    });
                } else {
                    reject(new Error('Paiement PayPal annulé'));
                }
            }, 2000);
        } else {
            reject(new Error('Paiement annulé'));
        }
    });
}

// Paiement par carte
async function processCardPayment(cardData, amount) {
    return new Promise((resolve, reject) => {
        const cardNumberRegex = /^[0-9]{16}$/;
        const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
        const cvvRegex = /^[0-9]{3,4}$/;
        
        if (!cardNumberRegex.test(cardData.number.replace(/\s/g, ''))) {
            reject(new Error('Numéro de carte invalide'));
            return;
        }
        if (!expiryRegex.test(cardData.expiry)) {
            reject(new Error('Date d\'expiration invalide'));
            return;
        }
        if (!cvvRegex.test(cardData.cvv)) {
            reject(new Error('Code CVV invalide'));
            return;
        }
        
        const confirmed = confirm(`Confirmez-vous le paiement de ${amount.toLocaleString()} Fcfa par carte bancaire ?\nCarte: **** **** **** ${cardData.number.slice(-4)}`);
        
        if (confirmed) {
            resolve({
                success: true,
                transactionId: 'CB' + Date.now(),
                message: 'Paiement par carte effectué avec succès',
                receipt: {
                    method: 'Carte Bancaire',
                    amount: amount,
                    cardLast4: cardData.number.slice(-4),
                    date: new Date().toLocaleString(),
                    transactionId: 'CB' + Date.now()
                }
            });
        } else {
            reject(new Error('Paiement annulé'));
        }
    });
}

// Paiement à la livraison
function processCashOnDelivery(amount) {
    return {
        success: true,
        message: 'Commande confirmée. Paiement à la livraison.',
        receipt: {
            method: 'Paiement à la livraison',
            amount: amount,
            date: new Date().toLocaleString(),
            orderId: 'COD_' + Date.now()
        }
    };
}

// Finalisation du paiement
async function finalizePayment(methodId, paymentData) {
    const transaction = JSON.parse(localStorage.getItem('current_transaction'));
    if (!transaction) {
        showNotification('Aucune transaction en cours', 'error');
        return false;
    }
    
    try {
        let result;
        switch (methodId) {
            case 'ORANGE_MONEY':
                result = await processOrangeMoneyPayment(paymentData.phone, transaction.totalAmount);
                break;
            case 'MTN_MONEY':
                result = await processMTNMoneyPayment(paymentData.phone, transaction.totalAmount);
                break;
            case 'PAYPAL':
                result = await processPayPalPayment(transaction.totalAmount);
                break;
            case 'VISA_MASTERCARD':
                result = await processCardPayment(paymentData, transaction.totalAmount);
                break;
            case 'CASH_ON_DELIVERY':
                result = processCashOnDelivery(transaction.totalAmount);
                break;
            default:
                throw new Error('Méthode de paiement non supportée');
        }
        
        if (result.success) {
            transaction.status = 'completed';
            transaction.paymentResult = result;
            transaction.completedAt = new Date().toISOString();
            localStorage.setItem('last_transaction', JSON.stringify(transaction));
            localStorage.removeItem('current_transaction');
            
            // Créer la commande
            const orderData = {
                ...transaction.orderData,
                paymentMethod: methodId,
                paymentDetails: result.receipt,
                total: transaction.totalAmount,
                status: 'confirmed',
                createdAt: transaction.createdAt
            };
            
            await Orders.create(orderData);
            
            // Vider le panier
            await Cart.clear();
            
            showNotification(result.message, 'success');
            setTimeout(() => {
                window.location.href = 'payment/confirmation.html';
            }, 2000);
            return true;
        }
    } catch (error) {
        showNotification(error.message, 'error');
        return false;
    }
}

// Récupération des méthodes de paiement
function getAvailablePaymentMethods() {
    return Object.values(PAYMENT_METHODS);
}

// Affichage des méthodes de paiement
function displayPaymentMethods(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = Object.values(PAYMENT_METHODS).map(method => `
        <div class="payment-method-card" data-payment="${method.id}" onclick="Payment.selectMethod('${method.id}')">
            <div class="payment-method-icon"><i class="${method.icon}" style="color: ${method.color};"></i></div>
            <div class="payment-method-info"><h4>${method.name}</h4><p>${method.description}</p></div>
            <div class="payment-method-arrow"><i class="fas fa-chevron-right"></i></div>
        </div>
    `).join('');
}

// Export
window.Payment = {
    methods: PAYMENT_METHODS,
    init: initPayment,
    finalize: finalizePayment,
    getAvailableMethods: getAvailablePaymentMethods,
    displayMethods: displayPaymentMethods,
    selectMethod: (methodId) => {
        localStorage.setItem('selected_payment_method', methodId);
        showNotification(`Méthode de paiement sélectionnée`, 'success');
    },
    addListener: addPaymentListener
};

console.log('💳 Payment Service - Gestion des paiements');