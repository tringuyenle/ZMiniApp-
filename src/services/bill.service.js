/**
 * Tính chi phí điện cho một chỉ số dựa trên đơn giá
 * @param {Object} reading Chỉ số điện
 * @param {Object|null} monthBill Thông tin hóa đơn tháng
 * @returns {number} Chi phí điện
 */
export function calculateCost(reading, monthBill) {
  const usage = Math.max(0, reading.newReading - reading.oldReading);
  
  if (!monthBill) return 0; // Chưa có dữ liệu hóa đơn
  
  return Math.round(usage * monthBill.pricePerUnit);
}

/**
 * Tính tổng chi phí điện của một tháng
 * @param {string} month Tháng cần tính
 * @param {Array} readings Mảng các chỉ số điện
 * @param {Array} monthlyBills Mảng các hóa đơn tháng
 * @returns {number} Tổng chi phí điện
 */
export function calculateMonthTotalCost(month, readings, monthlyBills) {
  const monthBill = getMonthBill(month, monthlyBills);
  if (!monthBill) return 0;
  
  const monthReadings = readings.filter((r) => r.month === month);
  let totalCost = 0;
  
  monthReadings.forEach((reading) => {
    totalCost += calculateCost(reading, monthBill);
  });
  
  return totalCost;
}

/**
 * Lấy thông tin hóa đơn của một tháng, bao gồm cả tháng được gộp
 * @param {string} month Tháng cần lấy hóa đơn
 * @param {Array} monthlyBills Mảng các hóa đơn tháng
 * @returns {Object|null} Hóa đơn tháng hoặc null nếu không có
 */
export function getMonthBill(month, monthlyBills) {
  // Tìm hóa đơn trực tiếp cho tháng này
  const directBill = monthlyBills.find((bill) => bill.month === month);
  if (directBill) return directBill;
  
  // Kiểm tra xem tháng này có nằm trong includedMonths của hóa đơn nào không
  const containingBill = monthlyBills.find(
    (bill) => bill.includedMonths && bill.includedMonths.includes(month)
  );
  
  if (containingBill) {
    // Nếu tháng này nằm trong hóa đơn khác, trả về phiên bản sao chép
    // với ghi chú về việc đây là một hóa đơn gộp
    return {
      ...containingBill,
      isPartOfMultiMonth: true,
      originalBillMonth: containingBill.month,
      // Tính toán giá trị ước tính dựa trên tỷ lệ sử dụng nếu cần
    };
  }
  
  return null;
}

/**
 * Tạo hoặc cập nhật hóa đơn tháng
 * @param {string} month Tháng cần tạo/cập nhật hóa đơn
 * @param {number} totalAmount Tổng số tiền
 * @param {number} totalKwh Tổng số kWh
 * @param {number} pricePerUnit Giá điện trên một kWh
 * @param {Array} monthlyBills Mảng các hóa đơn tháng hiện có
 * @param {Array} includedMonths Các tháng được bao gồm trong hóa đơn này
 * @returns {Array} Mảng các hóa đơn tháng đã được cập nhật
 */
export function updateMonthBill(month, totalAmount, totalKwh, pricePerUnit, monthlyBills, includedMonths = [month]) {
  const billData = {
    month,
    totalAmount,
    totalKwh,
    pricePerUnit,
    includedMonths: includedMonths, // Các tháng được bao gồm trong hóa đơn này
    isMultiMonth: includedMonths.length > 1 // Cờ đánh dấu hóa đơn nhiều tháng
  };

  const existingBillIndex = monthlyBills.findIndex(
    (bill) => bill.month === month
  );

  if (existingBillIndex >= 0) {
    const updatedBills = [...monthlyBills];
    updatedBills[existingBillIndex] = billData;
    return updatedBills;
  } else {
    return [...monthlyBills, billData];
  }
}

/**
 * Kiểm tra xem tất cả người dùng đã có chỉ số điện cho tháng chỉ định chưa
 * @param {string} month Tháng cần kiểm tra
 * @param {Array} people Mảng người dùng
 * @param {Array} readings Mảng chỉ số điện
 * @returns {boolean} true nếu tất cả đã có chỉ số, false nếu chưa
 */
export function allPeopleHaveReadings(month, people, readings) {
  const peopleWithReadings = new Set(
    readings.filter((r) => r.month === month).map((r) => r.personId)
  );
  
  return people.length > 0 && peopleWithReadings.size === people.length;
}

/**
 * Phát hiện các tháng bị bỏ qua giữa hai tháng
 * @param {string} startMonth Tháng bắt đầu (định dạng YYYY-MM)
 * @param {string} endMonth Tháng kết thúc (định dạng YYYY-MM)
 * @param {Array} existingBillMonths Mảng các tháng đã có hóa đơn
 * @returns {Array} Các tháng bị bỏ qua
 */
export function detectSkippedMonths(startMonth, endMonth, existingBillMonths) {
  const skippedMonths = [];
  
  // Parse tháng bắt đầu và kết thúc
  const [startYear, startMonthNum] = startMonth.split('-').map(Number);
  const [endYear, endMonthNum] = endMonth.split('-').map(Number);
  
  // Tính số tháng giữa startMonth và endMonth
  const monthDiff = (endYear - startYear) * 12 + (endMonthNum - startMonthNum);
  
  // Nếu có ít nhất 1 tháng giữa startMonth và endMonth
  if (monthDiff > 0) {
    let currentDate = new Date(startYear, startMonthNum);
    
    // Duyệt qua từng tháng để kiểm tra
    for (let i = 1; i <= monthDiff; i++) {
      currentDate.setMonth(currentDate.getMonth() + 1);
      const checkMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth()).padStart(2, '0')}`;
      
      // Kiểm tra xem tháng này đã có hóa đơn chưa
      if (!existingBillMonths.includes(checkMonth)) {
        skippedMonths.push(checkMonth);
      }
    }
  }
  
  return skippedMonths;
}