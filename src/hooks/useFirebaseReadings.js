import { useState } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { addReading, updateReading, deleteReading } from '../services/firebase.service';

export function useFirebaseReadings() {
  const { readings, setReadings } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Thêm chỉ số mới
  const addNewReading = async (readingData) => {
    setLoading(true);
    setError(null);
    
    try {
      const newReading = await addReading(readingData);
      
      if (newReading) {
        setReadings([newReading, ...readings]);
        return newReading;
      } else {
        throw new Error('Không thể thêm chỉ số điện');
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Cập nhật chỉ số điện
  const updateExistingReading = async (id, readingData) => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await updateReading(id, readingData);
      
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
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Xóa chỉ số điện
  const removeReading = async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await deleteReading(id);
      
      if (success) {
        setReadings(readings.filter(reading => reading.id !== id));
        return true;
      } else {
        throw new Error('Không thể xóa chỉ số điện');
      }
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    readings,
    loading,
    error,
    addNewReading,
    updateExistingReading,
    removeReading,
  };
}