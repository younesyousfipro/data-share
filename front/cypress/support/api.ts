// Test data prepared through the API, so that each scenario only clicks through what it tests

export const ACCOUNT_PASSWORD = 'e2e-password';

// A fresh account on every run: tests never depend on what the database already holds
export function uniqueEmail(): string {
  return `e2e-${Date.now()}@test.local`;
}

export function createAccount(): Cypress.Chainable<string> {
  const credentials = { email: uniqueEmail(), password: ACCOUNT_PASSWORD };
  cy.request('POST', '/api/auth/register', credentials);
  return cy.request('POST', '/api/auth/login', credentials).its('body.token');
}

export function uploadFile(token: string, password?: string): Cypress.Chainable<string> {
  return cy.fixture('sample.txt').then((content: string) => {
    const body = new FormData();
    body.append('file', new File([content], 'sample.txt'));
    if (password) {
      body.append('password', password);
    }
    // cy.request cannot send multipart/form-data: the browser's fetch does
    const upload = fetch('/api/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    }).then((response) => response.json());
    return cy.wrap(upload).its('id');
  });
}
