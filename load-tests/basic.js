// --- START OF load-tests/basic.js ---

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
// Custom metrics to track
const errorRate = new Rate('errors');
const redirectDuration = new Trend('redirect_duration');

// ---- TEST CONFIGURATION ----
// This defines HOW the load test runs.
export const options = {
  stages: [
    // Ramp up: 0 → 50 users over 30 seconds
    { duration: '30s', target: 50 },
    // Stay at 50 users for 1 minute
    { duration: '1m', target: 50 },
    // Ramp up more: 50 → 100 users over 30 seconds
    { duration: '30s', target: 100 },
    // Stay at 100 users for 1 minute
    { duration: '1m', target: 100 },
    // Ramp down: 100 → 0 users over 30 seconds
    { duration: '30s', target: 0 },
  ],
  // Thresholds — test FAILS if these aren't met
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests should complete in <500ms
    errors: ['rate<0.1'],              // Error rate should be below 10%
  },
};

const BASE_URL = 'http://localhost';
// We use 'nginx' (the Docker service name) because k6 will run
// inside the Docker network. If running k6 locally (not in Docker),
// change this to 'http://localhost'.

// ---- SETUP: Create test data ----
// This runs ONCE before the test starts.
export function setup() {
  // Register a test user
  const email = `loadtest-${Date.now()}@test.com`;

  const registerRes = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({ email, password: 'test1234' }),
      { headers: { 'Content-Type': 'application/json' } }
  );

  const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email, password: 'test1234' }),
      { headers: { 'Content-Type': 'application/json' } }
  );

  // If login failed, try registering with the same email again
  let token;
  try {
    token = JSON.parse(loginRes.body).token;
  } catch (e) {
    console.log('Login failed, trying fresh register...');
    const email = `loadtest-${Date.now()}-retry@test.com`;
    http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({ email, password: 'test1234' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    const retryLogin = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email, password: 'test1234' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    token = JSON.parse(retryLogin.body).token;
  }

  // Create some short URLs to test redirects
  const shortCodes = [];
  for (let i = 0; i < 10; i++) {
    const res = http.post(
      `${BASE_URL}/api/shorten`,
      JSON.stringify({ url: `https://example.com/page-${i}` }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );
    try {
      const body = JSON.parse(res.body);
      if (body.shortCode) {
        shortCodes.push(body.shortCode);
      }
    } catch (e) {
      console.log(`Failed to create short URL ${i}: ${res.status}`);
    }
  }

  console.log(`Setup complete. Token obtained. ${shortCodes.length} short URLs created.`);
  return { token, shortCodes };
}

// ---- MAIN TEST FUNCTION ----
// This runs for EACH virtual user, repeatedly, for the duration of the test.
export default function (data) {
  const { token, shortCodes } = data;

  // Scenario 1: Create a short URL (write operation)
  if (Math.random() < 0.2) {
    // 20% of requests are writes (creating new short URLs)
    const res = http.post(
      `${BASE_URL}/api/shorten`,
      JSON.stringify({
        url: `https://example.com/loadtest-${Date.now()}-${Math.random()}`,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const success = check(res, {
      'shorten: status 201': (r) => r.status === 201,
      'shorten: has shortCode': (r) => {
        try { return JSON.parse(r.body).shortCode !== undefined; }
        catch { return false; }
      },
    });
    errorRate.add(!success);
  }

  // Scenario 2: Redirect (read operation — the HOT PATH)
  if (shortCodes.length > 0 && Math.random() < 0.7) {
    // 70% of requests are redirects (the most common operation)
    const code = shortCodes[Math.floor(Math.random() * shortCodes.length)];
    const res = http.get(`${BASE_URL}/${code}`, {
      redirects: 0, // Don't follow redirect — we just want to measure our server
    });

    const success = check(res, {
      'redirect: status 302': (r) => r.status === 302,
      'redirect: has Location': (r) => r.headers['Location'] !== undefined,
    });
    errorRate.add(!success);
    redirectDuration.add(res.timings.duration);
  }

  // Scenario 3: Get stats (analytics query)
  if (shortCodes.length > 0 && Math.random() < 0.1) {
    // 10% of requests are stats lookups
    const code = shortCodes[Math.floor(Math.random() * shortCodes.length)];
    const res = http.get(`${BASE_URL}/api/stats/${code}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const success = check(res, {
      'stats: status 200': (r) => r.status === 200,
    });
    errorRate.add(!success);
  }

  // Wait 0.5-1.5 seconds between requests (simulate real user think time)
  sleep(Math.random() + 0.5);
}




export function handleSummary(data) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `load-tests/results-${timestamp}.json`;
      const summary = {
        timestamp: new Date().toISOString(),
        metrics: {
          http_reqs: data.metrics.http_reqs.values,
          http_req_duration: data.metrics.http_req_duration.values,
          http_req_failed: data.metrics.http_req_failed.values,
          errors: data.metrics.errors ? data.metrics.errors.values : null,
          redirect_duration: data.metrics.redirect_duration ? data.metrics.redirect_duration.values : null,
        },
        checks: {
          total: data.metrics.checks.values.passes + data.metrics.checks.values.fails,
          passes: data.metrics.checks.values.passes,
          fails: data.metrics.checks.values.fails,
          passRate: (data.metrics.checks.values.passes / (data.metrics.checks.values.passes + data.metrics.checks.values.fails) * 100).toFixed(2) + '%',
        },
      };

      return {
        [filename]: JSON.stringify(summary, null, 2),
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
      };
    }

// --- END OF load-tests/basic.js ---
