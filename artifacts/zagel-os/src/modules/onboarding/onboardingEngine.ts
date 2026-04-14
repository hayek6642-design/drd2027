/**
 * Zagel Onboarding Engine
 * Voice-driven conversational onboarding flow.
 */

import memoryManager from "../memory/memoryManager";

export type OnboardingStep =
  | "intro"
  | "name"
  | "job"
  | "interests"
  | "complete"
  | "exit";

export interface OnboardingStepData {
  step: OnboardingStep;
  zagelMessage: string;
  expectYesNo: boolean;
  isFinal: boolean;
  field?: string;
}

const FLOW: Record<
  OnboardingStep,
  {
    message: string | ((name?: string) => string);
    expectYesNo?: boolean;
    onYes?: OnboardingStep;
    onNo?: OnboardingStep;
    field?: string;
    next?: OnboardingStep;
    isFinal?: boolean;
  }
> = {
  intro: {
    message: "Hi... I am Zagel. Can I get to know you a little?",
    expectYesNo: true,
    onYes: "name",
    onNo: "exit",
  },
  name: {
    message: "What is your name?",
    field: "name",
    next: "job",
  },
  job: {
    message: "What do you do for work?",
    field: "job",
    next: "interests",
  },
  interests: {
    message: "What are your interests? You can say a few things.",
    field: "interests",
    next: "complete",
  },
  complete: {
    message: (name?: string) =>
      `Perfect! I am ready to help you${name ? `, ${name}` : ""}. Just tap the circle whenever you need me.`,
    isFinal: true,
  },
  exit: {
    message: "No problem! I will be here whenever you are ready.",
    isFinal: true,
  },
};

export type StepCallback = (data: OnboardingStepData) => void;
export type CompleteCallback = () => void;

class OnboardingEngine {
  private currentStep: OnboardingStep = "intro";
  private isActive = false;
  private onStepChange?: StepCallback;
  private onComplete?: CompleteCallback;

  start(callbacks: {
    onStep: StepCallback;
    onComplete: CompleteCallback;
    force?: boolean;
  }) {
    if (!callbacks.force && memoryManager.isOnboarded()) {
      callbacks.onComplete();
      return;
    }

    this.isActive = true;
    this.onStepChange = callbacks.onStep;
    this.onComplete = callbacks.onComplete;
    this.currentStep = "intro";
    this.emitStep("intro");
  }

  private emitStep(step: OnboardingStep) {
    const stepConfig = FLOW[step];
    if (!stepConfig) return;

    const memory = memoryManager.get();
    const rawMessage = stepConfig.message;
    const message =
      typeof rawMessage === "function" ? rawMessage(memory.name) : rawMessage;

    this.onStepChange?.({
      step,
      zagelMessage: message,
      expectYesNo: !!stepConfig.expectYesNo,
      isFinal: !!stepConfig.isFinal,
      field: stepConfig.field,
    });
  }

  handleAnswer(answer: string): OnboardingStep {
    if (!this.isActive) return this.currentStep;
    const step = FLOW[this.currentStep];
    if (!step) return this.currentStep;

    // Yes/No handling
    if (step.expectYesNo) {
      const normalized = answer.trim().toLowerCase();
      const isYes =
        ["yes", "yeah", "sure", "ok", "okay", "yep", "please"].some((w) =>
          normalized.includes(w)
        ) || (normalized.length > 2 && !this.isNo(normalized));

      const next = isYes ? step.onYes : step.onNo;
      if (next) {
        this.currentStep = next;
        this.emitStep(next);
      }
      return this.currentStep;
    }

    // Save answer
    if (step.field) {
      const trimmed = answer.trim();
      if (step.field === "name") {
        memoryManager.setName(trimmed);
      } else if (step.field === "job") {
        memoryManager.setJob(trimmed);
      } else if (step.field === "interests") {
        const items = trimmed
          .split(/[,،.;]/)
          .map((s) => s.trim())
          .filter(Boolean);
        memoryManager.setInterests(items.length > 0 ? items : [trimmed]);
      }
    }

    // Move to next step
    if (step.isFinal) {
      this.finalize();
      return this.currentStep;
    }

    if (step.next) {
      this.currentStep = step.next;
      this.emitStep(step.next);
    }

    return this.currentStep;
  }

  private isNo(text: string): boolean {
    return ["no", "nope", "not now", "later", "skip"].some((w) =>
      text.includes(w)
    );
  }

  private finalize() {
    memoryManager.completeOnboarding();
    this.isActive = false;
    this.onComplete?.();
  }

  getCurrentStep(): OnboardingStep {
    return this.currentStep;
  }

  isRunning(): boolean {
    return this.isActive;
  }

  reset() {
    this.currentStep = "intro";
    this.isActive = false;
  }
}

const onboardingEngine = new OnboardingEngine();
export default onboardingEngine;
