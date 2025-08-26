import { getWebSocketUrl } from '../config/api.js';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
  }

  // Connect to WebSocket
  connect(userId) {
    try {
      const wsUrl = `${getWebSocketUrl()}?userId=${userId}`;
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = (event) => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected', event);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('message', data);
          
          // Handle different message types
          if (data.type) {
            this.emit(data.type, data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.emit('disconnected', event);
        
        // Auto-reconnect if not closed intentionally
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(userId);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }

  // Disconnect from WebSocket
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
      this.isConnected = false;
    }
  }

  // Send message through WebSocket
  send(data) {
    if (this.isConnected && this.ws) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('WebSocket not connected');
      return false;
    }
  }

  // Send chat message
  sendMessage(messageData) {
    return this.send({
      type: 'chat_message',
      ...messageData
    });
  }

  // Send typing indicator
  sendTyping(isTyping) {
    return this.send({
      type: 'typing',
      isTyping
    });
  }

  // Join room
  joinRoom(roomId) {
    return this.send({
      type: 'join_room',
      roomId
    });
  }

  // Leave room
  leaveRoom(roomId) {
    return this.send({
      type: 'leave_room',
      roomId
    });
  }

  // Schedule reconnection
  scheduleReconnect(userId) {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect(userId);
      }
    }, delay);
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      readyState: this.ws ? this.ws.readyState : WebSocket.CLOSED
    };
  }
}

// Singleton instance
const wsService = new WebSocketService();
export default wsService;
