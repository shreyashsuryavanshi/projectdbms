document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Smooth input handling
    const inputs = document.querySelectorAll('.input-group input');
    
    inputs.forEach(input => {
        if (input.value.trim() !== '') {
            input.classList.add('has-value');
        }
        
        input.addEventListener('input', () => {
            if (input.value.trim() !== '') {
                input.classList.add('has-value');
            } else {
                input.classList.remove('has-value');
            }
        });
    });

    // Password Toggle Logic
    const togglePasswordVisibility = (toggleId, inputId) => {
        const toggleBtn = document.getElementById(toggleId);
        const inputField = document.getElementById(inputId);
        
        if (toggleBtn && inputField) {
            toggleBtn.addEventListener('click', () => {
                const isPassword = inputField.getAttribute('type') === 'password';
                inputField.setAttribute('type', isPassword ? 'text' : 'password');
                // Could update SVG here, but minimalist toggle is fine for now
            });
        }
    };

    togglePasswordVisibility('togglePassword', 'password');
    togglePasswordVisibility('toggleSignupPassword', 'signup-password');

    // Display Error Message
    const showError = (form, errorMsg) => {
        let errorDiv = form.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.color = '#ef4444';
            errorDiv.style.fontSize = '14px';
            errorDiv.style.marginBottom = '16px';
            errorDiv.style.textAlign = 'center';
            form.insertBefore(errorDiv, form.querySelector('.submit-btn'));
        }
        errorDiv.textContent = errorMsg;
    };

    // Login Form Submit
    const loginForm = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');
    
    if (loginForm && submitBtn) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const remember = document.getElementById('remember').checked;
            
            submitBtn.classList.add('loading');
            
            try {
                const response = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                
                if (response.ok) {
                    if (remember) {
                        localStorage.setItem('token', data.token);
                    } else {
                        sessionStorage.setItem('token', data.token);
                    }
                    submitBtn.style.background = '#10b981';
                    submitBtn.style.color = '#fff';
                    submitBtn.innerHTML = '<span>Success! Redirecting...</span>';
                    
                    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
                } else {
                    showError(loginForm, data.error || 'Login failed');
                }
            } catch (err) {
                showError(loginForm, 'Network error. Make sure backend is running.');
            } finally {
                if(!response || !response.ok){
                   submitBtn.classList.remove('loading');
                }
            }
        });
    }

    // Signup Form Submit
    const signupForm = document.getElementById('signupForm');
    const signupSubmitBtn = document.getElementById('signupSubmitBtn');

    if (signupForm && signupSubmitBtn) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullname = document.getElementById('fullname').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const terms = document.getElementById('terms').checked;

            if (!terms) {
                showError(signupForm, 'You must agree to the Terms & Conditions.');
                return;
            }

            signupSubmitBtn.classList.add('loading');
            
            try {
                const response = await fetch('http://localhost:3000/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullname, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    signupSubmitBtn.style.background = '#10b981';
                    signupSubmitBtn.style.color = '#fff';
                    signupSubmitBtn.innerHTML = '<span>Account Created!</span>';
                    
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    showError(signupForm, data.error || 'Signup failed');
                    signupSubmitBtn.classList.remove('loading');
                }
            } catch (err) {
                showError(signupForm, 'Network error. Make sure backend is running.');
                signupSubmitBtn.classList.remove('loading');
            } 
        });
    }
});
