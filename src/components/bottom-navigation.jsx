import React from "react";
import { BottomNavigation, Icon, useNavigate } from "zmp-ui";

const AppBottomNavigation = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState("home");

  const handleChangeTab = (selectedTab) => {
    setActiveTab(selectedTab);
    navigate(`/${selectedTab === "home" ? "" : selectedTab}`);
  };

  return (
    <BottomNavigation
      fixed
      activeKey={activeTab}
      onChange={handleChangeTab}
    >
      <BottomNavigation.Item
        key="home"
        label="Trang chủ"
        icon={<Icon icon="zi-home" />}
      />
      <BottomNavigation.Item
        key="electricity-calculator"
        label="Tính tiền"
        icon={<Icon icon="zi-lightbulb" />}
      />
      <BottomNavigation.Item
        key="history"
        label="Lịch sử"
        icon={<Icon icon="zi-clock" />}
      />
    </BottomNavigation>
  );
};

export default AppBottomNavigation;