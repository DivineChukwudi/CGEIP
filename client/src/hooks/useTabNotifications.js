// client/src/hooks/useTabNotifications.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Hook to manage per-tab notifications
 * Tracks unread notification counts for each dashboard tab
 * Automatically clears notifications when tab is opened
 * Polls for real-time updates
 */
export function useTabNotifications(userRole, userId) {
  const [tabNotifications, setTabNotifications] = useState({
    institutions: 0,
    faculties: 0,
    courses: 0,
    companies: 0,
    users: 0,
    transcripts: 0,
    applications: 0,
    jobs: 0,
    profile: 0,
    notifications: 0
  });

  const [loading, setLoading] = useState(true);

  // Fetch unread count for each tab
  const fetchTabNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/notifications/tab-counts`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          timeout: 5000
        }
      );

      setTabNotifications(response.data);
      setLoading(false);
    } catch (error) {
      console.warn('Warning: Could not fetch tab notifications:', error.message);
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchTabNotifications();

    // Poll for updates every 15 seconds
    const interval = setInterval(fetchTabNotifications, 15000);

    return () => clearInterval(interval);
  }, [userRole, userId, fetchTabNotifications]);

  // Clear notifications for a specific tab
  const clearTabNotification = useCallback(async (tabName) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.post(
        `${API_BASE_URL}/notifications/clear-tab`,
        { tab: tabName },
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          timeout: 5000
        }
      );

      // Update local state immediately
      setTabNotifications(prev => ({
        ...prev,
        [tabName]: 0
      }));
    } catch (error) {
      console.warn(`Could not clear ${tabName} notifications:`, error.message);
    }
  }, []);

  // Increment notification count for a tab when data changes
  const incrementTabNotification = useCallback((tabName) => {
    setTabNotifications(prev => ({
      ...prev,
      [tabName]: (prev[tabName] || 0) + 1
    }));
  }, []);

  // Get total unread notifications across all tabs
  const getTotalUnread = useCallback(() => {
    return Object.values(tabNotifications).reduce((sum, count) => sum + count, 0);
  }, [tabNotifications]);

  return {
    tabNotifications,
    loading,
    clearTabNotification,
    incrementTabNotification,
    fetchTabNotifications,
    getTotalUnread
  };
}
