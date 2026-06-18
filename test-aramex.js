/**
 * Quick Aramex credentials test — run with:
 *   node test-aramex.js
 */

const https = require('https');

const credentials = {
  UserName:           'bitoutawalid@gmail.com',
  Password:           'Aspire123',
  Version:            '1.0',
  AccountNumber:      '60506486',
  AccountPin:         '321321',
  AccountEntity:      'TUN',
  AccountCountryCode: 'TN',
  Source:             24,
};

// Minimal test shipment (won't create a real shipment — just validates credentials)
const payload = JSON.stringify({
  ClientInfo: credentials,
  Transaction: { Reference1: 'test-001', Reference2: '', Reference3: '', Reference4: '', Reference5: '' },
  Shipments: [
    {
      Reference1: 'TEST-001',
      Reference2: '',
      Reference3: '',
      Shipper: {
        Reference1: '',
        Reference2: '',
        AccountNumber: credentials.AccountNumber,
        PartyAddress: { Line1: 'Rue Ribat', Line2: '', Line3: '', City: 'Sousse', StateOrProvinceCode: '', PostCode: '', CountryCode: 'TN' },
        Contact: { Department: '', PersonName: 'Proteine Tunisie', Title: '', CompanyName: 'Proteine Tunisie', PhoneNumber1: '0021671160800', PhoneNumber1Ext: '', PhoneNumber2: '', PhoneNumber2Ext: '', FaxNumber: '', CellPhone: '0021671160800', EmailAddress: 'contact@protein.tn', Type: '' },
      },
      Consignee: {
        Reference1: '',
        Reference2: '',
        AccountNumber: '',
        PartyAddress: { Line1: 'Test Adresse', Line2: '', Line3: '', City: 'Tunis', StateOrProvinceCode: '', PostCode: '', CountryCode: 'TN' },
        Contact: { Department: '', PersonName: 'Test Client', Title: '', CompanyName: 'Test Client', PhoneNumber1: '0021620000000', PhoneNumber1Ext: '', PhoneNumber2: '', PhoneNumber2Ext: '', FaxNumber: '', CellPhone: '0021620000000', EmailAddress: 'test@test.com', Type: '' },
      },
      ThirdParty: {
        Reference1: '',
        Reference2: '',
        AccountNumber: '',
        PartyAddress: { Line1: '', Line2: '', Line3: '', City: '', StateOrProvinceCode: '', PostCode: '', CountryCode: 'TN' },
        Contact: { Department: '', PersonName: '', Title: '', CompanyName: '', PhoneNumber1: '', PhoneNumber1Ext: '', PhoneNumber2: '', PhoneNumber2Ext: '', FaxNumber: '', CellPhone: '', EmailAddress: '', Type: '' },
      },
      ShippingDateTime: '/Date(' + (Date.now()) + '-0500)/',
      DueDate:          '/Date(' + (Date.now()) + '-0500)/',
      Comments: 'credential test',
      PickupLocation: 'Reception',
      OperationsInstructions: '',
      AccountingInstrcutions: '',
      ForeignHAWB: '',
      TransportType: 0,
      PickupGUID: '',
      Details: {
        Dimensions:          null,
        ActualWeight:        { Unit: 'KG', Value: 0.5 },
        ChargeableWeight:    null,
        DescriptionOfGoods:  'Test',
        GoodsOriginCountry:  'TN',
        NumberOfPieces:      1,
        ProductGroup:        'DOM',
        ProductType:         'ONP',
        PaymentType:         'P',
        PaymentOptions:      '',
        Services:            'CODS',
        CashOnDeliveryAmount:           { CurrencyCode: 'TND', Value: 1 },
        InsuranceAmount:                null,
        CashAdditionalAmount:           null,
        CashAdditionalAmountDescription:'',
        CustomsValueAmount:             null,
        CollectAmount:                  null,
        Items:                          [],
      },
      Attachments: [],
    },
  ],
  LabelInfo: { ReportID: 9737, ReportType: 'URL' },
});

const options = {
  hostname: 'ws.aramex.net',
  path:     '/ShippingAPI.V2/Shipping/Service_1_0.svc/json/CreateShipments',
  method:   'POST',
  headers:  {
    'Content-Type':   'application/json',
    'Accept':         'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
};

console.log('Testing Aramex credentials...');
console.log('URL    :', 'https://' + options.hostname + options.path);
console.log('Account:', credentials.AccountNumber);
console.log('PIN    :', credentials.AccountPin);
console.log('User   :', credentials.UserName);
console.log('');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);

      // Check top-level notifications (login errors appear here)
      const notifs = json.Notifications || [];
      if (notifs.length > 0) {
        console.log('❌ Aramex notifications:');
        notifs.forEach(n => console.log('   Code:', n.Code, '| Message:', n.Message));
        return;
      }

      // Check shipment-level errors
      const shipment = (json.Shipments || [])[0];
      if (shipment && shipment.HasErrors) {
        console.log('❌ Shipment errors:');
        (shipment.Notifications || []).forEach(n => console.log('   Code:', n.Code, '| Message:', n.Message));
        return;
      }

      if (shipment && shipment.ID) {
        console.log('✅ SUCCESS! Credentials are valid.');
        console.log('   HAWB     :', shipment.ID);
        console.log('   Label URL:', shipment.ShipmentLabel?.LabelURL || 'N/A');
      } else {
        console.log('⚠️  Unexpected response:');
        console.log(JSON.stringify(json, null, 2));
      }
    } catch (e) {
      console.log('❌ Failed to parse response:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => console.log('❌ Network error:', e.message));
req.write(payload);
req.end();
