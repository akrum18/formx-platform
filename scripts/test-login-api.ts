import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:3001'

async function testLoginAPI() {
  try {
    console.log('🧪 Testing login API endpoint...')
    
    // Test with valid credentials
    console.log('Testing with valid credentials (test@formx.com / testpassword123)')
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: 'test@formx.com',
        password: 'testpassword123'
      }).toString()
    })

    console.log('Status:', response.status)
    const data = await response.json()
    console.log('Response:', data)

    if (response.ok && data.access_token) {
      console.log('✅ Login API working correctly!')
      console.log('✅ Access token generated successfully')
    } else {
      console.log('❌ Login failed:', data.detail)
    }

    // Test with invalid credentials
    console.log('\nTesting with invalid credentials')
    const invalidResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: 'invalid@example.com',
        password: 'wrongpassword'
      }).toString()
    })

    console.log('Invalid login status:', invalidResponse.status)
    const invalidData = await invalidResponse.json()
    console.log('Invalid login response:', invalidData)

  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testLoginAPI()