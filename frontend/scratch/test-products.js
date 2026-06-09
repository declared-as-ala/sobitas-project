const axios = require('axios');

async function test() {
  const API_URL = 'https://admin.protein.tn/api';
  console.log('Fetching products from:', API_URL + '/all_products');
  try {
    const res = await axios.get(API_URL + '/all_products', {
      params: { per_page: 5, page: 1 },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log('STATUS:', res.status);
    console.log('DATA KEYS:', Object.keys(res.data));
    console.log('PRODUCTS TYPE:', typeof res.data.products);
    console.log('IS PRODUCTS ARRAY:', Array.isArray(res.data.products));
    if (res.data.products) {
      if (Array.isArray(res.data.products)) {
        console.log('LENGTH:', res.data.products.length);
        if (res.data.products.length > 0) {
          console.log('SAMPLE PRODUCT:', JSON.stringify(res.data.products[0], null, 2));
        }
      } else if (res.data.products.data && Array.isArray(res.data.products.data)) {
        console.log('DATA LENGTH:', res.data.products.data.length);
        if (res.data.products.data.length > 0) {
          console.log('SAMPLE PRODUCT FROM DATA:', JSON.stringify(res.data.products.data[0], null, 2));
        }
      } else {
        console.log('PRODUCTS KEYS:', Object.keys(res.data.products));
      }
    }
    console.log('PAGINATION:', res.data.pagination);
  } catch (err) {
    console.error('ERROR OCCURRED:', err.message);
    if (err.response) {
      console.error('RESPONSE STATUS:', err.response.status);
      console.error('RESPONSE DATA:', err.response.data);
    }
  }
}

test();
