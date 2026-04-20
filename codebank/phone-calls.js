/**
 * Phone System - CodeBank Service
 * VoIP and call management system
 */

class PhoneSystem {
    constructor() {
        this.currentNumber = '';
        this.isInCall = false;
        this.callDuration = 0;
        this.callDurationInterval = null;
        this.isMuted = false;
        this.isSpeaker = false;
        this.contacts = this.initializeContacts();
        this.callHistory = this.initializeCallHistory();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderContacts();
        this.renderCallHistory();
    }

    setupEventListeners() {
        // Keypad buttons
        document.querySelectorAll('.key').forEach(btn => {
            btn.addEventListener('click', (e) => this.appendDigit(e.target.dataset.digit));
        });

        // Control buttons
        document.getElementById('backspaceBtn').addEventListener('click', () => this.backspace());
        document.getElementById('clearBtn').addEventListener('click', () => this.clear());
        document.getElementById('callBtn').addEventListener('click', () => this.initiateCall());

        // Call control buttons
        document.getElementById('muteBtn').addEventListener('click', () => this.toggleMute());
        document.getElementById('speakerBtn').addEventListener('click', () => this.toggleSpeaker());
        document.getElementById('keypadToggleBtn').addEventListener('click', () => this.toggleKeypad());
        document.getElementById('addCallBtn').addEventListener('click', () => this.addCall());
        document.getElementById('endCallBtn').addEventListener('click', () => this.endCall());

        // Contact search
        document.getElementById('contactSearch').addEventListener('input', (e) => this.searchContacts(e.target.value));

        // Clear history
        document.querySelector('.btn-clear-history').addEventListener('click', () => this.clearHistory());

        // In-call keypad digits
        document.querySelectorAll('.mini-keypad .key').forEach(btn => {
            btn.addEventListener('click', (e) => this.appendInCallDigit(e.target.dataset.digit));
        });
    }

    initializeContacts() {
        return [
            { name: 'John Doe', number: '+1 (555) 123-4567', avatar: '👤' },
            { name: 'Jane Smith', number: '+1 (555) 234-5678', avatar: '👤' },
            { name: 'Tech Support', number: '+1 (555) 345-6789', avatar: '📞' },
            { name: 'Mom', number: '+1 (555) 456-7890', avatar: '👩' },
            { name: 'Dad', number: '+1 (555) 567-8901', avatar: '👨' }
        ];
    }

    initializeCallHistory() {
        return [
            { name: 'John Doe', number: '+1 (555) 123-4567', time: '2 hours ago', duration: '5:32', type: 'incoming' },
            { name: 'Jane Smith', number: '+1 (555) 234-5678', time: 'Yesterday', duration: '12:15', type: 'outgoing' },
            { name: 'Tech Support', number: '+1 (555) 345-6789', time: '2 days ago', duration: '3:45', type: 'incoming' },
            { name: 'Mom', number: '+1 (555) 456-7890', time: '3 days ago', duration: '8:20', type: 'outgoing' }
        ];
    }

