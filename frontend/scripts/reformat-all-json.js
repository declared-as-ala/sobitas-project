const fs = require('fs');
const path = require('path');

/**
 * Reformats address data JSON from flat structure to hierarchical structure
 * Old structure: Gouvernorat -> Delegations (flat array of localités)
 * New structure: Gouvernorat -> Delegations -> Localités (nested)
 */
function reformatAddressData(data) {
  return data.map((gouvernorat) => {
    // Group localités by delegation Value
    const delegationsMap = new Map();
    
    if (!gouvernorat.Delegations || !Array.isArray(gouvernorat.Delegations)) {
      console.warn(`Warning: Gouvernorat ${gouvernorat.Name} has no Delegations array`);
      return {
        Name: gouvernorat.Name,
        NameAr: gouvernorat.NameAr,
        Value: gouvernorat.Value || gouvernorat.Name,
        Delegations: []
      };
    }
    
    gouvernorat.Delegations.forEach((item, itemIndex) => {
      // Check if this is already in the new format (has Localités array)
      if (item.Localités && Array.isArray(item.Localités)) {
        // Already in new format, just ensure it has proper structure
        const delegationValue = (item.Value || item.Name || '').trim();
        if (delegationValue && !delegationsMap.has(delegationValue)) {
          delegationsMap.set(delegationValue, {
            Name: item.Name || delegationValue,
            NameAr: item.NameAr,
            Value: delegationValue,
            Localités: item.Localités.map(loc => ({
              Name: loc.Name || '',
              NameAr: loc.NameAr,
              PostalCode: loc.PostalCode || '',
              Latitude: loc.Latitude,
              Longitude: loc.Longitude
            })).filter(loc => loc.Name) // Remove empty entries
          });
        } else if (delegationValue && delegationsMap.has(delegationValue)) {
          // Merge localités if delegation already exists
          const existing = delegationsMap.get(delegationValue);
          item.Localités.forEach(loc => {
            if (loc.Name && !existing.Localités.find(l => l.Name === loc.Name)) {
              existing.Localités.push({
                Name: loc.Name,
                NameAr: loc.NameAr,
                PostalCode: loc.PostalCode || '',
                Latitude: loc.Latitude,
                Longitude: loc.Longitude
              });
            }
          });
        }
      } else {
        // Old format - item is a localité with delegation Value
        const delegationValue = (item.Value || '').trim();
        
        if (!delegationValue) {
          console.warn(`Warning: Item at index ${itemIndex} in ${gouvernorat.Name} has no Value`);
          return;
        }
        
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
        const localiteName = item.Name || '';
        
        // Only add if it's a valid localité name (not just the delegation name)
        if (localiteName && localiteName !== delegationValue) {
          // Check for duplicates
          const exists = delegation.Localités.some(loc => loc.Name === localiteName);
          if (!exists) {
            delegation.Localités.push({
              Name: localiteName,
              NameAr: item.NameAr,
              PostalCode: item.PostalCode || '',
              Latitude: item.Latitude,
              Longitude: item.Longitude
            });
          }
        }
      }
    });
    
    // Convert map to array and sort
    const delegations = Array.from(delegationsMap.values())
      .map(del => ({
        ...del,
        Localités: del.Localités
          .sort((a, b) => a.Name.localeCompare(b.Name))
          .map((loc, index) => ({
            ...loc,
            // Ensure unique keys for React
            _uniqueId: `${gouvernorat.Value || gouvernorat.Name}-${del.Value}-${loc.Name}-${loc.PostalCode || index}`
          }))
      }))
      .sort((a, b) => a.Name.localeCompare(b.Name));
    
    return {
      Name: gouvernorat.Name,
      NameAr: gouvernorat.NameAr,
      Value: gouvernorat.Value || gouvernorat.Name,
      Delegations: delegations
    };
  });
}

/**
 * Process a JSON file
 */
function processJsonFile(filePath) {
  console.log(`\n📄 Processing: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }
  
  try {
    // Read the file
    const rawData = fs.readFileSync(filePath, 'utf8');
    let data;
    
    // Try to parse JSON
    try {
      data = JSON.parse(rawData);
    } catch (parseError) {
      console.error(`❌ Failed to parse JSON: ${parseError.message}`);
      return false;
    }
    
    if (!Array.isArray(data)) {
      console.error(`❌ Data is not an array`);
      return false;
    }
    
    console.log(`   Found ${data.length} gouvernorats`);
    
    // Reformat the data
    const transformedData = reformatAddressData(data);
    
    // Create backup
    const backupPath = filePath + '.backup';
    fs.writeFileSync(backupPath, rawData, 'utf8');
    console.log(`   ✅ Backup created: ${backupPath}`);
    
    // Write formatted data with proper indentation
    const formattedJson = JSON.stringify(transformedData, null, 2);
    fs.writeFileSync(filePath, formattedJson, 'utf8');
    
    // Statistics
    const totalDelegations = transformedData.reduce((sum, gov) => sum + gov.Delegations.length, 0);
    const totalLocalites = transformedData.reduce((sum, gov) => 
      sum + gov.Delegations.reduce((delSum, del) => delSum + del.Localités.length, 0), 0
    , 0);
    
    console.log(`   ✅ Reformatted successfully!`);
    console.log(`   📊 Statistics:`);
    console.log(`      - Gouvernorats: ${transformedData.length}`);
    console.log(`      - Delegations: ${totalDelegations}`);
    console.log(`      - Localités: ${totalLocalites}`);
    
    // Show sample
    const sampleGov = transformedData[0];
    if (sampleGov && sampleGov.Delegations.length > 0) {
      const sampleDel = sampleGov.Delegations[0];
      console.log(`   📋 Sample structure:`);
      console.log(`      ${sampleGov.Name} -> ${sampleDel.Name} -> ${sampleDel.Localités.length} localités`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error processing file: ${error.message}`);
    return false;
  }
}

// Main execution
console.log('🚀 Starting JSON reformatting process...\n');

const filesToProcess = [
  path.join(__dirname, '../public/data.json'),
  path.join(__dirname, '../src/util/data.json')
];

let successCount = 0;
let failCount = 0;

filesToProcess.forEach(filePath => {
  if (processJsonFile(filePath)) {
    successCount++;
  } else {
    failCount++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`✅ Successfully processed: ${successCount} file(s)`);
if (failCount > 0) {
  console.log(`❌ Failed: ${failCount} file(s)`);
}
console.log('='.repeat(60));
console.log('\n✨ All done! Your JSON files have been reformatted.');
console.log('💡 Backups have been created with .backup extension.');
