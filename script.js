const API_URL = 'https://rare-encouragement-production-a351.up.railway.app/api/auth';

const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const location = document.getElementById('location').value;
    const btn = registerForm.querySelector('button');

    setLoading(btn, true);

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, location })
      });

      const data = await res.json();

      if (res.ok) {
        showToast('Registered successfully! Redirecting to login...', 'success');
        setTimeout(() => window.location.href = 'login.html', 1500);
      } else {
        showToast(data.error || 'Registration failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Could not connect to server', 'error');
    } finally {
      setLoading(btn, false);
    }
  });
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = loginForm.querySelector('button');

    setLoading(btn, true);

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        showToast('Login successful! Redirecting...', 'success');

        setTimeout(() => {
          if (data.user.role === 'farmer') {
            window.location.href = 'farmer-dashboard.html';
          } else {
            window.location.href = 'buyer-dashboard.html';
          }
        }, 1000);
      } else {
        showToast(data.error || 'Login failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Could not connect to server', 'error');
    } finally {
      setLoading(btn, false);
    }
  });
}