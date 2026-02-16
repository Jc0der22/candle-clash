const { spawn } = require('child_process');

console.log('🚀 Starting Expo with tunnel...');
console.log('⏳ Waiting for tunnel URL...');
console.log('');

const expo = spawn('npx', ['expo', 'start', '--tunnel'], {
  env: { ...process.env }
});

let foundUrl = false;

expo.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  
  // Look for exp:// URL in output
  const expMatch = output.match(/exp:\/\/[^\s]+/);
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
  console.error(data.toString());
});

expo.on('close', (code) => {
  console.log(`Expo exited with code ${code}`);
  process.exit(code);
});

setTimeout(() => {
  if (!foundUrl) {
    console.log('⚠️  URL not detected yet - tunnel may still be starting...');
  }
}, 30000);
