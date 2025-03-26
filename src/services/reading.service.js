import { compareMonths } from './date.service';

/**
 * Lấy chỉ số điện mới nhất của một người
 * @param {string} personId ID của người dùng
 * @param {Array} readings Mảng các chỉ số điện
 * @returns {Object|null} Chỉ số điện mới nhất hoặc null nếu không có
 */
export function getLatestReading(personId, readings) {
  if (!personId) return null;
  
  const personReadings = readings
    .filter((r) => r.personId === personId)
    .sort((a, b) => {
      // Sắp xếp theo năm, tháng
      const [aYear, aMonth] = a.month.split("-").map(Number);
      const [bYear, bMonth] = b.month.split("-").map(Number);

      if (aYear !== bYear) return bYear - aYear;
      return bMonth - aMonth;
    });

  return personReadings.length > 0 ? personReadings[0] : null;
}

/**
 * Kiểm tra xem một người đã có chỉ số điện cho tháng hiện tại chưa
 * @param {string} personId ID của người dùng
 * @param {string} month Tháng cần kiểm tra
 * @param {Array} readings Mảng các chỉ số điện
 * @returns {boolean} true nếu đã có chỉ số, false nếu chưa
 */
export function hasReadingForMonth(personId, month, readings) {
  return readings.some(
    (r) => r.personId === personId && r.month === month
  );
}

/**
 * Lấy tất cả các tháng có chỉ số điện
 * @param {Array} readings Mảng các chỉ số điện
 * @returns {Array} Mảng các tháng theo thứ tự giảm dần
 */
export function getMonthsWithReadings(readings) {
  const months = [...new Set(readings.map((r) => r.month))];
  return months.sort().reverse();
}

/**
 * Lấy tất cả các chỉ số điện của một tháng
 * @param {string} month Tháng cần lấy chỉ số
 * @param {Array} readings Mảng các chỉ số điện
 * @returns {Array} Mảng các chỉ số điện của tháng
 */
export function getMonthReadings(month, readings) {
  return readings.filter((r) => r.month === month);
}

/**
 * Tính tổng kWh sử dụng của một tháng
 * @param {string} month Tháng cần tính
 * @param {Array} readings Mảng các chỉ số điện
 * @returns {number} Tổng kWh sử dụng
 */
export function calculateMonthUsage(month, readings) {
  const monthReadings = getMonthReadings(month, readings);
  let totalUsage = 0;
  
  monthReadings.forEach((reading) => {
    totalUsage += Math.max(0, reading.newReading - reading.oldReading);
  });
  
  return totalUsage;
}

/**
 * Tính tổng lượng điện sử dụng cho nhiều tháng
 * @param {Array} months Mảng các tháng cần tính (định dạng YYYY-MM)
 * @param {Array} readings Mảng các chỉ số điện
 * @returns {number} Tổng lượng điện sử dụng (kWh)
 */
export function calculateTotalUsageForMonths(months, readings) {
  return readings
    .filter(reading => months.includes(reading.month))
    .reduce((total, reading) => {
      const usage = Math.max(0, reading.newReading - reading.oldReading);
      return total + usage;
    }, 0);
}