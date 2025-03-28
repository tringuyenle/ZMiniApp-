import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInAnonymous, getCurrentUserId, getPeople, getReadings, getBills } from '../services/firebase.service';

export const FirebaseContext = createContext({
  people: [],
  readings: [],
  bills: [],
  loading: true,
  userId: null,
  setUserId: () => {},
});

export const FirebaseProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [people, setPeople] = useState([]);
  const [readings, setReadings] = useState([]);
  const [bills, setBills] = useState([]);
  
  // Khởi tạo với ID mặc định khi component mount
  useEffect(() => {
    const initializeDefaultUserId = async () => {
      try {
        const currentUserId = await getCurrentUserId();
        if (currentUserId) {
          setUserId(currentUserId);
        }
      } catch (error) {
        console.error("Không thể lấy userId mặc định:", error);
      }
    };
    
    initializeDefaultUserId();
  }, []);
  
  // Tải dữ liệu mỗi khi userId thay đổi
  useEffect(() => {
    const loadUserData = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {        
        // Tải dữ liệu mới với userId đã thay đổi
        const [peopleData, readingsData, billsData] = await Promise.all([
          getPeople(userId),
          getReadings(userId),
          getBills(userId)
        ]);
        
        setPeople(peopleData);
        setReadings(readingsData);
        setBills(billsData);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [userId]);
  
  const value = {
    user,
    userId,
    setUserId,
    people,
    setPeople,
    readings,
    setReadings,
    bills,
    setBills,
    loading
  };
  
  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};

// Hook để sử dụng context
export const useFirebase = () => useContext(FirebaseContext);