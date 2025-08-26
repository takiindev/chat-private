import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

class FirestoreService {
  constructor() {
    this.messagesCollection = 'messages';
    this.usersCollection = 'users';
    this.roomsCollection = 'rooms';
  }

  // Messages
  async sendMessage(messageData) {
    try {
      const docRef = await addDoc(collection(db, this.messagesCollection), {
        ...messageData,
        timestamp: serverTimestamp(),
        createdAt: new Date()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  async getMessages(limitCount = 200) {
    try {
      const q = query(
        collection(db, this.messagesCollection),
        orderBy('timestamp', 'asc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);
      const messages = [];
      querySnapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: messages };
    } catch (error) {
      console.error('Error getting messages:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time listener for messages with deduplication
  subscribeToMessages(callback, limitCount = 200) {
    const q = query(
      collection(db, this.messagesCollection),
      orderBy('timestamp', 'asc'),
      limit(limitCount)
    );

    let lastProcessedSnapshot = null;

    return onSnapshot(q, (querySnapshot) => {
      // Skip if this is the same snapshot we just processed
      if (lastProcessedSnapshot && querySnapshot.metadata.hasPendingWrites) {
        return;
      }
      
      const messages = [];
      const seenIds = new Set(); // Prevent duplicates
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const messageId = doc.id;
        
        // Skip if we've already seen this message
        if (seenIds.has(messageId)) {
          return;
        }
        seenIds.add(messageId);
        
        messages.push({
          id: messageId,
          ...data,
          // Convert Firestore timestamp to JavaScript Date
          timestamp: data.timestamp?.toDate?.() || new Date(data.createdAt)
        });
      });
      
      lastProcessedSnapshot = querySnapshot;
      callback(messages);
    }, (error) => {
      console.error('Error in messages subscription:', error);
    });
  }

  // Users
  async createUser(userData) {
    try {
      const docRef = await addDoc(collection(db, this.usersCollection), {
        ...userData,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUser(userId, userData) {
    try {
      const userRef = doc(db, this.usersCollection, userId);
      await updateDoc(userRef, {
        ...userData,
        lastActive: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time listener for online users
  subscribeToUsers(callback) {
    const q = query(
      collection(db, this.usersCollection),
      orderBy('lastActive', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const users = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          id: doc.id,
          ...data,
          lastActive: data.lastActive?.toDate?.() || new Date()
        });
      });
      callback(users);
    });
  }

  // Rooms (for future use)
  async createRoom(roomData) {
    try {
      const docRef = await addDoc(collection(db, this.roomsCollection), {
        ...roomData,
        createdAt: serverTimestamp(),
        memberCount: 0
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating room:', error);
      return { success: false, error: error.message };
    }
  }

  async getRooms() {
    try {
      const q = query(
        collection(db, this.roomsCollection),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const rooms = [];
      querySnapshot.forEach((doc) => {
        rooms.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: rooms };
    } catch (error) {
      console.error('Error getting rooms:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility functions
  async deleteOldMessages(maxMessages = 200) {
    try {
      const q = query(
        collection(db, this.messagesCollection),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.size > maxMessages) {
        const promises = [];
        querySnapshot.docs.slice(maxMessages).forEach((doc) => {
          promises.push(deleteDoc(doc.ref));
        });
        await Promise.all(promises);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting old messages:', error);
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
const firestoreService = new FirestoreService();
export default firestoreService;
