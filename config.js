// Farm Direct Frontend Configuration
// Automatically connects to local backend when tested on localhost,
// and uses the production Render backend when deployed on Netlify or custom domains.
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.protocol === 'file:';

const API_BASE_URL = isLocalhost
  ? 'http://localhost:5000/api'
  : 'https://farm-direct-backend-p7zu.onrender.com/api';

// For backward compatibility across existing files:
window.API_URL = API_BASE_URL;
window.IS_LOCAL = isLocalhost;
