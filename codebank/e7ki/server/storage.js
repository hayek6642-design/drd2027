import { randomUUID } from "crypto";
export class MemStorage {
    users;
    constructor() {
        this.users = new Map();
    }
    async getUser(id) {
        return this.users.get(id);
    }
    async getUserByEmail(email) {
        return Array.from(this.users.values()).find((user) => user.email === email);
    }
    async createUser(insertUser) {
        const id = randomUUID();
        const user = {
            ...insertUser,
            id,
            isOnline: false,
        };
        this.users.set(id, user);
        return user;
    }
}
export const storage = new MemStorage();
