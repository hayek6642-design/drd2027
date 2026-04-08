
# Script to update the UIController class in indexCB_Phase1_Complete.html

with open('indexCB_Phase1_Complete.html', 'r') as f:
    content = f.read()

# Find and replace the init() method to add setupViewAllButtons()
old_init = '''            init() {
                this.renderAppGrid();
                this.renderDock();
                this.bindEvents();
                this.loadStats();
                this.initScrollEffects();
            }'''

new_init = '''            init() {
                this.renderAppGrid();
                this.renderDock();
                this.bindEvents();
                this.loadStats();
                this.initScrollEffects();
                this.setupViewAllButtons(); // ADD THIS LINE
            }

            // ADD THIS NEW METHOD
            setupViewAllButtons() {
                const viewAllButtons = document.querySelectorAll('.section-action');
                viewAllButtons.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const section = btn.closest('.launcher-section');
                        const categoryTitle = section.querySelector('.section-title').textContent;
                        // Map category titles to category keys
                        const categoryMap = {
                            'Media & Entertainment': 'media',
                            'Finance & Trading': 'finance',
                            'Games & Fun': 'games',
                            'AI & Productivity': 'tools',
                            'Social': 'social'
                        };
                        const category = categoryMap[categoryTitle] || categoryTitle.toLowerCase().replace(/\\s+/g, '');
                        this.showAllAppsInCategory(category, categoryTitle);
                    });
                });
            }

            // ADD THIS NEW METHOD - Shows modal with all apps in category
            showAllAppsInCategory(category, categoryTitle) {
                const categoryApps = Object.values(ServiceRegistry).filter(s => 
                    s.category.toLowerCase() === category.toLowerCase()
                );
                
                const modal = document.createElement('div');
                modal.className = 'category-modal';
                modal.innerHTML = `
                    <div class="modal-overlay" style="
                        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                        background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);
                        z-index: 1000; display: flex; align-items: center; justify-content: center;
                        padding: 20px;">
                        <div class="modal-content" style="
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            border-radius: 25px; padding: 30px; max-width: 600px; width: 100%;
                            max-height: 80vh; overflow-y: auto; position: relative;">
                            <button class="close-modal" style="
                                position: absolute; top: 15px; right: 15px;
                                background: rgba(255,255,255,0.2); border: none; color: white;
                                width: 35px; height: 35px; border-radius: 50%; cursor: pointer;">✕</button>
                            <h2 style="color: white; margin-bottom: 20px;">${categoryTitle}</h2>
                            <div class="category-apps-grid" style="
                                display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 20px;">
                                ${categoryApps.map(app => `
                                    <div class="app-icon-large" data-service="${app.id}" style="
                                        text-align: center; cursor: pointer; padding: 15px;
                                        border-radius: 20px; background: rgba(255,255,255,0.1);">
                                        <div style="width: 70px; height: 70px; border-radius: 18px;
                                            background: ${this.getCategoryColor(app.category)};
                                            display: flex; align-items: center; justify-content: center;
                                            font-size: 32px; margin: 0 auto 10px;">
                                            <i class="fas ${app.icon}"></i>
                                        </div>
                                        <div style="color: white; font-size: 13px;">${app.name}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Close handlers
                modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
                modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
                    if (e.target === modal.querySelector('.modal-overlay')) modal.remove();
                });
                
                // App click handlers
                modal.querySelectorAll('.app-icon-large').forEach(icon => {
                    icon.addEventListener('click', () => {
                        this.serviceManager.mount(icon.dataset.service);
                        modal.remove();
                    });
                });
            }

            getCategoryColor(category) {
                const colors = {
                    media: 'linear-gradient(135deg, #667eea, #764ba2)',
                    finance: 'linear-gradient(135deg, #10b981, #059669)',
                    games: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    tools: 'linear-gradient(135deg, #ec4899, #db2777)',
                    social: 'linear-gradient(135deg, #3b82f6, #2563eb)'
                };
                return colors[category] || colors.media;
            }'''

# Replace the old init() method with the new one
updated_content = content.replace(old_init, new_init)

# Write the updated content back to the file
with open('indexCB_Phase1_Complete.html', 'w') as f:
    f.write(updated_content)

print('Successfully updated UIController class')
