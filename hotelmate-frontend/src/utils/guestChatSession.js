const SESSION_KEY = 'hotelmate_guest_chat_session';

export class GuestChatSession {
  constructor(hotelSlug, roomNumber) {
    this.hotelSlug = hotelSlug;
    this.roomNumber = roomNumber;
    this.sessionData = this.loadFromLocalStorage();
    this.apiBase = '/api/chat'; // Adjust to your API URL
  }

  /**
   * Initialize new session with PIN
   * Uses the new backend endpoint that returns complete session_data
   */
  async initialize(pin, fcmToken = null) {
    try {
      const payload = { pin };
      if (fcmToken) {
        payload.fcm_token = fcmToken;
      }

      const response = await fetch(
        `${this.apiBase}/${this.hotelSlug}/room/${this.roomNumber}/validate-chat-pin/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Invalid PIN');
      }

      const data = await response.json();
      
      // Backend now returns: { valid: true/false, session_data: {...}, fcm_token_saved: true/false }
      if (!data.valid) {
        throw new Error('Invalid PIN');
      }

      // Extract and save the session_data
      const sessionData = data.session_data;
      this.saveToLocalStorage(sessionData);
      
      console.log('✅ Backend session data:', {
        session_id: sessionData.session_id,
        room_number: sessionData.room_number,
        conversation_id: sessionData.conversation_id,
        pusher_channel: sessionData.pusher_channel,
        fcm_saved: data.fcm_token_saved
      });
      
      return sessionData;
    } catch (error) {
      console.error('Session initialization failed:', error);
      throw error;
    }
  }

  /**
   * Validate existing session on page load
   */
  async validate() {
    if (!this.sessionData?.session_token) {
      return false;
    }

    try {
      const response = await fetch(
        `${this.apiBase}/guest-session/${this.sessionData.session_token}/validate/`
      );

      if (!response.ok) {
        this.clearSession();
        return false;
      }

      const data = await response.json();
      if (data.valid) {
        this.saveToLocalStorage(data);
        return true;
      }
      
      this.clearSession();
      return false;
    } catch (error) {
      console.error('Session validation failed:', error);
      this.clearSession();
      return false;
    }
  }

  /**
   * Check for new messages (for polling backup)
   */
  async checkUnreadMessages() {
    if (!this.sessionData?.session_token) {
      return { unread_count: 0 };
    }

    try {
      const response = await fetch(
        `${this.apiBase}/guest-session/${this.sessionData.session_token}/unread-count/`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to check unread messages:', error);
      return { unread_count: 0 };
    }
  }

  /**
   * Save session data to localStorage
   */
  saveToLocalStorage(data) {
    this.sessionData = {
      ...this.sessionData,
      ...data,
      // Ensure we always have hotelSlug and roomNumber in session
      hotel_slug: data.hotel_slug || this.hotelSlug,
      room_number: data.room_number || this.roomNumber,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(this.sessionData));
    console.log('💾 Guest session saved:', {
      room_number: this.sessionData.room_number,
      hotel_slug: this.sessionData.hotel_slug,
      conversation_id: this.sessionData.conversation_id
    });
  }

  /**
   * Load session data from localStorage
   */
  loadFromLocalStorage() {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Clear session (logout)
   */
  clearSession() {
    this.sessionData = null;
    localStorage.removeItem(SESSION_KEY);
  }

  // Getters
  getSessionId() {
    return this.sessionData?.session_id;
  }

  getToken() {
    return this.sessionData?.session_token;
  }

  getConversationId() {
    return this.sessionData?.conversation_id;
  }

  getCurrentStaffHandler() {
    return this.sessionData?.current_staff_handler;
  }

  getPusherChannel() {
    return this.sessionData?.pusher_channel;
  }

  getHotelSlug() {
    return this.sessionData?.hotel_slug || this.hotelSlug;
  }

  getRoomNumber() {
    return this.sessionData?.room_number || this.roomNumber;
  }
  
  getGuestName() {
    return this.sessionData?.guest_name;
  }
}
