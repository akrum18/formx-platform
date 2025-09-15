import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:4000'

async function testSimpleAPI() {
  try {
    console.log('🧪 Testing basic API endpoint...')
    
    const response = await fetch(`${BASE_URL}/api/v2/cart-simple`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer invalid-token-for-testing`
      }
    })

    console.log('Status:', response.status)
    console.log('Status Text:', response.statusText)
    
    const text = await response.text()
    console.log('Response body:', text)
    
    try {
      const json = JSON.parse(text)
      console.log('Parsed JSON:', json)
    } catch (e) {
      console.log('Response is not JSON')
    }

  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testSimpleAPI()