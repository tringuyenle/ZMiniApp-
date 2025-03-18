import { atom } from "jotai";
import { getUserInfo } from "zmp-sdk/apis";

export const userState = atom(() =>
  getUserInfo({
    avatarType: "normal",
  })
);

export const displayNameState = atom("");

// Dữ liệu người dùng điện
export const peopleState = atom([
  // Ví dụ: { id: "1", name: "Nguyễn Văn A", room: "P101" }
]);

// Dữ liệu chỉ số điện
export const electricityReadingsState = atom([
  // Ví dụ: { id: "1", personId: "1", month: "2023-05", oldReading: 100, newReading: 150, extraCost: 50000, note: "" }
]);

// Dữ liệu giá điện
export const electricityRatesState = atom({
  tier1: 1678, // 0-50 kWh
  tier2: 1734, // 51-100 kWh
  tier3: 2014, // 101-200 kWh
  tier4: 2536, // 201-300 kWh
  tier5: 2834, // 301-400 kWh
  tier6: 2927, // >400 kWh
});

// Thêm state mới cho hóa đơn hàng tháng
export const monthlyBillState = atom([
  // Ví dụ: { month: "2023-05", totalAmount: 500000, totalKwh: 120, pricePerUnit: 4166.67 }
]);
