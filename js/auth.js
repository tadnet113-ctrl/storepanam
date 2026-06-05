// ==================== auth.js - Gestion complète de l'authentification ====================

// État de l'authentification
let authState = {
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false
};

// Écouteurs d'événements d'authentification
const authListeners = [];

// ==================== ÉCOUTEURS ====================

function addAuthListener(callback) {
    if (typeof callback === 'function') {
        authListeners.push(callback);
    }
}

function removeAuthListener(callback) {
    const index = authListeners.indexOf(callback);
    if (index > -1) authListeners.splice(index, 1);
}

function notifyAuthListeners() {
    authListeners.forEach(callback => {
        try {
            callback(authState);
        } catch (e) {
            console.error('Erreur dans listener auth:', e);
        }
    });
}

// ==================== INITIALISATION ====================

function initAuth() {
    const token = localStorage.getItem('paname_auth_token');
    const user = localStorage.getItem('paname_user');
    
    if (token && user) {
        authState.isAuthenticated = true;
        authState.user = JSON.parse(user);
        authState.token = token;
        authState.loading = false;
        notifyAuthListeners();
        console.log('✅ Utilisateur authentifié:', authState.user?.email);
    } else {
        authState.isAuthenticated = false;
        authState.user = null;
        authState.token = null;
        authState.loading = false;
        notifyAuthListeners();
        console.log('🔓 Aucune session active');
    }
}

// ==================== CONNEXION ====================

async function login(email, password, rememberMe = false) {
    authState.loading = true;
    notifyAuthListeners();
    
    try {
        // Validation des entrées
        if (!email || !password) {
            throw new Error('Email et mot de passe requis');
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Email invalide');
        }
        
        // Appel API (simulé ou réel)
        let response;
        if (window.API && window.API.login) {
            response = await window.API.login(email, password);
        } else {
            // Mode démo - simulation
            response = await simulateLogin(email, password);
        }
        
        if (response && response.token) {
            // Sauvegarde du token
            localStorage.setItem('paname_auth_token', response.token);
            localStorage.setItem('paname_user', JSON.stringify(response.user));
            if (rememberMe) {
                localStorage.setItem('paname_remember_me', 'true');
            }
            
            authState.isAuthenticated = true;
            authState.user = response.user;
            authState.token = response.token;
            authState.loading = false;
            
            notifyAuthListeners();
            updateAuthUI();
            
            Utils.showNotification('Connexion réussie ! Bienvenue ' + (response.user.fullName || response.user.email), 'success');
            return { success: true, user: response.user };
        } else {
            throw new Error('Email ou mot de passe incorrect');
        }
    } catch (error) {
        authState.loading = false;
        notifyAuthListeners();
        Utils.showNotification(error.message || 'Erreur de connexion', 'error');
        console.error('Erreur de connexion:', error);
        return { success: false, error: error.message };
    }
}

// Simulation de connexion (démo)
async function simulateLogin(email, password) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Compte admin
            if (email === 'admin@lepaname.com' && password === 'Admin123!') {
                resolve({
                    token: 'fake_jwt_token_admin_' + Date.now(),
                    user: {
                        id: 1,
                        email: 'admin@lepaname.com',
                        fullName: 'Administrateur',
                        phone: '657715482',
                        role: 'ADMIN',
                        avatar: 'A'
                    }
                });
            }
            // Compte utilisateur test
            else if (email === 'user@lepaname.com' && password === 'User123!') {
                resolve({
                    token: 'fake_jwt_token_user_' + Date.now(),
                    user: {
                        id: 2,
                        email: 'user@lepaname.com',
                        fullName: 'Utilisateur Test',
                        phone: '698765432',
                        role: 'USER',
                        avatar: 'U'
                    }
                });
            }
            else {
                reject(new Error('Email ou mot de passe incorrect'));
            }
        }, 800);
    });
}

// ==================== INSCRIPTION ====================

