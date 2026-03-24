import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

async function testAuth() {
  try {
    // 1. Register
    console.log('Registering user...');
    const registerData = {
      name: 'Test user',
      email: 'testuser@example.com',
      password: 'Password123!',
    };
    try {
      const regRes = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
      console.log('Registration Response:', regRes.data);
    } catch (err: any) {
      if (err.response && err.response.status === 400) {
        console.log('User already exists, proceeding to login.');
      } else {
        throw err;
      }
    }

    // 2. Login
    console.log('Logging in user...');
    const loginData = {
      email: 'testuser@example.com',
      password: 'Password123!',
    };
    const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
    console.log('Login Response:', loginRes.data);
    const token = loginRes.data.data.accessToken;
    console.log('Access Token:', token);

    // 3. Get Profile
    console.log('Getting profile...');
    const profileRes = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Profile Response:', profileRes.data);

  } catch (err: any) {
    if (err.response) {
      console.error('Error Response:', err.response.status, err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

testAuth();
