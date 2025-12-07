
class AdminAPI {
    constructor() {
        this.baseURL = '/api/admin';
        this.endpoints = {
            login: '/login',
            settings: '/settings',
            users: '/users',
            logs: '/logs',
            backups: '/backups',
            test: '/test'
        };
    }

    // Mock login API
    async login(username, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (username === 'admin' && password === 'admin123') {
                    resolve({
                        success: true,
                        token: 'mock-jwt-token-' + Date.now(),
                        user: {
                            id: 1,
                            username: 'fn',
                            email: 'cnntwrk@gmail.com',
                            role: 'admin'
                        }
                    });
                } else {
                    reject({
                        success: false,
                        message: 'Invalid credentials'
                    });
                }
            }, 1000);
        });
    }

    // Mock get settings
    async getSettings() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const settings = JSON.parse(localStorage.getItem('forexterAdminSettings')) || {};
                resolve({
                    success: true,
                    settings: settings
                });
            }, 500);
        });
    }

    // Mock save settings
    async saveSettings(settings) {
        return new Promise((resolve) => {
            setTimeout(() => {
                localStorage.setItem('forexterAdminSettings', JSON.stringify(settings));
                resolve({
                    success: true,
                    message: 'Settings saved successfully'
                });
            }, 800);
        });
    }

    // Mock get users
    async getUsers() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const settings = JSON.parse(localStorage.getItem('forexterAdminSettings')) || {};
                const users = settings.users || [];
                resolve({
                    success: true,
                    users: users
                });
            }, 600);
        });
    }

    // Mock add user
    async addUser(userData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const settings = JSON.parse(localStorage.getItem('forexterAdminSettings')) || {};
                if (!settings.users) settings.users = [];
                
                userData.id = Date.now();
                userData.createdAt = new Date().toISOString();
                userData.status = 'active';
                
                settings.users.push(userData);
                localStorage.setItem('forexterAdminSettings', JSON.stringify(settings));
                
                resolve({
                    success: true,
                    message: 'User added successfully',
                    user: userData
                });
            }, 1000);
        });
    }

    // Mock get logs
    async getLogs(filter = {}) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const settings = JSON.parse(localStorage.getItem('forexterAdminSettings')) || {};
                let logs = settings.logs || [];
                
                // Apply filters
                if (filter.level && filter.level !== 'all') {
                    logs = logs.filter(log => log.level === filter.level);
                }
                
                if (filter.timeRange) {
                    const hours = parseInt(filter.timeRange);
                    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
                    logs = logs.filter(log => new Date(log.timestamp) >= cutoff);
                }
                
                resolve({
                    success: true,
                    logs: logs,
                    total: logs.length
                });
            }, 700);
        });
    }

    // Mock test connection
    async testConnection(config) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const results = [];
                
                // Test server connection
                results.push({
                    service: 'Server Connection',
                    status: Math.random() > 0.3 ? 'success' : 'error',
                    message: Math.random() > 0.3 ? 
                        'Successfully connected to server' : 
                        'Failed to connect to server'
                });
                
                // Test email if configured
                if (config.emailEnabled && config.adminEmail) {
                    results.push({
                        service: 'Email Service',
                        status: 'success',
                        message: `Test email would be sent to ${config.adminEmail}`
                    });
                }
                
                // Test monitoring
                results.push({
                    service: 'Monitoring System',
                    status: 'success',
                    message: 'Monitoring system is active'
                });
                
                resolve({
                    success: true,
                    results: results
                });
            }, 1500);
        });
    }

    // Mock create backup
    async createBackup(name) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const backup = {
                    id: Date.now(),
                    name: name || `backup_${new Date().toISOString().split('T')[0]}`,
                    timestamp: new Date().toISOString(),
                    size: Math.floor(Math.random() * 5 + 1) + ' MB',
                    status: 'completed'
                };
                
                // Store backup in localStorage
                const backups = JSON.parse(localStorage.getItem('forexterBackups') || '[]');
                backups.push(backup);
                localStorage.setItem('forexterBackups', JSON.stringify(backups));
                
                resolve({
                    success: true,
                    backup: backup,
                    message: 'Backup created successfully'
                });
            }, 2000);
        });
    }

    // Mock get backups
    async getBackups() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const backups = JSON.parse(localStorage.getItem('forexterBackups') || '[]');
                resolve({
                    success: true,
                    backups: backups
                });
            }, 500);
        });
    }
}

// Create global API instance
window.adminAPI = new AdminAPI();
