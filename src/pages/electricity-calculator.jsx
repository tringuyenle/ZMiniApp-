import React, { useState, useEffect } from "react";
import {
  Page,
  Box,
  Text,
  Button,
  Input,
  Select,
  Modal,
  useSnackbar,
  useNavigate,
} from "zmp-ui";
import { useAtom } from "jotai";
import {
  peopleState,
  electricityReadingsState,
  monthlyBillState,
} from "../state";

// Import các hàm từ services
import { getCurrentMonth, getPreviousMonth } from "../services/date.service";
import { 
  getLatestReading, 
  hasReadingForMonth, 
  getMonthsWithReadings, 
  getMonthReadings,
  calculateMonthUsage
} from "../services/reading.service";
import {
  calculateCost,
  getMonthBill,
  allPeopleHaveReadings,
  updateMonthBill
} from "../services/bill.service";

const ElectricityCalculator = () => {
  const navigate = useNavigate();
  const [people, setPeople] = useAtom(peopleState);
  const [readings, setReadings] = useAtom(electricityReadingsState);
  const [monthlyBills, setMonthlyBills] = useAtom(monthlyBillState);

  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [showAddReadingModal, setShowAddReadingModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [totalBillAmount, setTotalBillAmount] = useState(0);
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [pricePerUnitEdited, setPricePerUnitEdited] = useState(false);
  const snackbar = useSnackbar();

  // Form state
  const [newPerson, setNewPerson] = useState({ name: "" });
  const [newReading, setNewReading] = useState({
    personId: "",
    month: getCurrentMonth(),
    oldReading: 0,
    newReading: 0,
    extraCost: 10000,
    note: "phí đồng hồ hằng tháng",
  });

  // Add new person
  const handleAddPerson = () => {
    if (!newPerson.name.trim()) {
      snackbar.openSnackbar({
        text: "Vui lòng nhập tên người dùng!",
        type: "warning",
      });
      return;
    }

    const id = Date.now().toString();
    setPeople([...people, { id, ...newPerson }]);
    setNewPerson({ name: "" });
    setShowAddPersonModal(false);
    snackbar.openSnackbar({ text: "Đã thêm người dùng mới!", type: "success" });
  };

  // Set up the reading form when a person is selected
  useEffect(() => {
    if (selectedPerson) {
      const latestReading = getLatestReading(selectedPerson.id, readings);

      if (latestReading) {
        // If previous reading exists, use its new reading as the old reading
        setNewReading({
          personId: selectedPerson.id,
          month: currentMonth, // Use current month for now
          oldReading: latestReading.newReading, // Use previous new reading as old reading
          newReading: latestReading.newReading, // Initialize with same value
          extraCost: 0,
          note: "",
        });
      } else {
        // First time reading for this person
        setNewReading({
          personId: selectedPerson.id,
          month: currentMonth,
          oldReading: 0,
          newReading: 0,
          extraCost: 0,
          note: "",
        });
      }
    }
  }, [selectedPerson, currentMonth]);

  // Add new reading
  const handleAddReading = () => {
    if (!newReading.personId) {
      snackbar.openSnackbar({
        text: "Vui lòng chọn người dùng!",
        type: "warning",
      });
      return;
    }

    if (newReading.newReading < newReading.oldReading) {
      snackbar.openSnackbar({
        text: "Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ!",
        type: "warning",
      });
      return;
    }

    // Check if reading for this person and month already exists
    const existingReadingIndex = readings.findIndex(
      (r) => r.personId === newReading.personId && r.month === newReading.month
    );

    const id = Date.now().toString();

    if (existingReadingIndex >= 0) {
      // Update existing reading
      const updatedReadings = [...readings];
      updatedReadings[existingReadingIndex] = {
        ...updatedReadings[existingReadingIndex],
        newReading: newReading.newReading,
        extraCost: newReading.extraCost,
        note: newReading.note,
      };
      setReadings(updatedReadings);
    } else {
      // Add new reading
      setReadings([...readings, { id, ...newReading }]);
    }

    setShowAddReadingModal(false);
    snackbar.openSnackbar({
      text: "Đã cập nhật chỉ số điện!",
      type: "success",
    });

    // Check if all people have readings for this month
    checkAllReadingsComplete(newReading.month);
  };

  // Check if all people have readings for a specific month
  const checkAllReadingsComplete = (month) => {
    // Sử dụng hàm từ bill.service
    if (allPeopleHaveReadings(month, people, readings)) {
      // All people have readings for this month
      snackbar.openSnackbar({
        text: "Đã nhập chỉ số cho tất cả mọi người! Bạn có thể nhập tổng tiền điện.",
        type: "success",
        duration: 5000,
      });

      // Open bill entry modal after a short delay
      setTimeout(() => {
        setShowBillModal(true);
      }, 1000);
    }
  };

  // Handle bill entry
  const handleBillSubmit = () => {
    if (totalBillAmount <= 0 && pricePerUnit <= 0) {
      snackbar.openSnackbar({
        text: "Vui lòng nhập tổng tiền điện hoặc đơn giá hợp lệ!",
        type: "warning",
      });
      return;
    }

    // Calculate total kWh used this month
    // Sử dụng hàm từ reading.service
    const totalKwh = calculateMonthUsage(currentMonth, readings);

    if (totalKwh === 0) {
      snackbar.openSnackbar({
        text: "Tổng số kWh sử dụng là 0!",
        type: "warning",
      });
      return;
    }

    // Determine which value to use - if pricePerUnit was manually changed, use it
    // Otherwise calculate from totalBillAmount
    let finalPricePerUnit = pricePerUnit;
    let finalTotalAmount = totalBillAmount;

    if (pricePerUnitEdited) {
      // If price was manually edited, recalculate total amount
      finalPricePerUnit = pricePerUnit;
      finalTotalAmount = Math.round(totalKwh * pricePerUnit);
    } else {
      // Otherwise calculate price from total amount
      finalPricePerUnit = totalBillAmount / totalKwh;
      finalTotalAmount = totalBillAmount;
    }

    // Sử dụng hàm từ bill.service để cập nhật hóa đơn
    const updatedBills = updateMonthBill(
      currentMonth,
      finalTotalAmount,
      totalKwh,
      finalPricePerUnit,
      monthlyBills
    );
    
    setMonthlyBills(updatedBills);

    setShowBillModal(false);
    snackbar.openSnackbar({
      text: `Đã cập nhật giá điện: ${new Intl.NumberFormat("vi-VN").format(
        finalPricePerUnit
      )} đ/kWh`,
      type: "success",
    });

    // Reset edited state
    setPricePerUnitEdited(false);
  };

  // Check if a person has a reading for the current month
  const hasCurrentMonthReading = (personId) => {
    // Sử dụng hàm từ reading.service
    return hasReadingForMonth(personId, currentMonth, readings);
  };

  // Get current month bill info
  const currentMonthBill = getMonthBill(currentMonth, monthlyBills);
  const monthsWithReadings = getMonthsWithReadings(readings);

  return (
    <Page className="page">
      <div className="section-container mb-4">
        {/* Month selector */}
        <Box mb={4}>
          <Text size="small" bold className="mb-1">
            Tháng
          </Text>
          <Select
            value={currentMonth}
            onChange={(value) => setCurrentMonth(value)}
            placeholder={`Tháng: ${currentMonth}`}
          >
            {/* Current month option */}
            <option value={getCurrentMonth()}>
              {getCurrentMonth()} (Hiện tại)
            </option>

            {/* Previous months options */}
            {[1, 2, 3].map((i) => {
              const month = new Date();
              month.setMonth(month.getMonth() - i);
              const monthValue = `${month.getFullYear()}-${String(
                month.getMonth() + 1
              ).padStart(2, "0")}`;
              return (
                <option key={monthValue} value={monthValue}>
                  {monthValue}
                </option>
              );
            })}
          </Select>
        </Box>

        <Box flex justifyContent="space-between" alignItems="center" mb={4}>
          <Text.Title size="normal">Quản lý người dùng</Text.Title>
          <Box flex>
            <Button
              size="small"
              onClick={() => setShowAddPersonModal(true)}
              className="mr-2"
            >
              Thêm người
            </Button>
            {currentMonthBill ? (
              <Button
                size="small"
                variant="secondary"
                onClick={() => setShowBillModal(true)}
              >
                Điều chỉnh tiền
              </Button>
            ) : (
              people.length > 0 && (
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setShowBillModal(true)}
                  disabled={!people.every((p) => hasCurrentMonthReading(p.id))}
                >
                  Nhập tổng tiền điện
                </Button>
              )
            )}
          </Box>
        </Box>

        {/* Current month bill info */}
        {currentMonthBill && (
          <Box className="p-3 bg-blue-50 rounded-md mb{4}">
            <Box flex justifyContent="space-between" mb={1}>
              <Text size="small">Tổng tiền điện:</Text>
              <Text bold>
                {new Intl.NumberFormat("vi-VN").format(
                  currentMonthBill.totalAmount
                )}{" "}
                đ
              </Text>
            </Box>
            <Box flex justifyContent="space-between" mb={1}>
              <Text size="small">Tổng tiêu thụ:</Text>
              <Text bold>{currentMonthBill.totalKwh} kWh</Text>
            </Box>
            <Box flex justifyContent="space-between">
              <Text size="small">Đơn giá:</Text>
              <Text bold>
                {new Intl.NumberFormat("vi-VN").format(
                  currentMonthBill.pricePerUnit
                )}{" "}
                đ/kWh
              </Text>
            </Box>
          </Box>
        )}

        {people.length === 0 ? (
          <Box className="py-8 text-center">
            <Text className="text-gray-500">Chưa có người dùng nào</Text>
          </Box>
        ) : (
          <Box className="space-y-3">
            {people.map((person) => {
              const hasReading = hasCurrentMonthReading(person.id);
              const reading = readings.find(
                (r) => r.personId === person.id && r.month === currentMonth
              );

              return (
                <Box
                  key={person.id}
                  className={`p-3 border rounded-md ${
                    hasReading ? "border-green-500" : ""
                  }`}
                  flex
                  justifyContent="space-between"
                  alignItems="center"
                  onClick={() => {
                    setSelectedPerson(person);
                    setShowAddReadingModal(true);
                  }}
                >
                  <Box>
                    <Text bold>{person.name}</Text>
                    {hasReading && (
                      <Box className="mt-1">
                        <Text size="xSmall">
                          Chỉ số: {reading.oldReading} → {reading.newReading} (
                          {reading.newReading - reading.oldReading} kWh)
                        </Text>
                        {currentMonthBill && (
                          <Text size="xSmall" bold className="text-green-600">
                            Tiền điện:{" "}
                            {new Intl.NumberFormat("vi-VN").format(
                              calculateCost(reading, currentMonthBill)
                            )}{" "}
                            đ
                          </Text>
                        )}
                      </Box>
                    )}
                  </Box>
                  <Button
                    size="small"
                    variant={hasReading ? "secondary" : "primary"}
                  >
                    {hasReading ? "Sửa" : "Thêm"}
                  </Button>
                </Box>
              );
            })}
          </Box>
        )}
      </div>

      {/* Monthly summary */}
      {monthsWithReadings.length > 0 && (
        <div className="section-container">
          <Text.Title size="normal" className="mb-4">
            Tổng kết theo tháng
          </Text.Title>
          <Box className="space-y-3">
            {monthsWithReadings.map((month) => {
              const monthBill = getMonthBill(month, monthlyBills);
              const monthReadings = getMonthReadings(month, readings);
              const totalUsage = calculateMonthUsage(month, readings);
              let totalCost = 0;

              monthReadings.forEach((reading) => {
                if (monthBill) {
                  totalCost += calculateCost(reading, monthBill);
                }
              });

              return (
                <Box key={month} className="p-3 border rounded-md">
                  <Box flex justifyContent="space-between">
                    <Text bold>Tháng {month}</Text>
                    {monthBill && (
                      <Text size="small">
                        {new Intl.NumberFormat("vi-VN").format(
                          monthBill.pricePerUnit
                        )}{" "}
                        đ/kWh
                      </Text>
                    )}
                  </Box>
                  <Box flex justifyContent="space-between" className="mt-1">
                    <Text size="small">Tổng tiêu thụ: {totalUsage} kWh</Text>
                    {monthBill && (
                      <Text size="small" bold>
                        {new Intl.NumberFormat("vi-VN").format(totalCost)} đ
                      </Text>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </div>
      )}

      {/* Add Person Modal */}
      <Modal
        visible={showAddPersonModal}
        title="Thêm người dùng mới"
        onClose={() => setShowAddPersonModal(false)}
        actions={[
          {
            text: "Hủy",
            onClick: () => setShowAddPersonModal(false),
          },
          {
            text: "Thêm",
            onClick: handleAddPerson,
            primary: true,
          },
        ]}
      >
        <Box className="p-4 space-y-4">
          <Input
            label="Tên người dùng"
            placeholder="Nhập tên"
            value={newPerson.name}
            onChange={(e) =>
              setNewPerson((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </Box>
      </Modal>

      {/* Add Reading Modal */}
      <Modal
        visible={showAddReadingModal}
        title={`Chỉ số điện - ${selectedPerson?.name || ""}`}
        onClose={() => setShowAddReadingModal(false)}
        actions={[
          {
            text: "Hủy",
            onClick: () => setShowAddReadingModal(false),
          },
          {
            text: "Lưu",
            onClick: handleAddReading,
            primary: true,
          },
        ]}
      >
        <Box className="p-4 space-y-4">
          <Text>Tháng: {newReading.month}</Text>

          {/* Readings */}
          <Input
            type="number"
            label="Chỉ số cũ"
            value={newReading.oldReading}
            onChange={(e) =>
              setNewReading((prev) => ({
                ...prev,
                oldReading: Number(e.target.value),
              }))
            }
            disabled={getLatestReading(selectedPerson?.id, readings)} // Disable if not the first reading
          />
          <Input
            type="number"
            label="Chỉ số mới"
            value={newReading.newReading}
            onChange={(e) =>
              setNewReading((prev) => ({
                ...prev,
                newReading: Number(e.target.value),
              }))
            }
          />

          {/* Extra cost */}
          <Input
            type="number"
            label="Chi phí bổ sung (đ)"
            value={newReading.extraCost}
            onChange={(e) =>
              setNewReading((prev) => ({
                ...prev,
                extraCost: Number(e.target.value),
              }))
            }
          />

          {/* Note */}
          <Input
            label="Ghi chú (tùy chọn)"
            placeholder="Nhập ghi chú"
            value={newReading.note}
            onChange={(e) =>
              setNewReading((prev) => ({ ...prev, note: e.target.value }))
            }
          />
        </Box>
      </Modal>

      {/* Bill Entry Modal */}
      <Modal
        visible={showBillModal}
        title={`Nhập tổng tiền điện - Tháng ${currentMonth}`}
        onClose={() => setShowBillModal(false)}
        actions={[
          {
            text: "Hủy",
            onClick: () => setShowBillModal(false),
          },
          {
            text: "Tính toán",
            onClick: handleBillSubmit,
            primary: true,
          },
        ]}
      >
        <Box className="p-4 space-y-4">
          <Input
            type="number"
            label="Tổng tiền điện (đ)"
            placeholder="Nhập tổng số tiền trên hóa đơn"
            value={pricePerUnitEdited ? (() => {
              // Tính lại tổng tiền dựa trên đơn giá đã điều chỉnh
              const totalKwh = calculateMonthUsage(currentMonth, readings);
              return Math.round(pricePerUnit * totalKwh);
            })() : totalBillAmount}
            onChange={(e) => {
              setTotalBillAmount(Number(e.target.value));
              // Nếu thay đổi tổng tiền, reset trạng thái chỉnh sửa đơn giá
              setPricePerUnitEdited(false);
            }}
          />

          {/* Summary of readings */}
          <Box className="py-2">
            <Text bold>Tổng kết chỉ số:</Text>
            <Box className="space-y-2 mt-2">
              {people.map((person) => {
                const reading = readings.find(
                  (r) => r.personId === person.id && r.month === currentMonth
                );
                if (!reading) return null;

                const usage = Math.max(
                  0,
                  reading.newReading - reading.oldReading
                );

                return (
                  <Box key={person.id} flex justifyContent="space-between">
                    <Text size="small">{person.name}:</Text>
                    <Text size="small">{usage} kWh</Text>
                  </Box>
                );
              })}

              {/* Total usage */}
              {(() => {
                const totalKwh = calculateMonthUsage(currentMonth, readings);

                return (
                  <Box
                    flex
                    justifyContent="space-between"
                    className="pt-2 border-t"
                  >
                    <Text size="small" bold>
                      Tổng cộng:
                    </Text>
                    <Text size="small" bold>
                      {totalKwh} kWh
                    </Text>
                  </Box>
                );
              })()}

              {/* Calculate price per kWh */}
              {totalBillAmount > 0 &&
                (() => {
                  const totalKwh = calculateMonthUsage(currentMonth, readings);

                  if (totalKwh > 0) {
                    const price = totalBillAmount / totalKwh;
                    return (
                      <Box
                        flex
                        justifyContent="space-between"
                        className="pt-2 mt-2 border-t"
                      >
                        <Text size="small" bold>
                          Đơn giá điện:
                        </Text>
                        <Text size="small" bold>
                          {new Intl.NumberFormat("vi-VN").format(price)} đ/kWh
                        </Text>
                      </Box>
                    );
                  }

                  return null;
                })()}
            </Box>
          </Box>

          {/* Manual price adjustment */}
          {(() => {
            const totalKwh = calculateMonthUsage(currentMonth, readings);

            if (totalKwh > 0) {
              // Tính đơn giá mặc định từ tổng tiền
              const defaultPrice = totalBillAmount / totalKwh;
              // Tính tổng tiền mới từ đơn giá đã điều chỉnh (nếu có)
              const adjustedTotal = pricePerUnitEdited
                ? Math.round(pricePerUnit * totalKwh)
                : totalBillAmount;

              return (
                <Box className="pt-3 space-y-4">
                  <Box>
                    <Text size="small" bold className="mb-1">
                      Điều chỉnh đơn giá (đ/kWh)
                    </Text>
                    <Input
                      type="number"
                      value={pricePerUnit || defaultPrice}
                      onChange={(e) => {
                        const newPrice = Number(e.target.value);
                        setPricePerUnit(newPrice);
                        setPricePerUnitEdited(true);
                        // Không cập nhật totalBillAmount ở đây, sẽ hiển thị bên dưới
                      }}
                    />
                  </Box>

                  {pricePerUnitEdited && (
                    <Box className="p-2 bg-yellow-50 rounded-md">
                      <Box flex justifyContent="space-between">
                        <Text size="small" bold>
                          Tổng tiền sẽ được điều chỉnh:
                        </Text>
                        <Text size="small" bold className="text-blue-600">
                          {new Intl.NumberFormat("vi-VN").format(
                            Math.round(pricePerUnit * totalKwh)
                          )}{" "}
                          đ
                        </Text>
                      </Box>
                      <Text size="xSmall" className="mt-1 text-gray-500">
                        Thay vì{" "}
                        {new Intl.NumberFormat("vi-VN").format(totalBillAmount)}{" "}
                        đ ban đầu
                      </Text>
                    </Box>
                  )}
                </Box>
              );
            }

            return null;
          })()}
        </Box>
      </Modal>
    </Page>
  );
};

export default ElectricityCalculator;
