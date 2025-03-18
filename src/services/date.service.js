/**
 * Lấy tháng hiện tại theo định dạng YYYY-MM
 * @returns {string} Tháng hiện tại (YYYY-MM)
 */
export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Lấy các tháng gần đây
 * @param {number} count Số tháng cần lấy
 * @returns {Array<string>} Mảng các tháng theo định dạng YYYY-MM
 */
export function getRecentMonths(count = 3) {
  const months = [];
  
  // Tháng hiện tại
  months.push(getCurrentMonth());
  
  // Các tháng trước đó
  for (let i = 1; i <= count; i++) {
    const month = new Date();
    month.setMonth(month.getMonth() - i);
    const monthValue = `${month.getFullYear()}-${String(
      month.getMonth() + 1
    ).padStart(2, "0")}`;
    months.push(monthValue);
  }
  
  return months;
}

/**
 * So sánh hai tháng theo định dạng YYYY-MM
 * @param {string} month1 Tháng thứ nhất
 * @param {string} month2 Tháng thứ hai
 * @returns {number} -1 nếu month1 < month2, 0 nếu bằng nhau, 1 nếu month1 > month2
 */
export function compareMonths(month1, month2) {
  const [year1, month1Value] = month1.split("-").map(Number);
  const [year2, month2Value] = month2.split("-").map(Number);
  
  if (year1 !== year2) return year1 - year2;
  return month1Value - month2Value;
}

/**
 * Lấy tháng trước của tháng đã cho theo định dạng YYYY-MM
 * @param {string} monthStr Tháng hiện tại theo định dạng YYYY-MM
 * @returns {string} Tháng trước đó theo định dạng YYYY-MM
 */
export function getPreviousMonth(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  let prevMonth = month - 1;
  let prevYear = year;

  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
}