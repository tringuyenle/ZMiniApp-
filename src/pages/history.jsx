import React, { useState, useMemo } from "react";
import { Page, Box, Text, Button, Select, useNavigate } from "zmp-ui";
import { useAtom } from "jotai";
import { peopleState, electricityReadingsState, monthlyBillState } from "../state";

// Import services
import { getCurrentMonth, getRecentMonths } from "../services/date.service";
import { 
  getMonthsWithReadings, 
  calculateMonthUsage,
  getMonthReadings
} from "../services/reading.service";
import { 
  calculateCost,
  calculateMonthTotalCost,
  getMonthBill
} from "../services/bill.service";

const HistoryPage = () => {
  const navigate = useNavigate();
  const [people] = useAtom(peopleState);
  const [readings] = useAtom(electricityReadingsState);
  const [monthlyBills] = useAtom(monthlyBillState);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedPerson, setSelectedPerson] = useState("all");
  
  // Extract all available months from readings
  const availableMonths = useMemo(() => {
    return getMonthsWithReadings(readings);
  }, [readings]);
  
  // Filter readings based on selections
  const filteredReadings = useMemo(() => {
    let filtered = readings;
    
    if (selectedMonth && selectedMonth !== "all") {
      filtered = filtered.filter(r => r.month === selectedMonth);
    }
    
    if (selectedPerson && selectedPerson !== "all") {
      filtered = filtered.filter(r => r.personId === selectedPerson);
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
    
    filteredReadings.forEach(reading => {
      if (!readingsByMonth[reading.month]) {
        readingsByMonth[reading.month] = [];
      }
      readingsByMonth[reading.month].push(reading);
      
      const usage = Math.max(0, reading.newReading - reading.oldReading);
      totalUsage += usage;
      
      // Get the bill for this reading's month
      const monthBill = getMonthBill(reading.month, monthlyBills);
      
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
      total: totalElectricityCost + totalExtraCost
    };
  }, [filteredReadings, monthlyBills]);
  
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
        <Text.Title size="normal" className="mb-4">Lịch sử tiêu thụ điện</Text.Title>
        
        <Box className="space-y-3">
          {/* Month selector */}
          <Box>
            <Text size="small" bold className="mb-1">Tháng</Text>
            <Box className="relative">
              <Select
                value={selectedMonth}
                onChange={(value) => setSelectedMonth(value)}
                placeholder={`Tháng: ${selectedMonth}`}
              >
                <option value="all">Tất cả tháng</option>
                {availableMonths.map(month => (
                  <option key={month} value={month}>{getMonthDisplayText(month)}</option>
                ))}
              </Select>
            </Box>
          </Box>
          
          {/* Person selector */}
          <Box>
            <Text size="small" bold className="mb-1">Người dùng</Text>
            <Box className="relative">
              <Select
                value={selectedPerson}
                onChange={(value) => setSelectedPerson(value)}
                placeholder={`Người dùng: ${selectedPerson}`}
              >
                <option value="all">Tất cả người dùng</option>
                {people.map(person => (
                  <option key={person.id} value={person.id}>{person.name}</option>
                ))}
              </Select>
            </Box>
          </Box>
        </Box>
      </div>
      
      {/* Summary */}
      <div className="section-container mb-4">
        <Text.Title size="small" className="mb-3">Tổng kết</Text.Title>
        <Box className="space-y-2">
          <Box flex justifyContent="space-between">
            <Text>Tổng số điện:</Text>
            <Text bold>{totals.usage} kWh</Text>
          </Box>
          <Box flex justifyContent="space-between">
            <Text>Tiền điện:</Text>
            <Text bold>{new Intl.NumberFormat('vi-VN').format(totals.electricityCost)} đ</Text>
          </Box>
          <Box flex justifyContent="space-between">
            <Text>Chi phí bổ sung:</Text>
            <Text bold>{new Intl.NumberFormat('vi-VN').format(totals.extraCost)} đ</Text>
          </Box>
          <Box flex justifyContent="space-between" className="pt-2 border-t">
            <Text bold>Tổng cộng:</Text>
            <Text bold className="text-red-500">{new Intl.NumberFormat('vi-VN').format(totals.total)} đ</Text>
          </Box>
        </Box>
      </div>
      
      {/* Monthly Bills Summary */}
      {selectedMonth === "all" && (
        <div className="section-container mb-4">
          <Text.Title size="small" className="mb-3">Hóa đơn theo tháng</Text.Title>
          
          {monthlyBills.length === 0 ? (
            <Box className="py-4 text-center">
              <Text className="text-gray-500">Chưa có hóa đơn nào</Text>
            </Box>
          ) : (
            <Box className="space-y-3">
              {monthlyBills.map((bill) => {
                const monthReadings = getMonthReadings(bill.month, readings);
                const totalExtraCostForMonth = monthReadings.reduce((sum, r) => sum + (r.extraCost || 0), 0);
                
                return (
                  <Box key={bill.month} className="p-3 border rounded-md">
                    <Box flex justifyContent="space-between">
                      <Text bold>Tháng {bill.month}</Text>
                      <Text size="small">
                        {new Intl.NumberFormat("vi-VN").format(bill.pricePerUnit)} đ/kWh
                      </Text>
                    </Box>
                    
                    <Box className="mt-2 space-y-1">
                      <Box flex justifyContent="space-between">
                        <Text size="small">Tổng tiêu thụ:</Text>
                        <Text size="small">{bill.totalKwh} kWh</Text>
                      </Box>
                      
                      <Box flex justifyContent="space-between">
                        <Text size="small">Tiền điện:</Text>
                        <Text size="small">
                          {new Intl.NumberFormat("vi-VN").format(bill.totalAmount - totalExtraCostForMonth)} đ
                        </Text>
                      </Box>
                      
                      <Box flex justifyContent="space-between">
                        <Text size="small">Chi phí bổ sung:</Text>
                        <Text size="small">
                          {new Intl.NumberFormat("vi-VN").format(totalExtraCostForMonth)} đ
                        </Text>
                      </Box>
                      
                      <Box flex justifyContent="space-between" className="pt-1 border-t">
                        <Text size="small" bold>Tổng cộng:</Text>
                        <Text size="small" bold>
                          {new Intl.NumberFormat("vi-VN").format(bill.totalAmount)} đ
                        </Text>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </div>
      )}
      
      {/* Detailed readings */}
      <div className="section-container">
        <Text.Title size="small" className="mb-3">Chi tiết</Text.Title>
        
        {filteredReadings.length === 0 ? (
          <Box className="py-8 text-center">
            <Text className="text-gray-500">Không có dữ liệu</Text>
          </Box>
        ) : (
          <Box className="space-y-3">
            {filteredReadings.map((reading) => {
              const person = people.find(p => p.id === reading.personId);
              const usage = Math.max(0, reading.newReading - reading.oldReading);
              const monthBill = getMonthBill(reading.month, monthlyBills);
              
              // Calculate cost using bill service
              const electricityCost = monthBill 
                ? calculateCost(reading, monthBill) - (reading.extraCost || 0)
                : 0;
                
              const extraCost = reading.extraCost || 0;
              const totalCost = electricityCost + extraCost;
              
              return (
                <Box key={reading.id} className="p-3 border rounded-md">
                  <Box flex justifyContent="space-between">
                    <Text bold>{person?.name}</Text>
                    <Text size="small">Tháng {reading.month}</Text>
                  </Box>
                  
                  <Box className="mt-2 space-y-1">
                    <Text size="small">Chỉ số: {reading.oldReading} → {reading.newReading} ({usage} kWh)</Text>
                    
                    {monthBill && (
                      <Box flex justifyContent="space-between">
                        <Text size="small">Đơn giá:</Text>
                        <Text size="small">
                          {new Intl.NumberFormat("vi-VN").format(monthBill.pricePerUnit)} đ/kWh
                        </Text>
                      </Box>
                    )}
                    
                    <Box flex justifyContent="space-between">
                      <Text size="small">Tiền điện:</Text>
                      <Text size="small">{new Intl.NumberFormat('vi-VN').format(electricityCost)} đ</Text>
                    </Box>
                    
                    {extraCost > 0 && (
                      <Box flex justifyContent="space-between">
                        <Text size="small">Chi phí bổ sung:</Text>
                        <Text size="small">{new Intl.NumberFormat('vi-VN').format(extraCost)} đ</Text>
                      </Box>
                    )}
                    
                    <Box flex justifyContent="space-between" className="pt-1 border-t">
                      <Text size="small" bold>Tổng cộng:</Text>
                      <Text size="small" bold>{new Intl.NumberFormat('vi-VN').format(totalCost)} đ</Text>
                    </Box>
                    
                    {reading.note && (
                      <Text size="xSmall" className="italic mt-1">Ghi chú: {reading.note}</Text>
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