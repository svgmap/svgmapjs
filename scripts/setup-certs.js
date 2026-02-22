import { execSync } from 'child_process';
import fs from 'fs';

const certFile = 'cert.pem';
const keyFile = 'key.pem';
const demoDir = 'demo-content';

// HTTPS化のため証明書の生成
if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
  console.log('Generating self-signed certificates...');
  try {
    execSync(`openssl req -x509 -newkey rsa:2048 -keyout ${keyFile} -out ${certFile} -days 365 -nodes -subj "/CN=localhost"`);
    console.log('Certificates generated successfully.');
  } catch (error) {
    console.error('Failed to generate certificates with openssl. Please ensure openssl is installed.', error);
    process.exit(1);
  }
} else {
  console.log('Certificates already exist.');
}

// Webコンテンツの取得
if (!fs.existsSync(demoDir)) {
  console.log(`Cloning svgMapDemo repository into ${demoDir}...`);
  try {
    execSync(`git clone git@github.com:svgmap/svgMapDemo.git ${demoDir}`, { stdio: 'inherit' });
    execSync('ls -la ' + demoDir, { stdio: 'inherit' });
    execSync(`cp -f ./tests/e2e/resources/* ${demoDir}/`, { stdio: 'inherit' });
    console.log('Repository cloned successfully.');
  } catch (error) {
    console.error('Failed to clone repository. Please check your git SSH setup.', error);
    // 継続可能な場合もあるため exit はしない
  }
} else {
  console.log(`${demoDir} already exists.`);
}

