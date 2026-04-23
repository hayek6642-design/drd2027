// Solitaire Game Logic
class SolitaireGame {
    constructor() {
        this.deck = [];
        this.foundation = Array(4).fill().map(() => []);
        this.tableau = Array(7).fill().map(() => []);
        this.waste = [];
        this.selectedCard = null;
        
        this.initializeGame();
        this.setupEventListeners();
    }

    initializeGame() {
        // Create deck
        const suits = ['♠', '♣', '♥', '♦'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        this.deck = suits.flatMap(suit => 
            values.map(value => ({
                suit,
                value,
                faceUp: false,
                color: (suit === '♥' || suit === '♦') ? 'red' : 'black'
            }))
        );
        
        // Shuffle deck
        this.shuffle();
        
        // Deal cards to tableau
        for (let i = 0; i < 7; i++) {
            for (let j = i; j < 7; j++) {
                this.tableau[j].push({
                    ...this.deck.pop(),
                    faceUp: i === j
                });
            }
        }
        
        this.renderGame();
    }

    shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    setupEventListeners() {
        document.getElementById('new-game').addEventListener('click', () => {
            this.initializeGame();
        });

        // Add click handlers for tableau and foundation piles
        document.querySelectorAll('.tableau-pile, .foundation-pile').forEach(pile => {
            pile.addEventListener('click', (e) => this.handlePileClick(e));
        });
    }

    handlePileClick(event) {
        const pile = event.currentTarget;
        const card = event.target.closest('.card');
        
        if (!card) return;
        
        if (this.selectedCard) {
            this.tryMoveCard(card, pile);
        } else if (card.classList.contains('face-up')) {
            this.selectCard(card);
        }
    }

    tryMoveCard(targetCard, targetPile) {
        const moveValid = this.isValidMove(this.selectedCard, targetCard, targetPile);
        
        if (moveValid) {
            this.moveCard(targetPile);
            this.checkWinCondition();
        }
        
        this.deselectCard();
    }

    isValidMove(sourceCard, targetCard, targetPile) {
        // Implement move validation rules
        return true; // Simplified for this example
    }

    moveCard(targetPile) {
        // Implement card movement logic
    }

    checkWinCondition() {
        const won = this.foundation.every(pile => 
            pile.length === 13 && pile[12].value === 'K'
        );
        
        if (won) {
            this.handleWin();
        }
    }

    handleWin() {
        // Award prizes for winning
        try {
            const currentRewards = window.getRewards ? window.getRewards() : { codes: 0, silverBars: 0, goldBars: 0 };
            const prize = { codes: 200 }; // Award 200 codes for winning
            
            const updatedRewards = {
                codes: (currentRewards.codes || 0) + prize.codes,
                silverBars: currentRewards.silverBars,
                goldBars: currentRewards.goldBars
            };
            
            if (window.saveRewards) {
                window.saveRewards(updatedRewards);
                if (window.showToast) {
                    window.showToast('Congratulations! You won 200 codes!', 'success');
                }
            }
        } catch (error) {
            console.error('Failed to award win prize:', error);
        }
    }

    renderGame() {
        this.renderTableau();
        this.renderFoundation();
        this.renderDeck();
    }

    renderTableau() {
        const tableauElement = document.getElementById('tableau');
        tableauElement.innerHTML = '';
        
        this.tableau.forEach((pile, i) => {
            const pileElement = document.createElement('div');
            pileElement.className = 'tableau-pile';
            pileElement.dataset.index = i;
            
            pile.forEach((card, j) => {
                const cardElement = this.createCardElement(card);
                cardElement.style.top = `${j * 20}px`; // Stagger cards vertically
                pileElement.appendChild(cardElement);
            });
            
            tableauElement.appendChild(pileElement);
        });
    }

    renderFoundation() {
        const foundationElement = document.getElementById('foundation');
        foundationElement.innerHTML = '';
        
        this.foundation.forEach((pile, i) => {
            const pileElement = document.createElement('div');
            pileElement.className = 'foundation-pile';
            pileElement.dataset.index = i;
            
            if (pile.length) {
                pileElement.appendChild(this.createCardElement(pile[pile.length - 1]));
            }
            
            foundationElement.appendChild(pileElement);
        });
    }

    renderDeck() {
        const deckElement = document.getElementById('deck');
        deckElement.innerHTML = '';
        
        if (this.deck.length) {
            deckElement.appendChild(this.createCardElement({ faceUp: false }));
        }
    }

    createCardElement(card) {
        const element = document.createElement('div');
        element.className = 'card';
        if (card.faceUp) {
            element.classList.add('face-up');
            element.dataset.value = card.value;
            element.dataset.suit = card.suit;
            element.style.color = card.color;
            element.textContent = `${card.value}${card.suit}`;
        }
        return element;
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SolitaireGame();
});
