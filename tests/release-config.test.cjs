const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const packageConfig = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
const easConfig = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
const gitignore = fs.readFileSync('.gitignore', 'utf8');

test('app and package versions stay aligned with the OTA runtime', () => {
  assert.equal(packageConfig.version, appConfig.version);
  assert.equal(appConfig.version, appConfig.runtimeVersion);
});

test('EAS production builds use remote auto-incremented native versions', () => {
  assert.equal(easConfig.cli.appVersionSource, 'remote');
  assert.equal(easConfig.build.production.autoIncrement, true);
});

test('Android does not request microphone access and TypeScript build info is ignored', () => {
  assert.equal(appConfig.android.permissions.includes('android.permission.RECORD_AUDIO'), false);
  assert.match(gitignore, /^\*\.tsbuildinfo$/m);
});
