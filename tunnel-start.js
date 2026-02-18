const { spawn } = require('child_process');

console.log('🚀 Starting Expo with tunnel...');
console.log('⏳ Waiting for tunnel URL...');
console.log('');

const expo = spawn('npx', ['expo', 'start', '--tunnel'], {
  env: { 
    ...process.env,
    CI: 'false',  // Force non-CI mode to show URL
    EXPO_NO_TELEMETRY: '1'
  },
  shell: true
});

let foundUrl = false;
let allOutput = '';

expo.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  allOutput += output;
  
  // Look for exp:// URL
  const expMatch = output.match(/exp:\/\/[^\s\)]+/);
  if (expMatch && !foundUrl) {
    console.log('');
    console.log('════════════════════════════════════════');
    console.log('✅ SHARE THIS URL WITH YOUR FRIEND:');
    console.log('');
    console.log('   ' + expMatch[0]);
    console.log('');
    console.log('════════════════════════════════════════');
    console.log('');
    foundUrl = true;
  }
});

expo.stderr.on('data', (data) => {
  const output = data.toString();
  process.stderr.write(output);
  allOutput += output;
});

expo.on('close', (code) => {
  if (!foundUrl) {
    console.log('');
    console.log('⚠️  exp:// URL not found in output');
    console.log('Search above for "exp://" or "Tunnel" manually');
    console.log('');
  }
  process.exit(code);
});

// Extended timeout since tunnel takes time
setTimeout(() => {
  if (!foundUrl) {
    console.log('');
    console.log('📍 Still waiting for tunnel URL...');
    console.log('This can take 1-2 minutes on first start');
    console.log('');
  }
}, 45000);
