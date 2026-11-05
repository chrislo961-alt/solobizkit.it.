import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT=process.cwd();
const read=(file)=>fs.readFileSync(path.join(ROOT,file),'utf8');

const proRuntimeFiles=[
  'pro/pro-app.js',
  'pro/account-plan-sidebar.js',
  'pro/workspace-ui.js',
  'pro/leads/leads.js',
  'pro/pipeline/pipeline.js',
  'pro/estimates/estimates.js',
  'pro/recurring/recurring.js',
  'pro/catalog/catalog.js',
  'pro/settings/settings.js',
  'pro/operations/operations.js',
];

test('Pro app keeps upgrade navigation inside the workspace',()=>{
  for(const file of proRuntimeFiles){
    const source=read(file);
    assert.equal(source.includes('/pro-pricing/'),false,`${file} must not send app users to /pro-pricing/`);
  }
  assert.match(read('pro/pro-app.js'),/href="\/pro\/upgrade\/"|href='\/pro\/upgrade\/'/);
  assert.match(read('pro/account-plan-sidebar.js'),/href="\/pro\/upgrade\/"|href='\/pro\/upgrade\/'/);
});

test('private app routes remain noindex',()=>{
  for(const file of [
    'pro/index.html',
    'pro/upgrade/index.html',
    'pro/operations/index.html',
    'pro/leads/index.html',
    'pro/pipeline/index.html',
    'pro/estimates/index.html',
    'pro/recurring/index.html',
    'pro/catalog/index.html',
    'pro/settings/index.html',
    'portal/index.html',
  ]){
    assert.match(read(file),/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i,`${file} must remain noindex`);
  }
});

test('Operations is injected once and keeps the signed-out action hidden',()=>{
  const workspace=read('pro/workspace-ui.js');
  const operationsHtml=read('pro/operations/index.html');
  const operationsJs=read('pro/operations/operations.js');
  assert.match(workspace,/ensureOperationsNav/);
  assert.match(workspace,/\/pro\/operations/);
  assert.equal((operationsHtml.match(/class="nav-item active" href="\/pro\/operations\/"/g)||[]).length,1);
  assert.match(operationsHtml,/id="addButton" hidden/);
  assert.match(operationsJs,/if\(!session\)\{\s*addButton\.hidden=true;/);
});

test('Operations covers all seven product areas',()=>{
  const source=read('pro/operations/operations.js');
  for(const area of ['bookings','contracts','time','projects','expenses','portal','integrations']){
    assert.match(source,new RegExp(`['"]${area}['"]`),`Operations is missing ${area}`);
  }
  for(const table of ['sbk_bookings','sbk_contracts','sbk_time_entries','sbk_projects','sbk_expenses','sbk_portal_messages','sbk_integrations']){
    assert.match(source,new RegExp(table),`Operations is not wired to ${table}`);
  }
});

test('client portal supports messages and contract signing',()=>{
  const portal=read('portal/portal.js');
  assert.match(portal,/data-contract-sign/);
  assert.match(portal,/sign_contract/);
  assert.match(portal,/action:'message'/);
  assert.match(portal,/portalMessageForm/);
});
