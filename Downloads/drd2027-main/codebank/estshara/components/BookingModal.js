/**
 * Estshara Components - Booking Modal
 * Handles booking flow and payment
 */

class BookingModal extends HTMLElement {
  constructor() {
    super();
    this.consultant = null;
    this.open = false;
  }
  
  static get observedAttributes() {
    return ['open', 'consultant'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      this.open = newValue !== null;
      this.style.display = this.open ? 'flex' : 'none';
    }
  }
  
  connectedCallback() {
    this.render();
  }
  
  show(consultant) {
    this.consultant = consultant;
    this.open = true;
    this.setAttribute('open', '');
    this.renderConsultant();
  }
  
  hide() {
    this.open = false;
    this.removeAttribute('open');
  }
  
  render() {
    this.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <button class="modal-close">&times;</button>
        
        <div class="booking-header">
          <h2>احجز استشارة</h2>
          <p>اختر نوع الاستشارة المناسبة لك</p>
        </div>
        
        <div class="consultant-preview">
          <!-- Dynamic content -->
        </div>
        
        <form id="booking-form">
          <div class="form-group">
            <label for="problem-description">描述 المشكلة</label>
            <textarea 
              id="problem-description" 
              rows="4" 
              required
              placeholder="اشرح مشكلتك بالتفصيل للحصول على أفضل إجابة..."
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>نوع الاستشارة</label>
            <div class="consultation-types">
              <label class="type-option">
                <input type="radio" name="type" value="message" checked>
                <div class="type-card">
                  <span class="type-icon">💬</span>
                  <span class="type-name">رسالة نصية</span>
                  <span class="type-price">${this.consultant?.price || 50} د.إ</span>
                </div>
              </label>
              
              <label class="type-option">
                <input type="radio" name="type" value="call">
                <div class="type-card">
                  <span class="type-icon">📞</span>
                  <span class="type-name">مكالمة صوتية</span>
                  <span class="type-price">${Math.floor((this.consultant?.price || 50) * 2)} د.إ</span>
                </div>
              </label>
              
              <label class="type-option">
                <input type="radio" name="type" value="video">
                <div class="type-card">
                  <span class="type-icon">📹</span>
                  <span class="type-name">مكالمة فيديو</span>
                  <span class="type-price">${Math.floor((this.consultant?.price || 50) * 3)} د.إ</span>
                </div>
              </label>
            </div>
          </div>
          
          <div class="price-summary">
            <div class="row">
              <span>سعر الاستشارة</span>
              <span class="amount">${this.consultant?.price || 50} د.إ</span>
            </div>
            <div class="row">
              <span>الرسوم (25%)</span>
              <span class="amount">${Math.floor((this.consultant?.price || 50) * 0.25)} د.إ</span>
            </div>
            <div class="row total">
              <span>الإجمالي</span>
              <span class="amount">${this.consultant?.price || 50} د.إ</span>
            </div>
          </div>
          
          <button type="submit" class="submit-btn">
            ادفع وابدأ الاستشارة
          </button>
        </form>
      </div>
    `;
    
    this.setupEvents();
  }
  
  renderConsultant() {
    const preview = this.querySelector('.consultant-preview');
    if (preview && this.consultant) {
      preview.innerHTML = `
        <div class="consultant-card-preview">
          <span class="avatar">${this.consultant.avatar || '👨‍⚕️'}</span>
          <div class="info">
            <h3>${this.consultant.name}</h3>
            <p>${this.consultant.specialty}</p>
            <div class="rating">
              ${'⭐'.repeat(Math.floor(this.consultant.rating || 4))}
              <span>${this.consultant.rating?.toFixed(1) || '4.0'}</span>
            </div>
          </div>
        </div>
      `;
    }
  }
  
  setupEvents() {
    // Close button
    this.querySelector('.modal-close')?.addEventListener('click', () => this.hide());
    
    // Backdrop click
    this.querySelector('.modal-backdrop')?.addEventListener('click', () => this.hide());
    
    // Form submit
    this.querySelector('#booking-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitBooking();
    });
    
    // Price update on type change
    this.querySelectorAll('input[name="type"]').forEach(input => {
      input.addEventListener('change', () => this.updatePrice());
    });
  }
  
  updatePrice() {
    const type = this.querySelector('input[name="type"]:checked')?.value || 'message';
    const basePrice = this.consultant?.price || 50;
    const multipliers = { message: 1, call: 2, video: 3 };
    const price = basePrice * (multipliers[type] || 1);
    
    const totalEl = this.querySelector('.price-summary .total .amount');
    if (totalEl) {
      totalEl.textContent = `${price} د.إ`;
    }
  }
  
  async submitBooking() {
    const description = this.querySelector('#problem-description')?.value;
    const type = this.querySelector('input[name="type"]:checked')?.value || 'message';
    const basePrice = this.consultant?.price || 50;
    const multipliers = { message: 1, call: 2, video: 3 };
    const amount = basePrice * (multipliers[type] || 1);
    
    try {
      const response = await fetch('/api/estshara/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantId: this.consultant.id,
          type,
          amount,
          description
        })
      });
      
      const result = await response.json();
      
      this.dispatchEvent(new CustomEvent('booking-complete', {
        detail: { result, consultant: this.consultant, type, amount }
      }));
      
      this.hide();
      
    } catch (err) {
      alert('فشل الحجز: ' + err.message);
    }
  }
}

customElements.define('booking-modal', BookingModal);
window.BookingModal = BookingModal;