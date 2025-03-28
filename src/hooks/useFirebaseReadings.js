import { useState } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { addReading, updateReading, deleteReading } from '../services/firebase.service';

export function useFirebaseReadings() {
  const { readings, setReadings, userId } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Thêm chỉ số mới - đã thêm tham số customUserId
  const addNewReading = async (readingData, customUserId = null) => {
    setLoading(true);
    setError(null);
    
    try {
      // Sử dụng userId từ context nếu customUserId không được cung cấp
      const idToUse = customUserId || userId;
      const newReading = await addReading(readingData, idToUse);
      
      if (newReading) {
        setReadings([newReading, ...readings]);
        return newReading;
      } else {
        throw new Error('Không thể thêm chỉ số điện');
      }
    } catch (err) {
      setError(err.message);
      console.error("Lỗi khi thêm chỉ số:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Cập nhật chỉ số điện - đã thêm tham số customUserId
  const updateExistingReading = async (id, readingData, customUserId = null) => {
    setLoading(true);
    setError(null);
    
    try {
      // Sử dụng userId từ context nếu customUserId không được cung cấp
      const idToUse = customUserId || userId;
      const success = await updateReading(id, readingData, idToUse);
      
      if (success) {
        const updatedReadings = readings.map(reading => 
          reading.id === id ? { ...reading, ...readingData } : reading
        );
        setReadings(updatedReadings);
        return true;
      } else {
        throw new Error('Không thể cập nhật chỉ số điện');
      }
    } catch (err) {
      setError(err.message);
      console.error("Lỗi khi cập nhật chỉ số:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Xóa chỉ số điện - đã thêm tham số customUserId
  const removeReading = async (id, customUserId = null) => {
    setLoading(true);
    setError(null);
    
    try {
      // Sử dụng userId từ context nếu customUserId không được cung cấp
      const idToUse = customUserId || userId;
      const success = await deleteReading(id, idToUse);
      
      if (success) {
        setReadings(readings.filter(reading => reading.id !== id));
        return true;
      } else {
        throw new Error('Không thể xóa chỉ số điện');
      }
    } catch (err) {
      setError(err.message);
      console.error("Lỗi khi xóa chỉ số:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Lấy chỉ số gần nhất cho một người dùng và tháng cụ thể
  const getPersonReadingForMonth = (personId, month) => {
    return readings.find(r => r.personId === personId && r.month === month) || null;
  };
  
  // Lấy tất cả chỉ số cho một tháng
  const getReadingsForMonth = (month) => {
    return readings.filter(r => r.month === month);
  };
  
  return {
    readings,
    loading,
    error,
    addNewReading,
    updateExistingReading,
    removeReading,
    getPersonReadingForMonth,
    getReadingsForMonth,
  };
}