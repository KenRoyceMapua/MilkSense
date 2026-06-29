/* ================================================
   MAKATI MILK BANK - AUTHENTICATION SYSTEM
   ================================================ */

// ✅ ADDED: Supabase integration
import { supabase } from './src/supabase.js';

// Demo credentials for login
const DEMO_CREDENTIALS = {
  email: 'admin@makatimilkbank.org',
  password: 'admin123'
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('Auth module loaded');
  
  // Setup password toggle
  setupPasswordToggle();
  
  // Setup form submission
  setupLoginForm();
  
  // Check if user is already logged in (redirect to dashboard)
  checkExistingSession();
});

/* ================================================
   PASSWORD VISIBILITY TOGGLE
   ================================================ */

function setupPasswordToggle() {
  const toggleButton = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const toggleIcon = document.querySelector('.toggle-icon');
  
  if (toggleButton && passwordInput) {
    toggleButton.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Toggle password visibility
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      
      // Update icon
      if (toggleIcon) {
        toggleIcon.textContent = isPassword ? '🙈' : '👁️';
      }
      
      // Add visual feedback
      toggleButton.classList.toggle('active');
    });
  }
}

/* ================================================
   LOGIN FORM HANDLING
   ================================================ */

function setupLoginForm() {
  const loginForm = document.getElementById('loginForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // ✅ ADDED: Forgot password button
  const forgotBtn = document.getElementById('forgot-password');
  forgotBtn?.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const loginError = document.getElementById('loginError');

    if (!email) {
      showError(loginError, 'Enter your email first before resetting password.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/index.html'
    });

    if (error) {
      showError(loginError, error.message);
    } else {
      loginError.textContent = '✓ Password reset email sent! Check your inbox.';
      loginError.className = 'error-message success-message show';
    }
  });
}

// ✅ UPDATED: handleLogin is now async to support Supabase
async function handleLogin(event) {
  event.preventDefault();
  
  // Get form inputs
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('rememberMe').checked;
  const submitBtn = document.getElementById('submitBtn');
  const loginError = document.getElementById('loginError');
  
  // Clear previous errors
  clearErrors();
  
  // Validation
  if (!email) {
    showError(loginError, 'Please enter your email address.');
    return;
  }
  
  if (!validateEmail(email)) {
    showError(loginError, 'Please enter a valid email address.');
    return;
  }
  
  if (!password) {
    showError(loginError, 'Please enter your password.');
    return;
  }
  
  // Add loading state
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  // ✅ ADDED: Try Supabase login first
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (!error && data.session) {
    // ✅ Supabase login successful
    console.log('Supabase login successful for:', email);

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUser', JSON.stringify({
      email: email,
      name: data.user.user_metadata?.name || 'Administrator',
      role: 'Milk Bank Manager',
      loginTime: new Date().toISOString()
    }));

    if (rememberMe) {
      localStorage.setItem('rememberEmail', email);
    } else {
      localStorage.removeItem('rememberEmail');
    }

    loginError.textContent = '✓ Login successful! Redirecting...';
    loginError.className = 'error-message success-message show';

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 500);

    return; // stop here, no need to check demo credentials
  }

  // ✅ KEPT: Fallback to demo credentials if Supabase fails
  setTimeout(() => {
    // Verify credentials
    if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
      // Successful login
      console.log('Login successful for:', email);
      
      // Set session
      localStorage.setItem('isLoggedIn', 'true');
      
      // Store user info if needed
      localStorage.setItem('currentUser', JSON.stringify({
        email: email,
        name: 'Administrator',
        role: 'Milk Bank Manager',
        loginTime: new Date().toISOString()
      }));
      
      // Handle "Remember me"
      if (rememberMe) {
        localStorage.setItem('rememberEmail', email);
      } else {
        localStorage.removeItem('rememberEmail');
      }
      
      // Show success message
      loginError.textContent = '✓ Login successful! Redirecting...';
      loginError.className = 'error-message success-message show';
      
      // Redirect to dashboard after brief delay
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 500);
    } else {
      // Failed login
      console.warn('Login failed: Invalid credentials');
      showError(loginError, 'Invalid email or password. Please try again.');
      
      // Remove loading state
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  }, 800); // Simulate 800ms API delay
}

/* ================================================
   UTILITY FUNCTIONS
   ================================================ */

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showError(element, message) {
  if (element) {
    element.textContent = message;
    element.classList.add('show');
    
    // Auto-focus first input for UX
    const firstInput = document.querySelector('input[type="email"], input[type="password"]');
    if (firstInput) {
      firstInput.focus();
    }
  }
}

function clearErrors() {
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const loginError = document.getElementById('loginError');
  
  if (emailError) emailError.textContent = '';
  if (passwordError) passwordError.textContent = '';
  if (loginError) {
    loginError.textContent = '';
    loginError.classList.remove('show', 'success-message');
  }
}

function checkExistingSession() {
  // If user is already logged in, redirect to dashboard
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  if (isLoggedIn) {
    window.location.href = 'index.html';
  }
  
  // Pre-fill email if "Remember me" was checked
  const rememberedEmail = localStorage.getItem('rememberEmail');
  if (rememberedEmail) {
    const emailInput = document.getElementById('email');
    const rememberCheckbox = document.getElementById('rememberMe');
    if (emailInput) emailInput.value = rememberedEmail;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }
}

/* ================================================
   SECURITY FUNCTIONS
   ================================================ */

// ✅ UPDATED: logout now also signs out from Supabase
async function logout() {
  console.log('User logged out');
  
  await supabase.auth.signOut(); // ✅ ADDED
  
  // Clear all session data
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('currentUser');
  // Note: We keep rememberEmail so user doesn't have to re-enter
  
  // Redirect to login
  window.location.href = 'signin.html';
}

function isAuthenticated() {
  return localStorage.getItem('isLoggedIn') === 'true';
}

function getCurrentUser() {
  const userJson = localStorage.getItem('currentUser');
  return userJson ? JSON.parse(userJson) : null;
}

console.log('✓ Auth system ready');