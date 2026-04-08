/**
 * app-registry.js - Central registry for all CodeBank applications
 * DIAGNOSTIC VERSION - With path fallbacks and error handling
 */

export const AppRegistry = {
    core: [
        {
            id: 'safecode',
            name: 'SafeCode',
            category: 'core',
            icon: 'fa-shield-alt',
            color: '#10b981',
            url: '/codebank/safecode.html',      // ✅ المسار المطلق بعد النقل 
            fallbackUrls: [],                     // أفرغ المصفوفة لتجنب أي التباس 
            description: 'Secure code storage',
            status: 'online',
            badge: 'Core'
        }
    ],
    media: [
        {
            id: 'samma3ny',
            name: 'Samma3ny',
            category: 'media',
            icon: 'fa-music',
            color: '#8b5cf6',
            url: './samma3ny.html',
            description: 'Audio platform',
            status: 'online',
            badge: null
        },
        {
            id: 'battalooda',
            name: 'Battalooda (بطلودة)',
            category: 'media',
            icon: 'fa-microphone-alt',
            color: '#e74c3c',
            url: '/codebank/battalooda.html',
            description: 'منصة لاكتشاف المواهب الصوتية',
            status: 'online',
            badge: 'جديد'
        },
        {
            id: 'farragna',
            name: 'Farragna',
            category: 'media',
            icon: 'fa-chart-line',
            color: '#ec4899',
            url: './farragna.html',
            description: 'Trading platform',
            status: 'online',
            badge: 'New'
        },
        {
            id: 'oneworld',
            name: 'OneWorld',
            category: 'media',
            icon: 'fa-globe',
            color: '#8b5cf6',
            url: './oneworld/index.html',
            status: 'online',
            description: 'Global content hub',
            badge: null
        },
        {
            id: 'nostaglia',
            name: 'Nostaglia',
            category: 'media',
            icon: 'fa-compact-disc',
            color: '#8b5cf6',
            url: './nostaglia.html',
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
            url: './setta.html',
            status: 'maintenance',
            description: 'Photo & video gallery',
            badge: 'Beta'
        },
        {
            id: 'shots',
            name: 'Shots!',
            category: 'media',
            icon: 'fa-image',
            color: '#8b5cf6',
            url: './shots.html',
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
            url: './eb3at.html',
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
            url: './pebalaash.html',
            description: 'Gaming platform',
            status: 'online',
            badge: 'Hot'
        },
        {
            id: 'qarsan',
            name: 'Qarsan',
            icon: 'fa-shield-alt',
            color: '#3b82f6',
            url: './qarsan/index.html',
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
            url: './Games-Centre.html',
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
            url: './yahood.html',
            status: 'online',
            description: 'Geo-based treasure mining & PvP world',
            badge: 'New'
        },
        {
            id: 'piston',
            name: 'Piston',
            category: 'games',
            icon: 'fa-cog',
            color: '#f59e0b',
            url: './piston.html',
            status: 'offline',
            description: 'Game engine',
            badge: 'Soon'
        }
    ],
    tools: [
        {
            id: 'corsa',
            name: 'CoRsA',
            category: 'tools',
            icon: 'fa-brain',
            color: '#7c3aed',
            url: './corsa.html',
            status: 'online',
            description: 'AI Assistant',
            badge: 'AI'
        },
        {
            id: 'aihub',
            name: 'AI Hub',
            category: 'tools',
            icon: 'fa-robot',
            color: '#7c3aed',
            url: './aihub.html',
            description: 'Gateway to the AI World',
            status: 'online',
            badge: 'AI'
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
            badge: 'New',
            target: '_self'
        },
        {
            id: 'calculator',
            name: 'Calculator',
            category: 'tools',
            icon: 'fa-calculator',
            color: '#10b981',
            url: './calculator.html',
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
            url: './e7ki.html',
            description: 'Chat platform',
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
