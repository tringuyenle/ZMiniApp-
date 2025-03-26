import React from "react";
import {
  App,
  ZMPRouter,
  AnimationRoutes,
  SnackbarProvider,
  Route,
  Spinner,
} from "zmp-ui";
import HomePage from "../pages";
import Form from "../pages/form";
import ElectricityCalculator from "../pages/electricity-calculator";
import History from "../pages/history";
import AppBottomNavigation from "./bottom-navigation";
import { FirebaseProvider, useFirebase } from "../context/FirebaseContext";

// Wrapper component khi đang tải dữ liệu
const AppContent = () => {
  const { loading } = useFirebase();
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner />
        <p className="ml-2 text-gray-500">Đang tải dữ liệu...</p>
      </div>
    );
  }
  
  return (
    <>
      <AnimationRoutes>
        <Route path="/" element={<HomePage />} />
        <Route path="/form" element={<Form />} />
        <Route path="/electricity-calculator" element={<ElectricityCalculator />} />
        <Route path="/history" element={<History />} />
      </AnimationRoutes>
      <AppBottomNavigation />
    </>
  );
};

const MyApp = () => {
  return (
    <App>
      <SnackbarProvider>
        <FirebaseProvider>
          <ZMPRouter>
            <AppContent />
          </ZMPRouter>
        </FirebaseProvider>
      </SnackbarProvider>
    </App>
  );
};

export default MyApp;