async function register(userData) {
    authState.loading = true;
    notifyAuthListeners();
    
    try {
        // Validation des données
        if (!userData.fullName || !userData.email || !userData.password) {
            throw new Error('Tous les champs sont requis');
        }
        
        if (userData.password !== userData.confirmPassword) {
            throw new Error('Les mots de passe ne correspondent pas');
        }
        
        if (userData.password.length < 6) {
            throw new Error('Le mot de passe doit contenir au moins 6 caractères');
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            throw new Error('Email invalide');
        }
        
        // Appel API
        let response;
        if (window.API && window.API.register) {
            response = await window.API.register(userData);
        } else {
            response = await simulateRegister(userData);
        }
        
        if (response && response.token) {
            localStorage.setItem('paname_auth_token', response.token);
            localStorage.setItem('paname_user', JSON.stringify(response.user));
            
            authState.isAuthenticated = true;
            authState.user = response.user;
            authState.token = response.token;
            authState.loading = false;
            
            notifyAuthListeners();
            updateAuthUI();
            
            Utils.showNotification('Inscription réussie ! Bienvenue', 'success');
            return { success: true, user: response.user };
        }
    } catch (error) {
        authState.loading = false;
        notifyAuthListeners();
        Utils.showNotification(error.message || 'Erreur d\'inscription', 'error');
        return { success: false, error: error.message };
    }
}

async function simulateRegister(userData) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                token: 'fake_jwt_token_' + Date.now(),
                user: {
                    id: Date.now(),
                    email: userData.email,
                    fullName: userData.fullName,
                    phone: userData.phone || '',
                    role: 'USER',
                    avatar: userData.fullName.charAt(0).toUpperCase()
                }
            });
        }, 800);
    });
}

// ==================== DÉCONNEXION ====================

async function logout() {
    authState.loading = true;
    notifyAuthListeners();
    
    try {
        if (window.API && window.API.logout) {
            await window.API.logout();
        }
    } catch (e) {
        // Ignorer les erreurs de déconnexion
    }
    
    localStorage.removeItem('paname_auth_token');
    localStorage.removeItem('paname_user');
    localStorage.removeItem('paname_remember_me');
    
    authState.isAuthenticated = false;
    authState.user = null;
    authState.token = null;
    authState.loading = false;
    
    notifyAuthListeners();
    updateAuthUI();
    
    Utils.showNotification('Déconnexion réussie', 'success');
    
    // Redirection après déconnexion
    setTimeout(() => {
        if (window.location.pathname.includes('/admin/') || window.location.pathname.includes('dashboard')) {
            window.location.href = '../index.html';
        } else {
            window.location.href = 'index.html';
        }
    }, 1500);
}

// ==================== GESTION DU PROFIL ====================

function getCurrentUser() {
    return authState.user;
}

function isAuthenticated() {
    return authState.isAuthenticated;
}

function isAdmin() {
    return authState.isAuthenticated && 
           (authState.user?.role === 'ADMIN' || authState.user?.role === 'ROLE_ADMIN');
}

function getToken() {
    return authState.token;
}

async function updateProfile(profileData) {
    authState.loading = true;
    notifyAuthListeners();
    
    try {
        let response;
        if (window.API && window.API.updateProfile) {
            response = await window.API.updateProfile(profileData);
        } else {
            response = await simulateUpdateProfile(profileData);
        }
        
        if (response && response.user) {
            authState.user = response.user;
            localStorage.setItem('paname_user', JSON.stringify(response.user));
            authState.loading = false;
            notifyAuthListeners();
            Utils.showNotification('Profil mis à jour avec succès', 'success');
            return { success: true, user: response.user };
        }
    } catch (error) {
        authState.loading = false;
        notifyAuthListeners();
        Utils.showNotification(error.message || 'Erreur de mise à jour', 'error');
        return { success: false, error: error.message };
    }
}

