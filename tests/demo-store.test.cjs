const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const path = require('node:path');
// Only these pure modules are allowed. A new network/native import fails this test.
const cache = {};
function load(file) {
  file = path.resolve(__dirname, '..', file);
  if (cache[file]) return cache[file];
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const allowedRequire = name => { assert.equal(name, '../src/panel'); return load('src/panel.ts'); };
  vm.runInThisContext('(function(require,module,exports){'+js+'\n})')(allowedRequire, module, module.exports);
  return cache[file] = module.exports;
}
const { createDemoStore } = load('services/demo-store.ts');
const make = () => createDemoStore('2026-11-11');
const group = s => s.request('operations/invoice-group','POST',{items:s.orders.slice(0,2).map(o=>({orderId:o.id,price:o.price}))});
test('demo visits are isolated and resetting discards modifications', () => {
 const a=make(), b=make();a.updateOrder(a.orders[0].id,{notes:'edited'});assert.notEqual(a.orders[0].notes,b.orders[0].notes);assert.equal(make().invoices.length,0);
});
test('group, pay and delete release demo orders without double billing', async () => {
 const s=make();await group(s);assert.equal(s.invoices[0].total,90);await assert.rejects(()=>group(s));
 await s.request('operations/invoices','POST',{action:'pay',invoice_id:s.invoices[0].id,payment_method:'cash'});
 assert.ok(s.orders[0].paid);assert.throws(()=>s.updateOrder(s.orders[0].id,{paid:false}));
 await s.request('operations/invoices','POST',{action:'delete',invoice_id:s.invoices[0].id});
 assert.equal(s.orders[0].invoiceId,undefined);assert.equal(s.orders[0].paid,false);await group(s);assert.equal(s.invoices.length,1);
});
test('invalid invoice amounts and paid jobs are rejected atomically', async () => {
 const s=make();await assert.rejects(()=>s.request('operations/invoice-group','POST',{items:[{orderId:s.orders[0].id,price:NaN}]}));assert.equal(s.invoices.length,0);
 s.updateOrder(s.orders[0].id,{paid:true,paidAmount:45});await assert.rejects(()=>group(s));assert.equal(s.orders[1].invoiceId,undefined);
});
test('new house creates only its own recurrence and worker removal unassigns', () => {
 const s=make();s.saveHouse({...s.houses[0],id:'new',firstDate:'2026-11-11',frequency:'Cada 15 dias'});
 assert.deepEqual(s.orders.filter(o=>o.houseId==='new').map(o=>o.date),['2026-11-11','2026-11-26','2026-12-11','2026-12-26','2027-01-10']);
 s.deleteWorker('demo-worker');assert.ok(s.orders.every(o=>!o.workerId));
});
test('unsupported backend requests never fall through to live services', async () => {
 const s=make();await assert.rejects(()=>s.request('users','POST',{action:'delete'}));await assert.rejects(()=>s.request('operations','GET'));
});
