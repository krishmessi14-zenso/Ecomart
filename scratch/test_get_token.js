function getTokenMock(storage) {
  const directToken = storage.getItem("token") || storage.getItem("fc_token") || storage.getItem("token");
  if (directToken) return directToken;

  try {
    const authUserStr = storage.getItem("em_auth_user");
    if (authUserStr) {
      const parsed = JSON.parse(authUserStr);
      if (parsed && parsed.token) return parsed.token;
    }
  } catch {
    /* ignore */
  }
  return null;
}

const mockStorage = {
  data: {
    "em_auth_user": JSON.stringify({ token: "test_jwt_123", name: "Krish", id: "u_krish" })
  },
  getItem(key) { return this.data[key] || null; }
};

console.log("Extracted token:", getTokenMock(mockStorage));
