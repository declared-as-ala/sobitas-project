const fs = require('fs');
const path = require('path');

// Read the original data.json file
const inputPath = path.join(__dirname, '../public/data.json');
const outputPath = path.join(__dirname, '../public/data.json');

console.log('Reading data.json...');
const rawData = fs.readFileSync(inputPath, 'utf8');
const data = JSON.parse(rawData);

console.log(`Processing ${data.length} gouvernorats...`);

// Transform the data structure
const transformedData = data.map((gouvernorat) => {
  // Group localités by delegation Value
  const delegationsMap = new Map();
  
  gouvernorat.Delegations.forEach((item) => {
    const delegationValue = (item.Value || '').trim();
    
    if (!delegationValue) return;
    
    // Get or create the delegation
    if (!delegationsMap.has(delegationValue)) {
      delegationsMap.set(delegationValue, {
        Name: delegationValue,
        Value: delegationValue,
        Localités: []
      });
    }
    
    // Add the localité to the delegation
    const delegation = delegationsMap.get(delegationValue);
    delegation.Localités.push({
      Name: item.Name,
      NameAr: item.NameAr,
      PostalCode: item.PostalCode || '',
      Latitude: item.Latitude,
      Longitude: item.Longitude
    });
  });
  
  // Convert map to array and sort
  const delegations = Array.from(delegationsMap.values())
    .map(del => ({
      ...del,
      Localités: del.Localités.sort((a, b) => a.Name.localeCompare(b.Name))
    }))
    .sort((a, b) => a.Name.localeCompare(b.Name));
  
  return {
    Name: gouvernorat.Name,
    NameAr: gouvernorat.NameAr,
    Value: gouvernorat.Value || gouvernorat.Name,
    Delegations: delegations
  };
});

// Write the transformed data
console.log('Writing formatted data.json...');
fs.writeFileSync(outputPath, JSON.stringify(transformedData, null, 2), 'utf8');

console.log('✅ Data reformatted successfully!');
console.log(`Total gouvernorats: ${transformedData.length}`);

// Show sample statistics
const sampleGov = transformedData[0];
if (sampleGov) {
  console.log(`\nSample (${sampleGov.Name}):`);
  console.log(`  - Delegations: ${sampleGov.Delegations.length}`);
  sampleGov.Delegations.forEach(del => {
    console.log(`    - ${del.Name}: ${del.Localités.length} localités`);
  });
}
