// Asset Management System
// Comprehensive tracking of digital and physical inventories
// Supports fungible and non-fungible assets with full lifecycle management

import { errorHandler } from './advanced-error-handler.js';
import { transactionMonitor } from './transaction-monitor.js';
import { firebase } from './src/core/database/firebase-client.js';

export class AssetManager {
    constructor(options = {}) {
        this.enablePersistence = options.enablePersistence !== false;
        this.maxAssetHistory = options.maxAssetHistory || 1000;
        this.assetCategories = options.assetCategories || {
            digital: ['codes', 'tokens', 'nft', 'digital_currency'],
            physical: ['bars', 'coins', 'collectibles', 'documents'],
            fungible: ['codes', 'tokens', 'bars', 'coins'],
            non_fungible: ['nft', 'collectibles', 'documents']
        };

        // Asset storage
        this.assets = new Map();
        this.assetHistory = [];
        this.assetCategoriesMap = new Map();

        // Valuation tracking
        this.priceFeeds = new Map();
        this.valuationHistory = new Map();

        // Initialize
        this._initializeAssetCategories();
        this._loadPersistedAssets();

        console.log('🚀 Asset Manager initialized');
    }

    // Register a new asset
    async registerAsset(assetData) {
        const assetId = assetData.id || `asset_${Date.now()}_${Math.random().toString(36).substring(2)}`;

        try {
            console.log('📦 Registering asset:', assetId, assetData);

            // Validate asset data
            this._validateAssetData(assetData);

            const asset = {
                id: assetId,
                userId: assetData.userId,
                type: assetData.type, // 'digital', 'physical'
                category: assetData.category,
                subType: assetData.subType, // 'codes', 'bars', 'nft', etc.
                name: assetData.name,
                description: assetData.description,
                metadata: assetData.metadata || {},
                quantity: assetData.quantity || 1,
                unitValue: assetData.unitValue || 0,
                totalValue: (assetData.quantity || 1) * (assetData.unitValue || 0),
                status: assetData.status || 'active', // 'active', 'inactive', 'transferred', 'sold'
                location: assetData.location || 'inventory',
                tags: assetData.tags || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                history: [{
                    action: 'created',
                    timestamp: Date.now(),
                    details: assetData
                }]
            };

            // Store asset
            this.assets.set(assetId, asset);

            // Update category mapping
            if (!this.assetCategoriesMap.has(assetData.category)) {
                this.assetCategoriesMap.set(assetData.category, new Set());
            }
            this.assetCategoriesMap.get(assetData.category).add(assetId);

            // Add to history
            this._addToHistory({
                assetId,
                action: 'register',
                details: assetData,
                timestamp: Date.now()
            });

            // Persist if enabled
            if (this.enablePersistence) {
                await this._persistAsset(asset);
            }

            // Record transaction
            transactionMonitor.recordTransactionComplete(`asset_register_${assetId}`, true, null, {
                assetId,
                type: asset.type,
                category: asset.category
            });

            console.log('✅ Asset registered:', assetId);
            return asset;

        } catch (error) {
            console.error('Error registering asset:', error);
            transactionMonitor.recordError(error, 'asset_register', { assetId, assetData });
            throw error;
        }
    }

    // Update asset information
    async updateAsset(assetId, updates) {
        try {
            const asset = this.assets.get(assetId);
            if (!asset) {
                throw new Error('Asset not found');
            }

            console.log('📝 Updating asset:', assetId, updates);

            // Store old state for history
            const oldAsset = { ...asset };

            // Apply updates
            const updatedAsset = {
                ...asset,
                ...updates,
                totalValue: (updates.quantity !== undefined ? updates.quantity : asset.quantity) *
                           (updates.unitValue !== undefined ? updates.unitValue : asset.unitValue),
                updatedAt: new Date().toISOString()
            };

            // Update asset
            this.assets.set(assetId, updatedAsset);

            // Add to history
            this._addToHistory({
                assetId,
                action: 'update',
                details: { old: oldAsset, new: updates },
                timestamp: Date.now()
            });

            // Persist if enabled
            if (this.enablePersistence) {
                await this._persistAsset(updatedAsset);
            }

            console.log('✅ Asset updated:', assetId);
            return updatedAsset;

        } catch (error) {
            console.error('Error updating asset:', error);
            transactionMonitor.recordError(error, 'asset_update', { assetId, updates });
            throw error;
        }
    }

