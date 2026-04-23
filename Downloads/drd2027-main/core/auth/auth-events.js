
import EventEmitter from 'events';

class AuthEvents extends EventEmitter { }

export const authEvents = new AuthEvents();

// Event Types Constants
export const AUTH_EVENTS = {
    LOGIN: 'auth:login',
    LOGOUT: 'auth:logout',
    REVOKE: 'auth:revoke',
    VALIDATE_FAIL: 'auth:validate_fail'
};
