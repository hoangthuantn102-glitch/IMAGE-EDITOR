import { useState, useEffect } from 'react';
import localforage from 'localforage';
import { Session } from '../types';

const HISTORY_STORAGE_KEY = 'ai-image-editor-history';

// Configure localforage to use IndexedDB
localforage.config({
  name: 'AIImageEditor',
  storeName: 'history_store',
  description: 'Stores session history including base64 images'
});

export const useHistory = () => {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const storedHistory = await localforage.getItem<Session[]>(HISTORY_STORAGE_KEY);
        if (storedHistory) {
          setSessions(storedHistory);
        } else {
          // Fallback to localStorage for migration
          const oldHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
          if (oldHistory) {
            const parsed = JSON.parse(oldHistory);
            setSessions(parsed);
            await localforage.setItem(HISTORY_STORAGE_KEY, parsed);
            localStorage.removeItem(HISTORY_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error("Failed to load history from localforage", error);
        setSessions([]);
      }
    };
    loadHistory();
  }, []);

  const saveSession = async (sessionData: Omit<Session, 'id' | 'timestamp'>) => {
    const newSession: Session = {
      ...sessionData,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    };
    
    setSessions(prevSessions => {
      const updatedSessions = [newSession, ...prevSessions].slice(0, 50); // Keep max 50 sessions
      
      // Save asynchronously
      localforage.setItem(HISTORY_STORAGE_KEY, updatedSessions).catch(error => {
        console.error("Failed to save history to localforage", error);
      });
      
      return updatedSessions;
    });
  };

  const deleteSession = async (sessionId: number) => {
    setSessions(prevSessions => {
      const updatedSessions = prevSessions.filter(s => s.id !== sessionId);
      
      // Save asynchronously
      localforage.setItem(HISTORY_STORAGE_KEY, updatedSessions).catch(error => {
        console.error("Failed to update history in localforage", error);
      });
      
      return updatedSessions;
    });
  };

  return { sessions, saveSession, deleteSession };
};