    // Transfer asset between users/locations
    async transferAsset(assetId, toUserId, quantity = null) {
        try {
            const asset = this.assets.get(assetId);
            if (!asset) {
                throw new Error('Asset not found');
            }

            console.log('🔄 Transferring asset:', assetId, 'to user:', toUserId);

            const transferQuantity = quantity || asset.quantity;

            if (transferQuantity > asset.quantity) {
                throw new Error('Insufficient asset quantity for transfer');
            }

            // Create transfer record
            const transfer = {
                id: `transfer_${Date.now()}_${Math.random().toString(36).substring(2)}`,
                assetId,
                fromUserId: asset.userId,
                toUserId,
                quantity: transferQuantity,
                transferValue: transferQuantity * asset.unitValue,
                timestamp: Date.now(),
                status: 'pending'
            };

            // Update asset quantity or mark as transferred
            if (transferQuantity === asset.quantity) {
                await this.updateAsset(assetId, {
                    status: 'transferred',
                    location: `transferred_to_${toUserId}`
                });
            } else {
                await this.updateAsset(assetId, {
                    quantity: asset.quantity - transferQuantity
                });

                // Create new asset for transferred portion
                const transferredAsset = {
                    ...asset,
                    id: `asset_${Date.now()}_${Math.random().toString(36).substring(2)}`,
                    userId: toUserId,
                    quantity: transferQuantity,
                    totalValue: transferQuantity * asset.unitValue,
                    status: 'transferred',
                    location: `received_from_${asset.userId}`,
                    history: [{
                        action: 'transferred_in',
                        timestamp: Date.now(),
                        details: { fromUserId: asset.userId, transferId: transfer.id }
                    }]
                };

                this.assets.set(transferredAsset.id, transferredAsset);
            }

            // Add transfer to history
            this._addToHistory({
                assetId,
                action: 'transfer',
                details: transfer,
                timestamp: Date.now()
            });

            console.log('✅ Asset transferred:', assetId);
            return transfer;

        } catch (error) {
            console.error('Error transferring asset:', error);
            transactionMonitor.recordError(error, 'asset_transfer', { assetId, toUserId, quantity });
            throw error;
        }
    }

    // Get asset by ID
    getAsset(assetId) {
        return this.assets.get(assetId);
    }

    // Get assets by user
    getAssetsByUser(userId, filters = {}) {
        const userAssets = [];

        for (const asset of this.assets.values()) {
            if (asset.userId !== userId) continue;

            // Apply filters
            if (filters.type && asset.type !== filters.type) continue;
            if (filters.category && asset.category !== filters.category) continue;
            if (filters.status && asset.status !== filters.status) continue;
            if (filters.location && asset.location !== filters.location) continue;

            userAssets.push(asset);
        }

        return userAssets;
    }

    // Get assets by category
    getAssetsByCategory(category) {
        const assetIds = this.assetCategoriesMap.get(category) || new Set();
        const assets = [];

        for (const assetId of assetIds) {
            const asset = this.assets.get(assetId);
            if (asset) {
                assets.push(asset);
            }
        }

        return assets;
    }

    // Calculate portfolio value
    calculatePortfolioValue(userId, currency = 'USD') {
        const assets = this.getAssetsByUser(userId, { status: 'active' });
        let totalValue = 0;
        const breakdown = {};

        for (const asset of assets) {
            const assetValue = asset.totalValue || 0;
            totalValue += assetValue;

            // Breakdown by category
            if (!breakdown[asset.category]) {
                breakdown[asset.category] = 0;
            }
            breakdown[asset.category] += assetValue;
        }

        return {
            totalValue,
            currency,
            breakdown,
            assetCount: assets.length,
            lastCalculated: new Date().toISOString()
        };
    }

    // Get asset history
    getAssetHistory(assetId, limit = 100) {
        return this.assetHistory
            .filter(entry => entry.assetId === assetId)
            .slice(0, limit);
    }

