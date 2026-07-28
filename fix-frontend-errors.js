// Fix Frontend JavaScript Errors
// Add these fixes to your admin-login.html

// Fix 1: Define currentConfig if it's missing
const currentConfig = {
  supabaseUrl: 'https://cgxjqfjupscdrynazloy.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxZmp1cHNjZHJ5bmF6bG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzA3NjEsImV4cCI6MjA5MDgwNjc2MX0.ccu92rWi1YDraYmrO3jFfgxxBw1Bs0XtgzIf5Pko7iA',
  backendUrl: 'https://vialifecoach-global-foundation-backend.onrender.com'
};

const CURRENT_USER_STORAGE_KEY = 'currentUser';

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string' || token.split('.').length < 2) {
    return null;
  }

  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (error) {
    console.warn('Unable to decode JWT payload:', error.message);
    return null;
  }
}

function readStoredCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Unable to read stored user:', error.message);
    return null;
  }
}

// Fix 2: Initialize Supabase client properly
let supabase;
try {
  // Check if supabase is already loaded
  if (typeof window.supabase !== 'undefined') {
    const { createClient } = window.supabase;
    supabase = createClient(currentConfig.supabaseUrl, currentConfig.supabaseAnonKey);
  } else if (typeof supabase !== 'undefined') {
    // If using import/module
    const { createClient } = supabase;
    supabase = createClient(currentConfig.supabaseUrl, currentConfig.supabaseAnonKey);
  } else {
    console.warn('Supabase library not loaded');
  }
} catch (error) {
  console.error('Error initializing Supabase:', error);
}

// Fix 3: Safe admin login function
async function safeAdminLogin(email, password) {
  try {
    // Option 1: Use backend API (recommended)
    const response = await fetch(`${currentConfig.backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }
    
    const data = await response.json();
    console.log('✅ Login successful');
    return data;
    
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    
    // Option 2: Fallback to direct Supabase if backend fails
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });
        
        if (error) throw error;
        console.log('✅ Supabase login successful');
        return data;
      } catch (supabaseError) {
        console.error('❌ Supabase login failed:', supabaseError.message);
        throw supabaseError;
      }
    }
    
    throw error;
  }
}

// Fix 4: Safe user data loading
async function safeLoadUserData() {
  try {
    // Try backend first
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const response = await fetch(`${currentConfig.backendUrl}/api/auth/me`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const user = data?.data?.user || data?.user || data;
      if (user) {
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
      }
      return user;
    }

    const storedUser = readStoredCurrentUser();
    if (storedUser) {
      return storedUser;
    }

    if (token) {
      const payload = decodeJwtPayload(token);
      if (payload) {
        const fallbackUser = {
          id: payload.id ?? 0,
          name: payload.name || 'Admin',
          email: payload.email || 'admin',
          role: payload.role || 'admin',
          verified: true,
        };
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(fallbackUser));
        return fallbackUser;
      }
    }
    
    // Fallback to Supabase
    if (supabase) {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      const user = data?.user || data;
      if (user) {
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
      }
      return user;
    }
    
    throw new Error('Unable to load user data');
    
  } catch (error) {
    console.error('❌ Failed to load user data:', error.message);
    throw error;
  }
}

// Fix 5: Common error handler
function handleFrontendError(error, context = 'Unknown') {
  console.error(`❌ Error in ${context}:`, error.message);
  
  // Show user-friendly error
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = error.message;
    errorElement.style.display = 'block';
  }
}

// Fix 6: Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Initializing admin login page...');
  
  // Check if required elements exist
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  
  if (loginForm && emailInput && passwordInput) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = emailInput.value;
      const password = passwordInput.value;
      
      if (!email || !password) {
        handleFrontendError(new Error('Email and password are required'), 'Login');
        return;
      }
      
      try {
        const result = await safeAdminLogin(email, password);
        const token =
          result?.accessToken ||
          result?.token ||
          result?.data?.accessToken ||
          result?.data?.token ||
          result?.session?.access_token;
        
        // Store token if available
        if (token) {
          localStorage.setItem('token', token);
          localStorage.setItem('accessToken', token);
        }

        // Prefer the user returned by login; fall back to the dedicated user endpoint.
        const userData = result?.data?.user || result?.user || await safeLoadUserData();
        if (userData) {
          window.currentUser = userData;
          localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(userData));
        }
        
        // Redirect to admin dashboard
        window.location.href = '/admin/dashboard';
        
      } catch (error) {
        handleFrontendError(error, 'Login');
      }
    });
  } else {
    console.error('❌ Required form elements not found');
  }
});

// Export functions for global use
window.safeAdminLogin = safeAdminLogin;
window.safeLoadUserData = safeLoadUserData;
window.handleFrontendError = handleFrontendError;
window.currentConfig = currentConfig;
