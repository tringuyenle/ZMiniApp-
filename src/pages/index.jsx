import React from "react";
import { Box, Page, Text, Button, useNavigate } from "zmp-ui";

const HomePage = () => {
  const navigate = useNavigate();
  
  return (
    <Page className="page">
      <div className="section-container">
        <Text.Title size="small" className="mb-3">Quản lý điện</Text.Title>
        <Box flex flexDirection="row" justifyContent="space-between">
          <Button 
            className="w-[48%] h-32 flex flex-col items-center justify-center"
            variant="primary"
            onClick={() => navigate("/electricity-calculator")}
          >
            <Box flex flexDirection="column" alignItems="center">
              <i className="zi-lightbulb text-2xl mb-2"></i>
              <Text size="normal" bold>Tính tiền điện</Text>
            </Box>
          </Button>
          
          <Button 
            className="w-[48%] h-32 flex flex-col items-center justify-center"
            variant="secondary"
            onClick={() => navigate("/history")}
          >
            <Box flex flexDirection="column" alignItems="center">
              <i className="zi-clock text-2xl mb-2"></i>
              <Text size="normal" bold>Lịch sử</Text>
            </Box>
          </Button>
        </Box>
      </div>
    </Page>
  );
};

export default HomePage;