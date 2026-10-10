/**
 * EcoMart Authentication & OTP Service
 */

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "An error occurred during authentication.");
  }
  return data;
};

export const authService = {
  // Send OTP
  async sendOTP(email, purpose = "email_verification") {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose }),
    });
    return handleResponse(res);
  },

  // Verify OTP
  async verifyOTP(email, otp, purpose = "email_verification") {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, purpose }),
    });
    return handleResponse(res);
  },

  // Resend OTP
  async resendOTP(email, purpose = "email_verification") {
    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose }),
    });
    return handleResponse(res);
  },

  // Register Customer
  async registerCustomer(payload) {
    const res = await fetch("/api/auth/register/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Register Vendor
  async registerVendor(payload) {
    const res = await fetch("/api/auth/register/vendor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Login
  async login(email, password, role) {
    const payload = { email, password };
    if (role) payload.role = role;

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Logout
  async logout() {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
    });
    return handleResponse(res);
  },

  // Forgot Password - Step 1: Send OTP
  async forgotPasswordSendOTP(email) {
    const res = await fetch("/api/auth/forgot-password/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  // Forgot Password - Step 2: Verify OTP
  async forgotPasswordVerifyOTP(email, otp) {
    const res = await fetch("/api/auth/forgot-password/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    return handleResponse(res);
  },

  // Forgot Password - Step 3: Reset Password
  async resetPassword(email, otp, newPassword) {
    const res = await fetch("/api/auth/forgot-password/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    return handleResponse(res);
  },

  // Change Password - Send OTP
  async changePasswordSendOTP(currentPassword, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch("/api/auth/change-password/send-otp", {
      method: "POST",
      headers,
      body: JSON.stringify({ currentPassword }),
    });
    return handleResponse(res);
  },

  // Change Password - Verify OTP
  async changePasswordVerifyOTP(otp, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch("/api/auth/change-password/verify-otp", {
      method: "POST",
      headers,
      body: JSON.stringify({ otp }),
    });
    return handleResponse(res);
  },

  // Change Password - Update
  async changePasswordUpdate(currentPassword, newPassword, otp, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch("/api/auth/change-password/update", {
      method: "POST",
      headers,
      body: JSON.stringify({ currentPassword, newPassword, otp }),
    });
    return handleResponse(res);
  },
};

export default authService;
