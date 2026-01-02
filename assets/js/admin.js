// Admin JavaScript for ForexterChat

class AdminSystem {
    constructor() {
        this.init();
    }
    
    init() {
        this.checkAdminAuth();
        this.initEventListeners();
        this.loadSystemInfo();
    }
    
    checkAdminAuth() {
        const session = JSON.parse(localStorage.getItem('forexter_session') || '{}');
        
        if (!session.user || session.user.role !== 'admin') {
            window.location.href = '../../pages/authlogin.html';
            return;
        }
        
        // Update admin info in UI
        this.updateAdminInfo(session.user);
    }
    
    updateAdminInfo(user) {
        document.getElementById('adminName').textContent = user.name;
        
        // Update avatar based on admin ID
        const adminAvatars = {
            'ndii': '🌟',
            'fanks': '⚡',
            'lanyz': '👑',
            'lez': '🔥',
            'karin': '💎',
            'kenz': '🚀'
        };
        
        const adminId = user.email.split('@')[0].toLowerCase();
        const avatar = adminAvatars[adminId] || '👨‍💼';
        
        const avatarElement = document.querySelector('.contact-avatar span');
        if (avatarElement) {
            avatarElement.textContent = avatar;
        }
    }
    
    initEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('adminLogout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.href.includes('#')) {
                    e.preventDefault();
                    this.handleNavClick(link.getAttribute('href'));
                }
            });
        });
        
        // Sidebar toggle for mobile
        const mobileToggle = document.querySelector('.mobile-menu-btn');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                document.querySelector('.sidebar').classList.toggle('active');
            });
        }
    }
    
    handleNavClick(href) {
        // Handle navigation for hash links
        const target = href.substring(1);
        const element = document.getElementById(target);
        
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('forexter_session');
            window.location.href = '../../login.html';
        }
    }
    
    loadSystemInfo() {
        // Load system information
        const users = JSON.parse(localStorage.getItem('forexter_users') || '[]');
        const pendingUsers = JSON.parse(localStorage.getItem('forexter_pending_users') || '[]');
        const messages = JSON.parse(localStorage.getItem('forexter_messages') || '[]');
        const files = JSON.parse(localStorage.getItem('forexter_files') || '[]');
        
        // Update counts if elements exist
        this.updateElementText('totalUsersCount', users.length);
        this.updateElementText('pendingUsersCount', pendingUsers.length);
        this.updateElementText('totalMessagesCount', messages.length);
        this.updateElementText('totalFilesCount', files.length);
        
        // Calculate storage usage
        const totalStorage = this.calculateStorageUsage();
        this.updateElementText('storageUsage', totalStorage + ' MB');
    }
    
    updateElementText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }
    
    calculateStorageUsage() {
        let total = 0;
        
        // Calculate size of localStorage data
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('forexter_')) {
                total += localStorage.getItem(key).length * 2; // Approximate size in bytes
            }
        }
        
        // Convert to MB
        return (total / (1024 * 1024)).toFixed(2);
    }
    
    // File Management
    async uploadFile(file, category = 'general') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const fileData = {
                    id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    category: category,
                    uploadedBy: this.getCurrentAdmin().id,
                    uploadedAt: Date.now(),
                    data: e.target.result
                };
                
                // Save to localStorage
                const files = JSON.parse(localStorage.getItem('forexter_files') || '[]');
                files.push(fileData);
                localStorage.setItem('forexter_files', JSON.stringify(files));
                
                resolve(fileData);
            };
            
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    getFiles(category = null) {
        const files = JSON.parse(localStorage.getItem('forexter_files') || '[]');
        
        if (category) {
            return files.filter(file => file.category === category);
        }
        
        return files;
    }
    
    deleteFile(fileId) {
        const files = JSON.parse(localStorage.getItem('forexter_files') || '[]');
        const filteredFiles = files.filter(file => file.id !== fileId);
        localStorage.setItem('forexter_files', JSON.stringify(filteredFiles));
        return filteredFiles;
    }
    
    // User Management
    getUsers(status = null) {
        const users = JSON.parse(localStorage.getItem('forexter_users') || '[]');
        
        if (status) {
            return users.filter(user => user.status === status);
        }
        
        return users;
    }
    
    getPendingUsers() {
        return JSON.parse(localStorage.getItem('forexter_pending_users') || '[]');
    }
    
    approveUser(userId) {
        const pendingUsers = JSON.parse(localStorage.getItem('forexter_pending_users') || '[]');
        const userIndex = pendingUsers.findIndex(u => u.id === userId);
        
        if (userIndex === -1) return null;
        
        const user = pendingUsers[userIndex];
        user.status = 'approved';
        user.approvedAt = Date.now();
        user.approvedBy = this.getCurrentAdmin().id;
        
        // Move to approved users
        const users = JSON.parse(localStorage.getItem('forexter_users') || '[]');
        users.push(user);
        localStorage.setItem('forexter_users', JSON.stringify(users));
        
        // Remove from pending
        pendingUsers.splice(userIndex, 1);
        localStorage.setItem('forexter_pending_users', JSON.stringify(pendingUsers));
        
        return user;
    }
    
    rejectUser(userId, reason = '') {
        const pendingUsers = JSON.parse(localStorage.getItem('forexter_pending_users') || '[]');
        const userIndex = pendingUsers.findIndex(u => u.id === userId);
        
        if (userIndex === -1) return false;
        
        const user = pendingUsers[userIndex];
        user.status = 'rejected';
        user.rejectedAt = Date.now();
        user.rejectedBy = this.getCurrentAdmin().id;
        user.rejectionReason = reason;
        
        // Move to rejected list (for history)
        const rejectedUsers = JSON.parse(localStorage.getItem('forexter_rejected_users') || '[]');
        rejectedUsers.push(user);
        localStorage.setItem('forexter_rejected_users', JSON.stringify(rejectedUsers));
        
        // Remove from pending
        pendingUsers.splice(userIndex, 1);
        localStorage.setItem('forexter_pending_users', JSON.stringify(pendingUsers));
        
        return true;
    }
    
    createCustomUser(userData) {
        const user = {
            id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            ...userData,
            type: 'custom',
            createdAt: Date.now(),
            createdBy: this.getCurrentAdmin().id,
            status: 'active'
        };
        
        const users = JSON.parse(localStorage.getItem('forexter_users') || '[]');
        users.push(user);
        localStorage.setItem('forexter_users', JSON.stringify(users));
        
        return user;
    }
    
    updateUser(userId, updates) {
        const users = JSON.parse(localStorage.getItem('forexter_users') || '[]');
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) return null;
        
        users[userIndex] = { ...users[userIndex], ...updates };
        localStorage.setItem('forexter_users', JSON.stringify(users));
        
        return users[userIndex];
    }
    
    deleteUser(userId) {
        const users = JSON.parse(localStorage.getItem('forexter_users') || '[]');
        const filteredUsers = users.filter(user => user.id !== userId);
        localStorage.setItem('forexter_users', JSON.stringify(filteredUsers));
        return filteredUsers;
    }
    
    // System Settings
    updateSystemSettings(settings) {
        const currentSettings = JSON.parse(localStorage.getItem('forexter_settings') || '{}');
        const updatedSettings = { ...currentSettings, ...settings };
        localStorage.setItem('forexter_settings', JSON.stringify(updatedSettings));
        return updatedSettings;
    }
    
    getSystemSettings() {
        return JSON.parse(localStorage.getItem('forexter_settings') || '{}');
    }
    
    sendNotification(title, message, type = 'info', target = 'all') {
        const notification = {
            id: 'notif_' + Date.now(),
            title: title,
            message: message,
            type: type,
            target: target,
            sentBy: this.getCurrentAdmin().id,
            sentAt: Date.now(),
            readBy: []
        };
        
        const notifications = JSON.parse(localStorage.getItem('forexter_notifications') || '[]');
        notifications.push(notification);
        localStorage.setItem('forexter_notifications', JSON.stringify(notifications));
        
        return notification;
    }
    
    // Helper Methods
    getCurrentAdmin() {
        const session = JSON.parse(localStorage.getItem('forexter_session') || '{}');
        return session.user || { id: 'unknown', name: 'Unknown Admin' };
    }
    
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    formatDate(timestamp) {
        return new Date(timestamp).toLocaleString('id-ID', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    logActivity(type, message) {
        const activity = {
            id: 'act_' + Date.now(),
            type: type,
            message: message,
            admin: this.getCurrentAdmin().name,
            timestamp: Date.now()
        };
        
        const activities = JSON.parse(localStorage.getItem('forexter_activities') || '[]');
        activities.push(activity);
        
        // Keep only last 100 activities
        if (activities.length > 100) {
            activities.shift();
        }
        
        localStorage.setItem('forexter_activities', JSON.stringify(activities));
        
        // Dispatch event for real-time updates
        window.dispatchEvent(new CustomEvent('activityUpdate', { detail: activity }));
        
        return activity;
    }
    
    // Real-time System Monitoring
    startSystemMonitor() {
        setInterval(() => {
            this.updateSystemMetrics();
        }, 1000);
    }
    
    updateSystemMetrics() {
        const metrics = {
            cpu: Math.floor(Math.random() * 30) + 20, // Simulated CPU usage
            memory: Math.floor(Math.random() * 40) + 30, // Simulated Memory usage
            storage: this.calculateStorageUsage(),
            activeUsers: this.getUsers('active').length,
            pendingUsers: this.getPendingUsers().length
        };
        
        // Dispatch event for real-time updates
        window.dispatchEvent(new CustomEvent('systemMetricsUpdate', { detail: metrics }));
        
        return metrics;
    }
    
    // Database Export/Import
    exportDatabase() {
        const data = {};
        
        // Collect all forexter data
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('forexter_')) {
                try {
                    data[key] = JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    data[key] = localStorage.getItem(key);
                }
            }
        }
        
        return {
            timestamp: Date.now(),
            exportedBy: this.getCurrentAdmin().name,
            data: data
        };
    }
    
    importDatabase(data) {
        if (!data || !data.data) {
            throw new Error('Invalid database format');
        }
        
        // Backup current data
        const backup = this.exportDatabase();
        localStorage.setItem('forexter_backup_' + Date.now(), JSON.stringify(backup));
        
        // Import new data
        Object.keys(data.data).forEach(key => {
            if (typeof data.data[key] === 'object') {
                localStorage.setItem(key, JSON.stringify(data.data[key]));
            } else {
                localStorage.setItem(key, data.data[key]);
            }
        });
        
        return true;
    }
}

// Initialize admin system when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.adminSystem = new AdminSystem();
    
    // Initialize tooltips
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', (e) => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = e.target.dataset.tooltip;
            document.body.appendChild(tooltip);
            
            const rect = e.target.getBoundingClientRect();
            tooltip.style.position = 'fixed';
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
            tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
            
            e.target._tooltip = tooltip;
        });
        
        element.addEventListener('mouseleave', (e) => {
            if (e.target._tooltip) {
                e.target._tooltip.remove();
                delete e.target._tooltip;
            }
        });
    });
    
    // Initialize modals
    const modalTriggers = document.querySelectorAll('[data-modal]');
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const modalId = trigger.dataset.modal;
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('active');
            }
        });
    });
    
    // Close modals
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').classList.remove('active');
        });
    });
    
    // Close modal on overlay click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
});
