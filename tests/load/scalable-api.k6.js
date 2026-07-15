import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const savedLatency = new Trend('saved_latency', true);
const jobSubmitLatency = new Trend('job_submit_latency', true);

export const options = {
  scenarios: {
    ramp_to_capacity: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 200 },
        { duration: '3m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    saved_latency: ['p(95)<500'],
    job_submit_latency: ['p(95)<1000'],
  },
};

const baseUrl = __ENV.BASE_URL ?? 'http://localhost:3001/api';
const headers = {
  Authorization: __ENV.AUTH_TOKEN ? `Bearer ${__ENV.AUTH_TOKEN}` : '',
  'x-user-id': __ENV.USER_ID ?? 'load-test-user',
  'x-organization-id': __ENV.ORGANIZATION_ID ?? 'load-test-organization',
  'x-project-id': __ENV.PROJECT_ID ?? 'load-test-project',
  'Content-Type': 'application/json',
};

export default function () {
  const saved = http.get(`${baseUrl}/prompts/saved?limit=24`, {
    headers,
    timeout: '10s',
    tags: { endpoint: 'saved' },
  });
  savedLatency.add(saved.timings.duration);
  check(saved, { 'saved returns 200': (response) => response.status === 200 });

  if (__ENV.PROMPT_ID && __ITER % 10 === 0) {
    const submitted = http.post(
      `${baseUrl}/prompts/${__ENV.PROMPT_ID}/save`,
      JSON.stringify({ saved: true }),
      {
        headers: {
          ...headers,
          'Idempotency-Key': `k6-${__VU}-${Math.floor(__ITER / 10)}`,
        },
        timeout: '10s',
        tags: { endpoint: 'job_submit' },
      },
    );
    jobSubmitLatency.add(submitted.timings.duration);
    check(submitted, {
      'save is bounded': (response) => response.status === 200 || response.status === 202,
    });
  }

  sleep(1);
}
