// Generate a random session ID for guest users
export function generateSessionId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get or create a session ID from localStorage
export function getOrCreateSessionId(): string {
  const existingSessionId = localStorage.getItem('guest_session_id');
  
  if (existingSessionId) {
    return existingSessionId;
  }
  
  const newSessionId = generateSessionId();
  localStorage.setItem('guest_session_id', newSessionId);
  return newSessionId;
}

// Clear the session ID (useful when user logs in)
export function clearSessionId(): void {
  localStorage.removeItem('guest_session_id');
}
