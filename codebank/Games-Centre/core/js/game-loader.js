/**
 * Game Loader - Ensures all game dependencies are properly loaded
 * This script is injected into game iframes to handle dependency loading
 */

// Game Loader
class GameLoader {
    constructor() {
        this.dependencies = {
            jquery: {
                url: 'https://code.jquery.com/jquery-3.6.0.min.js',
                test: () => typeof jQuery !== 'undefined',
                loaded: false
            },
            three: {
                url: 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js',
                test: () => typeof THREE !== 'undefined',
                loaded: false
            },
            threeOrbitControls: {
                url: 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.js',
                test: () => typeof THREE.OrbitControls !== 'undefined',
                loaded: false,
                depends: ['three']
            },
            threeGLTFLoader: {
                url: 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/GLTFLoader.js',
                test: () => typeof THREE.GLTFLoader !== 'undefined',
                loaded: false,
                depends: ['three']
            },
            threeDRACOLoader: {
                url: 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/DRACOLoader.js',
                test: () => typeof THREE.DRACOLoader !== 'undefined',
                loaded: false,
                depends: ['three']
            },
            lottie: {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.7.4/lottie.min.js',
                test: () => typeof lottie !== 'undefined',
                loaded: false
            }
        };

        this.loadQueue = [];
        this.loading = false;
    }

    /**
     * Load a dependency
     */
    loadDependency(name) {
        const dep = this.dependencies[name];
        if (!dep || dep.loaded) return Promise.resolve();

        // Check if dependencies are met
        if (dep.depends && dep.depends.length > 0) {
            const missingDeps = dep.depends.filter(d => !this.dependencies[d].loaded);
            if (missingDeps.length > 0) {
                return Promise.all(missingDeps.map(d => this.loadDependency(d)))
                    .then(() => this.loadDependency(name));
            }
        }

        return new Promise((resolve, reject) => {
            if (dep.test()) {
                // Already loaded
                dep.loaded = true;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = dep.url;
            script.onload = () => {
                dep.loaded = true;
                resolve();
            };
            script.onerror = () => {
                console.error(`Failed to load dependency: ${name}`);
                reject(new Error(`Failed to load ${name}`));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Load multiple dependencies
     */
    loadDependencies(names) {
        return Promise.all(names.map(name => this.loadDependency(name)));
    }

    /**
     * Auto-detect and load required dependencies for a game
     */
    autoLoadForGame(gameName) {
        const depsToLoad = [];

        // Game-specific dependencies
        switch (gameName) {
            case 'tertis-classic':
                depsToLoad.push('jquery');
                break;
            case 'spinner':
                depsToLoad.push('three', 'threeOrbitControls', 'threeGLTFLoader', 'threeDRACOLoader', 'lottie');
                break;
            case 'river-raid':
                depsToLoad.push('jquery');
                break;
            case 'snake&ladder1':
                depsToLoad.push('jquery');
                break;
            default:
                // Try to auto-detect from scripts
                const scripts = document.getElementsByTagName('script');
                for (let script of scripts) {
                    if (script.src.includes('jquery')) depsToLoad.push('jquery');
                    if (script.src.includes('three')) depsToLoad.push('three');
                }
                break;
        }

        if (depsToLoad.length > 0) {
            return this.loadDependencies(depsToLoad);
        }

        return Promise.resolve();
    }
}

// Create global game loader instance
window.gameLoader = new GameLoader();

// Auto-load dependencies when game loads
document.addEventListener('DOMContentLoaded', () => {
    // Get game name from URL or other context
    const gameName = window.location.pathname.split('/').pop().replace('/index.html', '');

    // Auto-load dependencies for this game
    window.gameLoader.autoLoadForGame(gameName)
        .then(() => {
            console.log('All dependencies loaded successfully');
        })
        .catch(error => {
            console.error('Failed to load dependencies:', error);
        });
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameLoader;
}