    renderContacts() {
        const list = document.getElementById('contactsList');
        list.innerHTML = this.contacts.map(contact => `
            <div class="contact-item" data-number="${contact.number}">
                <div class="contact-avatar">${contact.avatar}</div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-number">${contact.number}</div>
                </div>
                <button class="contact-call-btn" title="Call">☎️</button>
            </div>
        `).join('');

        // Attach contact item click listeners
        document.querySelectorAll('.contact-item').forEach(item => {
            item.addEventListener('click', () => this.callContact(item.dataset.number));
            item.querySelector('.contact-call-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.callContact(item.dataset.number);
            });
        });
    }

    renderCallHistory() {
        const list = document.getElementById('callHistory');
        list.innerHTML = this.callHistory.map(call => `
            <div class="history-item">
                <div class="history-type ${call.type}">
                    ${call.type === 'incoming' ? '📥' : '📤'}
                </div>
                <div class="history-info">
                    <div class="history-name">${call.name}</div>
                    <div class="history-time">${call.time} • ${call.duration}</div>
                </div>
                <button class="history-call-btn">☎️</button>
            </div>
        `).join('');

        // Attach history call listeners
        document.querySelectorAll('.history-call-btn').forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                const contact = this.callHistory[idx];
                this.callContact(contact.number);
            });
        });
    }

    appendDigit(digit) {
        this.currentNumber += digit;
        document.getElementById('phoneDisplay').value = this.currentNumber;
    }

    appendInCallDigit(digit) {
        const display = document.getElementById('inCallDisplay');
        display.value = (display.value || '') + digit;
    }

    backspace() {
        this.currentNumber = this.currentNumber.slice(0, -1);
        document.getElementById('phoneDisplay').value = this.currentNumber;
    }

    clear() {
        this.currentNumber = '';
        document.getElementById('phoneDisplay').value = '';
    }

    initiateCall() {
        if (this.currentNumber.length === 0) {
            alert('Please enter a phone number');
            return;
        }
        this.startCall(this.currentNumber);
    }

    callContact(number) {
        this.currentNumber = number;
        document.getElementById('phoneDisplay').value = number;
        this.startCall(number);
    }

    startCall(number) {
        this.isInCall = true;
        
        // Find contact info
        const contact = this.contacts.find(c => c.number === number) || 
                       this.callHistory.find(c => c.number === number);
        
        const name = contact ? contact.name : 'Unknown';
        const avatar = contact ? contact.avatar : '👤';

        // Update UI
        document.getElementById('dialPad').style.display = 'none';
        document.getElementById('callView').style.display = 'flex';

        document.getElementById('callerName').textContent = name;
        document.getElementById('callerNumber').textContent = number;
        document.getElementById('callerAvatar').textContent = avatar;
        document.getElementById('callStatus').textContent = 'Connected';

        // Start duration timer
        this.callDuration = 0;
        this.callDurationInterval = setInterval(() => {
            this.callDuration++;
            const mins = Math.floor(this.callDuration / 60);
            const secs = this.callDuration % 60;
            document.getElementById('callDuration').textContent = 
                `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }, 1000);

        // Add to call history
        this.addToHistory(name, number, 'outgoing');

        console.log(`[Phone] Call started with ${name} (${number})`);
    }

    endCall() {
        if (this.callDurationInterval) {
            clearInterval(this.callDurationInterval);
        }

        this.isInCall = false;
        document.getElementById('callView').style.display = 'none';
        document.getElementById('dialPad').style.display = 'flex';
        document.getElementById('inCallKeypad').style.display = 'none';

        this.currentNumber = '';
        document.getElementById('phoneDisplay').value = '';
        document.getElementById('callDuration').textContent = '00:00';
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        const btn = document.getElementById('muteBtn');
        btn.classList.toggle('active');
        btn.textContent = this.isMuted ? '🔇 Unmute' : '🔇 Mute';
    }

    toggleSpeaker() {
        this.isSpeaker = !this.isSpeaker;
        const btn = document.getElementById('speakerBtn');
        btn.classList.toggle('active');
        btn.textContent = this.isSpeaker ? '📢 Speaker Off' : '📢 Speaker';
    }

    toggleKeypad() {
        const keypad = document.getElementById('inCallKeypad');
        keypad.style.display = keypad.style.display === 'none' ? 'block' : 'none';
    }

    addCall() {
        alert('Add call feature - start second call while keeping first on hold');
    }

    searchContacts(query) {
        const filtered = this.contacts.filter(c =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.number.includes(query)
        );

        const list = document.getElementById('contactsList');
        list.innerHTML = filtered.map(contact => `
            <div class="contact-item" data-number="${contact.number}">
                <div class="contact-avatar">${contact.avatar}</div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-number">${contact.number}</div>
                </div>
                <button class="contact-call-btn" title="Call">☎️</button>
            </div>
        `).join('');

        document.querySelectorAll('.contact-item').forEach(item => {
            item.addEventListener('click', () => this.callContact(item.dataset.number));
            item.querySelector('.contact-call-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.callContact(item.dataset.number);
            });
        });
    }

    addToHistory(name, number, type) {
        this.callHistory.unshift({
            name,
            number,
            time: 'Just now',
            duration: '0:00',
            type
        });

        if (this.callHistory.length > 20) {
            this.callHistory.pop();
        }
    }

    clearHistory() {
        if (confirm('Clear all call history?')) {
            this.callHistory = [];
            this.renderCallHistory();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.phoneSystem = new PhoneSystem();
    console.log('[Phone System] Initialized successfully');
});
