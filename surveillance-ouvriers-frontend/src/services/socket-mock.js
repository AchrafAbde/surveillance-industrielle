/**
 * Mock implementation of Socket.IO client
 * This is used when the real Socket.IO connection fails
 */

class MockSocket {
  constructor() {
    this.handlers = {};
    this.connected = true;
    console.log("Using MockSocket as fallback");
  }

  on(event, callback) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(callback);
  }

  off(event, callback) {
    if (!this.handlers[event]) return;
    this.handlers[event] = this.handlers[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    console.log(`[MockSocket] Emitted event: ${event}`, data);
  }

  disconnect() {
    this.connected = false;
    console.log("[MockSocket] Disconnected");
  }
}

export const createMockSocketIO = () => {
  return {
    connect: () => new MockSocket(),
  };
};

export default createMockSocketIO;
