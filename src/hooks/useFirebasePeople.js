import { useState } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { addPerson, updatePerson, deletePerson } from '../services/firebase.service';

export function useFirebasePeople() {
  const { people, setPeople } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Thêm người mới
  const addNewPerson = async (personData) => {
    setLoading(true);
    setError(null);
    
    try {
      const newPerson = await addPerson(personData);
      
      if (newPerson) {
        setPeople([newPerson, ...people]);
        return newPerson;
      } else {
        throw new Error('Không thể thêm người dùng');
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Cập nhật người dùng
  const updateExistingPerson = async (id, personData) => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await updatePerson(id, personData);
      
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
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Xóa người dùng
  const removePerson = async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await deletePerson(id);
      
      if (success) {
        setPeople(people.filter(person => person.id !== id));
        return true;
      } else {
        throw new Error('Không thể xóa người dùng');
      }
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    people,
    loading,
    error,
    addNewPerson,
    updateExistingPerson,
    removePerson,
  };
}