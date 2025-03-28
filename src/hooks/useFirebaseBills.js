import { useState } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { addOrUpdateBill } from '../services/firebase.service';
import { getMonthBill as getMonthBillService } from "../services/bill.service";

export function useFirebaseBills() {
  const { bills, setBills, userId } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Thêm hoặc cập nhật hóa đơn - đã thêm tham số customUserId
  const saveMonthBill = async (month, billData, customUserId = null) => {
    setLoading(true);
    setError(null);
    
    try {
      // Sử dụng userId từ context nếu customUserId không được cung cấp
      const idToUse = customUserId || userId;
      const savedBill = await addOrUpdateBill(month, billData, idToUse);
      
      if (savedBill) {
        // Kiểm tra xem đã có hóa đơn cho tháng này chưa
        const existingIndex = bills.findIndex(bill => bill.month === month);
        
        if (existingIndex >= 0) {
          // Cập nhật hóa đơn hiện có
          const updatedBills = [...bills];
          updatedBills[existingIndex] = savedBill;
          setBills(updatedBills);
        } else {
          // Thêm hóa đơn mới
          setBills([savedBill, ...bills]);
        }
        
        return savedBill;
      } else {
        throw new Error('Không thể lưu hóa đơn');
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Lấy hóa đơn cho một tháng cụ thể
  const getMonthBill = (month) => {
    return getMonthBillService(month, bills);
  };
  
  return {
    bills,
    loading,
    error,
    saveMonthBill,
    getMonthBill,
  };
}