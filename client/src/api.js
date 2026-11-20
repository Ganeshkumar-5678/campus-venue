const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth
  async login(user_id, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch user');
    return data.user;
  },

  // College Profile
  async getCollegeProfile() {
    const res = await fetch(`${API_BASE}/college-profile`);
    return await res.json();
  },

  async getProfile() {
    return this.getCollegeProfile();
  },

  async updateCollegeProfile(profileData) {
    const res = await fetch(`${API_BASE}/college-profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');
    return data;
  },

  // Departments
  async getDepartments(all = false) {
    const res = await fetch(`${API_BASE}/departments?all=${all}`);
    return await res.json();
  },

  async createDepartment(data) {
    const res = await fetch(`${API_BASE}/departments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to create department');
    return result;
  },

  async updateDepartment(id, data) {
    const res = await fetch(`${API_BASE}/departments/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update department');
    return result;
  },

  async toggleDepartment(id) {
    const res = await fetch(`${API_BASE}/departments/${id}/toggle`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    return await res.json();
  },

  // Users
  async getUsers() {
    const res = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
    return await res.json();
  },

  async createUser(userData) {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to create user');
    return result;
  },

  async updateUser(id, userData) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update user');
    return result;
  },

  async resetPassword(id, new_password) {
    const res = await fetch(`${API_BASE}/users/${id}/reset-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ new_password })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to reset password');
    return result;
  },

  async toggleUser(id) {
    const res = await fetch(`${API_BASE}/users/${id}/toggle`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    return await res.json();
  },

  async deleteUser(id) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to delete user');
    return result;
  },

  async deleteDepartment(id) {
    const res = await fetch(`${API_BASE}/departments/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to delete department');
    return result;
  },

  // Venues (The 4 verified halls)
  async getVenues() {
    const res = await fetch(`${API_BASE}/venues`);
    return await res.json();
  },

  async updateVenue(id, venueData) {
    const res = await fetch(`${API_BASE}/venues/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(venueData)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update venue');
    return result;
  },

  async toggleVenue(id) {
    const res = await fetch(`${API_BASE}/venues/${id}/toggle`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    return await res.json();
  },

  async checkAvailability(date, startTime, endTime) {
    const params = new URLSearchParams({ date, startTime, endTime });
    const res = await fetch(`${API_BASE}/venues/availability?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to check venue availability');
    return data;
  },

  // Bookings - Direct Confirmation & Cancellation
  async getBookings(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, val);
      }
    });
    const res = await fetch(`${API_BASE}/bookings?${params}`, { headers: getHeaders() });
    return await res.json();
  },

  async getBookingById(id) {
    const res = await fetch(`${API_BASE}/bookings/${id}`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Booking not found');
    return data;
  },

  async createBooking(bookingData) {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(bookingData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create booking');
    return data;
  },

  // Department Self-Cancellation
  async cancelBooking(id, cancellation_reason) {
    const res = await fetch(`${API_BASE}/bookings/${id}/cancel`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ cancellation_reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to cancel booking');
    return data;
  },

  // Admin Emergency Cancellation
  async adminCancelBooking(id, cancellation_reason, admin_message = '') {
    const res = await fetch(`${API_BASE}/admin/bookings/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ cancellation_reason, admin_message })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to execute emergency cancellation');
    return data;
  },

  async getBookingAlternatives(id) {
    const res = await fetch(`${API_BASE}/bookings/${id}/alternatives`, { headers: getHeaders() });
    return await res.json();
  },

  // Holidays
  async getHolidays() {
    const res = await fetch(`${API_BASE}/holidays`);
    return await res.json();
  },

  async createHoliday(holidayData) {
    const res = await fetch(`${API_BASE}/holidays`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(holidayData)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to create holiday');
    return result;
  },

  async deleteHoliday(id) {
    const res = await fetch(`${API_BASE}/holidays/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return await res.json();
  },

  async checkHoliday(date) {
    const res = await fetch(`${API_BASE}/holidays/check?date=${date}`);
    return await res.json();
  },

  // Calendar
  async getCalendar(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });
    const res = await fetch(`${API_BASE}/calendar?${params}`, { headers: getHeaders() });
    return await res.json();
  },

  // Analytics
  async getDashboardAnalytics() {
    const res = await fetch(`${API_BASE}/analytics/dashboard`, { headers: getHeaders() });
    return await res.json();
  },

  // Audit Logs & Email Logs
  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/admin/audit-logs`, { headers: getHeaders() });
    return await res.json();
  },

  async getEmailLogs() {
    const res = await fetch(`${API_BASE}/email-logs`, { headers: getHeaders() });
    return await res.json();
  },

  // 3-Day Reminders trigger
  async triggerReminders() {
    const res = await fetch(`${API_BASE}/reminders/check`, {
      method: 'POST',
      headers: getHeaders()
    });
    return await res.json();
  },

  // Natural Language Voice Parsing
  async parseVoice(speechText, currentDepartmentId, existingEntities = {}) {
    const res = await fetch(`${API_BASE}/voice/parse`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ speechText, currentDepartmentId, existingEntities })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to process voice request');
    return data;
  },

  async processVoice(speechText, currentDepartmentId, existingEntities = {}) {
    return this.parseVoice(speechText, currentDepartmentId, existingEntities);
  }
};
