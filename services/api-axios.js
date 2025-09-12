const axios = require('axios');
const FormData = require('form-data');

const apiAxios = {
  request: async (url, method = 'GET', data = null, req = null, extraHeaders = {}) => {
    const token = req?.session?.user?.accessToken;

    const headers = {
      'Accept': 'application/json',
      ...extraHeaders,
    };

    // Si on envoie un fichier via multipart/form-data
    if (data instanceof FormData) {
      Object.assign(headers, data.getHeaders());
    } else {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      url,
      headers,
      data
    };

    try {
      const response = await axios(config);
      return response;
    } catch (error) {
      const responseData = error.response?.data;
      console.error('API Request Failed:', {
        url,
        method,
        error: error.message,
        response: responseData
      });

      const apiError = new Error(responseData?.message || `HTTP ${error.response?.status || 500}`);
      apiError.status = error.response?.status || 500;
      apiError.data = responseData;
      throw apiError;
    }
  },

};

module.exports = apiAxios;
