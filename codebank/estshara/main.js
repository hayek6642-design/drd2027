/**
 * Estshara - Main Entry Point (Micro-Frontend Shell)
 * @version 1.0.0
 * Architecture: Lazy-loaded modules, event-driven communication
 */

// ==========================================
// EVENT SYSTEM
// ==========================================
const EstsharaEvents = {
  CONSULTANT_SELECTED: 'estshara:consultant:selected',
  TRANSACTION_INITIATED: 'estshara:tx:init',
  CALL_CONNECTED: 'estshara:call:connected',
  AI_EVAL_COMPLETE: 'estshara:ai:eval:complete',
  CATEGORY_SELECTED: 'estshara:category:selected',
  BOOKING_COMPLETE: 'estshara:booking:complete',
  MESSAGE_SENT: 'estshara:message:sent'
};

// Global event bus
window.EstsharaEvents = EstsharaEvents;

// ==========================================
// CATEGORY SYSTEM
// ==========================================
const CategoryMatrix = {
  medical: {
    id: 'medical',
    icon: '⚕️',
    name: 'طبي',
    subspecialties: [
      { id: 'cardiology', name: 'Cardiology', urgency: 'high' },
      { id: 'dermatology', name: 'Dermatology', urgency: 'medium' },
      { id: 'psychiatry', name: 'Mental Health', urgency: 'high' },
      { id: 'nutrition', name: 'Nutrition', urgency: 'low' },
      { id: 'pediatrics', name: 'Pediatrics', urgency: 'high' }
    ],
    pricingMultiplier: 1.5
  },
  
  legal: {
    id: 'legal',
    icon: '⚖️',
    name: 'قانون',
    subspecialties: [
      { id: 'corporate', name: 'Corporate Law' },
      { id: 'criminal', name: 'Criminal Defense' },
      { id: 'family', name: 'Family Law' },
      { id: 'immigration', name: 'Immigration' },
      { id: 'ip', name: 'Intellectual Property' }
    ],
    pricingMultiplier: 2.0
  },
  
  economics: {
    id: 'economics',
    icon: '📈',
    name: 'اقتصاد',
    subspecialties: [
      { id: 'stocks', name: 'Stock Market' },
      { id: 'crypto', name: 'Cryptocurrency' },
      { id: 'banking', name: 'Banking' },
      { id: 'tax', name: 'Tax Planning' },
      { id: 'realestate', name: 'Real Estate Investment' }
    ],
    pricingMultiplier: 1.8
  },
  
  technicians: {
    id: 'technicians',
    icon: '🔧',
    name: 'فنيون',
    subspecialties: [
      { id: 'electrical', name: 'Electrical' },
      { id: 'plumbing', name: 'Plumbing' },
      { id: 'hvac', name: 'HVAC' },
      { id: 'automotive', name: 'Automotive' },
      { id: 'appliances', name: 'Appliances' }
    ],
    pricingMultiplier: 1.0
  }
};

// ==========================================
// CONSULTANT STATE MACHINE
// ==========================================
const ConsultantLifecycle = {
  states: [
    'APPLIED', 'DOCS_REVIEW', 'TEST_PENDING', 'TEST_STARTED',
    'TEST_PASSED', 'TEST_FAILED', 'ONBOARDING', 'ACTIVE',
    'SUSPENDED', 'BANNED'
  ],
  
  transitions: {
    'APPLIED': ['DOCS_REVIEW', 'BANNED'],
    'DOCS_REVIEW': ['TEST_PENDING', 'BANNED'],
    'TEST_PENDING': ['TEST_STARTED', 'BANNED'],
    'TEST_STARTED': ['TEST_PASSED', 'TEST_FAILED'],
    'TEST_FAILED': ['TEST_PENDING'],
    'TEST_PASSED': ['ONBOARDING'],
    'ONBOARDING': ['ACTIVE'],
    'ACTIVE': ['SUSPENDED', 'BANNED'],
    'SUSPENDED': ['ACTIVE', 'BANNED']
  },
  
  isValidTransition: function(from, to) {
    const allowed = this.transitions[from] || [];
    return allowed.includes(to);
  }
};

// ==========================================
// TRANSACTION MANAGER
// ==========================================
class EstsharaTransactionManager {
  constructor() {
    this.FEE_STRUCTURE = {
      consultant: 0.70,  // 70% to consultant
      platform: 0.25,    // 25% platform
      reserve: 0.05     // 5% dispute reserve
    };
  }
  
  calculateSplits(amount) {
    return {
      consultantShare: Math.floor(amount * this.FEE_STRUCTURE.consultant),
      platformShare: Math.floor(amount * this.FEE_STRUCTURE.platform),
      reserveShare: Math.floor(amount * this.FEE_STRUCTURE.reserve)
    };
  }
  
