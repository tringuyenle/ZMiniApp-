/**
 * Tính chi phí điện cho một chỉ số dựa trên đơn giá
 * @param {Object} reading Chỉ số điện
 * @param {Object|null} monthBill Thông tin hóa đơn tháng
 * @returns {number} Chi phí điện
 */
export function calculateCost(reading, monthBill) {
  const usage = Math.max(0, reading.newReading - reading.oldReading);
  
  if (!monthBill) return 0; // Chưa có dữ liệu hóa đơn
  
  return Math.round(usage * monthBill.pricePerUnit) + (reading.extraCost || 0);
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
 * Lấy thông tin hóa đơn của một tháng
 * @param {string} month Tháng cần lấy hóa đơn
 * @param {Array} monthlyBills Mảng các hóa đơn tháng
 * @returns {Object|null} Hóa đơn tháng hoặc null nếu không có
 */
export function getMonthBill(month, monthlyBills) {
  return monthlyBills.find((bill) => bill.month === month);
}

/**
 * Tạo hoặc cập nhật hóa đơn tháng
 * @param {string} month Tháng cần tạo/cập nhật hóa đơn
 * @param {number} totalAmount Tổng số tiền
 * @param {number} totalKwh Tổng số kWh
 * @param {number} pricePerUnit Giá điện trên một kWh
 * @param {Array} monthlyBills Mảng các hóa đơn tháng hiện có
 * @returns {Array} Mảng các hóa đơn tháng đã được cập nhật
 */
export function updateMonthBill(month, totalAmount, totalKwh, pricePerUnit, monthlyBills) {
  const billData = {
    month,
    totalAmount,
    totalKwh,
    pricePerUnit,
  };

  const existingBillIndex = monthlyBills.findIndex(
    (bill) => bill.month === month
  );

  if (existingBillIndex >= 0) {
    // Cập nhật hóa đơn hiện có
    const updatedBills = [...monthlyBills];
    updatedBills[existingBillIndex] = billData;
    return updatedBills;
  } else {
    // Thêm hóa đơn mới
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