import { multiTenantContext, requirePermission } from '../server/src/middleware/rbac.js';

async function testRbacAndTenancy() {
  console.log('--- Testing RBAC & Tenancy Shield ---');

  // Test Anonymous Write Mutation Block
  const anonReq = {
    method: 'POST',
    path: '/api/invoices',
    headers: {}
  };
  let anonBlocked = false;
  let anonStatus = null;
  const anonRes = {
    status(code) { anonStatus = code; return this; },
    json(obj) { anonBlocked = true; }
  };
  multiTenantContext(anonReq, anonRes, () => {});
  requirePermission()(anonReq, anonRes, () => {});

  if (anonStatus === 401 && anonBlocked) {
    console.log('✓ PASSED: Anonymous write mutation blocked with 401 Unauthorized.');
  } else {
    console.error(`✗ FAILED: Anonymous write not blocked (status: ${anonStatus})`);
    process.exit(1);
  }

  // Test AUDITOR_READ_ONLY Write Mutation Block
  const auditorReq = {
    method: 'POST',
    path: '/api/invoices',
    headers: { 'x-user-role': 'AUDITOR_READ_ONLY' }
  };
  let auditorBlocked = false;
  let auditorStatus = null;
  const auditorRes = {
    status(code) { auditorStatus = code; return this; },
    json(obj) { auditorBlocked = true; }
  };
  multiTenantContext(auditorReq, auditorRes, () => {});
  requirePermission()(auditorReq, auditorRes, () => {});

  if (auditorStatus === 403 && auditorBlocked) {
    console.log('✓ PASSED: AUDITOR_READ_ONLY write mutation blocked with 403 Forbidden.');
  } else {
    console.error(`✗ FAILED: Auditor write not blocked (status: ${auditorStatus})`);
    process.exit(1);
  }

  // Test Read Method Allowed for Auditor
  const readReq = {
    method: 'GET',
    path: '/api/invoices',
    headers: { 'x-user-role': 'AUDITOR_READ_ONLY' }
  };
  let readAllowed = false;
  multiTenantContext(readReq, auditorRes, () => {});
  requirePermission()(readReq, auditorRes, () => { readAllowed = true; });

  if (readAllowed) {
    console.log('✓ PASSED: AUDITOR_READ_ONLY read allowed.');
  } else {
    console.error('✗ FAILED: Auditor read not allowed');
    process.exit(1);
  }

  console.log('✓ ALL RBAC & SECURITY SHIELD TESTS PASSED.');
  process.exit(0);
}

testRbacAndTenancy().catch(err => {
  console.error(err);
  process.exit(1);
});
