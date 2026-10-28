import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import LandlordDashboard from "./pages/LandlordDashboard";
import TenantDashboard from "./pages/TenantDashboard";
import CreateAgreementPage from "./pages/CreateAgreementPage";
import AgreementDetailPage from "./pages/AgreementDetailPage";
import OracleMonitorPage from "./pages/OracleMonitorPage";
import PaymentsPage from "./pages/PaymentsPage";

// Clean Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  const storedToken = localStorage.getItem("token");
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const activeUser = user || storedUser;
  const isAuth = isAuthenticated || !!storedToken;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-slate-500 text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-semibold text-slate-700">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated -> redirect to login immediately
  if (!isAuth || !activeUser) {
    return <Navigate to="/login" replace />;
  }

  // Role mismatch -> redirect to appropriate role dashboard
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(activeUser.role)) {
    return (
      <Navigate
        to={activeUser.role === "landlord" ? "/dashboard/landlord" : "/dashboard/tenant"}
        replace
      />
    );
  }

  return children;
};

export const App = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Navbar />

            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                <Route
                  path="/dashboard/landlord"
                  element={
                    <ProtectedRoute allowedRoles={["landlord"]}>
                      <LandlordDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/dashboard/tenant"
                  element={
                    <ProtectedRoute allowedRoles={["tenant"]}>
                      <TenantDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/agreements/create"
                  element={
                    <ProtectedRoute allowedRoles={["landlord"]}>
                      <CreateAgreementPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/agreements/:id"
                  element={
                    <ProtectedRoute>
                      <AgreementDetailPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/payments"
                  element={
                    <ProtectedRoute>
                      <PaymentsPage />
                    </ProtectedRoute>
                  }
                />

                <Route path="/oracle-monitor" element={<OracleMonitorPage />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
              <div className="max-w-7xl mx-auto px-4 space-y-1">
                <p className="font-semibold text-slate-700">
                  Blockchain Based Rental Agreement
                </p>
                <p>
                  Deployed on Local Hardhat Network (Chain ID: 31337) • MongoDB • Express.js • React • Node.js • Solidity
                </p>
              </div>
            </footer>
          </div>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
