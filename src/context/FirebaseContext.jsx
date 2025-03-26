import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInAnonymous, getCurrentUserId, getPeople, getReadings, getBills } from '../services/firebase.service';

const FirebaseContext = createContext(null);

export const FirebaseProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [people, setPeople] = useState([]);
  const [readings, setReadings] = useState([]);
  const [bills, setBills] = useState([]);
  
  // Đăng nhập và khởi tạo dữ liệu
  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      
      try {
        // Ưu tiên lấy userId từ Zalo trước
        const currentUserId = await getCurrentUserId();
        setUserId(currentUserId);
        
        // Nếu không có userId từ Zalo, thử đăng nhập ẩn danh
        if (!currentUserId) {
          const firebaseUser = await signInAnonymous();
          setUser(firebaseUser);
          if (firebaseUser) {
            setUserId(`firebase_${firebaseUser.uid}`);
          }
        }
        
        // Nếu có userId (từ bất kỳ nguồn nào), tải dữ liệu
        if (currentUserId || userId) {
          const idToUse = currentUserId || userId;
          console.log("Loading data for userId:", idToUse);
          
          const [peopleData, readingsData, billsData] = await Promise.all([
            getPeople(idToUse),
            getReadings(idToUse),
            getBills(idToUse)
          ]);
          
          setPeople(peopleData);
          setReadings(readingsData);
          setBills(billsData);
        } else {
          console.error("Không thể xác định userId");
        }
      } catch (error) {
        console.error("Lỗi khởi tạo Firebase:", error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeApp();
  }, []);
  
  // Giá trị context
  const value = {
    user,
    userId,
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