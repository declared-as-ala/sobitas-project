async function measureFetchSpeed(url) {
    const startTime = performance.now(); // start timer
    try {
      const response = await fetch(url);
      const data = await response.json(); // parse response
      const endTime = performance.now(); // end timer
      console.log(`Fetched ${data.length || 'data'} from ${url} in ${(endTime - startTime).toFixed(2)} ms`);
    } catch (error) {
      console.error(`Error fetching from ${url}:`, error);
    }
  }
  
  async function compareAPIs() {
    const apis = [
      "http://localhost:8080/api/all_products",
      "https://admin.protein.tn/api/all_products"
    ];
  
    for (const api of apis) {
      await measureFetchSpeed(api);
    }
  }
  
  compareAPIs();
  