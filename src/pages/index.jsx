import React, { useState, useEffect, useContext } from "react";
import { Box, Page, Text, Button, useNavigate, Input, useSnackbar } from "zmp-ui";
import { FirebaseContext } from "../context/FirebaseContext";
import { getCurrentUserId } from "../services/firebase.service";

const HomePage = () => {
  const navigate = useNavigate();
  const [customUserId, setCustomUserId] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const { userId, setUserId } = useContext(FirebaseContext);
  const snackbar = useSnackbar();
  
  // Lấy ID của người dùng hiện tại để hiển thị khi component mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const currentId = await getCurrentUserId();
        setCurrentUser(currentId || "Chưa xác định");
      } catch (error) {
        console.error("Lỗi khi lấy ID người dùng:", error);
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Cập nhật hiển thị currentUser khi userId trong context thay đổi
  useEffect(() => {
    if (userId) {
      setCurrentUser(userId);
    }
  }, [userId]);
  
  // Xử lý khi người dùng muốn sử dụng ID tùy chỉnh
  const handleUseCustomId = () => {
    if (!customUserId.trim()) {
      snackbar.openSnackbar({
        text: "Vui lòng nhập ID người dùng",
        type: "warning"
      });
      return;
    }
    
    // Format ID để đảm bảo nhất quán
    const formattedId = customUserId.startsWith("zalo_") 
      ? customUserId 
      : `zalo_${customUserId}`;
    
    // Cập nhật context với ID tùy chỉnh - điều này sẽ trigger useEffect trong FirebaseContext
    setUserId(formattedId);
    
    // Thông báo cho người dùng
    snackbar.openSnackbar({
      text: `Đã chuyển sang dữ liệu của người dùng: ${formattedId}`,
      type: "success",
      duration: 3000
    });
    
    // Chuyển hướng tới trang tính tiền điện sau khi chuyển userId
    setTimeout(() => {
      navigate("/electricity-calculator");
    }, 1000);
  };
  
  // Xử lý khi người dùng muốn quay lại ID của chính họ
  const handleResetToOwnId = async () => {
    try {
      const ownId = await getCurrentUserId();
      // Cập nhật context - điều này sẽ trigger useEffect trong FirebaseContext
      setUserId(ownId);
      setCustomUserId("");
      
      snackbar.openSnackbar({
        text: "Đã quay lại dữ liệu của bạn",
        type: "success"
      });
      
      // Chuyển hướng tới trang tính tiền điện sau khi chuyển userId
      setTimeout(() => {
        navigate("/electricity-calculator");
      }, 1000);
    } catch (error) {
      console.error("Lỗi khi reset ID:", error);
      snackbar.openSnackbar({
        text: "Không thể quay lại ID của bạn",
        type: "error"
      });
    }
  };
  
  return (
    <Page className="page">
      <div className="section-container">
        <Text.Title className="mb-4">Quản lý điện</Text.Title>
        
        {/* Thông tin người dùng hiện tại */}
        <Box className="mb-5 bg-white rounded-lg shadow-md p-5">
          <Text size="large" bold className="mb-3">Xem dữ liệu của người dùng</Text>
          
          <Box className="mb-4">
            <Text size="small" className="text-gray-500 mb-1">ID người dùng hiện tại:</Text>
            <Text bold className="break-all py-2 px-3 bg-blue-50 rounded-md">{currentUser}</Text>
          </Box>
          
          {/* Ô input cho ID tùy chỉnh */}
          <Box className="mt-4">
            <Input
              label="Nhập ID người dùng khác"
              placeholder="Nhập zalo_ID hoặc ID số"
              value={customUserId}
              onChange={(e) => setCustomUserId(e.target.value)}
              clearable
            />
            
            <Box flex justifyContent="space-between" mt={3}>
              <Button 
                size="large" 
                onClick={handleUseCustomId}
                disabled={!customUserId.trim()}
                className="text-xs"
              >
                Dùng ID này
              </Button>
              <Button 
                size="large" 
                variant="secondary" 
                onClick={handleResetToOwnId}
                className="text-xs"
              >
                Quay lại ID của tôi
              </Button>
            </Box>
          </Box>
        </Box>
      </div>
    </Page>
  );
};

export default HomePage;