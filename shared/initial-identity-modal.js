// Initial Identity Setup Modal - First Run User Registration
// Displays mandatory setup modal for new users

class InitialIdentityModal {
    constructor() {
        try { if (window.__AUTH_OVERLAY_DISABLED__ === true) return; } catch(_){}
        this.modal = null;
        this.form = null;
        this.isVisible = false;
        this.init();
    }

    async init() {
        // Check if user has already completed setup
        const hasCompletedSetup = await this.checkSetupCompleted();

        if (!hasCompletedSetup) {
            this.createModal();
            this.show();
        }
    }

    async checkSetupCompleted() {
        try {
            // Check unifiedStorage first
            if (window.unifiedStorage) {
                const completed = await window.unifiedStorage.cacheGet('identitySetupCompleted');
                if (completed === true) return true;
            }

            // Check localStorage as fallback
            const localCompleted = localStorage.getItem('identitySetupCompleted');
            if (localCompleted === 'true') return true;

            // Check if user exists in Neon (via API)
            if (window.AuthClient) {
                const session = await window.AuthClient.getSession();
                if (session?.user) return true;
            }

            return false;
        } catch (error) {
            console.warn('Error checking setup completion:', error);
            return false;
        }
    }

    createModal() {
        // Create modal overlay
        this.modal = document.createElement('div');
        this.modal.id = 'initial-identity-modal';
        this.modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
            color: white;
            text-align: center;
        `;

        modalContent.innerHTML = `
            <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 700;">Welcome to CodeBank</h2>
                <p style="margin: 0; font-size: 16px; opacity: 0.9;">Please complete your identity setup to continue</p>
            </div>

            <form id="identity-form" style="display: flex; flex-direction: column; gap: 20px;">
                <div style="text-align: left;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Country</label>
                    <select id="country-select" required style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 8px;
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        font-size: 16px;
                    ">
                        <option value="">Select your country</option>
                        <option value="AE">United Arab Emirates</option>
                        <option value="EG">Egypt</option>
                        <option value="SA">Saudi Arabia</option>
                        <option value="US">United States</option>
                        <option value="GB">United Kingdom</option>
                        <option value="DE">Germany</option>
                        <option value="FR">France</option>
                        <option value="IN">India</option>
                        <option value="PK">Pakistan</option>
                        <option value="TR">Turkey</option>
                        <option value="IR">Iran</option>
                        <option value="IQ">Iraq</option>
                        <option value="JO">Jordan</option>
                        <option value="LB">Lebanon</option>
                        <option value="SY">Syria</option>
                        <option value="YE">Yemen</option>
                        <option value="OM">Oman</option>
                        <option value="KW">Kuwait</option>
                        <option value="QA">Qatar</option>
                        <option value="BH">Bahrain</option>
                        <option value="IL">Israel</option>
                        <option value="PS">Palestine</option>
                        <option value="MA">Morocco</option>
                        <option value="TN">Tunisia</option>
                        <option value="DZ">Algeria</option>
                        <option value="LY">Libya</option>
                        <option value="SD">Sudan</option>
                        <option value="SO">Somalia</option>
                        <option value="ET">Ethiopia</option>
                        <option value="KE">Kenya</option>
                        <option value="UG">Uganda</option>
                        <option value="TZ">Tanzania</option>
                        <option value="ZA">South Africa</option>
                        <option value="NG">Nigeria</option>
                        <option value="GH">Ghana</option>
                        <option value="CI">Ivory Coast</option>
                        <option value="SN">Senegal</option>
                        <option value="ML">Mali</option>
                        <option value="BF">Burkina Faso</option>
                        <option value="NE">Niger</option>
                        <option value="TD">Chad</option>
                        <option value="CM">Cameroon</option>
                        <option value="GA">Gabon</option>
                        <option value="CG">Republic of Congo</option>
                        <option value="CD">Democratic Republic of Congo</option>
                        <option value="RW">Rwanda</option>
                        <option value="BI">Burundi</option>
                        <option value="MW">Malawi</option>
                        <option value="MZ">Mozambique</option>
                        <option value="ZW">Zimbabwe</option>
                        <option value="ZM">Zambia</option>
                        <option value="BW">Botswana</option>
                        <option value="NA">Namibia</option>
                        <option value="AO">Angola</option>
                    </select>
                </div>

                <div style="text-align: left;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Language</label>
                    <select id="language-select" required style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 8px;
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        font-size: 16px;
                    ">
                        <option value="">Select your language</option>
                        <option value="ar">العربية (Arabic)</option>
                        <option value="en">English</option>
                        <option value="ur">اردو (Urdu)</option>
                        <option value="fa">فارسی (Persian)</option>
                        <option value="tr">Türkçe (Turkish)</option>
                        <option value="fr">Français (French)</option>
                        <option value="de">Deutsch (German)</option>
                        <option value="hi">हिन्दी (Hindi)</option>
                        <option value="sw">Kiswahili (Swahili)</option>
                        <option value="am">አማርኛ (Amharic)</option>
                        <option value="ha">Hausa</option>
                        <option value="yo">Yoruba</option>
                    </select>
                </div>

                <div style="text-align: left;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Religion</label>
                    <select id="religion-select" required style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 8px;
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        font-size: 16px;
                    ">
                        <option value="">Select your religion</option>
                        <option value="islam">Islam</option>
                        <option value="christianity">Christianity</option>
                        <option value="judaism">Judaism</option>
                        <option value="hinduism">Hinduism</option>
                        <option value="buddhism">Buddhism</option>
                        <option value="sikhism">Sikhism</option>
                        <option value="other">Other</option>
                        <option value="none">None</option>
                    </select>
                </div>

                <div style="text-align: left;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Email</label>
                    <input type="email" id="email-input" required placeholder="your.email@example.com" style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 8px;
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        font-size: 16px;
                    ">
                </div>

                <div style="text-align: left;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Password</label>
                    <input type="password" id="password-input" required placeholder="Create a strong password" style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 8px;
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        font-size: 16px;
                    ">
                </div>

                <div style="text-align: left;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Telephone Number</label>
                    <input type="tel" id="phone-input" required placeholder="+971 50 123 4567" style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 8px;
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        font-size: 16px;
                    ">
                </div>

                <button type="submit" id="submit-btn" style="
                    background: linear-gradient(135deg, #4CAF50, #45a049);
                    color: white;
                    border: none;
                    padding: 15px;
                    border-radius: 10px;
                    font-size: 18px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-top: 20px;
                ">Complete Setup</button>
            </form>
        `;

        this.modal.appendChild(modalContent);
        document.body.appendChild(this.modal);

        this.form = document.getElementById('identity-form');
        this.setupFormHandlers();
    }

    setupFormHandlers() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit();
        });
    }

    async handleSubmit() {
        const submitBtn = document.getElementById('submit-btn');
        const originalText = submitBtn.textContent;

        try {
            submitBtn.textContent = 'Creating Account...';
            submitBtn.disabled = true;

            const formData = {
                country: document.getElementById('country-select').value,
                language: document.getElementById('language-select').value,
                religion: document.getElementById('religion-select').value,
                email: document.getElementById('email-input').value,
                password: document.getElementById('password-input').value,
                phone: document.getElementById('phone-input').value
            };

            // Validate required fields
            if (!formData.country || !formData.language || !formData.religion ||
                !formData.email || !formData.password || !formData.phone) {
                throw new Error('All fields are required');
            }

            // Create user account via API
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Registration failed');
            }

            const result = await response.json();

            // Store setup completion flag
            if (window.unifiedStorage) {
                await window.unifiedStorage.cacheSet('identitySetupCompleted', true);
            }
            localStorage.setItem('identitySetupCompleted', 'true');

            // Store user preferences
            const preferences = {
                country: formData.country,
                language: formData.language,
                religion: formData.religion
            };

            if (window.unifiedStorage) {
                await window.unifiedStorage.cacheSet('userPreferences', preferences);
            }
            localStorage.setItem('userPreferences', JSON.stringify(preferences));

            // Hide modal
            this.hide();

            // Dispatch success events (canonical + legacy)
            try { window.dispatchEvent(new CustomEvent('identity:completed', { detail: { user: result.user, jwt: result.jwt } })); } catch(_){}
            try { window.dispatchEvent(new CustomEvent('identity:setup:completed', { detail: { user: result.user, jwt: result.jwt } })); } catch(_){}

            console.log('✅ Identity setup completed successfully');

        } catch (error) {
            console.error('❌ Identity setup failed:', error);
            alert('Setup failed: ' + error.message);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    show() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            this.isVisible = true;
            try { if (window.UIState) window.UIState.lock('identity'); } catch(_){}
        }
    }

    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
            this.isVisible = false;
            try { if (window.UIState) window.UIState.unlock('identity'); } catch(_){}
        }
    }
}

// Create singleton instance
const initialIdentityModal = new InitialIdentityModal();

// Export for module use
export { initialIdentityModal as default };

// Also expose globally for non-module access
window.InitialIdentityModal = initialIdentityModal;
