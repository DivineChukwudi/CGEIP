// client/src/hooks/useNotificationCounts.js - UPDATED
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function useNotificationCounts(userRole, userId) {
  const [counts, setCounts] = useState({
    // Admin counts
    pendingCompanies: 0,
    totalUsers: 0,
    pendingTranscripts: 0,
    
    // Institution counts
    pendingApplications: 0,
    totalApplications: 0,
    
    // Student counts
    admittedApplications: 0,
    
    // Company counts
    newApplicants: 0,
    totalJobs: 0,
    
    // Universal
    unreadNotifications: 0
  });

  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/notifications/counts`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          timeout: 5000 // 5 second timeout
        }
      );

      setCounts(response.data);
      setLoading(false);
    } catch (error) {
      // Silent fail for notification counts - this shouldn't break the dashboard
      console.warn('Warning: Could not fetch notification counts:', error.message);
      setLoading(false);
      // Keep existing counts instead of crashing
    }
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchCounts();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchCounts, 30000);

    // Cleanup
    return () => {
      clearInterval(interval);
    };
  }, [userRole, userId]);

  // Function to manually refresh counts (call after marking notifications as read)
  const refreshCounts = () => {
    fetchCounts();
  };

  return { counts, loading, refreshCounts };
}