async function changePassword(currentPassword, newPassword, confirmPassword) {
    if (newPassword !== confirmPassword) {
        Utils.showNotification('Les nouveaux mots de passe ne correspondent pas', 'error');
        return { success: false };
    }
    
    if (newPassword.length < 6) {
        Utils.showNotification('Le mot de passe doit contenir au moins 6 caractères', 'error');
        return { success: false };
    }
    
    authState.loading = true;
    notifyAuthListeners();
    
    try {
        // Appel API pour changer le mot de passe
        if (window.API && window.API.changePassword) {
            await window.API.changePassword(currentPassword, newPassword);
        }
        
        authState.loading = false;
        notifyAuthListeners();
        Utils.showNotification('Mot de passe modifié avec succès', 'success');
        return { success: true };
    } catch (error) {
        authState.loading = false;
        notifyAuthListeners();
        Utils.showNotification(error.message || 'Erreur lors du changement de mot de passe', 'error');
        return { success: false };
    }
}

async function simulateUpdateProfile(profileData) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                user: {
                    ...authState.user,
                    ...profileData
                }
            });
        }, 500);
    });
}

// ==================== MISE À JOUR DE L'INTERFACE ====================

function updateAuthUI() {
    const isLoggedIn = authState.isAuthenticated;
    const user = authState.user;
    const isAdminUser = isAdmin();
    
    // Éléments à afficher si connecté
    document.querySelectorAll('.auth-show-logged-in').forEach(el => {
        el.style.display = isLoggedIn ? 'flex' : 'none';
    });
    
    // Éléments à afficher si déconnecté
    document.querySelectorAll('.auth-show-logged-out').forEach(el => {
        el.style.display = !isLoggedIn ? 'flex' : 'none';
    });
    
    // Éléments réservés aux administrateurs
    document.querySelectorAll('.auth-show-admin').forEach(el => {
        el.style.display = isAdminUser ? 'flex' : 'none';
    });
    
    // Nom de l'utilisateur
    document.querySelectorAll('.auth-user-name').forEach(el => {
        el.textContent = user ? (user.fullName || user.email || 'Utilisateur') : '';
    });
    
    // Email de l'utilisateur
    document.querySelectorAll('.auth-user-email').forEach(el => {
        el.textContent = user ? user.email : '';
    });
    
    // Avatar / Initiales
    document.querySelectorAll('.auth-user-initials').forEach(el => {
        if (user && user.fullName) {
            const initials = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
            el.textContent = initials;
        } else if (user && user.email) {
            el.textContent = user.email.charAt(0).toUpperCase();
        } else {
            el.textContent = '?';
        }
    });
    
    // Avatar image
    document.querySelectorAll('.auth-user-avatar').forEach(el => {
        if (user && user.avatar) {
            el.src = user.avatar;
        }
    });
}

// ==================== PROTECTION DES ROUTES ====================

function requireAuth(redirectUrl = 'login.html') {
    if (!isAuthenticated()) {
        Utils.showNotification('Veuillez vous connecter pour accéder à cette page', 'error');
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1500);
        return false;
    }
    return true;
}

function requireAdmin(redirectUrl = 'index.html') {
    if (!isAuthenticated()) {
        Utils.showNotification('Veuillez vous connecter', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return false;
    }
    if (!isAdmin()) {
        Utils.showNotification('Accès non autorisé. Zone administrateur.', 'error');
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1500);
        return false;
    }
    return true;
}

// ==================== INITIALISATION ====================

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    
    // Mettre à jour l'interface après chaque changement d'état
    addAuthListener(() => updateAuthUI());
    
    // Gérer le bouton de déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

// ==================== EXPORT ====================

window.Auth = {
    // État
    getState: () => authState,
    isAuthenticated,
    isAdmin,
    getCurrentUser,
    getToken,
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    
    // Listeners
    addListener: addAuthListener,
    removeListener: removeAuthListener,
    
    // Protection
    requireAuth,
    requireAdmin,
    
    // UI
    updateUI: updateAuthUI
};

console.log('🔐 Auth Service - Authentification initialisée');
console.log('📧 Compte admin: admin@lepaname.com / Admin123!');
console.log('👤 Compte user: user@lepaname.com / User123!');