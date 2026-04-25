/**
 * app-registry.js - Central registry for all CodeBank applications
 * BADGES REMOVED - Clean app grid display
 */

export const AppRegistry = {
    core: [
        {
            id: 'safecode',
            name: 'SafeCode',
            category: 'core',
            icon: 'fa-shield-alt',
            color: '#10b981',
            url: '/codebank/safecode/',
            fallbackUrls: [],
            description: 'Secure code storage',
            status: 'online',
            badge: null
        }
    ],
    media: [
        {
            id: 'samma3ny',
            name: 'Samma3ny',
            category: 'media',
            icon: 'fa-music',
            color: '#8b5cf6',
            url: '/codebank/samma3ny.html',
            description: 'Audio platform',
            status: 'online',
            badge: null
        },
        {
            id: 'battalooda',
            name: 'Battalooda',
            category: 'media',
            icon: 'fa-microphone-alt',
            color: '#e74c3c',
            url: '/codebank/battaloosa-modern.html',
            description: 'Vocal talent discovery platform',
            status: 'online',
            badge: null
        },
        {
            id: 'farragna',
            name: 'Farragna',
            category: 'media',
            icon: 'fa-chart-line',
            color: '#ec4899',
            url: '/codebank/farragna-modern.html',
            description: 'Trading platform',
            status: 'online',
            badge: null
        },
        {
            id: 'oneworld',
            name: 'OneWorld',
            category: 'media',
            icon: 'fa-globe',
            color: '#8b5cf6',
            url: '/codebank/oneworld/index.html',
            status: 'online',
            description: 'Global content hub',
            badge: null
        },
        {
            id: 'nostalgia',
            name: 'Nostalgia',
            category: 'media',
            icon: 'fa-compact-disc',
            color: '#8b5cf6',
            url: '/codebank/nostalgia/',
            status: 'maintenance',
            description: 'Retro music collection',
            badge: null
        },
        {
            id: 'setta',
            name: 'Setta X Tes3a',
            category: 'media',
            icon: 'fa-camera',
            color: '#8b5cf6',
            url: '/codebank/setta/',
            status: 'maintenance',
            description: 'Photo & video gallery',
            badge: null
        },
        {
            id: 'shots',
            name: 'Shots!',
            category: 'media',
            icon: 'fa-image',
            color: '#8b5cf6',
            url: '/codebank/shots/',
            status: 'online',
            description: 'Screenshot manager',
            badge: null
        }
    ],
    finance: [
        {
            id: 'eb3at',
            name: 'Eb3at',
            category: 'finance',
            icon: 'fa-paper-plane',
            color: '#3b82f6',
            url: '/codebank/eb3at/',
            description: 'Messaging service',
            status: 'online',
            badge: null
        },
        {
            id: 'pebalaash',
            name: 'Pebalaash',
            category: 'finance',
            icon: 'fa-gamepad',
            color: '#f59e0b',
            url: '/codebank/pebalaash-modern.html',
            description: 'Marketplace platform',
            status: 'online',
            badge: null
        },
        {
            id: 'qarsan',
            name: 'Qarsan',
            icon: 'fa-shield-alt',
            color: '#3b82f6',
            url: '/codebank/qarsan/index.html',
            status: 'online',
            description: 'Security & protection',
            badge: null
        }
    ],
    games: [
        {
            id: 'games',
            name: 'Games Centre',
            category: 'games',
            icon: 'fa-gamepad',
            color: '#f59e0b',
            url: '/codebank/Games-Centre.html',
            status: 'online',
            description: 'Gaming hub',
            badge: null
        },
        {
            id: 'yahood',
            name: 'Yahood!',
            category: 'games',
            icon: 'fa-map-marked-alt',
            color: '#10b981',
            url: '/codebank/yahood/',
            status: 'online',
            description: 'Geo-based treasure mining & PvP world',
            badge: null
        },
        {
            id: 'piston',
            name: 'Piston',
            category: 'games',
            icon: 'fa-cog',
            color: '#f59e0b',
            url: '/codebank/piston.html',
            status: 'offline',
            description: 'Game engine',
            badge: null
        }
    ],
    tools: [
        {
            id: 'corsa',
            name: 'CoRsA',
            category: 'tools',
            icon: 'fa-brain',
            color: '#7c3aed',
            url: '/codebank/corsa/',
            status: 'online',
            description: 'AI Assistant',
            badge: null
        },
        {
            id: 'aihub',
            name: 'AI Hub',
            category: 'tools',
            icon: 'fa-robot',
            color: '#7c3aed',
            url: '/codebank/aihub/',
            description: 'Gateway to the AI World',
            status: 'online',
            badge: null
        },
        {
            id: 'openHands',
            name: 'OpenHands',
            category: 'tools',
            icon: 'fa-hands',
            color: '#6366f1',
            url: 'https://docs.openhands.dev/overview/welcome',
            description: 'AI Software Agent - Open in iframe',
            status: 'online',
            badge: null,
            target: '_self'
        },
        {
            id: 'calculator',
            name: 'Calculator',
            category: 'tools',
            icon: 'fa-calculator',
            color: '#10b981',
            url: '/codebank/calculator/',
            description: 'Scientific Calculator',
            status: 'online',
            badge: null
        },
        {
            id: 'e7ki',
            name: 'E7ki',
            category: 'tools',
            icon: 'fa-comments',
            color: '#06b6d4',
            url: '/codebank/e7ki/',
            description: 'Chat platform with ZAGEL messenger',
            status: 'online',
            badge: null
        }
    ]
};

export const DockConfig = [
    { id: 'safecode', name: 'Safe Assets', icon: 'fa-shield-halved', color: '#3b82f6' },
    { id: 'samma3ny', name: 'Samma3ny', icon: 'fa-music', color: '#8b5cf6' },
    { id: 'eb3at', name: 'Eb3at', icon: 'fa-paper-plane', color: '#3b82f6' },
    { id: 'games', name: 'Games', icon: 'fa-gamepad', color: '#f59e0b' },
    { id: 'corsa', name: 'CoRsA', icon: 'fa-brain', color: '#06b6d4' },
    { id: 'aihub', name: 'AI Hub', icon: 'fa-robot', color: '#06b6d4' }
];
