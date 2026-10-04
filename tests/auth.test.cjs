const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadAuth(env = {}, options = {}) {
  const saved = new Map();
  const calls = [];
  let configuredKey;
  let session = options.session || null;
  const auth = {
    exchangeCodeForSession: async code => { calls.push(code); session = { user: { id: 'test-user' } }; return { error: null }; },
    signInWithOAuth: async request => {
      assert.equal(saved.get('ngc-access-role'), options.role || 'admin');
      assert.equal(request.options.redirectTo, 'nietogreencare://admin');
      assert.equal(request.options.skipBrowserRedirect, true);
      return { data: { url: 'https://example.test/authorize' }, error: null };
    },
    getSession: async () => ({ data: { session } }),
  };
  const modules = {
    'react-native-url-polyfill/auto': {},
    '@supabase/supabase-js': { createClient: (_url, key) => { configuredKey = key; return { auth }; } },
    'expo-secure-store': {
      getItemAsync: async name => saved.get(name) ?? null,
      setItemAsync: async (name, value) => { saved.set(name, value); },
      deleteItemAsync: async name => { saved.delete(name); },
    },
    'expo-web-browser': {
      maybeCompleteAuthSession: () => {},
      openAuthSessionAsync: async () => options.result || { type: 'success', url: 'nietogreencare://?code=google-code' },
    },
    'react-native': { Platform: { OS: 'android' } },
  };
  const source = fs.readFileSync(require.resolve('../services/auth.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, require: name => { if (!(name in modules)) throw Error(name); return modules[name]; }, process: { env }, URL, URLSearchParams };
  vm.runInNewContext(compiled, context);
  return { api: context.exports, saved, calls, configuredKey };
}
const config = { EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };

test('publishable key works alone and takes precedence over legacy anon', () => {
  assert.equal(loadAuth(config).configuredKey, 'sb_publishable_test');
  assert.equal(loadAuth({ ...config, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'legacy' }).configuredKey, 'sb_publishable_test');
});
test('legacy anon remains supported when publishable is absent or blank', () => {
  assert.equal(loadAuth({ EXPO_PUBLIC_SUPABASE_URL: config.EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'legacy', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' ' }).configuredKey, 'legacy');
});
test('missing configuration cannot open OAuth', async () => {
  const { api } = loadAuth();
  assert.equal(api.supabase, null);
  await assert.rejects(api.signInWithGoogle('admin'), /no está configurada/);
});
test('Google saves panel before opening browser and exchanges the PKCE code', async () => {
  const { api, calls } = loadAuth(config);
  assert.equal(await api.signInWithGoogle('admin'), true);
  assert.equal(await api.restoreAccessRole(), 'admin');
  assert.deepEqual(calls, ['google-code']);
});
test('worker selection persists and invalid saved selections are ignored', async () => {
  const { api, saved } = loadAuth(config, { role: 'worker' });
  await api.signInWithGoogle('worker');
  assert.equal(await api.restoreAccessRole(), 'worker');
  saved.set('ngc-access-role', 'unknown');
  assert.equal(await api.restoreAccessRole(), null);
});
test('browser and deep-link callbacks exchange a code only once', async () => {
  const { api, calls } = loadAuth(config);
  await Promise.all([api.finishGoogleSignIn('nietogreencare://?code=same'), api.finishGoogleSignIn('nietogreencare://?code=same')]);
  assert.deepEqual(calls, ['same']);
});
test('foreign callbacks are ignored and OAuth errors surface', async () => {
  const { api, calls } = loadAuth(config);
  await api.finishGoogleSignIn('https://example.test/?code=foreign');
  await api.finishGoogleSignIn('nietogreencare://other?code=foreign');
  assert.deepEqual(calls, []);
  await assert.rejects(api.finishGoogleSignIn('nietogreencare://#error=access_denied'), /Google no autorizó/);
});
test('cancelled browser does not claim a successful login', async () => {
  const { api, calls } = loadAuth(config, { result: { type: 'cancel' } });
  assert.equal(await api.signInWithGoogle('admin'), false);
  assert.deepEqual(calls, []);
});

test('double tap shares one OAuth request and one code exchange', async () => {
 const {api,calls}=loadAuth(config);
 const first=api.signInWithGoogle('admin');
 const second=api.signInWithGoogle('admin');
 assert.equal(first,second);
 assert.deepEqual(await Promise.all([first,second]),[true,true]);
 assert.deepEqual(calls,['google-code']);
});
test('Android dismissal preserves an already received session', async () => {
 const {api}=loadAuth(config,{result:{type:'dismiss'},session:{user:{id:'test-user'}}});
 assert.equal(await api.signInWithGoogle('admin'),true);
});
test('callback with missing code reports an error instead of silent return', async () => {
 const {api}=loadAuth(config);
 await assert.rejects(api.finishGoogleSignIn('nietogreencare://?unexpected=value'),/código de acceso válido/);
});

test('explicit native admin callback exchanges the code', async () => {
 const {api,calls}=loadAuth(config);
 await api.finishGoogleSignIn('nietogreencare://admin?code=native-admin');
 assert.deepEqual(calls,['native-admin']);
});
test('unexpected paths cannot exchange a code', async () => {
 const {api,calls}=loadAuth(config);
 await api.finishGoogleSignIn('nietogreencare://admin/unknown?code=untrusted');
 assert.deepEqual(calls,[]);
});
