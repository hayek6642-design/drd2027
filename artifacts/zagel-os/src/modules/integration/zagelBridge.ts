/**
 * Zagel Bridge - Integration layer between Zagel and external services
 * Handles communication with: safecode, samma3ny, farragna, e7ki
 */

export type ServiceName = "safecode" | "samma3ny" | "farragna" | "e7ki";

export interface ServiceConfig {
  name: ServiceName;
  displayName: string;
  url: string;
  icon: string;
  color: string;
  description: string;
}

export const SERVICES: Record<ServiceName, ServiceConfig> = {
  safecode: {
    name: "safecode",
    displayName: "SafeCode",
    url: "/safecode",
    icon: "code",
    color: "#4ecdc4",
    description: "Code assets and snippets",
  },
  samma3ny: {
    name: "samma3ny",
    displayName: "Samma3ny",
    url: "/samma3ny",
    icon: "headphones",
    color: "#f7b731",
    description: "Audio and media",
  },
  farragna: {
    name: "farragna",
    displayName: "Farragna",
    url: "/farragna",
    icon: "video",
    color: "#e17055",
    description: "Video and media",
  },
  e7ki: {
    name: "e7ki",
    displayName: "E7ki",
    url: "/e7ki",
    icon: "message-circle",
    color: "#a29bfe",
    description: "Chat system",
  },
};

type DataListener = (service: ServiceName, data: unknown) => void;

class ZagelBridge {
  private listeners: Set<DataListener> = new Set();
  private activeService: ServiceName | null = null;

  subscribe(listener: DataListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(service: ServiceName, data: unknown) {
    this.listeners.forEach((l) => l(service, data));
  }

  // Open a service (navigate or open in panel)
  openService(name: ServiceName) {
    this.activeService = name;
    const config = SERVICES[name];
    if (config) {
      // Emit event for UI to handle
      this.notify(name, { action: "open", url: config.url });
    }
  }

  // Send data to a service
  sendData(service: ServiceName, payload: unknown) {
    this.notify(service, { action: "data", payload });
  }

  // Receive data from a service
  receiveData(): { service: ServiceName | null; data: unknown } {
    return { service: this.activeService, data: null };
  }

  getActiveService(): ServiceName | null {
    return this.activeService;
  }

  getServiceConfig(name: ServiceName): ServiceConfig | null {
    return SERVICES[name] || null;
  }

  getAllServices(): ServiceConfig[] {
    return Object.values(SERVICES);
  }

  closeService() {
    this.activeService = null;
  }
}

const zagelBridge = new ZagelBridge();
export default zagelBridge;
