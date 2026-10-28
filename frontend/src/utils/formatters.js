/**
 * Currency formatter for Indian Rupees (₹ / INR)
 * Supports standard Indian comma separation: ₹25,000, ₹1,50,000, ₹10,00,000
 */
export const formatINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  const num = Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatRawINR = (amount) => {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString("en-IN")}`;
};
