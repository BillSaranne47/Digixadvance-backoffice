const apiRequest = {
  request: async (url, method = 'GET', data = null, req = null, extraHeaders = {}) => {
    const token = req?.session?.user?.accessToken || req?.cookies?.accessToken;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...extraHeaders
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      headers,
      credentials: 'include',
    };

    if (data instanceof FormData) {
      // Let fetch handle multipart/form-data headers automatically
      delete headers['Content-Type'];
      options.body = data;
    } else if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const responseData = await response.json();
      const contentType = response.headers.get('content-type') || '';

      // If unauthorized, try to refresh token
      if (response.status === 401 && req) {
        const refreshToken = req.session?.user?.refreshToken || req.cookies?.refreshToken;
        
        if (refreshToken) {
          // Call refresh token endpoint
          const newTokens = await apiRequest.post(
            `${process.env.UserbaseUrl}api/auth/refresh-token`,
            { refreshToken },
            req
          );

          // Update session and cookies
          if (req.session.user) {
            req.session.user.accessToken = newTokens.accessToken;
            req.session.user.refreshToken = newTokens.refreshToken;
          }

          res?.cookie('accessToken', newTokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000
          });

          // Retry original request with new token
          headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
          const retryResponse = await fetch(url, options);
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}`);
          }
          
          return await retryResponse.json();
        }
      }
      
      if (!response.ok) {
        const apiError = new Error(responseData.message || `HTTP ${response.status}`);
        apiError.status = response.status;
        apiError.data = responseData;
        apiError.response = { // Ajoute ceci
          status: response.status,
          data: responseData
        };
        throw apiError;
      }

      return responseData;
    } catch (error) {
      console.error('API Request Failed:', {
        url,
        method,
        error: error.message
      });
      throw error;
    }
  },

  get: (url, req, extraHeaders = {}) => apiRequest.request(url, 'GET', null, req, extraHeaders),
  post: (url, data, req, extraHeaders = {}) => apiRequest.request(url, 'POST', data, req, extraHeaders),
  put: (url, data, req, extraHeaders = {}) => apiRequest.request(url, 'PUT', data, req, extraHeaders),
  patch: (url, data, req, extraHeaders = {}) => apiRequest.request(url, 'PATCH', data, req, extraHeaders),
  delete: (url, req, extraHeaders = {}) => apiRequest.request(url, 'DELETE', null, req, extraHeaders),
};

module.exports = apiRequest;