    // Get all asset history
    getAllHistory(filters = {}, limit = 1000) {
        let history = [...this.assetHistory];

        if (filters.userId) {
            history = history.filter(entry => {
                const asset = this.assets.get(entry.assetId);
                return asset && asset.userId === filters.userId;
            });
        }

        if (filters.action) {
            history = history.filter(entry => entry.action === filters.action);
        }

        if (filters.fromDate) {
            history = history.filter(entry => entry.timestamp >= filters.fromDate);
        }

        if (filters.toDate) {
            history = history.filter(entry => entry.timestamp <= filters.toDate);
        }

        return history
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    // Update asset valuation
    async updateAssetValuation(assetId, newUnitValue, source = 'manual') {
        try {
            const updates = {
                unitValue: newUnitValue,
                totalValue: null, // Will be recalculated
                valuationSource: source,
                lastValuation: new Date().toISOString()
            };

            // Recalculate total value
            const asset = this.assets.get(assetId);
            if (asset) {
                updates.totalValue = asset.quantity * newUnitValue;
            }

            const updatedAsset = await this.updateAsset(assetId, updates);

            // Record valuation change
            this._addToHistory({
                assetId,
                action: 'valuation_update',
                details: {
                    oldUnitValue: asset.unitValue,
                    newUnitValue,
                    source,
                    valueChange: updates.totalValue - asset.totalValue
                },
                timestamp: Date.now()
            });

            return updatedAsset;

        } catch (error) {
            console.error('Error updating asset valuation:', error);
            throw error;
        }
    }

    // Bulk asset operations
    async bulkUpdateAssets(assetIds, updates) {
        const results = [];

        for (const assetId of assetIds) {
            try {
                const result = await this.updateAsset(assetId, updates);
                results.push({ success: true, assetId, asset: result });
            } catch (error) {
                results.push({ success: false, assetId, error: error.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`📦 Bulk update completed: ${successCount}/${results.length} successful`);

        return results;
    }

    // Asset search and filtering
    searchAssets(query, filters = {}) {
        const results = [];
        const searchTerm = query.toLowerCase();

        for (const asset of this.assets.values()) {
            // Text search
            const searchableText = [
                asset.name,
                asset.description,
                asset.category,
                asset.subType,
                ...(asset.tags || [])
            ].join(' ').toLowerCase();

            if (!searchableText.includes(searchTerm)) {
                continue;
            }

            // Apply filters
            if (filters.type && asset.type !== filters.type) continue;
            if (filters.category && asset.category !== filters.category) continue;
            if (filters.status && asset.status !== filters.status) continue;
            if (filters.userId && asset.userId !== filters.userId) continue;

            results.push(asset);
        }

        return results;
    }

    // Export asset data
    exportAssetData(format = 'json') {
        const data = {
            assets: Array.from(this.assets.values()),
            history: this.assetHistory,
            categories: Array.from(this.assetCategoriesMap.entries()),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };

        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        }

        if (format === 'csv') {
            return this._convertToCSV(data.assets);
        }

        return data;
    }

    // Import asset data
    async importAssetData(data, options = {}) {
        try {
            const { assets, history } = data;
            const overwrite = options.overwrite || false;

            console.log('📥 Importing asset data:', assets.length, 'assets');

            // Import assets
            for (const assetData of assets) {
                if (overwrite || !this.assets.has(assetData.id)) {
                    this.assets.set(assetData.id, assetData);

                    // Update category mapping
                    if (!this.assetCategoriesMap.has(assetData.category)) {
                        this.assetCategoriesMap.set(assetData.category, new Set());
                    }
                    this.assetCategoriesMap.get(assetData.category).add(assetData.id);
                }
            }

            // Import history
            if (history && options.importHistory) {
                this.assetHistory.unshift(...history);
                this.assetHistory = this.assetHistory.slice(0, this.maxAssetHistory);
            }

            // Persist
            if (this.enablePersistence) {
                await this._persistAllAssets();
            }

            console.log('✅ Asset data imported successfully');
            return { success: true, importedAssets: assets.length };

        } catch (error) {
            console.error('Error importing asset data:', error);
            throw error;
        }
    }

    // Get asset statistics
    getAssetStatistics(userId = null) {
        const assets = userId ?
            this.getAssetsByUser(userId) :
            Array.from(this.assets.values());

        const stats = {
            totalAssets: assets.length,
            totalValue: 0,
            byType: {},
            byCategory: {},
            byStatus: {},
            averageValue: 0,
            topAssets: []
        };

        for (const asset of assets) {
            // Total value
            stats.totalValue += asset.totalValue || 0;

            // By type
            stats.byType[asset.type] = (stats.byType[asset.type] || 0) + 1;

            // By category
            stats.byCategory[asset.category] = (stats.byCategory[asset.category] || 0) + 1;

            // By status
            stats.byStatus[asset.status] = (stats.byStatus[asset.status] || 0) + 1;
        }

        // Average value
        stats.averageValue = assets.length > 0 ? stats.totalValue / assets.length : 0;

        // Top assets by value
        stats.topAssets = assets
            .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
            .slice(0, 10);

        return stats;
    }

    // Validate asset data
    _validateAssetData(assetData) {
        if (!assetData.userId) {
            throw new Error('User ID is required');
        }

        if (!assetData.type || !['digital', 'physical'].includes(assetData.type)) {
            throw new Error('Valid asset type is required (digital or physical)');
        }

        if (!assetData.category) {
            throw new Error('Asset category is required');
        }

        if (!assetData.name) {
            throw new Error('Asset name is required');
        }

        if (assetData.quantity !== undefined && assetData.quantity < 0) {
            throw new Error('Asset quantity cannot be negative');
        }

        if (assetData.unitValue !== undefined && assetData.unitValue < 0) {
            throw new Error('Asset unit value cannot be negative');
        }
    }

    // Add to history
    _addToHistory(entry) {
        this.assetHistory.unshift(entry);

        // Keep only recent history
        if (this.assetHistory.length > this.maxAssetHistory) {
            this.assetHistory = this.assetHistory.slice(0, this.maxAssetHistory);
        }

        // Persist history periodically
        if (this.assetHistory.length % 100 === 0 && this.enablePersistence) {
            this._persistHistory();
        }
    }

    // Initialize asset categories
    _initializeAssetCategories() {
        // Flatten category mappings for quick lookup
        for (const [type, categories] of Object.entries(this.assetCategories)) {
            for (const category of categories) {
                if (!this.assetCategoriesMap.has(category)) {
                    this.assetCategoriesMap.set(category, new Set());
                }
            }
        }
    }

    // Persistence methods
    async _persistAsset(asset) {
        try {
            if (this.enablePersistence) {
                localStorage.setItem(`asset_${asset.id}`, JSON.stringify(asset));

                // Update asset index
                const index = JSON.parse(localStorage.getItem('asset_index') || '{}');
                index[asset.id] = {
                    id: asset.id,
                    userId: asset.userId,
                    type: asset.type,
                    category: asset.category,
                    updatedAt: asset.updatedAt
                };
                localStorage.setItem('asset_index', JSON.stringify(index));
            }
        } catch (error) {
            console.warn('Failed to persist asset:', error);
        }
    }

    async _persistAllAssets() {
        try {
            const index = {};

            for (const asset of this.assets.values()) {
                localStorage.setItem(`asset_${asset.id}`, JSON.stringify(asset));
                index[asset.id] = {
                    id: asset.id,
                    userId: asset.userId,
                    type: asset.type,
                    category: asset.category,
                    updatedAt: asset.updatedAt
                };
            }

            localStorage.setItem('asset_index', JSON.stringify(index));
            console.log('💾 All assets persisted');
        } catch (error) {
            console.warn('Failed to persist all assets:', error);
        }
    }

    _persistHistory() {
        try {
            localStorage.setItem('asset_history', JSON.stringify(this.assetHistory.slice(0, 500)));
        } catch (error) {
            console.warn('Failed to persist history:', error);
        }
    }

    _loadPersistedAssets() {
        try {
            // Load asset index
            const indexData = localStorage.getItem('asset_index');
            if (indexData) {
                const index = JSON.parse(indexData);

                // Load assets
                for (const assetId of Object.keys(index)) {
                    const assetData = localStorage.getItem(`asset_${assetId}`);
                    if (assetData) {
                        const asset = JSON.parse(assetData);
                        this.assets.set(assetId, asset);

                        // Update category mapping
                        if (!this.assetCategoriesMap.has(asset.category)) {
                            this.assetCategoriesMap.set(asset.category, new Set());
                        }
                        this.assetCategoriesMap.get(asset.category).add(assetId);
                    }
                }

                console.log(`📦 Loaded ${this.assets.size} persisted assets`);
            }

            // Load history
            const historyData = localStorage.getItem('asset_history');
            if (historyData) {
                const history = JSON.parse(historyData);
                this.assetHistory = history;
                console.log(`📚 Loaded ${history.length} history entries`);
            }

        } catch (error) {
            console.warn('Failed to load persisted assets:', error);
        }
    }

    // Utility methods
    _convertToCSV(assets) {
        if (assets.length === 0) return '';

        const headers = ['ID', 'Name', 'Type', 'Category', 'Quantity', 'Unit Value', 'Total Value', 'Status', 'Created At'];
        const rows = [headers.join(',')];

        for (const asset of assets) {
            const row = [
                asset.id,
                `"${asset.name}"`,
                asset.type,
                asset.category,
                asset.quantity,
                asset.unitValue,
                asset.totalValue,
                asset.status,
                asset.createdAt
            ];
            rows.push(row.join(','));
        }

        return rows.join('\n');
    }

    // Get asset manager statistics
    getManagerStats() {
        return {
            totalAssets: this.assets.size,
            totalHistoryEntries: this.assetHistory.length,
            categories: Array.from(this.assetCategoriesMap.keys()),
            lastUpdated: new Date().toISOString()
        };
    }

    // Clear all assets (for testing/reset)
    clearAllAssets() {
        this.assets.clear();
        this.assetHistory = [];
        this.assetCategoriesMap.clear();

        // Clear localStorage
        if (this.enablePersistence) {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('asset_') || key === 'asset_index' || key === 'asset_history')) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
        }

        console.log('🗑️ All assets cleared');
    }

    // Destroy asset manager
    destroy() {
        this.assets.clear();
        this.assetHistory = [];
        this.assetCategoriesMap.clear();
        console.log('💥 Asset Manager destroyed');
    }
}

// Create global instance
export const assetManager = new AssetManager();

// Auto-initialize
if (typeof window !== 'undefined') {
    window.assetManager = assetManager;
    console.log('🚀 Asset Manager ready');
}

export default AssetManager;