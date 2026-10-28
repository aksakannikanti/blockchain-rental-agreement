const crypto = require("crypto");

const GATEWAY_SECRET =
  process.env.PAYMENT_GATEWAY_SECRET || "mock_gateway_hmac_secret_key_blockchain_rental_9988";

class MockGatewayService {
  /**
   * Simulates tenant paying through an external payment gateway
   * Returns a signed payment confirmation payload
   */
  static processPayment({ agreementId, amount, payerName, payerEmail, shouldSimulateFailure = false }) {
    const timestamp = Math.floor(Date.now() / 1000);
    const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
    const paymentReference = `EXT-MOCK-${timestamp}-${randomHex}`;

    const status = shouldSimulateFailure ? "FAILED" : "SUCCESS";

    const payload = {
      gateway: "MockRentalPayGateway-v1",
      agreementId: Number(agreementId),
      paymentReference,
      amount: Number(amount),
      currency: "INR",
      payerName: payerName || "Anonymous Tenant",
      payerEmail: payerEmail || "tenant@example.com",
      status,
      timestamp,
    };

    // Generate cryptographic HMAC-SHA256 signature to guarantee authenticity
    const signature = this.generateSignature(payload);

    return {
      success: !shouldSimulateFailure,
      confirmation: {
        payload,
        signature,
        issuedAt: new Date().toISOString(),
        gatewayName: "MockRentalPay Gateway (Simulated Payment Provider)",
      },
    };
  }

  /**
   * Generates HMAC signature for payment confirmation payload
   */
  static generateSignature(payload) {
    const serialized = JSON.stringify({
      gateway: payload.gateway,
      agreementId: payload.agreementId,
      paymentReference: payload.paymentReference,
      amount: payload.amount,
      currency: payload.currency,
      status: payload.status,
      timestamp: payload.timestamp,
    });

    return crypto.createHmac("sha256", GATEWAY_SECRET).update(serialized).digest("hex");
  }

  /**
   * Validates whether a payment confirmation signature is authentic
   */
  static verifySignature(payload, signature) {
    if (!payload || !signature) return false;
    const expectedSignature = this.generateSignature(payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  }
}

module.exports = MockGatewayService;
