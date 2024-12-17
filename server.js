require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { findBestMatch } = require('./knowledgeBase');

const app = express();
app.use(cors());
app.use(express.json());

// Proxy endpoint for n8n chat
app.get('/api/chat-proxy', async (req, res) => {
  const N8N_CHAT_URL = 'https://lschatbot.app.n8n.cloud/webhook/bcba9ea8-1397-4aee-85c1-3df5cf517556/chat';
  
  try {
    // Remove cache-related headers from the forwarded request
    const headers = { ...req.headers };
    delete headers['if-none-match'];
    delete headers['if-modified-since'];
    
    const response = await axios.get(N8N_CHAT_URL, {
      params: req.query,
      headers: {
        ...headers,
        host: new URL(N8N_CHAT_URL).host,
        // Add cache-busting headers
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      responseType: 'stream',
      // Tell axios to treat 304 as an error
      validateStatus: function (status) {
        return status === 200; // Only treat 200 as success
      }
    });

    // Copy all headers except those related to caching and framing
    const responseHeaders = { ...response.headers };
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['etag'];
    delete responseHeaders['last-modified'];
    
    // Set our own headers
    res.set({
      ...responseHeaders,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*'
    });
    
    // Pipe the response
    response.data.pipe(res);
  } catch (error) {
    console.error('Chat proxy error:', error);
    
    // If we got a 304, try again without any caching headers
    if (error.response && error.response.status === 304) {
      try {
        const retryResponse = await axios.get(N8N_CHAT_URL, {
          headers: {
            host: new URL(N8N_CHAT_URL).host,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          responseType: 'stream'
        });
        
        retryResponse.data.pipe(res);
        return;
      } catch (retryError) {
        console.error('Retry failed:', retryError);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to proxy chat request',
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});