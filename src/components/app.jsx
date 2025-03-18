import React from "react";
import {
  App,
  ZMPRouter,
  AnimationRoutes,
  SnackbarProvider,
  Route,
} from "zmp-ui";
import HomePage from "../pages";
import Form from "../pages/form";
import ElectricityCalculator from "../pages/electricity-calculator";
import History from "../pages/history";
import AppBottomNavigation from "./bottom-navigation";

const MyApp = () => {
  return (
    <App>
      <SnackbarProvider>
        <ZMPRouter>
          <AnimationRoutes>
            <Route path="/" element={<HomePage />} />
            <Route path="/form" element={<Form />} />
            <Route path="/electricity-calculator" element={<ElectricityCalculator />} />
            <Route path="/history" element={<History />} />
          </AnimationRoutes>
          <AppBottomNavigation />
        </ZMPRouter>
      </SnackbarProvider>
    </App>
  );
};
export default MyApp;
