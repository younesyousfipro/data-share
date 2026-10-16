import { defineConfig } from 'cypress';

// E2E tests run against the real stack: `npm start` (front, proxies /api) and the back
// on port 8080 must both be running. Nothing is mocked.
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    // Shared helpers are plain imported functions, no global support file needed
    supportFile: false,
    // Failure screenshots are enough, videos are heavy
    video: false,
  },
});
