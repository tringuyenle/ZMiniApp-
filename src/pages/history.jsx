import React, { useState, useMemo } from "react";
import { Page, Box, Text, Select } from "zmp-ui";

// Import services
import { getCurrentMonth } from "../services/date.service";
import {
  getMonthsWithReadings,
  calculateMonthUsage,
} from "../services/reading.service";
import { 
  calculateCost, 
  getMonthBill as getMonthBillService 
} from "../services/bill.service";

import { useFirebasePeople } from "../hooks/useFirebasePeople";
import { useFirebaseReadings } from "../hooks/useFirebaseReadings";
import { useFirebaseBills } from "../hooks/useFirebaseBills";

const HistoryPage = () => {
  const { people } = useFirebasePeople();
  const { readings } = useFirebaseReadings();
  const { bills, getMonthBill } = useFirebaseBills();
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedPerson, setSelectedPerson] = useState("all");
  const getPersonName = (personId) => {
    const person = people.find((p) => p.id === personId);
    return person ? person.name : "Tất cả";
  };

  // Extract all available months from readings
  const availableMonths = useMemo(() => {
    return getMonthsWithReadings(readings);
  }, [readings]);

  // Filter readings based on selections
  const filteredReadings = useMemo(() => {
    let filtered = readings;

    if (selectedMonth && selectedMonth !== "all") {
      filtered = filtered.filter((r) => r.month === selectedMonth);
    }

    if (selectedPerson && selectedPerson !== "all") {
      filtered = filtered.filter((r) => r.personId === selectedPerson);
    }

    return filtered;
  }, [readings, selectedMonth, selectedPerson]);

  // Calculate total usage and cost for filtered readings
  const totals = useMemo(() => {
    let totalUsage = 0;
    let totalElectricityCost = 0;
    let totalExtraCost = 0;

    // Group readings by month first
    const readingsByMonth = {};

    filteredReadings.forEach((reading) => {
      if (!readingsByMonth[reading.month]) {
        readingsByMonth[reading.month] = [];
      }
      readingsByMonth[reading.month].push(reading);

      const usage = Math.max(0, reading.newReading - reading.oldReading);
      totalUsage += usage;

      // Get the bill for this reading's month
      const monthBill = getMonthBill(reading.month); // Đã sửa

      // Calculate cost using the bill service
      if (monthBill) {
        totalElectricityCost += calculateCost(reading, monthBill);
        totalExtraCost += reading.extraCost || 0;
      } else {
        // If no bill exists for this month, just add extra cost
        totalExtraCost += reading.extraCost || 0;
      }
    });

    return {
      usage: totalUsage,
      electricityCost: totalElectricityCost,
      extraCost: totalExtraCost,
      total: totalElectricityCost + totalExtraCost,
    };
  }, [filteredReadings, getMonthBill]);

  // Month display text
  const getMonthDisplayText = (month) => {
    if (month === getCurrentMonth()) {
      return `${month} (Hiện tại)`;
    }
    return month;
  };

  return (
    <Page className="page">
      <div className="section-container mb-4">
        <Text.Title size="normal" className="mb-4">
          Lịch sử tiêu thụ điện
        </Text.Title>

        <Box className="space-y-3">
          {/* Month selector */}
          <Box>
            <Text size="small" bold className="mb-1">
              Tháng
            </Text>
            <Box className="relative">
              <Select
                value={selectedMonth}
                onChange={(value) => setSelectedMonth(value)}
                placeholder={`Tháng: ${selectedMonth}`}
              >
                <option value="all">Tất cả tháng</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {getMonthDisplayText(month)}
                  </option>
                ))}
              </Select>
            </Box>
          </Box>

          {/* Person selector */}
          <Box>
            <Text size="small" bold className="mb-1">
              Người dùng
            </Text>
            <Box className="relative">
              <Select
                value={selectedPerson}
                onChange={(value) => setSelectedPerson(value)}
                placeholder={`Người dùng: ${getPersonName(selectedPerson)}`}
              >
                <option value="all">Tất cả người dùng</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
            </Box>
          </Box>
        </Box>
      </div>

