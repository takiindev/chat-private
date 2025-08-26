import React, { useState, useRef, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import firestoreService from './services/api.js';

// Get config from environment variables
const MAX_MESSAGES = parseInt(import.meta.env.VITE_MAX_MESSAGES) || 200;
const MAX_MESSAGE_LENGTH = parseInt(import.meta.env.VITE_MAX_MESSAGE_LENGTH) || 1000;
const MAX_USERNAME_LENGTH = parseInt(import.meta.env.VITE_MAX_USERNAME_LENGTH) || 30;
const ENABLE_REALTIME = import.meta.env.VITE_ENABLE_REALTIME === 'true';
const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true';

const USER_KEY = 'chat_user';

// Color palette for user avatars and names
const USER_COLORS = [
  { bg: 'bg-gradient-to-br from-red-400 to-red-600', text: 'text-red-600', light: 'bg-red-50' },
  { bg: 'bg-gradient-to-br from-blue-400 to-blue-600', text: 'text-blue-600', light: 'bg-blue-50' },
  { bg: 'bg-gradient-to-br from-green-400 to-green-600', text: 'text-green-600', light: 'bg-green-50' },
  { bg: 'bg-gradient-to-br from-purple-400 to-purple-600', text: 'text-purple-600', light: 'bg-purple-50' },
  { bg: 'bg-gradient-to-br from-pink-400 to-pink-600', text: 'text-pink-600', light: 'bg-pink-50' },
  { bg: 'bg-gradient-to-br from-orange-400 to-orange-600', text: 'text-orange-600', light: 'bg-orange-50' },
  { bg: 'bg-gradient-to-br from-teal-400 to-teal-600', text: 'text-teal-600', light: 'bg-teal-50' },
  { bg: 'bg-gradient-to-br from-indigo-400 to-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-50' },
  { bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600', text: 'text-yellow-600', light: 'bg-yellow-50' },
  { bg: 'bg-gradient-to-br from-cyan-400 to-cyan-600', text: 'text-cyan-600', light: 'bg-cyan-50' }
];

// Get color for user based on userId
const getUserColor = (userId) => {
  const colorIndex = Math.abs(userId.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % USER_COLORS.length;
  return USER_COLORS[colorIndex];
};

// Get avatar image for all users
const getUserAvatar = () => {
  return '/avatar.png'; // All users use the same avatar image
};

// Lưu trữ số thứ tự người dùng ẩn danh
let anonymousCounter = parseInt(localStorage.getItem('anonymous_counter') || '0');

function getAnonymousName() {
  anonymousCounter += 1;
  localStorage.setItem('anonymous_counter', anonymousCounter.toString());
  return `Ẩn danh ${anonymousCounter}`;
}

// Load user from localStorage
function loadUser() {
  try {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : { name: getAnonymousName(), id: Date.now() };
  } catch {
    return { name: getAnonymousName(), id: Date.now() };
  }
}

// Save user to localStorage
function saveUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user:', error);
  }
}

const Chat = () => {
  // Debug: Check render count
  if (DEBUG_MODE) {
    console.log('Chat component rendered');
  }

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [user, setUser] = useState(() => loadUser());
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false); // Add sending state
  const [visibleTimestamps, setVisibleTimestamps] = useState(new Set());
  const [copiedMessageId, setCopiedMessageId] = useState(null); // For copy feedback
  const [pendingMessage, setPendingMessage] = useState(null); // Store message while sending
  const [textareaKey, setTextareaKey] = useState(0); // Force textarea re-render
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission); // Track notification permission
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom when new message added
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length]); // Only trigger when message count changes

  // Save user when it changes
  useEffect(() => {
    if (user) {
      saveUser(user);
    }
  }, [user.name]); // Only save when name changes

  // Load messages and setup real-time listener
  useEffect(() => {
    let unsubscribe = null;
    
    const setupMessagesListener = () => {
      if (ENABLE_REALTIME) {
        // Setup real-time listener
        unsubscribe = firestoreService.subscribeToMessages((newMessages) => {
          setMessages(newMessages);
          setLoading(false);
        }, MAX_MESSAGES);
      } else {
        // Load messages once
        const loadMessages = async () => {
          const result = await firestoreService.getMessages(MAX_MESSAGES);
          if (result.success) {
            setMessages(result.data);
          }
          setLoading(false);
        };
        loadMessages();
      }
    };

    setupMessagesListener();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // Empty dependency array to run only once

  // Simulate online status (less frequent updates)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsOnline(Math.random() > 0.1); // 90% online chance
    }, 10000); // Update every 10 seconds instead of 5
    return () => clearInterval(interval);
  }, []);

  // Ensure input DOM and state are synchronized
  useEffect(() => {
    if (inputRef.current) {
      // Force sync DOM with React state
      if (inputRef.current.value !== input) {
        inputRef.current.value = input;
        inputRef.current.textContent = input;
        inputRef.current.innerHTML = input;
      }
    }
  }, [input]);

  // Request notification permission and handle notifications
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        return permission;
      }
      return Notification.permission;
    }
    return 'denied';
  };

  // Show notification for new message
  const showNotification = (message) => {
    if (notificationPermission === 'granted' && 'Notification' in window) {
      // Don't show notification for own messages
      if (message.userId === user.id) return;
      
      // Don't show if page is visible
      if (!document.hidden) return;
      
      const notification = new Notification(`${message.name}`, {
        body: message.text.length > 50 ? message.text.substring(0, 50) + '...' : message.text,
        icon: '/vite.svg', // You can change this to your app icon
        badge: '/vite.svg',
        tag: 'chat-message', // Replace previous notifications
        silent: false,
        requireInteraction: false
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Click to focus window
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  // Request permission on component mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Watch for new messages and show notifications
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      // Only show notification for messages from others
      if (latestMessage.userId !== user.id) {
        showNotification(latestMessage);
      }
    }
  }, [messages, user.id, notificationPermission]);

  const handleSendWithText = async (messageText) => {
    if (!messageText || sending) return; // Prevent if already sending
    
    setSending(true);
    
    const newMessage = {
      userId: user.id,
      name: user.name,
      text: messageText,
      time: new Date().toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      isOwn: true
    };

    // Send to Firestore
    try {
      const result = await firestoreService.sendMessage(newMessage);
      
      if (result.success) {
        inputRef.current?.focus();
        
        // Clean up old messages if we're at the limit
        if (messages.length >= MAX_MESSAGES) {
          await firestoreService.deleteOldMessages(MAX_MESSAGES);
        }
      } else {
        console.error('Failed to send message:', result.error);
        // Restore input on error from pending message
        if (pendingMessage) {
          setInput(pendingMessage);
          if (inputRef.current) {
            inputRef.current.value = pendingMessage;
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore input on error from pending message
      if (pendingMessage) {
        setInput(pendingMessage);
        if (inputRef.current) {
          inputRef.current.value = pendingMessage;
        }
      }
    } finally {
      setSending(false); // Reset sending state
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return; // Prevent if already sending
    
    const messageText = input.trim();
    
    // Step 1: Store message in pending state
    setPendingMessage(messageText);
    
    // Step 2: IMMEDIATELY clear input - multiple approaches to ensure it works
    setInput('');
    if (inputRef.current) {
      // Force clear all possible content
      inputRef.current.value = '';
      inputRef.current.innerHTML = '';
      inputRef.current.textContent = '';
      inputRef.current.innerText = '';
      // Reset all styles
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = '56px';
      // Force blur and focus to reset
      inputRef.current.blur();
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
    
    // Step 3: Force React to update immediately
    flushSync(() => {
      setInput('');
    });
    
    // Step 4: Force textarea re-render if needed
    setTextareaKey(prev => prev + 1);
    
    // Step 4: Now send the message from pending state
    await handleSendWithText(messageText);
    
    // Step 5: Clear pending message after sending
    setPendingMessage(null);
  };

  const handleNameEdit = () => {
    setTempName(user.name);
    setEditingName(true);
  };

  const handleNameChange = (e) => {
    setTempName(e.target.value);
  };

  const handleNameSave = () => {
    if (tempName.trim()) {
      setUser(prev => ({ ...prev, name: tempName.trim() }));
    }
    setEditingName(false);
  };

  const handleNameCancel = () => {
    setTempName('');
    setEditingName(false);
  };

  // Auto resize textarea based on content
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    
    // Auto resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  };

  // Copy message to clipboard
  const copyMessageToClipboard = async (messageText, messageId) => {
    try {
      await navigator.clipboard.writeText(messageText);
      // Show visual feedback
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000); // Hide after 2 seconds
      console.log('Message copied to clipboard');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = messageText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      // Show visual feedback
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
      console.log('Message copied to clipboard (fallback)');
    }
  };

  // Check if message is from current user
  const isMessageFromCurrentUser = (msg) => msg.userId === user.id;

  // Check if we should show timestamp (if messages are more than 5 minutes apart)
  const shouldShowTimestamp = (currentMsg, previousMsg) => {
    if (!previousMsg) return true;
    const currentTime = new Date(currentMsg.timestamp || currentMsg.createdAt);
    const previousTime = new Date(previousMsg.timestamp || previousMsg.createdAt);
    const diffInMinutes = (currentTime - previousTime) / (1000 * 60);
    return diffInMinutes > 5;
  };

  // Check if we should show avatar (if different user or time gap)
  const shouldShowAvatar = (currentMsg, nextMsg) => {
    if (!nextMsg) return true;
    if (currentMsg.userId !== nextMsg.userId) return true;
    const currentTime = new Date(currentMsg.timestamp || currentMsg.createdAt);
    const nextTime = new Date(nextMsg.timestamp || nextMsg.createdAt);
    const diffInMinutes = (nextTime - currentTime) / (1000 * 60);
    return diffInMinutes > 2;
  };

  // Check if we should show user name (only show for first message in a group)
  const shouldShowUserName = (currentMsg, previousMsg) => {
    if (!previousMsg) return true; // Always show for first message
    if (currentMsg.userId !== previousMsg.userId) return true; // Show if different user
    const currentTime = new Date(currentMsg.timestamp || currentMsg.createdAt);
    const prevTime = new Date(previousMsg.timestamp || previousMsg.createdAt);
    const diffInMinutes = (currentTime - prevTime) / (1000 * 60);
    return diffInMinutes > 2; // Show if time gap > 2 minutes
  };

  // Toggle timestamp visibility  
  const toggleTimestamp = (messageId) => {
    setVisibleTimestamps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  return (
    <div className="h-[100dvh] w-screen bg-white flex flex-col overflow-hidden">
      {/* Header - Modern style with gradient */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left section - App info */}
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold truncate">Chat Private</h1>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-300' : 'bg-gray-300'} animate-pulse flex-shrink-0`}></div>
                  <span className="text-sm text-white text-opacity-90 truncate">
                    {isOnline ? `${messages.length} tin nhắn` : 'Đang kết nối...'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Right section - Controls and User profile */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Notification button */}
              {notificationPermission === 'denied' && (
                <button
                  onClick={requestNotificationPermission}
                  className="p-2 bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30 rounded-full transition-all duration-200 backdrop-blur-sm flex-shrink-0"
                  title="Bật thông báo"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5zM10.5 8.5a2.5 2.5 0 105 0 2.5 2.5 0 00-5 0zM17 8.5a7.5 7.5 0 01-15 0 7.5 7.5 0 0115 0z"></path>
                  </svg>
                </button>
              )}
              
              {/* User profile section */}
              {editingName ? (
                <div className="flex items-center space-x-2">
                  <input
                    className="bg-white bg-opacity-80 border border-white border-opacity-30 rounded-xl px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-32 sm:w-40 text-sm"
                    value={tempName}
                    onChange={handleNameChange}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleNameSave();
                      if (e.key === 'Escape') handleNameCancel();
                    }}
                    placeholder="Nhập tên mới..."
                    maxLength={MAX_USERNAME_LENGTH}
                    autoFocus
                  />
                  <button
                    onClick={handleNameSave}
                    className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </button>
                  <button
                    onClick={handleNameCancel}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  {/* User info - hidden on very small screens */}
                  <div className="text-right hidden sm:block">
                    <div className="font-semibold text-white text-sm truncate max-w-24">{user.name}</div>
                    <div className="text-xs text-white text-opacity-75">{messages.length}/{MAX_MESSAGES}</div>
                  </div>
                  {/* Avatar */}
                  <div className={`w-[30px] h-[30px] ${getUserColor(user.id).bg} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Edit button */}
                  <button
                    onClick={handleNameEdit}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-all flex-shrink-0"
                    title="Chỉnh sửa tên"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area - Full screen with colorful design */}
      <div className="flex-1 overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Đang tải tin nhắn...</h3>
                  <p className="text-gray-500">Vui lòng đợi trong giây lát</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Chào mừng đến Chat Private!</h3>
                <p className="text-gray-600 mb-2">Chưa có tin nhắn nào trong cuộc trò chuyện</p>
                <p className="text-sm text-gray-500">Hãy gửi tin nhắn đầu tiên để bắt đầu!</p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                {messages.map((msg, index) => {
                  const isOwn = isMessageFromCurrentUser(msg);
                  const previousMsg = index > 0 ? messages[index - 1] : null;
                  const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
                  const showTimestamp = shouldShowTimestamp(msg, previousMsg);
                  const showAvatar = shouldShowAvatar(msg, nextMsg);
                  const showUserName = shouldShowUserName(msg, previousMsg);
                  const showClickableTime = visibleTimestamps.has(msg.id);
                  const userColor = getUserColor(msg.userId);
                  
                  // Nếu là tin nhắn thông báo (system/announcement/broadcast)
                  if (msg.type === 'system' || msg.type === 'announcement' || msg.type === 'broadcast' || msg.type === 'notify') {
                    return (
                      <div key={msg.id} className="w-full">
                        <div className="flex justify-center my-4">
                          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm px-4 py-2 rounded-full shadow-md">
                            <span className="font-semibold">{msg.name ? msg.name + ': ' : ''}</span>
                            <span>{msg.text}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  // ...existing code...
                  return (
                    <div key={msg.id} className="w-full">
                      {/* Time separator with gradient */}
                      {showTimestamp && (
                        <div className="flex justify-center my-6">
                          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm px-4 py-2 rounded-full shadow-md">
                            {new Date(msg.timestamp || msg.createdAt).toLocaleDateString('vi-VN', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Message */}
                      <div className="mb-1">
                        {/* Layout: Avatar left, Name + Message right */}
                        <div className={`flex items-start gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                          {/* Avatar - always show for every message */}
                          <div className={`flex-shrink-0 ${isOwn ? 'pl-2' : 'pr-2'}`}> 
                            <div className="w-[30px] h-[30px] rounded-full overflow-hidden shadow-md ring-2 ring-gray-200">
                              <img 
                                src={getUserAvatar()} 
                                alt={isOwn ? user.name : msg.name}
                                className="w-[30px] h-[30px] object-cover object-center"
                                onError={(e) => {
                                  // Fallback to text avatar if image fails to load
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                              <div className={`w-[30px] h-[30px] ${isOwn ? getUserColor(user.id).bg : userColor.bg} rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm`} style={{display: 'none'}}>
                                {isOwn ? user.name.charAt(0).toUpperCase() : msg.name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          </div>
                          
                          {/* Right side: Name and Message in column */}
                          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-xs sm:max-w-md lg:max-w-lg flex-1`}>
                            {/* User name - always show for every message */}
                            <div className={`mb-0.5 ${isOwn ? 'text-right' : 'text-left'}`}> 
                              <span className={`text-sm font-semibold ${isOwn ? 'text-indigo-600' : getUserColor(msg.userId).text}`}>
                                {isOwn ? user.name : msg.name}
                              </span>
                            </div>
                            
                            {/* Message bubble */}
                            <div
                              onClick={() => toggleTimestamp(msg.id)}
                              onDoubleClick={() => copyMessageToClipboard(msg.text, msg.id)}
                              className={`relative rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-sm select-text px-3 py-1.5 ${
                                isOwn
                                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-md'
                                  : `bg-gray-800 text-white rounded-bl-md`
                              }`}
                              title="Click: Show time | Double click: Copy message"
                            >
                              <p className="m-0 text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                              
                              {/* Copy success indicator */}
                              {copiedMessageId === msg.id && (
                                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg animate-bounce">
                                  Copied!
                                </div>
                              )}
                              
                              {/* Message status for own messages */}
                              {isOwn && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                  </svg>
                                </div>
                              )}
                            </div>
                            
                            {/* Clickable timestamp */}
                            {showClickableTime && (
                              <div className={`text-xs text-gray-500 mt-2 px-3 py-1 bg-gray-100 rounded-full ${isOwn ? 'mr-2' : 'ml-2'}`}>
                                {msg.time || new Date(msg.timestamp || msg.createdAt).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area - Modern gradient design */}
          <div className="bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSend} className="flex items-center space-x-3">
                <div className="flex-1 relative flex items-center">
                  <textarea
                    key={textareaKey}
                    ref={inputRef}
                    className="w-full resize-none bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200 min-h-[44px] max-h-32 text-gray-800 placeholder-gray-500 overflow-hidden"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        // Just call handleSend directly, let it handle the clearing
                        if (!sending && input.trim()) {
                          handleSend(e);
                        }
                      }
                    }}
                    placeholder="Nhập tin nhắn của bạn..."
                    rows={1}
                    maxLength={MAX_MESSAGE_LENGTH}
                  />
                  {input.length > MAX_MESSAGE_LENGTH * 0.8 && (
                    <div className="absolute right-4 bottom-4 text-xs text-gray-400 bg-white px-2 py-1 rounded-lg shadow">
                      {input.length}/{MAX_MESSAGE_LENGTH}
                    </div>
                  )}
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={!input.trim() || sending ? undefined : handleSend}
                  className={`rounded-full flex items-center justify-center transition-all duration-200 shadow-lg cursor-pointer px-3 py-3 ${
                    input.trim() && !sending
                      ? 'bg-black text-white hover:bg-gray-900 transform scale-100 hover:scale-105' 
                      : 'bg-black text-gray-400 cursor-not-allowed transform scale-95'
                  }`}
                  style={{ outline: 'none' }}
                >
                  {sending ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </form>
              
              {/* Pending message indicator */}
              {pendingMessage && sending && (
                <div className="mt-2 text-center">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                    <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang gửi: "{pendingMessage.length > 30 ? pendingMessage.substring(0, 30) + '...' : pendingMessage}"
                  </div>
                </div>
              )}
              
              {/* Enhanced message limit warning */}
              {messages.length >= MAX_MESSAGES * 0.9 && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-orange-400 to-red-500 text-white text-sm font-medium shadow-md">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                    </svg>
                    {messages.length >= MAX_MESSAGES ? 
                      'Đã đạt giới hạn tin nhắn! Tin nhắn cũ sẽ tự động xóa.' : 
                      `Sắp đạt giới hạn: ${messages.length}/${MAX_MESSAGES} tin nhắn`
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Chat);
