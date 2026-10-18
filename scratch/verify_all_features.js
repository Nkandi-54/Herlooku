async function get(path, headers = {}) {
  const res = await fetch(`http://localhost:3000${path}`, { headers });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: res.status, headers: res.headers, text, json };
}

async function post(path, body, headers = {}) {
  const res = await fetch(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: res.status, headers: res.headers, text, json };
}

async function runTests() {
  console.log('====================================================');
  console.log('HERLOOKU COMPLETE SYSTEM & PRIVACY VERIFICATION TEST');
  console.log('====================================================\n');

  let allPassed = true;
  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
    } else {
      console.error(`❌ FAIL: ${message}`);
      allPassed = false;
    }
  }

  // 1. Check worker profiles list
  console.log('1. Testing /api/workers...');
  const workersRes = await get('/api/workers');
  assert(workersRes.status === 200, 'GET /api/workers returns status 200');
  assert(Array.isArray(workersRes.json?.profiles), 'Profiles array returned');
  const sampleWorker = workersRes.json?.profiles?.[0];
  assert(sampleWorker?.hireFee === 23.076923, `Worker has constant hiring fee ($23.08 USD base / Ksh 3,000): ${sampleWorker?.hireFee}`);
  assert(typeof sampleWorker?.expectedDailySalary === 'number', `Worker has stated daily pay: Ksh ${sampleWorker?.expectedDailySalary * 130}/day ($${sampleWorker?.expectedDailySalary}/day)`);

  // 2. Set active user to Worker (usr_worker_grace)
  console.log('\n2. Testing Worker Privacy (Grace Ochieng) - Money & Hiring Fee Redaction...');
  const switchWorker = await post('/api/auth/me', { action: 'switch', userId: 'usr_worker_grace' });
  assert(switchWorker.status === 200 && switchWorker.json?.activeUser?.id === 'usr_worker_grace', 'Switched to Worker Grace');

  // Test worker's GET /api/bookings
  const workerBookingsRes = await get('/api/bookings');
  assert(workerBookingsRes.status === 200, 'Worker GET /api/bookings returns 200');
  const workerBookings = workerBookingsRes.json?.bookings || [];
  assert(workerBookings.length > 0, `Worker has bookings: ${workerBookings.length}`);
  
  let moneyLeaked = false;
  for (const b of workerBookings) {
    if (b.platformBookingFee !== undefined || b.totalAmount !== undefined || b.hireFee !== undefined || b.platformFee !== undefined || b.paymentTransactionRef !== undefined || b.paymentMethod !== undefined) {
      moneyLeaked = true;
      console.error('Leaked financial fields in worker booking:', b);
    }
  }
  assert(!moneyLeaked, 'ZERO financial fields (platformBookingFee, totalAmount, hireFee, paymentTransactionRef) exposed to worker in /api/bookings');

  // Test worker's GET /api/profile
  const workerProfileRes = await get('/api/profile');
  assert(workerProfileRes.status === 200, 'Worker GET /api/profile returns 200');
  assert(workerProfileRes.json?.workerProfile?.hireFee === undefined, 'Worker profile GET /api/profile completely redacts hireFee');
  assert(typeof workerProfileRes.json?.workerProfile?.expectedDailySalary === 'number', `Worker profile contains expectedDailySalary: $${workerProfileRes.json?.workerProfile?.expectedDailySalary}`);

  // 3. Set active user to Client (usr_client_sarah) and test booking creation + upfront lock checkout
  console.log('\n3. Testing Client Booking & Constant Hiring Fee Checkout...');
  const switchClient = await post('/api/auth/me', { action: 'switch', userId: 'usr_client_sarah' });
  assert(switchClient.status === 200 && switchClient.json?.activeUser?.id === 'usr_client_sarah', 'Switched to Client Sarah');

  // Pick unique open dates to avoid date collisions
  const rand = Math.floor(Math.random() * 80) + 10;
  const initRes = await post('/api/bookings', {
    workerId: 'usr_worker_elena',
    startDate: `2027-03-${rand < 10 ? '0' + rand : rand}`,
    endDate: `2027-03-${rand + 3 < 10 ? '0' + (rand + 3) : (rand + 3)}`,
    clientAddress: '123 Kilimani Road, Nairobi',
    serviceRequirements: 'Full-time housekeeping and deep cleaning',
  });
  assert(initRes.status === 200, 'POST /api/bookings creates booking with status 200');
  assert(initRes.json?.booking?.platformBookingFee === 23.076923, `Platform booking fee locked to constant Ksh 3,000 ($23.08): ${initRes.json?.booking?.platformBookingFee}`);
  assert(initRes.json?.booking?.workerExpectedDailySalary > 0, 'Worker expected daily salary recorded for offline settlement');

  // The browser can no longer confirm a payment or lock a worker.
  // A worker is locked ONLY by the server-side Safaricom callback.
  const bypassRes = await post('/api/bookings/checkout', {
    bookingId: initRes.json?.booking?.id,
    paymentMethod: 'mpesa',
    paymentDetails: { phoneNumber: '+254 700 112 233' }
  });
  assert(bypassRes.status === 405, 'POST /api/bookings/checkout is rejected (browser cannot lock a worker)');
  const stillPending = await get('/api/bookings');
  const pendingBooking = (stillPending.json?.bookings || []).find(b => b.id === initRes.json?.booking?.id);
  assert(pendingBooking?.status === 'pending_payment', 'Booking remains pending_payment until provider confirmation');

  // 4. Testing Emergency Alarm System
  console.log('\n4. Testing Emergency Alarm / SOS System...');
  const alarmRes = await post('/api/emergencies', {
    bookingId: initRes.json?.booking?.id,
    alarmType: 'security',
    severity: 'critical',
    details: 'Unauthorized entry attempt at premises during work shift. Alarm triggered by domestic helper/client.',
    location: 'Kilimani, Nairobi'
  });
  assert(alarmRes.status === 200, 'POST /api/emergencies raises alarm with status 200');
  assert(alarmRes.json?.alarm?.status === 'active', 'Alarm status is active');
  assert(alarmRes.json?.alarm?.details.includes('Unauthorized entry attempt'), 'Alarm details stored properly');

  // 5. Switch to Admin (usr_admin_alex) and verify Oversight
  console.log('\n5. Testing Admin Oversight (usr_admin_alex)...');
  await post('/api/auth/me', { action: 'switch', userId: 'usr_admin_alex' });
  const adminAlarmsRes = await get('/api/emergencies');
  assert(adminAlarmsRes.status === 200, 'Admin GET /api/emergencies returns 200');
  assert(adminAlarmsRes.json?.alarms?.some(a => a.id === alarmRes.json?.alarm?.id), 'Admin can view raised emergency alarm in emergency command center');

  // 6. Test HTML page rendering across all layouts with correct active roles
  console.log('\n6. Testing Route Rendering across all user roles...');
  
  // Public pages
  for (const route of ['/', '/workers', '/workers/usr_worker_grace']) {
    const pageRes = await get(route);
    assert(pageRes.status === 200 && pageRes.text.length > 500, `Public page ${route} -> Status: ${pageRes.status} (${pageRes.text.length} bytes)`);
  }

  // Client pages (active: usr_client_sarah)
  await post('/api/auth/me', { action: 'switch', userId: 'usr_client_sarah' });
  for (const route of ['/booking/usr_worker_grace', '/dashboard/client', '/dashboard/client/profile']) {
    const pageRes = await get(route);
    assert(pageRes.status === 200 && pageRes.text.length > 500, `Client page ${route} -> Status: ${pageRes.status} (${pageRes.text.length} bytes)`);
  }

  // Worker pages (active: usr_worker_grace)
  await post('/api/auth/me', { action: 'switch', userId: 'usr_worker_grace' });
  for (const route of ['/dashboard/worker', '/dashboard/worker/profile']) {
    const pageRes = await get(route);
    assert(pageRes.status === 200 && pageRes.text.length > 500, `Worker page ${route} -> Status: ${pageRes.status} (${pageRes.text.length} bytes)`);
  }

  // Admin pages (active: usr_admin_alex)
  await post('/api/auth/me', { action: 'switch', userId: 'usr_admin_alex' });
  for (const route of ['/admin', '/admin/verifications']) {
    const pageRes = await get(route);
    assert(pageRes.status === 200 && pageRes.text.length > 500, `Admin page ${route} -> Status: ${pageRes.status} (${pageRes.text.length} bytes)`);
  }

  // Restore client active user
  await post('/api/auth/me', { action: 'switch', userId: 'usr_client_sarah' });

  console.log('\n====================================================');
  if (allPassed) {
    console.log('🎉 ALL SYSTEM & PRIVACY VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('❌ SOME TESTS FAILED. CHECK LOGS ABOVE.');
  }
  console.log('====================================================\n');
}

runTests().catch(console.error);

