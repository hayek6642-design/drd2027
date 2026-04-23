/**
 * Estshara Components - Consultant Card
 * Reusable consultant display component
 */

class ConsultantCard extends HTMLElement {
  constructor(consultant) {
    super();
    this.consultant = consultant;
  }
  
  connectedCallback() {
    this.render();
  }
  
  render() {
    const { id, name, avatar, specialty, rating, price, isOnline } = this.consultant;
    
    this.innerHTML = `
      <div class="consultant-card" data-id="${id}">
        <div class="card-header">
          <div class="avatar-wrapper">
            <span class="avatar">${avatar || '👨‍⚕️'}</span>
            ${isOnline ? '<span class="online-badge"></span>' : ''}
          </div>
          <div class="rating">
            ${this.renderStars(rating)}
            <span class="rating-value">${rating?.toFixed(1) || '4.0'}</span>
          </div>
        </div>
        
        <div class="card-body">
          <h3 class="name">${name}</h3>
          <p class="specialty">${specialty}</p>
          
          <div class="stats">
            <div class="stat">
              <span class="stat-value">${this.consultant.responses || 120}</span>
              <span class="stat-label">استشارة</span>
            </div>
            <div class="stat">
              <span class="stat-value">${this.consultant.yearsExp || 5}</span>
              <span class="stat-label">سنوات خبرة</span>
            </div>
          </div>
        </div>
        
        <div class="card-footer">
          <div class="price">
            <span class="amount">${price || 50}</span>
            <span class="currency">د.إ</span>
          </div>
          <button class="book-btn" data-id="${id}">
            احجز الآن
          </button>
        </div>
      </div>
    `;
    
    // Attach events
    this.querySelector('.book-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('book', { 
        detail: { consultant: this.consultant },
        bubbles: true 
      }));
    });
  }
  
  renderStars(rating) {
    const full = Math.floor(rating || 4);
    const empty = 5 - full;
    return '⭐'.repeat(full) + '☆'.repeat(empty);
  }
}

// Register custom element
customElements.define('consultant-card', ConsultantCard);

// Export
window.ConsultantCard = ConsultantCard;