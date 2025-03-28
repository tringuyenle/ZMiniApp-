import { useState } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { addPerson, updatePerson, deletePerson } from '../services/firebase.service';

export function useFirebasePeople() {
  const { people, setPeople, userId } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Thêm người mới - đã thêm tham số customUserId
  const addNewPerson = async (personData, customUserId = null) => {
    setLoading(true);
    setError(null);
    
    try {
      // Sử dụng userId từ context nếu customUserId không được cung cấp
      const idToUse = customUserId || userId;
      const newPerson = await addPerson(personData, idToUse);
      
      if (newPerson) {
        setPeople([newPerson, ...people]);
        return newPerson;
      } else {
        throw new Error('Không thể thêm người dùng');
      }
    } catch (err) {
      setError(err.message);
      console.error("Lỗi khi thêm người dùng:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Cập nhật người dùng - đã thêm tham số customUserId
  const updateExistingPerson = async (id, personData, customUserId = null) => {
    setLoading(true);
    setError(null);
    
    try {
      // Sử dụng userId từ context nếu customUserId không được cung cấp
      const idToUse = customUserId || userId;
      const success = await updatePerson(id, personData, idToUse);
      
      if (success) {
        const updatedPeople = people.map(person => 
          person.id === id ? { ...person, ...personData } : person
        );
        setPeople(updatedPeople);
        return true;
      } else {
        throw new Error('Không thể cập nhật người dùng');
      }
    } catch (err) {
      setError(err.message);
      console.error("Lỗi khi cập nhật người dùng:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Xóa người dùng - đã thêm tham số customUserId
  const removePerson = async (id, customUserId = null) => {
    setLoading(true);
    setError(null);
    
    try {
      // Sử dụng userId từ context nếu customUserId không được cung cấp
      const idToUse = customUserId || userId;
      const success = await deletePerson(id, idToUse);
      
      if (success) {
        setPeople(people.filter(person => person.id !== id));
        return true;
      } else {
        throw new Error('Không thể xóa người dùng');
      }
    } catch (err) {
      setError(err.message);
      console.error("Lỗi khi xóa người dùng:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Tìm người dùng theo ID
  const getPersonById = (personId) => {
    return people.find(person => person.id === personId) || null;
  };
  
  // Kiểm tra xem một tên đã tồn tại chưa
  const isNameExists = (name) => {
    return people.some(person => person.name.toLowerCase() === name.toLowerCase());
  };
  
  return {
    people,
    loading,
    error,
    addNewPerson,
    updateExistingPerson,
    removePerson,
    getPersonById,
    isNameExists
  };
}