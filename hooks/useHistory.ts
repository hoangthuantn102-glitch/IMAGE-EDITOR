import { useState, useEffect } from 'react';
import { Session } from '../types';

const HISTORY_STORAGE_KEY = 'ai-image-editor-history';

export const useHistory = () => {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        setSessions(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
      setSessions([]);
    }
  }, []);

  const saveSession = (sessionData: Omit<Session, 'id' | 'timestamp'>) => {
    const newSession: Session = {
      ...sessionData,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    };
    
    setSessions(prevSessions => {
      const updatedSessions = [newSession, ...prevSessions].slice(0, 50); // Keep max 50 sessions
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedSessions));
      } catch (error) {
        console.error("Failed to save history to localStorage", error);
      }
      return updatedSessions;
    });
  };

  const deleteSession = (sessionId: number) => {
    setSessions(prevSessions => {
      const updatedSessions = prevSessions.filter(s => s.id !== sessionId);
       try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedSessions));
      } catch (error) {
        console.error("Failed to update history in localStorage", error);
      }
      return updatedSessions;
    });
  };

  return { sessions, saveSession, deleteSession };
};