{/* Monthly Bills Summary */}
{selectedMonth === "all" && (
  <div className="section-container mb-4">
    <Text.Title size="small" className="mb-3">
      Hóa đơn theo tháng
    </Text.Title>

    {bills.length === 0 ? (
      <Box className="py-4 text-center">
        <Text className="text-gray-500">Chưa có hóa đơn nào</Text>
      </Box>
    ) : (
      <Box className="space-y-3">
        {bills.map((bill) => {
          const totalUsage = bill.totalKwh || calculateMonthUsage(bill.month, readings);
          const totalExtraCostForMonth = bill.totalExtraCost;
          const totalElectricityCost = bill.totalAmount;

          return (
            <Box key={bill.month} className="p-3 border rounded-md">
              <Box flex justifyContent="space-between">
                <Text bold>Tháng {bill.month}</Text>
                <Text size="small" bold>
                  {new Intl.NumberFormat("vi-VN").format(bill.pricePerUnit)} đ/kWh
                </Text>
              </Box>

              <Box className="mt-2 space-y-1">
                <Box flex justifyContent="space-between">
                  <Text size="small">Tổng tiêu thụ:</Text>
                  <Text size="small" bold>{totalUsage} kWh</Text>
                </Box>

                <Box flex justifyContent="space-between">
                  <Text size="small">Tiền điện:</Text>
                  <Text size="small" bold>
                    {new Intl.NumberFormat("vi-VN").format(totalElectricityCost)} đ
                  </Text>
                </Box>

                <Box flex justifyContent="space-between">
                  <Text size="small">Chi phí bổ sung:</Text>
                  <Text size="small" bold>
                    {new Intl.NumberFormat("vi-VN").format(totalExtraCostForMonth)} đ
                  </Text>
                </Box>

                <Box
                  flex
                  justifyContent="space-between"
                  className="pt-1 border-t"
                >
                  <Text size="small" bold>Tổng cộng:</Text>
                  <Text size="small" bold className="text-red-500">
                    {new Intl.NumberFormat("vi-VN").format(totalElectricityCost + totalExtraCostForMonth)} đ
                  </Text>
                </Box>
              </Box>

              {bill.isMultiMonth && (
                <Box
                  className="mt-2 pt-1 border-t border-blue-100"
                  flex
                  justifyContent="center"
                >
                  <Text size="small" className="text-blue-500 italic">
                    Hóa đơn này bao gồm {bill.includedMonths.length + 1} tháng:{" "}
                    {[...bill.includedMonths, bill.month].join(", ")}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    )}
  </div>
)}
{/* Tổng kết theo tháng (khi chọn một tháng cụ thể) */}
{selectedMonth !== "all" && availableMonths.includes(selectedMonth) && (
  <div className="section-container mb-4">
    <Text.Title size="small" className="mb-3">
      Chi tiết tháng {selectedMonth}
    </Text.Title>

    {(() => {
      const month = selectedMonth;
      const monthBill = getMonthBill(month);
      const totalUsage = monthBill.totalKwh;
      const totalElectricityCost = monthBill.totalAmount;
      const totalExtraCostForMonth = monthBill.totalExtraCost;

      // Hiển thị thông tin chi tiết tháng
      return (
        <Box className="p-3 border rounded-md bg-blue-50">
          <Box flex justifyContent="space-between">
            <Text bold>Tháng {month}</Text>

            {monthBill ? (
              <Text size="small" bold>
                {new Intl.NumberFormat("vi-VN").format(
                  monthBill.pricePerUnit
                )}{" "}
                đ/kWh
              </Text>
            ) : ( 
              <Text size="small" className="text-gray-500 italic">
                Chưa có hóa đơn
              </Text>
            )}
          </Box>

          <Box flex justifyContent="space-between" className="mt-2">
            <Text size="small">Tổng tiêu thụ:</Text>
            <Text size="small" bold>
              {totalUsage} kWh
            </Text>
          </Box>

          {monthBill && (
            <>
              <Box flex justifyContent="space-between" className="mt-1">
                <Text size="small">Tiền điện:</Text>
                <Text size="small" bold>
                  {new Intl.NumberFormat("vi-VN").format(
                    totalElectricityCost
                  )}{" "}
                  đ
                </Text>
              </Box>

              <Box flex justifyContent="space-between" className="mt-1">
                <Text size="small">Chi phí bổ sung:</Text>
                <Text size="small" bold>
                  {new Intl.NumberFormat("vi-VN").format(
                    totalExtraCostForMonth
                  )}{" "}
                  đ
                </Text>
              </Box>

              <Box
                flex
                justifyContent="space-between"
                className="pt-1 mt-1 border-t"
              >
                <Text size="small" bold>
                  Tổng cộng:
                </Text>
                <Text size="small" className="text-red-500" bold>
                  {new Intl.NumberFormat("vi-VN").format(
                    totalElectricityCost + totalExtraCostForMonth
                  )}{" "}
                  đ
                </Text>
              </Box>

              {monthBill.isMultiMonth && (
                <Box
                  className="mt-2 pt-1 border-t border-blue-200"
                  flex
                  justifyContent="center"
                >
                  <Text size="small" className="text-blue-600 italic">
                    Hóa đơn này bao gồm{" "}
                    {monthBill.includedMonths.length + 1} tháng:{" "}
                    {[...monthBill.includedMonths, month].join(", ")}
                  </Text>
                </Box>
              )}
              
              {monthBill.isPartOfMultiMonth && (
                <Box
                  className="mt-2 pt-1 border-t border-blue-200"
                  flex
                  justifyContent="center"
                >
                  <Text size="small" className="text-blue-600 italic">
                    Thuộc hóa đơn tháng {monthBill.originalBillMonth}
                  </Text>
                </Box>
              )}
            </>
          )}
        </Box>
      );
    })()}
  </div>
)}

{/* Detailed readings */}
<div className="section-container">
  <Text.Title size="small" className="mb-3">
    Chi tiết
  </Text.Title>

  {filteredReadings.length === 0 ? (
    <Box className="py-8 text-center">
      <Text className="text-gray-500">Không có dữ liệu</Text>
    </Box>
  ) : (
    <Box className="space-y-3">
      {filteredReadings.map((reading) => {
        const person = people.find((p) => p.id === reading.personId);
        const monthBill = getMonthBill(reading.month);
        const usage = Math.max(0, reading.newReading - reading.oldReading);

        // Tính chi phí điện sử dụng calculateCost từ bill.service
        const electricityCost = monthBill ? calculateCost(reading, monthBill) : 0;
        const extraCost = reading.extraCost || 0;
        const totalCost = electricityCost + extraCost;

        return (
          <Box key={reading.id} className="p-3 border rounded-md">
            <Box flex justifyContent="space-between">
              <Text bold>{person?.name || "Không xác định"}</Text>
              <Text size="small">Tháng {reading.month}</Text>
            </Box>

            <Box className="mt-2 space-y-1">
              <Text size="small">
                Chỉ số: {reading.oldReading} → {reading.newReading} ({usage} kWh)
              </Text>

              {monthBill && (
                <Box flex justifyContent="space-between">
                  <Text size="small">Đơn giá:</Text>
                  <Text size="small">
                    {new Intl.NumberFormat("vi-VN").format(
                      monthBill.pricePerUnit
                    )}{" "}
                    đ/kWh
                  </Text>
                </Box>
              )}

              <Box flex justifyContent="space-between">
                <Text size="small">Tiền điện:</Text>
                <Text size="small">
                  {new Intl.NumberFormat("vi-VN").format(electricityCost)}{" "}
                  đ
                </Text>
              </Box>

              {extraCost > 0 && (
                <Box flex justifyContent="space-between">
                  <Text size="small">Chi phí bổ sung:</Text>
                  <Text size="small">
                    {new Intl.NumberFormat("vi-VN").format(extraCost)} đ
                  </Text>
                </Box>
              )}

              <Box flex justifyContent="space-between" className="pt-1 border-t">
                <Text size="small" bold>Tổng cộng:</Text>
                <Text size="small" bold>
                  {new Intl.NumberFormat("vi-VN").format(totalCost)} đ
                </Text>
              </Box>

              {reading.note && (
                <Text size="xSmall" className="italic mt-1">
                  Ghi chú: {reading.note}
                </Text>
              )}

              {monthBill && monthBill.isPartOfMultiMonth && (
                <Text size="xSmall" className="text-blue-500 mt-1">
                  (Thuộc hóa đơn tháng {monthBill.originalBillMonth})
                </Text>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  )}
</div>
    </Page>
  );
};

export default HistoryPage;
