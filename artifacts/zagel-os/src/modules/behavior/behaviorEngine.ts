/**
 * Zagel Behavior Engine
 * Manages personality, mood, and response style modulation.
 */

export type Mood = "neutral" | "happy" | "playful" | "serious" | "empathetic" | "excited";
export type Personality = "playful" | "serious" | "poetic" | "technical";

export interface BehaviorState {
  mood: Mood;
  personality: Personality;
  energy: number; // 0-1
}

class BehaviorEngine {
  private state: BehaviorState = {
    mood: "neutral",
    personality: "playful",
    energy: 0.7,
  };

  private listeners: Set<(state: BehaviorState) => void> = new Set();

  subscribe(listener: (state: BehaviorState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  getState(): BehaviorState {
    return { ...this.state };
  }

  setMood(mood: Mood) {
    this.state.mood = mood;
    this.notify();
  }

  setPersonality(personality: Personality) {
    this.state.personality = personality;
    this.notify();
  }

  setEnergy(energy: number) {
    this.state.energy = Math.max(0, Math.min(1, energy));
    this.notify();
  }

  // Detect mood from AI response text
  detectMoodFromText(text: string): Mood {
    const lower = text.toLowerCase();
    if (
      lower.includes("exciting") ||
      lower.includes("amazing") ||
      lower.includes("wonderful")
    )
      return "excited";
    if (
      lower.includes("happy") ||
      lower.includes("great") ||
      lower.includes("fantastic")
    )
      return "happy";
    if (
      lower.includes("fun") ||
      lower.includes("playful") ||
      lower.includes("joke")
    )
      return "playful";
    if (lower.includes("sorry") || lower.includes("understand") || lower.includes("feel"))
      return "empathetic";
    if (
      lower.includes("analyze") ||
      lower.includes("technical") ||
      lower.includes("system")
    )
      return "serious";
    return "neutral";
  }

  // Get avatar animation state from mood
  getAvatarAnimation(mood: Mood): string {
    const map: Record<Mood, string> = {
      neutral: "idle",
      happy: "happy",
      playful: "dance",
      serious: "focus",
      empathetic: "gentle",
      excited: "excited",
    };
    return map[mood] || "idle";
  }

  // Get color accent from mood
  getMoodColor(mood: Mood): string {
    const colors: Record<Mood, string> = {
      neutral: "#7c9cbf",
      happy: "#f9d74b",
      playful: "#f97fcd",
      serious: "#7cc4f9",
      empathetic: "#b89cf9",
      excited: "#f9a45c",
    };
    return colors[mood] || "#7c9cbf";
  }

  // Modulate response text for personality
  addPersonalityFlair(text: string, personality: Personality): string {
    if (personality === "poetic") {
      return text; // AI handles this via system prompt
    }
    return text;
  }
}

const behaviorEngine = new BehaviorEngine();
export default behaviorEngine;
