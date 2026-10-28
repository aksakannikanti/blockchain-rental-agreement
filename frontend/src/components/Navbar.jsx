import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Building,
  UserCheck,
  PlusCircle,
  CreditCard,
  LogOut,
  Layers,
} from "lucide-react";

export const Navbar = () => {
  const { user, logout, isAuthenticated, isLandlord } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    addToast("Signed out successfully", "info");
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Exact Brand Title */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                Blockchain Based Rental Agreement
              </span>
            </div>
          </Link>

          {/* Role-Specific Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {isAuthenticated ? (
              isLandlord ? (
                // Landlord Navigation Links
                <>
                  <Link
                    to="/dashboard/landlord"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      isActive("/dashboard/landlord")
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    My Properties & Leases
                  </Link>

                  <Link
                    to="/agreements/create"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      isActive("/agreements/create")
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 text-indigo-600" />
                    New Agreement
                  </Link>

                  <Link
                    to="/payments"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      isActive("/payments")
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Rent Ledger
                  </Link>
                </>
              ) : (
                // Tenant Navigation Links
                <>
                  <Link
                    to="/dashboard/tenant"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      isActive("/dashboard/tenant")
                        ? "bg-violet-50 text-violet-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    My Rental Home
                  </Link>

                  <Link
                    to="/payments"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      isActive("/payments")
                        ? "bg-violet-50 text-violet-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Payment Receipts
                  </Link>
                </>
              )
            ) : null}
          </nav>

          {/* Right Action: User Profile & Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {/* User Info */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      isLandlord ? "bg-indigo-600" : "bg-violet-600"
                    }`}
                  >
                    {user?.name?.charAt(0) || "U"}
                  </div>
                  <div className="hidden sm:block text-left text-xs">
                    <p className="font-bold text-slate-900 leading-tight">{user?.name || "User"}</p>
                    <span className="text-[10px] font-semibold text-slate-500 capitalize bg-slate-100 px-1.5 py-0.5 rounded">
                      {user?.role || "Account"}
                    </span>
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={handleLogout}
                  title="Sign out of your account"
                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1.5 transition active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;