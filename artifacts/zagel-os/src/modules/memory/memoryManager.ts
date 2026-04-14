/**
 * Zagel Memory Manager
 * Handles persistent storage of user data, preferences, and behavior rules.
 * Uses localStorage for immediate access + API for server sync.
 */

const STORAGE_KEY = "zagel_memory";

export interface ZagelMemory {
  userId: string;
  name?: string;
  job?: string;
  interests: string[];
  preferences: Record<string, unknown>;
  behaviorRules: string[];
  templates: Record<string, unknown>[];
  scenarios: Record<string, unknown>[];
  mood: string;
  personality: string;
  onboardingComplete: boolean;
}

const DEFAULT_MEMORY: ZagelMemory = {
  userId: "default",
  name: undefined,
  job: undefined,
  interests: [],
  preferences: {},
  behaviorRules: [],
  templates: [],
  scenarios: [],
  mood: "neutral",
  personality: "playful",
  onboardingComplete: false,
};

class MemoryManager {
  private memory: ZagelMemory;
  private listeners: Set<(memory: ZagelMemory) => void> = new Set();

  constructor() {
    this.memory = this.loadFromStorage();
  }

  private loadFromStorage(): ZagelMemory {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_MEMORY, ...JSON.parse(stored) };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_MEMORY };
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memory));
      this.listeners.forEach((l) => l(this.memory));
    } catch {
      // ignore
    }
  }

  subscribe(listener: (memory: ZagelMemory) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get(): ZagelMemory {
    return { ...this.memory };
  }

  update(partial: Partial<ZagelMemory>) {
    this.memory = { ...this.memory, ...partial };
    this.saveToStorage();

    // Sync to server in background
    this.syncToServer().catch(() => {});
  }

  setName(name: string) {
    this.update({ name });
  }

  setJob(job: string) {
    this.update({ job });
  }

  setInterests(interests: string[]) {
    this.update({ interests });
  }

  addInterest(interest: string) {
    const interests = [...this.memory.interests];
    if (!interests.includes(interest)) {
      interests.push(interest);
    }
    this.update({ interests });
  }

  setMood(mood: string) {
    this.update({ mood });
  }

  setPersonality(personality: string) {
    this.update({ personality });
  }

  completeOnboarding() {
    this.update({ onboardingComplete: true });
  }

  isOnboarded(): boolean {
    return (
      this.memory.onboardingComplete &&
      !!this.memory.name
    );
  }

  getContextString(): string {
    const parts: string[] = [];
    if (this.memory.name) parts.push(`User: ${this.memory.name}`);
    if (this.memory.job) parts.push(`Job: ${this.memory.job}`);
    if (this.memory.interests.length > 0) {
      parts.push(`Interests: ${this.memory.interests.join(", ")}`);
    }
    return parts.join(". ");
  }

  async syncToServer() {
    try {
      await fetch("/api/zagel/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: this.memory.userId,
          name: this.memory.name,
          job: this.memory.job,
          interests: this.memory.interests,
          preferences: this.memory.preferences,
          behaviorRules: this.memory.behaviorRules,
          mood: this.memory.mood,
          personality: this.memory.personality,
        }),
      });
    } catch {
      // Silent fail - local storage is still good
    }
  }

  async loadFromServer() {
    try {
      const res = await fetch(`/api/zagel/memory?userId=${this.memory.userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.name) {
          this.memory = {
            ...this.memory,
            name: data.name,
            job: data.job,
            interests: data.interests || [],
            preferences: data.preferences || {},
            behaviorRules: data.behaviorRules || [],
            mood: data.mood || "neutral",
            personality: data.personality || "playful",
          };
          this.saveToStorage();
        }
      }
    } catch {
      // Use local storage
    }
  }

  reset() {
    this.memory = { ...DEFAULT_MEMORY };
    this.saveToStorage();
  }
}

const memoryManager = new MemoryManager();
export default memoryManager;