  async executeTransaction(tx) {
    const splits = this.calculateSplits(tx.amount);
    
    // Fire event for UI update
    window.dispatchEvent(new CustomEvent(EstsharaEvents.TRANSACTION_INITIATED, {
      detail: { ...tx, splits }
    }));
    
    // Call API
    try {
      const response = await fetch('/api/estshara/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx)
      });
      
      return await response.json();
    } catch (err) {
      console.error('[Estshara] Transaction failed:', err);
      throw err;
    }
  }
}

// ==========================================
// CIRCUIT BREAKER FOR E7KI
// ==========================================
class E7kiCircuitBreaker {
  constructor() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.threshold = 5;
    this.timeout = 60000;
    this.lastFailure = 0;
  }
  
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.state = 'HALF_OPEN';
        console.log('[E7kiCircuitBreaker] HALF_OPEN - Testing recovery');
      } else {
        throw new Error('E7ki service unavailable');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.log('[E7kiCircuitBreaker] CLOSED - Recovered');
    }
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailure = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      console.log('[E7kiCircuitBreaker] OPEN - Too many failures');
    }
  }
}

// ==========================================
// MAIN APPLICATION
// ==========================================
class EstsharaApp {
  constructor() {
    this.currentCategory = null;
    this.selectedConsultant = null;
    this.transactionManager = new EstsharaTransactionManager();
    this.e7kiBreaker = new E7kiCircuitBreaker();
    this.consultants = [];
    
    this.init();
  }
  
  async init() {
    console.log('[Estshara] Initializing...');
    
    // Load categories
    this.renderCategories();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Mark as ready
    this.markReady();
    
    console.log('[Estshara] Ready');
  }
  
  markReady() {
    const app = document.getElementById('app');
    const mainContent = document.getElementById('main-content');
    
    if (app && mainContent) {
      app.classList.remove('loading');
      mainContent.style.display = 'block';
    }
  }
  
  renderCategories() {
    const grid = document.getElementById('category-grid');
    if (!grid) return;
    
    grid.innerHTML = Object.values(CategoryMatrix).map(cat => `
      <button class="category-card" data-category="${cat.id}">
        <span class="category-icon">${cat.icon}</span>
        <span class="category-name">${cat.name}</span>
        <span class="category-count">${cat.subspecialties.length} تخصص</span>
      </button>
    `).join('');
  }
  
