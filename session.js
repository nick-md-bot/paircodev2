const axios = require("axios");

const token = "6b48368ece35dce3e100d6b76e2b3f18f4026809e1a6dc8b4dd94947e7e9b14ecead52dc407755634bd13f3a56d01b34593e7461a42c66d39e6a7a406743d31d";

async function create(data) {
  try {
    const config = {
      method: 'post',
      url: 'https://hastebin.com/documents',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'  
      },
      data: JSON.stringify({ content: data })  
    };

    const response = await axios(config);
    return { id: response.data.key };  
  } catch (error) {
    throw new Error(`Error creating document: ${error.message}`);
  }
}

async function get(key) {
  try {
    const config = {
      method: 'get',
      url: `https://hastebin.com/raw/${key}`,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const response = await axios(config);
    return response.data
  } catch (error) {
    throw new Error(`Error getting document: ${error.message}`);
  }
}

module.exports = { create, get };
