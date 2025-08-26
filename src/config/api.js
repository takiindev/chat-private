// API Configuration
const API_CONFIG = {
  // Base URL for API (có thể thay đổi theo environment)
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  
  // WebSocket URL cho real-time chat
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:3001',
  
  // API Endpoints
  ENDPOINTS: {
    // Chat endpoints
    CHAT: {
      SEND_MESSAGE: '/chat/send',
      GET_MESSAGES: '/chat/messages',
      GET_ONLINE_USERS: '/chat/users',
      JOIN_ROOM: '/chat/join',
      LEAVE_ROOM: '/chat/leave'
    },
    
    // User endpoints
    USER: {
      CREATE_ANONYMOUS: '/user/anonymous',
      UPDATE_NAME: '/user/update-name',
      GET_PROFILE: '/user/profile'
    },
    
    // Room endpoints (nếu muốn có nhiều phòng chat)
    ROOM: {
      CREATE: '/room/create',
      JOIN: '/room/join',
      LIST: '/room/list',
      GET_INFO: '/room/info'
    }
  },
  
  // Request timeout
  TIMEOUT: 10000,
  
  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000
  }
};

// Environment-specific configurations
const ENVIRONMENTS = {
  development: {
    ...API_CONFIG,
    BASE_URL: 'http://localhost:3001/api',
    WS_URL: 'ws://localhost:3001'
  },
  
  production: {
    ...API_CONFIG,
    BASE_URL: 'https://your-production-api.com/api',
    WS_URL: 'wss://your-production-api.com'
  },
  
  staging: {
    ...API_CONFIG,
    BASE_URL: 'https://staging-api.your-domain.com/api',
    WS_URL: 'wss://staging-api.your-domain.com'
  }
};

// Get current environment
const getCurrentEnvironment = () => {
  return import.meta.env.MODE || 'development';
};

// Get config for current environment
export const getApiConfig = () => {
  const env = getCurrentEnvironment();
  return ENVIRONMENTS[env] || ENVIRONMENTS.development;
};

// Helper function to build full URL
export const buildApiUrl = (endpoint) => {
  const config = getApiConfig();
  return `${config.BASE_URL}${endpoint}`;
};

// Helper function for WebSocket URL
export const getWebSocketUrl = () => {
  const config = getApiConfig();
  return config.WS_URL;
};

// Export default config
export default getApiConfig();
