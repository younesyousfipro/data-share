import http from 'k6/http';
import { check, sleep } from 'k6';

// Inside the k6 container, "localhost" is the container itself: the API runs on the host
const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:8080';

// Built once at init and shared by every iteration: k6 sends it, nothing is read from disk
const FILE_CONTENT = 'x'.repeat(1024 * 1024);

export const options = {
	stages: [
		{ duration: '10s', target: 10 },
		{ duration: '30s', target: 10 },
		{ duration: '10s', target: 0 },
	],
	// Scoped to the "upload" tag: setup and teardown requests are measured too, but must not count
	thresholds: {
		'http_req_failed{name:upload}': ['rate<0.01'],
		'http_req_duration{name:upload}': ['p(95)<1000'],
	},
};

// Runs once before the load: one fresh account per run, so runs never share data
export function setup() {
	const account = { email: `perf-${Date.now()}@example.com`, password: 'perf-password' };
	const json = { headers: { 'Content-Type': 'application/json' } };

	http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(account), json);
	const login = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(account), json);

	return { authHeaders: { Authorization: `Bearer ${login.json('token')}` } };
}

export default function (data) {
	const response = http.post(
		`${BASE_URL}/api/files`,
		{ file: http.file(FILE_CONTENT, 'perf-1mb.txt', 'text/plain') },
		{ headers: data.authHeaders, tags: { name: 'upload' } },
	);
	check(response, { 'upload returns 201': (r) => r.status === 201 });
	sleep(1);
}

// Each run uploads hundreds of MB: removed afterwards so back/uploads does not grow
export function teardown(data) {
	const files = http.get(`${BASE_URL}/api/files`, { headers: data.authHeaders }).json();
	for (const file of files) {
		http.del(`${BASE_URL}/api/files/${file.id}`, null, { headers: data.authHeaders });
	}
}
