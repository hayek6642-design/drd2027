export class StateMachine {
    constructor() {
        this.state = 'INIT';
        this.listeners = [];
        this.validTransitions = {
            'INIT': ['LOBBY'],
            'LOBBY': ['READY'],
            'READY': ['RUNNING', 'LOBBY'],
            'RUNNING': ['PAUSED', 'COMPLETED'],
            'PAUSED': ['RUNNING', 'LOBBY'],
            'COMPLETED': ['ARCHIVED', 'LOBBY'],
            'ARCHIVED': ['LOBBY']
        };
    }

    transition(newState) {
        if (!this.validTransitions[this.state].includes(newState) && newState !== 'INIT') {
            console.warn(`Invalid transition: ${this.state} -> ${newState}`);
            // Force transition for dev/recovery if needed, but log it
        }
        
        this.state = newState;
        this.notify();
    }

    subscribe(callback) {
        this.listeners.push(callback);
    }

    notify() {
        this.listeners.forEach(cb => cb(this.state));
    }

    getState() {
        return this.state;
    }
}
