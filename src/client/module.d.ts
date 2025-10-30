declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

// Devvit Realtime API types
declare global {
  interface DevvitRealtimeChannel {
    send: (message: any) => Promise<void>;
    unsubscribe: () => void;
    onConnected?: (callback: () => void) => void;
    onDisconnected?: (callback: () => void) => void;
  }

  interface DevvitRealtime {
    subscribe: (topic: string, onMessage: (message: any) => void) => DevvitRealtimeChannel;
  }

  interface Window {
    devvit?: {
      realtime?: DevvitRealtime;
    };
  }
}

export {};
