/**
 * app-registry.js - Central registry for all CodeBank applications
 * DIAGNOSTIC VERSION - With path fallbacks and error handling
 */

// Helper to detect correct path (for diagnostic purposes)
const pathVariants = {
    safecode: [
        './safecode/index.html',      // lowercase
        './SafeCode/index.html',      // camelCase
        './safe-code/index.html',     // hyphenated
        './safe_code/index.html',     // underscore
        '/safecode/index.html',       // absolute root
        '/codebank/safecode/index.html' // full path
    ],
    pebalaash: [
        './pebalaash/index.html',
        './Pebalaash/index.html',
        './pebalaash.html',           // flat file
        '/pebalaash/index.html'
    ],
    farragna: [
        './farragna/index.html',
        './Farragna/index.html',
        './farragna.html',
        '/farragna/index.html'
    ]
};

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
            category: 'finance',
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
            icon: 'fa-globe',
            color: 'media',
            url: './oneworld.html',
            status: 'online',
            description: 'Global content hub',
            badge: null
        },
        {
            id: 'nostaglia',
            name: 'Nostaglia',
            icon: 'fa-compact-disc',
            color: 'media',
            url: './nostaglia.html',
            status: 'online',
            description: 'Retro music collection',
            badge: null
        },
        {
            id: 'setta',
            name: 'Setta X Tes3a',
            icon: 'fa-camera',
            color: 'media',
            url: './setta.html',
            status: 'busy',
            description: 'Photo & video gallery',
            badge: 'Beta'
        },
        {
            id: 'shots',
            name: 'Shots!',
            icon: 'fa-image',
            color: 'media',
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
            category: 'tools',
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
            category: 'games',
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
            color: 'finance',
            url: './qarsan.html',
            status: 'online',
            description: 'Security & protection',
            badge: null
        }
    ],
    games: [
        {
            id: 'games',
            name: 'Games Centre',
            icon: 'fa-gamepad',
            color: 'games',
            url: './Games-Centre.html',
            status: 'online',
            description: 'Gaming hub',
            badge: null
        },
        {
            id: 'piston',
            name: 'Piston',
            icon: 'fa-cog',
            color: 'games',
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
            icon: 'fa-brain',
            color: 'ai',
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
    { id: 'safecode', name: 'Safe Assets', icon: 'fa-shield-halved', color: 'finance' },
    { id: 'samma3ny', name: 'Samma3ny', icon: 'fa-music', color: 'media' },
    { id: 'eb3at', name: 'Eb3at', icon: 'fa-paper-plane', color: 'finance' },
    { id: 'games', name: 'Games', icon: 'fa-gamepad', color: 'games' },
    { id: 'corsa', name: 'CoRsA', icon: 'fa-brain', color: 'tools' },
    { id: 'aihub', name: 'AI Hub', icon: 'fa-robot', color: 'tools' }
];

// Export path variants for diagnostic use
export { pathVariants };
