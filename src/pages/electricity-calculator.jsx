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
import * as htmlToImage from "html-to-image";

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

  const [showExportBillModal, setShowExportBillModal] = useState(false);
  // Form state
  const [newPerson, setNewPerson] = useState({ name: "" });
  const [newReading, setNewReading] = useState({
    personId: "",
    month: getCurrentMonth(),
    oldReading: 0,
    newReading: 0,
    extraCost: 0,
    note: "",
  });

  // Thêm hàm này để tạo nội dung hóa đơn dạng text
  const generateBillText = () => {
    let billText = `HÓA ĐƠN TIỀN ĐIỆN - THÁNG ${currentMonth}\n\n`;

    if (currentMonthBill && currentMonthBill.isMultiMonth) {
      billText += `(Hóa đơn gộp: ${[
        ...currentMonthBill.includedMonths,
        currentMonth,
      ].join(", ")})\n\n`;
    }

    billText += `Tổng tiêu thụ: ${currentMonthBill?.totalKwh} kWh\n`;
    billText += `Đơn giá điện: ${new Intl.NumberFormat("vi-VN").format(
      currentMonthBill?.pricePerUnit
    )} đ/kWh\n`;
    billText += `Tiền điện: ${new Intl.NumberFormat("vi-VN").format(
      currentMonthBill?.totalAmount - currentMonthBill?.totalExtraCost
    )} đ\n`;

    billText += `CHI TIẾT THEO NGƯỜI DÙNG:\n`;

    people.forEach((person) => {
      const reading = readings.find(
        (r) => r.personId === person.id && r.month === currentMonth
      );
      if (!reading) return;

      const usage = reading.newReading - reading.oldReading;
      const electricityCost = currentMonthBill
        ? calculateCost(reading, currentMonthBill)
        : 0;
      const totalCost = electricityCost + (reading.extraCost || 0);

      billText += `\n${person.name}\n`;
      billText += `Chỉ số: ${reading.oldReading} → ${reading.newReading} (${usage} kWh)\n`;
      billText += `Tiền điện: ${new Intl.NumberFormat("vi-VN").format(
        electricityCost
      )} đ\n`;

      if (reading.extraCost > 0) {
        billText += `Chi phí bổ sung: ${new Intl.NumberFormat("vi-VN").format(
          reading.extraCost
        )} đ\n`;
      }

      billText += `Tổng cộng: ${new Intl.NumberFormat("vi-VN").format(
        totalCost
      )} đ\n`;

      if (reading.note) {
        billText += `Ghi chú: ${reading.note}\n`;
      }
    });

    billText += `\nNgày xuất hóa đơn: ${new Date().toLocaleDateString(
      "vi-VN"
    )}`;

    return billText;
  };
  // Hàm tải xuống hình ảnh hóa đơn
  // Cập nhật hàm downloadBillAsImage để hoạt động tốt hơn trên thiết bị di động
  const downloadBillAsImage = async () => {
    try {
      snackbar.openSnackbar({
        text: "Đang tạo hình ảnh hóa đơn...",
        type: "info",
      });

      const billElement = document.getElementById("bill-export");

      if (!billElement) {
        throw new Error("Không tìm thấy phần tử hóa đơn");
      }

      // Thêm padding và đặt nền trắng để hình ảnh đẹp hơn
      const originalPadding = billElement.style.padding;
      const originalBg = billElement.style.backgroundColor;

      billElement.style.padding = "20px";
      billElement.style.backgroundColor = "white";

      // Tạo hình ảnh từ phần tử DOM
      const dataUrl = await htmlToImage.toPng(billElement, {
        quality: 0.95,
        backgroundColor: "white",
        style: {
          margin: "0",
          boxShadow: "none",
        },
      });

      // Khôi phục style gốc
      billElement.style.padding = originalPadding;
      billElement.style.backgroundColor = originalBg;

      // Xử lý dựa trên thiết bị
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        // Tạo hình ảnh trong DOM
        const imgElement = document.createElement("img");
        imgElement.src = dataUrl;

        // Tạo một div container cho hình ảnh
        const container = document.createElement("div");
        container.style.position = "fixed";
        container.style.top = "0";
        container.style.left = "0";
        container.style.right = "0";
        container.style.bottom = "0";
        container.style.backgroundColor = "rgba(0,0,0,0.9)";
        container.style.zIndex = "9999";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.justifyContent = "center";
        container.style.alignItems = "center";
        container.style.padding = "20px";

        // Tạo heading
        const heading = document.createElement("h3");
        heading.textContent = "Hóa đơn tiền điện - Tháng " + currentMonth;
        heading.style.color = "white";
        heading.style.marginBottom = "10px";

        // Tạo hướng dẫn
        const instruction = document.createElement("p");
        instruction.textContent = "Nhấn giữ vào hình ảnh để lưu";
        instruction.style.color = "white";
        instruction.style.marginBottom = "20px";
        instruction.style.fontSize = "14px";

        // Tạo nút đóng
        const closeButton = document.createElement("button");
        closeButton.textContent = "Đóng";
        closeButton.style.marginTop = "20px";
        closeButton.style.padding = "10px 20px";
        closeButton.style.background = "white";
        closeButton.style.border = "none";
        closeButton.style.borderRadius = "4px";
        closeButton.onclick = () => {
          document.body.removeChild(container);
        };

        // Thiết lập style cho hình ảnh
        imgElement.style.maxWidth = "100%";
        imgElement.style.maxHeight = "70vh";
        imgElement.style.objectFit = "contain";
        imgElement.style.border = "1px solid #ccc";
        imgElement.style.backgroundColor = "white";

        // Thêm tất cả các phần tử vào container
        container.appendChild(heading);
        container.appendChild(instruction);
        container.appendChild(imgElement);
        container.appendChild(closeButton);

        // Thêm container vào body
        document.body.appendChild(container);

        snackbar.openSnackbar({
          text: "Nhấn giữ vào hình ảnh để lưu.",
          type: "success",
          duration: 5000,
        });
      } else {
        // Máy tính - tạo link để tải xuống
        const link = document.createElement("a");
        link.download = `Hoa-don-dien-thang-${currentMonth.replace(
          "-",
          "_"
        )}.png`;
        link.href = dataUrl;
        link.click();

        snackbar.openSnackbar({
          text: "Đã tải xuống hình ảnh hóa đơn",
          type: "success",
        });
      }
    } catch (error) {
      console.error("Lỗi tạo hình ảnh:", error);
      snackbar.openSnackbar({
        text: "Không thể tạo hình ảnh hóa đơn",
        type: "error",
      });

      // Fallback nếu không tạo được hình ảnh
      showBillAsAlert();
    }
  };
  // Hàm hiển thị hóa đơn dạng alert nếu không thể chia sẻ
  const showBillAsAlert = () => {
    const billText = generateBillText();
    snackbar.openSnackbar({
      text: "Không thể chia sẻ trực tiếp, hiển thị nội dung hóa đơn.",
      type: "info",
    });

    // Hiển thị hộp thoại với nội dung hóa đơn
    setTimeout(() => {
      alert("HÓA ĐƠN TIỀN ĐIỆN\n\n" + billText);
    }, 1000);
  };

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
        setNewReading(() => {
          const [currentYear, currentMonthNum] = currentMonth
            .split("-")
            .map(Number);
          const [latestYear, latestMonthNum] = latestReading.month
            .split("-")
            .map(Number);
          const monthDifference =
            (currentYear - latestYear) * 12 +
            (currentMonthNum - latestMonthNum);
          const calculatedExtraCost =
            monthDifference > 0
              ? 10000 * monthDifference
              : latestReading.extraCost;
          const getOldReading =
            monthDifference > 0
              ? latestReading.newReading
              : latestReading.oldReading;

          return {
            personId: selectedPerson.id,
            month: currentMonth,
            oldReading: getOldReading,
            newReading: latestReading.newReading,
            extraCost: calculatedExtraCost,
            note:
            monthDifference > 0
                ? `Chi phí bổ sung bao gồm phụ phí đồng hồ ${monthDifference} tháng: ${new Intl.NumberFormat(
                    "vi-VN"
                  ).format(calculatedExtraCost)} đ`
                : latestReading.note || "",
          };
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
  }, [selectedPerson, currentMonth, readings]);

  // Thêm useEffect sau các state khai báo đầu component
  useEffect(() => {
    // Tự động cập nhật includedMonths và isMultiMonthBill khi mở modal hóa đơn
    if (showBillModal) {
      const previousMonths = getPreviousUnbilledMonths(currentMonth, bills);
      if (previousMonths.length > 0) {
        setIncludedMonths(previousMonths);
        setIsMultiMonthBill(true);
      } else {
        setIncludedMonths([]);
        setIsMultiMonthBill(false);
      }
    }
  }, [showBillModal, currentMonth, bills]);

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
    } else {
      snackbar.openSnackbar({
        text: "Có lỗi khi lưu chỉ số điện!",
        type: "error",
      });
    }
  };

  // Handle bill entry
  // Cập nhật hàm handleBillSubmit để tự động sử dụng previousMonths

  const handleBillSubmit = async () => {
    // Kiểm tra valid
    if (totalBillAmount <= 0 && pricePerUnit <= 0) {
      snackbar.openSnackbar({
        text: "Vui lòng nhập tổng tiền điện hoặc đơn giá hợp lệ!",
        type: "warning",
      });
      return;
    }

    // Lấy danh sách tháng chưa có hóa đơn
    const previousMonths = getPreviousUnbilledMonths(currentMonth, bills);
    const isMultiBill = previousMonths.length > 0;

    // Tính tổng kWh - tự động tính cho tất cả các tháng nếu có tháng chưa có hóa đơn
    const months = isMultiBill
      ? [...previousMonths, currentMonth]
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
        .filter((reading) => months.includes(reading.month))
        .reduce((sum, reading) => sum + (reading.extraCost || 0), 0);
    };

    // Lấy tổng chi phí phụ
    const totalExtraCost = calculateTotalExtraCost(months, readings);

    // Lưu dữ liệu vào Firebase với thông tin tháng gộp và chi phí phụ
    const billData = {
      totalAmount: finalTotalAmount,
      totalKwh: totalKwh,
      pricePerUnit: finalPricePerUnit,
      includedMonths: isMultiBill ? previousMonths : [],
      isMultiMonth: isMultiBill,
      totalExtraCost: totalExtraCost,
    };

    const result = await saveMonthBill(currentMonth, billData);

    if (result) {
      setShowBillModal(false);
      snackbar.openSnackbar({
        text: `Đã cập nhật giá điện: ${new Intl.NumberFormat("vi-VN").format(
          finalPricePerUnit
        )} đ/kWh${isMultiBill ? " (hóa đơn gộp)" : ""}`,
        type: "success",
      });
      setPricePerUnitEdited(false);
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
              <Text size="small">Tổng tiền chi phí bổ sung:</Text>
              <Text bold>
                {new Intl.NumberFormat("vi-VN").format(
                  currentMonthBill.totalExtraCost
                )}{" "}
                đ
              </Text>
            </Box>

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
                <Text size="small" className="text-blue-600 italic">
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
          <>
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
                            Chỉ số: {reading.oldReading} → {reading.newReading}{" "}
                            ({reading.newReading - reading.oldReading} kWh)
                          </Text>
                          {currentMonthBill && (
                            <>
                              <Text size="xSmall" className="">
                                Tiền điện:{" "}
                                {new Intl.NumberFormat("vi-VN").format(
                                  calculateCost(reading, currentMonthBill)
                                )}{" "}
                                đ
                              </Text>
                              <Text size="xSmall" className="">
                                Tiền bổ sung:{" "}
                                {new Intl.NumberFormat("vi-VN").format(
                                  reading.extraCost
                                )}{" "}
                                đ
                              </Text>
                              <Text
                                size="xSmall"
                                bold
                                className="text-green-600"
                              >
                                Tổng cộng:{" "}
                                {new Intl.NumberFormat("vi-VN").format(
                                  calculateCost(reading, currentMonthBill) +
                                    reading.extraCost
                                )}{" "}
                                đ
                              </Text>
                              <Box
                                className="mt-2 pt-1 border-t border-blue-100"
                                flex
                                justifyContent="center"
                              >
                                <Text
                                  size="small"
                                  className="text-blue-500 italic"
                                >
                                  {reading.note}
                                </Text>
                              </Box>
                            </>
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
            {/* Nút xuất hóa đơn */}
            <Box className="mt-4 flex justify-center">
              <Button
                size="large"
                className="bg-green-600 text-white px-6"
                onClick={() => {
                  // Xử lý logic xuất hóa đơn ở đây
                  if (!currentMonthBill) {
                    snackbar.openSnackbar({
                      text: "Chưa có hóa đơn cho tháng này!",
                      type: "warning",
                    });
                    return;
                  }
                  setShowExportBillModal(true);
                  snackbar.openSnackbar({
                    text: "Đang chuẩn bị xuất hóa đơn...",
                    type: "success",
                  });
                  // Chuyển đến trang xuất hóa đơn hoặc mở modal xuất hóa đơn
                }}
                disabled={!currentMonthBill}
              >
                {currentMonthBill
                  ? "Xuất hóa đơn tháng này"
                  : "Chưa có hóa đơn để xuất"}
              </Button>
            </Box>
          </>
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
          {/* Các input khác giữ nguyên */}
          {(() => {
            const totalKwh = calculateMonthUsage(
              currentMonth,
              readings
            );

            return (
              <Input
                type="number"
                label="Tổng tiền điện (đ)"
                placeholder="Nhập tổng số tiền trên hóa đơn"
                value={
                  pricePerUnitEdited
                    ?  Math.round(pricePerUnit * totalKwh) : totalBillAmount
                }
                onChange={(e) => {
                  setTotalBillAmount(Number(e.target.value));
                  setPricePerUnit(Number(e.target.value) / totalKwh);
                  setPricePerUnitEdited(false);
                }}
              />
            );
          })()}

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
                        const totalKwh = calculateMonthUsage(
                          currentMonth,
                          readings
                        );
                        setTotalBillAmount(Math.round(newPrice * totalKwh));
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
                            totalBillAmount
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

      {/* Export Bill Modal */}
      <Modal
        visible={showExportBillModal}
        onClose={() => setShowExportBillModal(false)}
        actions={[
          {
            text: "Đóng",
            onClick: () => setShowExportBillModal(false),
          },
          {
            text: "Tải (PNG)",
            onClick: () => downloadBillAsImage(),
            primary: "true",
          },
        ]}
      >
        <Box
          className="p-4"
          id="bill-export"
          style={{ maxWidth: "600px", margin: "0 auto" }}
        >
          {/* Header */}
          <Box className="text-center mb-4 pb-3 border-b">
            <Text.Title size="normal">HÓA ĐƠN TIỀN ĐIỆN</Text.Title>
            <Text className="mt-1 font-medium">Tháng {currentMonth}</Text>
            {currentMonthBill && currentMonthBill.isMultiMonth && (
              <Text size="small" className="text-blue-600 mt-1">
                (Hóa đơn gộp:{" "}
                {[...currentMonthBill.includedMonths, currentMonth].join(", ")})
              </Text>
            )}
          </Box>

          {/* Bill info */}
          <Box className="mb-4 p-3 bg-blue-50 rounded-md">
            <Box flex justifyContent="space-between" className="mb-2">
              <Text>Tổng tiêu thụ:</Text>
              <Text bold>{currentMonthBill?.totalKwh} kWh</Text>
            </Box>
            <Box flex justifyContent="space-between" className="mb-2">
              <Text>Đơn giá điện:</Text>
              <Text bold>
                {new Intl.NumberFormat("vi-VN").format(
                  currentMonthBill?.pricePerUnit
                )}{" "}
                đ/kWh
              </Text>
            </Box>
            <Box flex justifyContent="space-between" className="mb-2">
              <Text>Tiền điện:</Text>
              <Text bold>
                {new Intl.NumberFormat("vi-VN").format(
                  currentMonthBill?.totalAmount -
                    currentMonthBill?.totalExtraCost
                )}{" "}
                đ
              </Text>
            </Box>
          </Box>

          {/* People details */}
          <Text bold className="mb-2">
            Chi tiết theo người dùng:
          </Text>
          <Box className="space-y-3">
            {people.map((person) => {
              const reading = readings.find(
                (r) => r.personId === person.id && r.month === currentMonth
              );
              if (!reading) return null;

              const usage = reading.newReading - reading.oldReading;
              const electricityCost = currentMonthBill
                ? calculateCost(reading, currentMonthBill)
                : 0;
              const totalCost = electricityCost + (reading.extraCost || 0);

              return (
                <Box key={person.id} className="p-3 border rounded-md">
                  <Text bold>{person.name}</Text>
                  <Box className="mt-2 space-y-1">
                    <Box flex justifyContent="space-between">
                      <Text size="small">Chỉ số:</Text>
                      <Text size="small">
                        {reading.oldReading} → {reading.newReading} ({usage}{" "}
                        kWh)
                      </Text>
                    </Box>
                    <Box flex justifyContent="space-between">
                      <Text size="small">Tiền điện:</Text>
                      <Text size="small">
                        {new Intl.NumberFormat("vi-VN").format(electricityCost)}{" "}
                        đ
                      </Text>
                    </Box>
                    {reading.extraCost > 0 && (
                      <Box flex justifyContent="space-between">
                        <Text size="small">Chi phí bổ sung:</Text>
                        <Text size="small">
                          {new Intl.NumberFormat("vi-VN").format(
                            reading.extraCost
                          )}{" "}
                          đ
                        </Text>
                      </Box>
                    )}
                    <Box
                      flex
                      justifyContent="space-between"
                      className="pt-1 border-t"
                    >
                      <Text size="small" bold>
                        Tổng cộng:
                      </Text>
                      <Text size="small" bold>
                        {new Intl.NumberFormat("vi-VN").format(totalCost)} đ
                      </Text>
                    </Box>
                    {reading.note && (
                      <Text size="xSmall" className="mt-1 text-blue-500 italic">
                        {reading.note}
                      </Text>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Footer */}
          <Box className="text-center mt-4 pt-4 border-t">
            <Text size="small" className="italic">
              Ngày xuất hóa đơn: {new Date().toLocaleDateString("vi-VN")}
            </Text>
          </Box>
        </Box>
      </Modal>
    </Page>
  );
};

export default ElectricityCalculator;