  setupEventListeners() {
    // Category selection
    document.getElementById('category-grid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.category-card');
      if (card) {
        this.selectCategory(card.dataset.category);
      }
    });
    
    // Back to categories
    document.getElementById('back-to-categories')?.addEventListener('click', () => {
      this.showCategories();
    });
    
    // Close modal
    document.querySelector('.modal-close')?.addEventListener('click', () => {
      this.closeModal();
    });
    
    document.querySelector('.modal-backdrop')?.addEventListener('click', () => {
      this.closeModal();
    });
  }
  
  async selectCategory(categoryId) {
    this.currentCategory = CategoryMatrix[categoryId];
    
    // Show subspecialty selection or load consultants
    await this.loadConsultants(categoryId);
    
    // Update UI
    document.getElementById('category-grid').style.display = 'none';
    document.getElementById('consultant-results').style.display = 'block';
    document.getElementById('results-title').textContent = 
      `${this.currentCategory.name} - استشر الآن`;
    
    // Fire event
    window.dispatchEvent(new CustomEvent(EstsharaEvents.CATEGORY_SELECTED, {
      detail: { category: this.currentCategory }
    }));
  }
  
  async loadConsultants(categoryId) {
    const list = document.getElementById('consultant-list');
    if (!list) return;
    
    list.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
      // Call E7ki with circuit breaker
      const response = await this.e7kiBreaker.call(async () => {
        return await fetch(`/api/e7ki/consultants?category=${categoryId}`)
          .then(r => r.json());
      });
      
      this.consultants = response.consultants || [];
      this.renderConsultants();
      
    } catch (err) {
      console.error('[Estshara] Failed to load consultants:', err);
      list.innerHTML = '<p class="error">عذراً، فشل تحميل Consultants</p>';
    }
  }
  
  renderConsultants() {
    const list = document.getElementById('consultant-list');
    if (!list) return;
    
    if (this.consultants.length === 0) {
      list.innerHTML = '<p class="empty">لا يوجد Consultants متاحين حالياً</p>';
      return;
    }
    
    list.innerHTML = this.consultants.map(consultant => `
      <div class="consultant-card" data-id="${consultant.id}">
        <div class="consultant-avatar">${consultant.avatar || '👨‍⚕️'}</div>
        <div class="consultant-info">
          <h3 class="consultant-name">${consultant.name}</h3>
          <p class="consultant-specialty">${consultant.specialty}</p>
          <div class="consultant-rating">
            <span class="stars">${'⭐'.repeat(Math.floor(consultant.rating || 4))}</span>
            <span class="rating-value">${consultant.rating || 4.0}</span>
          </div>
        </div>
        <div class="consultant-price">
          <span class="price">${consultant.price || 50}</span>
          <span class="currency">د.إ</span>
          <span class="unit">/ رسالة</span>
        </div>
        <button class="book-btn" data-id="${consultant.id}">احجز</button>
      </div>
    `).join('');
    
    // Add click handlers
    list.querySelectorAll('.book-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openBooking(btn.dataset.id);
      });
    });
    
    list.querySelectorAll('.consultant-card').forEach(card => {
      card.addEventListener('click', () => this.openBooking(card.dataset.id));
    });
  }
  
  showCategories() {
    document.getElementById('category-grid').style.display = 'grid';
    document.getElementById('consultant-results').style.display = 'none';
    this.currentCategory = null;
  }
  
  openBooking(consultantId) {
    this.selectedConsultant = this.consultants.find(c => c.id === consultantId);
    
    if (!this.selectedConsultant) return;
    
    const modal = document.getElementById('booking-modal');
    const form = document.getElementById('booking-form');
    
    form.innerHTML = `
      <h2>احجز استشارة</h2>
      <div class="booking-consultant">
        <span class="avatar">${this.selectedConsultant.avatar || '👨‍⚕️'}</span>
        <div>
          <h3>${this.selectedConsultant.name}</h3>
          <p>${this.selectedConsultant.specialty}</p>
        </div>
      </div>
      
      <form id="booking-form-inner">
        <div class="form-group">
          <label>وصف المشكلة</label>
          <textarea id="problem-description" rows="4" required placeholder="اشرح مشكلتك بالتفصيل..."></textarea>
        </div>
        
        <div class="form-group">
          <label>نوع الاستشارة</label>
          <select id="consultation-type" required>
            <option value="message">رسالة نصية</option>
            <option value="call">مكالمة صوتية</option>
            <option value="video">مكالمة فيديو</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>السعر</label>
          <div class="price-display">
            <span class="amount">${this.selectedConsultant.price || 50}</span>
            <span class="currency">د.إ</span>
          </div>
        </div>
        
        <button type="submit" class="submit-btn">ادفع وابدأ الاستشارة</button>
      </form>
    `;
    
    // Handle form submission
    form.querySelector('form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitBooking();
    });
    
    modal.style.display = 'flex';
    
    // Fire event
    window.dispatchEvent(new CustomEvent(EstsharaEvents.CONSULTANT_SELECTED, {
      detail: { consultant: this.selectedConsultant }
    }));
  }
  
  async submitBooking() {
    const description = document.getElementById('problem-description')?.value;
    const type = document.getElementById('consultation-type')?.value;
    const amount = this.selectedConsultant.price || 50;
    
    try {
      // Execute transaction
      const result = await this.transactionManager.executeTransaction({
        type,
        amount,
        consultantId: this.selectedConsultant.id,
        description
      });
      
      // Fire booking complete event
      window.dispatchEvent(new CustomEvent(EstsharaEvents.BOOKING_COMPLETE, {
        detail: { transaction: result, consultant: this.selectedConsultant }
      }));
      
      // Open chat
      this.closeModal();
      this.openChat();
      
    } catch (err) {
      alert('فشل الدفع: ' + err.message);
    }
  }
  
  openChat() {
    if (!this.selectedConsultant) return;
    
    const chat = document.getElementById('chat-interface');
    const nameEl = chat?.querySelector('.consultant-name');
    const avatarEl = chat?.querySelector('.consultant-avatar');
    
    if (nameEl) nameEl.textContent = this.selectedConsultant.name;
    if (avatarEl) avatarEl.textContent = this.selectedConsultant.avatar || '👨‍⚕️';
    
    if (chat) chat.style.display = 'flex';
  }
  
  closeModal() {
    document.getElementById('booking-modal').style.display = 'none';
  }
}

// ==========================================
// INITIALIZE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  window.Estshara = new EstsharaApp();
});

// Export for module federation
window.EstsharaApp = EstsharaApp;
window.CategoryMatrix = CategoryMatrix;
window.ConsultantLifecycle = ConsultantLifecycle;
window.EstsharaTransactionManager = EstsharaTransactionManager;
window.E7kiCircuitBreaker = E7kiCircuitBreaker;