const net = require('net');
const tls = require('tls');
const fs = require('fs');
const path = require('path');

// Read .env file
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = (match[2] || '').trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[match[1]] = val;
      }
    }
  }
  return env;
}

const env = loadEnv();
const host = env.MAIL_HOST || 'smtp.gmail.com';
const port = parseInt(env.MAIL_PORT || '587', 10);
const user = env.MAIL_USERNAME || '';
const rawPass = env.MAIL_PASSWORD || '';
const cleanPass = rawPass.replace(/\s+/g, '');
const from = env.MAIL_FROM_ADDRESS || user;
const fromName = env.MAIL_FROM_NAME || 'Protein.tn';
const to = process.argv[2] || (env.ADMIN_EMAILS || '').split(',')[0].trim();

const missing = [
  ['MAIL_USERNAME', user],
  ['MAIL_PASSWORD', cleanPass],
  ['recipient argument or ADMIN_EMAILS', to],
].filter(([, value]) => !value).map(([name]) => name);

if (missing.length > 0) {
  console.error(`Missing SMTP configuration: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('========================================');
console.log(' PROTEIN.TN SMTP TEST');
console.log('========================================');
console.log(`Host: ${host}:${port}`);
console.log(`Username: ${user}`);
console.log(`Sender Name: ${fromName}`);
console.log('Password: configured');
console.log(`Recipient: ${to}`);
console.log('----------------------------------------\n');

function testSmtp(password) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, host);
    let step = 0;
    let secureSocket = null;

    function handleData(data, currentSocket) {
      const response = data.toString();
      const lines = response.trim().split('\n');
      console.log(`[SMTP] ${lines[lines.length - 1]}`);

      if (step === 0 && response.startsWith('220')) {
        step++;
        currentSocket.write('EHLO localhost\r\n');
      } else if (step === 1 && response.startsWith('250')) {
        step++;
        currentSocket.write('STARTTLS\r\n');
      } else if (step === 2 && response.startsWith('220')) {
        step++;
        secureSocket = tls.connect({
          socket: socket,
          host: host,
          rejectUnauthorized: true
        }, () => {
          secureSocket.write('EHLO localhost\r\n');
        });

        secureSocket.on('data', (d) => handleData(d, secureSocket));
        secureSocket.on('error', (err) => reject(err));
      } else if (step === 3 && response.startsWith('250')) {
        step++;
        secureSocket.write('AUTH LOGIN\r\n');
      } else if (step === 4 && response.startsWith('334')) {
        step++;
        secureSocket.write(Buffer.from(user).toString('base64') + '\r\n');
      } else if (step === 5 && response.startsWith('334')) {
        step++;
        secureSocket.write(Buffer.from(password).toString('base64') + '\r\n');
      } else if (step === 6 && response.startsWith('235')) {
        step++;
        secureSocket.write(`MAIL FROM:<${from}>\r\n`);
      } else if (step === 7 && response.startsWith('250')) {
        step++;
        secureSocket.write(`RCPT TO:<${to}>\r\n`);
      } else if (step === 8 && response.startsWith('250')) {
        step++;
        secureSocket.write('DATA\r\n');
      } else if (step === 9 && response.startsWith('354')) {
        step++;
        const emailContent = [
          `From: "${fromName}" <${from}>`,
          `To: <${to}>`,
          `Subject: Test Email from Protein.tn`,
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset=UTF-8',
          '',
          `Bonjour,\r\n\r\nCeci est un e-mail de test envoyé avec succès via la configuration SMTP de Protein.tn.\r\n\r\nExpéditeur: ${fromName} <${from}>\r\nDestinataire: ${to}\r\nDate: ${new Date().toLocaleString()}`,
          '',
          '.'
        ].join('\r\n') + '\r\n';
        secureSocket.write(emailContent);
      } else if (step === 10 && response.startsWith('250')) {
        step++;
        secureSocket.write('QUIT\r\n');
        resolve(true);
      } else if (response.startsWith('5') || response.startsWith('4')) {
        reject(new Error(response.trim()));
      }
    }

    socket.on('data', (d) => {
      if (step < 3) handleData(d, socket);
    });

    socket.on('error', (err) => reject(err));
  });
}

(async () => {
  try {
    await testSmtp(cleanPass);
    console.log('\n✅ [SUCCESS] Email sent successfully to ' + to);
  } catch (err) {
    console.error('\n❌ [FAILED] SMTP Authentication / Delivery error:');
    console.error(err.message);
  }
})();

