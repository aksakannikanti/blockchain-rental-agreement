import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { agreementAPI, authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatINR } from "../utils/formatters";
import {
  Building,
  Calendar,
  FileText,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  Key,
  Sparkles,
  ArrowLeft,
  IndianRupee,
} from "lucide-react";

export const CreateAgreementPage = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    propertyAddress: "",
    propertyType: "Apartment",
    description: "",
    tenantEmail: "",
    tenantAddress: "",
    rentAmount: "",
    securityDeposit: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split("T")[0],
    terms: "1. Rent payable monthly in Indian Rupees (₹) via verified payment gateway.\n2. Security deposit is refundable upon termination in good condition.\n3. Notice period of 1 month required prior to vacating.",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [tenantsList, setTenantsList] = useState([]);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await authAPI.getUsers("tenant");
        setTenantsList(res.data.users || []);
      } catch (err) {
        console.warn("Failed to fetch registered tenants:", err.message);
      }
    };
    fetchTenants();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-lookup wallet address if landlord enters tenant email
      if (name === "tenantEmail" && value) {
        const matchedTenant = tenantsList.find(
          (t) => t.email.toLowerCase() === value.trim().toLowerCase()
        );
        if (matchedTenant && matchedTenant.walletAddress) {
          updated.tenantAddress = matchedTenant.walletAddress;
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await agreementAPI.create(formData);
      setSuccessData(res.data);
      addToast(
        `Agreement #${res.data.agreement?.agreementId} successfully deployed to the blockchain!`,
        "success"
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create agreement on the blockchain."
      );
      addToast("Failed to create agreement", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link
            to="/dashboard/landlord"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 font-semibold mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Create Rental Agreement
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Deploys a new lease smart contract on the blockchain (Amounts in ₹ Rupees)
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {successData ? (
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-sm p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Rental Agreement Successfully Deployed!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Agreement #{successData.agreement?.agreementId} registered for {formatINR(formData.rentAmount)}/month.
            </p>
          </div>

          <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-left font-mono text-xs space-y-2 max-w-lg mx-auto">
            <div className="flex justify-between text-slate-400">
              <span>Monthly Rent:</span>
              <span className="text-emerald-300 font-bold">{formatINR(formData.rentAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Agreement ID:</span>
              <span className="text-indigo-300 font-bold">#{successData.agreement?.agreementId}</span>
            </div>
            <div>
              <span className="text-slate-400">Blockchain Tx Hash:</span>
              <p className="text-emerald-400 break-all select-all mt-0.5">
                {successData.txHash}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setSuccessData(null);
                handleAutofill();
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              Create Another
            </button>
            <Link
              to="/dashboard/landlord"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
            >
              View in Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
          {/* Step 1: Property */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h2 className="font-bold text-sm text-slate-900">Property Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Property Address *
                </label>
                <input
                  type="text"
                  required
                  name="propertyAddress"
                  value={formData.propertyAddress}
                  onChange={handleChange}
                  placeholder="e.g. Flat 402, Shanti Heights, Bengaluru"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Property Type
                </label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Apartment">Apartment</option>
                  <option value="House / Villa">House / Villa</option>
                  <option value="Condo">Condo</option>
                  <option value="Commercial Space">Commercial Space</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Amenities
              </label>
              <textarea
                name="description"
                rows="2"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief summary of furnishings, parking, wifi..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              ></textarea>
            </div>
          </div>

          {/* Step 2: Tenant */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="font-bold text-sm text-slate-900">Tenant Information</h2>
            </div>

            {/* Quick-Select from Registered Tenants */}
            {tenantsList.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Registered Tenant (1-Click Auto-Fill)
                </label>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const selected = tenantsList.find((t) => t.email === e.target.value);
                    if (selected) {
                      setFormData((prev) => ({
                        ...prev,
                        tenantEmail: selected.email,
                        tenantAddress: selected.walletAddress || "",
                      }));
                      addToast(`Selected tenant: ${selected.name}`, "info");
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 text-slate-700"
                >
                  <option value="" disabled>
                    -- Choose a registered tenant --
                  </option>
                  {tenantsList.map((t) => (
                    <option key={t._id} value={t.email}>
                      {t.name} ({t.email}) {t.walletAddress ? `• ${t.walletAddress.substring(0, 10)}...` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Selecting a tenant automatically populates their email and verified wallet address.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tenant Email Address *
                </label>
                <input
                  type="email"
                  required
                  name="tenantEmail"
                  value={formData.tenantEmail}
                  onChange={handleChange}
                  placeholder="tenant@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  The tenant will see this agreement in their dashboard upon logging in
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tenant Ethereum Wallet (Optional)
                </label>
                <input
                  type="text"
                  name="tenantAddress"
                  value={formData.tenantAddress}
                  onChange={handleChange}
                  placeholder="0x... (auto-resolved from tenant email)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Automatically resolved from the tenant's account if left blank
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Rent & Deposit in Rupees */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h2 className="font-bold text-sm text-slate-900">Rent & Security Deposit (₹ Rupees)</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monthly Rent (₹ INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    step="100"
                    required
                    name="rentAmount"
                    value={formData.rentAmount}
                    onChange={handleChange}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-sm font-black text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-indigo-600 font-bold mt-0.5">{formatINR(formData.rentAmount)} / month</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Security Deposit (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    step="100"
                    name="securityDeposit"
                    value={formData.securityDeposit}
                    onChange={handleChange}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{formatINR(formData.securityDeposit)} refundable</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Step 4: Terms */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                4
              </span>
              <h2 className="font-bold text-sm text-slate-900">Lease Terms & Covenants</h2>
            </div>

            <div>
              <textarea
                required
                name="terms"
                rows="4"
                value={formData.terms}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              ></textarea>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/dashboard/landlord"
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deploying to Blockchain...
                </>
              ) : (
                <>
                  Deploy Lease ({formatINR(formData.rentAmount)})
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateAgreementPage;
