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
  Spinner,
  Checkbox,
} from "zmp-ui";
import { useFirebasePeople } from "../hooks/useFirebasePeople";
import { useFirebaseReadings } from "../hooks/useFirebaseReadings";
import { useFirebaseBills } from "../hooks/useFirebaseBills";

// Import các hàm từ services
import {
  getCurrentMonth,
  getRecentMonths,
  getPreviousUnbilledMonths,
} from "../services/date.service";
import {
  getLatestReading,
  hasReadingForMonth,
  getMonthsWithReadings,
  calculateMonthUsage,
  calculateTotalUsageForMonths,
} from "../services/reading.service";
import { calculateCost, allPeopleHaveReadings } from "../services/bill.service";

const ElectricityCalculator = () => {
  // Sử dụng hooks Firebase
  const { people, loading: peopleLoading, addNewPerson } = useFirebasePeople();
  const {
    readings,
    loading: readingsLoading,
    addNewReading,
    updateExistingReading,
  } = useFirebaseReadings();
  const {
    bills,
    loading: billsLoading,
    saveMonthBill,
    getMonthBill,
  } = useFirebaseBills();

  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [showAddReadingModal, setShowAddReadingModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [totalBillAmount, setTotalBillAmount] = useState(0);
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [pricePerUnitEdited, setPricePerUnitEdited] = useState(false);
  const [isMultiMonthBill, setIsMultiMonthBill] = useState(false);
  const [includedMonths, setIncludedMonths] = useState([]);

  const snackbar = useSnackbar();
  const isLoading = peopleLoading || readingsLoading || billsLoading;

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
  const handleAddPerson = async () => {
    if (!newPerson.name.trim()) {
      snackbar.openSnackbar({
        text: "Vui lòng nhập tên người dùng!",
        type: "warning",
      });
      return;
    }

    const result = await addNewPerson(newPerson);

    if (result) {
      setNewPerson({ name: "" });
      setShowAddPersonModal(false);
      snackbar.openSnackbar({
        text: "Đã thêm người dùng mới!",
        type: "success",
      });
    } else {
      snackbar.openSnackbar({
        text: "Có lỗi khi thêm người dùng!",
        type: "error",
      });
    }
  };

  const isMonthLocked = (month) => {
    // Phân tích tháng thành năm và số tháng
    const [targetYear, targetMonth] = month.split("-").map(Number);

    // Kiểm tra tất cả các hóa đơn để xem có tháng nào lớn hơn không
    return bills.some((bill) => {
      const [billYear, billMonth] = bill.month.split("-").map(Number);

      // So sánh: billYear > targetYear hoặc (billYear === targetYear và billMonth > targetMonth)
      return (
        billYear > targetYear ||
        (billYear === targetYear && billMonth > targetMonth)
      );
    });
  };

  // Set up the reading form when a person is selected
  useEffect(() => {
    if (selectedPerson) {
      const latestReading = getLatestReading(selectedPerson.id, readings);

      if (latestReading) {
        // If previous reading exists, use its new reading as the old reading
        setNewReading({
          personId: selectedPerson.id,
          month: currentMonth,
          oldReading: latestReading.newReading,
          newReading: latestReading.newReading,
          extraCost: latestReading.extraCost,
          note: latestReading.note,
        });
      } else {
        // First time reading for this person
        setNewReading({
          personId: selectedPerson.id,
          month: currentMonth,
          oldReading: 0,
          newReading: 0,
          extraCost: 10000,
          note: "phí đồng hồ hằng tháng",
        });
      }
    }
  }, [selectedPerson, currentMonth, readings]);

  // Add/Update reading
  const handleAddReading = async () => {
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
    const existingReading = readings.find(
      (r) => r.personId === newReading.personId && r.month === newReading.month
    );

    let result;

    if (existingReading) {
      // Update existing reading
      result = await updateExistingReading(existingReading.id, {
        newReading: newReading.newReading,
        extraCost: newReading.extraCost,
        note: newReading.note,
      });
    } else {
      // Add new reading
      result = await addNewReading(newReading);
    }

    if (result) {
      setShowAddReadingModal(false);
      snackbar.openSnackbar({
        text: "Đã cập nhật chỉ số điện!",
        type: "success",
      });

      // Check if all people have readings for this month
      checkAllReadingsComplete(newReading.month);
    } else {
      snackbar.openSnackbar({
        text: "Có lỗi khi lưu chỉ số điện!",
        type: "error",
      });
    }
  };

  // Check if all people have readings for a specific month
  const checkAllReadingsComplete = (month) => {
    if (allPeopleHaveReadings(month, people, readings)) {
      snackbar.openSnackbar({
        text: "Đã nhập chỉ số cho tất cả mọi người! Bạn có thể nhập tổng tiền điện.",
        type: "success",
        duration: 5000,
      });

      setTimeout(() => {
        setShowBillModal(true);
      }, 1000);
    }
  };

  // Handle bill entry
  const handleBillSubmit = async () => {
    // Kiểm tra valid
    if (totalBillAmount <= 0 && pricePerUnit <= 0) {
      snackbar.openSnackbar({
        text: "Vui lòng nhập tổng tiền điện hoặc đơn giá hợp lệ!",
        type: "warning",
      });
      return;
    }

    // Tính tổng kWh - nếu là hóa đơn gộp, tính cho tất cả các tháng
    const months = isMultiMonthBill
      ? [...includedMonths, currentMonth]
      : [currentMonth];
    const totalKwh = calculateTotalUsageForMonths(months, readings);

    if (totalKwh === 0) {
      snackbar.openSnackbar({
        text: "Tổng số kWh sử dụng là 0!",
        type: "warning",
      });
      return;
    }

    // Tính giá trị cuối cùng
    let finalPricePerUnit = pricePerUnit;
    let finalTotalAmount = totalBillAmount;

    if (pricePerUnitEdited) {
      finalPricePerUnit = pricePerUnit;
      finalTotalAmount = Math.round(totalKwh * pricePerUnit);
    } else {
      finalPricePerUnit = totalBillAmount / totalKwh;
      finalTotalAmount = totalBillAmount;
    }

// Tính toán tổng chi phí phụ từ tất cả các tháng liên quan
const calculateTotalExtraCost = (months, readings) => {
  return readings
    .filter(reading => months.includes(reading.month))
    .reduce((sum, reading) => sum + (reading.extraCost || 0), 0);
};

// Lấy tổng chi phí phụ
const totalExtraCost = calculateTotalExtraCost(months, readings);

// Lưu dữ liệu vào Firebase với thông tin tháng gộp và chi phí phụ
const billData = {
  totalAmount: finalTotalAmount,
  totalKwh: totalKwh,
  pricePerUnit: finalPricePerUnit,
  includedMonths: isMultiMonthBill ? includedMonths : [],
  isMultiMonth: isMultiMonthBill,
  totalExtraCost: totalExtraCost, // Thêm thông tin về tổng chi phí phụ
};

    const result = await saveMonthBill(currentMonth, billData);

    if (result) {
      setShowBillModal(false);
      snackbar.openSnackbar({
        text: `Đã cập nhật giá điện: ${new Intl.NumberFormat("vi-VN").format(
          finalPricePerUnit
        )} đ/kWh${isMultiMonthBill ? " (hóa đơn gộp)" : ""}`,
        type: "success",
      });
      setPricePerUnitEdited(false);
      setIsMultiMonthBill(false);
      setIncludedMonths([]);
    } else {
      // Xử lý lỗi
    }
  };

  // Check if a person has a reading for the current month
  const hasCurrentMonthReading = (personId) => {
    return hasReadingForMonth(personId, currentMonth, readings);
  };

  // Get current month bill info
  const currentMonthBill = getMonthBill(currentMonth);
  const monthsWithReadings = getMonthsWithReadings(readings);

  // Hiển thị loading nếu đang tải dữ liệu
  if (isLoading) {
    return (
      <Page className="page">
        <Box className="h-64 flex items-center justify-center">
          <Spinner />
          <Text className="ml-2">Đang tải dữ liệu...</Text>
        </Box>
      </Page>
    );
  }

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
              {isMonthLocked(getCurrentMonth()) ? " 🔒" : ""}
            </option>

            {/* Previous months options */}
            {getRecentMonths().map((monthValue) => {
              const locked = isMonthLocked(monthValue);
              return (
                <option key={monthValue} value={monthValue}>
                  {monthValue}
                  {locked ? " 🔒" : ""}
                </option>
              );
            })}
          </Select>
        </Box>

        <Box
          flex
          flexDirection="column"
          justifyContent="space-between"
          alignItems="center"
          mb={4}
        >
          <Text.Title size="normal">Quản lý người dùng</Text.Title>
          <Box flex mt={2}>
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
                onClick={() => {
                  if (isMonthLocked(currentMonth)) {
                    snackbar.openSnackbar({
                      text: "Không thể điều chỉnh tiền điện. Tháng này đã bị khóa.",
                      type: "warning",
                    });
                    return;
                  }
                  setShowBillModal(true);
                }}
                disabled={isMonthLocked(currentMonth)}
              >
                {isMonthLocked(currentMonth) ? "Đã khóa" : "Điều chỉnh tiền"}
              </Button>
            ) : (
              people.length > 0 && (
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => {
                    if (isMonthLocked(currentMonth)) {
                      snackbar.openSnackbar({
                        text: "Không thể nhập tiền điện. Tháng này đã bị khóa.",
                        type: "warning",
                      });
                      return;
                    }
                    setShowBillModal(true);
                  }}
                  disabled={
                    !people.every((p) => hasCurrentMonthReading(p.id)) ||
                    isMonthLocked(currentMonth)
                  }
                >
                  {isMonthLocked(currentMonth)
                    ? "Đã khóa"
                    : "Nhập tổng tiền điện"}
                </Button>
              )
            )}
          </Box>
        </Box>

        {/* Current month bill info */}
        {currentMonthBill && (
          <Box className="p-4 bg-blue-50 rounded-md mb-4">
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

            <Box
              flex
              justifyContent="space-between"
              mb={currentMonthBill.isMultiMonth ? 1 : 0}
            >
              <Text size="small">Đơn giá:</Text>
              <Text bold>
                {new Intl.NumberFormat("vi-VN").format(
                  currentMonthBill.pricePerUnit
                )}{" "}
                đ/kWh
              </Text>
            </Box>

            {currentMonthBill.isMultiMonth && (
              <Box className="mt-2 pt-2 border-t border-blue-200">
                <Text size="small" italic className="text-blue-600">
                  Hóa đơn này bao gồm{" "}
                  {currentMonthBill.includedMonths.length + 1} tháng:{" "}
                  {[...currentMonthBill.includedMonths, currentMonth].join(
                    ", "
                  )}
                </Text>
              </Box>
            )}
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
              const monthLocked = isMonthLocked(currentMonth);

              return (
                <Box
                  key={person.id}
                  className={`p-3 border rounded-md ${
                    hasReading ? "border-green-500" : ""
                  } ${monthLocked ? "opacity-75" : ""}`}
                  flex
                  justifyContent="space-between"
                  alignItems="center"
                  onClick={() => {
                    if (monthLocked) {
                      snackbar.openSnackbar({
                        text: "Không thể thay đổi chỉ số. Tháng này đã bị khóa.",
                        type: "warning",
                      });
                      return;
                    }
                    setSelectedPerson(person);
                    setShowAddReadingModal(true);
                  }}
                >
                  <Box>
                    <Text bold>
                      {person.name}
                      {monthLocked && <span className="ml-1">🔒</span>}
                    </Text>
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
                    disabled={monthLocked}
                  >
                    {hasReading ? "Sửa" : "Thêm"}
                  </Button>
                </Box>
              );
            })}
          </Box>
        )}
      </div>

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
            primary: "true",
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
            primary: "true",
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
            primary: "true",
          },
        ]}
      >
        <Box className="p-4 space-y-4">
          {/* Thêm UI để chỉ định nếu hóa đơn này bao gồm nhiều tháng */}
          <Box className="mb-2">
            <Checkbox
              label="Đây là hóa đơn gộp nhiều tháng"
              checked={isMultiMonthBill}
              onChange={(e) => setIsMultiMonthBill(e.target.checked)}
            />
            {isMultiMonthBill && (
              <Box className="mt-2 p-2 bg-yellow-50 rounded-md">
                <Text size="small">Hóa đơn này bao gồm:</Text>
                <Box className="mt-1">
                  {getPreviousUnbilledMonths(currentMonth, bills).map(
                    (month) => (
                      <Checkbox
                        key={month}
                        label={month}
                        checked={includedMonths.includes(month)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setIncludedMonths([...includedMonths, month]);
                          } else {
                            setIncludedMonths(
                              includedMonths.filter((m) => m !== month)
                            );
                          }
                        }}
                      />
                    )
                  )}
                </Box>
              </Box>
            )}{" "}
          </Box>

          {/* Các input khác giữ nguyên */}
          <Input
            type="number"
            label="Tổng tiền điện (đ)"
            placeholder="Nhập tổng số tiền trên hóa đơn"
            value={
              pricePerUnitEdited
                ? (() => {
                    const totalKwh = calculateMonthUsage(
                      currentMonth,
                      readings
                    );
                    return Math.round(pricePerUnit * totalKwh);
                  })()
                : totalBillAmount
            }
            onChange={(e) => {
              setTotalBillAmount(Number(e.target.value));
              setPricePerUnitEdited(false);
            }}
          />

          {/* Hiển thị thêm thông tin khi là hóa đơn gộp */}
          {isMultiMonthBill && includedMonths.length > 0 && (
            <Box className="p-2 bg-blue-50 rounded-md">
              <Text bold>Thông tin hóa đơn gộp:</Text>
              <Box className="mt-1">
                <Text size="small">
                  Các tháng được gộp: {includedMonths.join(", ")} và{" "}
                  {currentMonth}
                </Text>
                <Text size="small" className="mt-1">
                  Tổng kWh sử dụng cho {includedMonths.length + 1} tháng:{" "}
                  {calculateTotalUsageForMonths(
                    [...includedMonths, currentMonth],
                    readings
                  )}{" "}
                  kWh
                </Text>
              </Box>
            </Box>
          )}

          {/* Phần tổng kết giữ nguyên */}
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
