describe('Share a file', () => {
  // A fresh account on every run: the test never depends on what the database already holds
  const email = `e2e-${Date.now()}@test.local`;
  const password = 'e2e-password';

  it('creates an account, logs in and gets a download link', () => {
    cy.visit('/register');
    cy.get('#email').type(email);
    cy.get('#password').type(password);
    cy.get('#confirm-password').type(password);
    cy.contains('button', 'Créer mon compte').click();

    cy.location('pathname').should('eq', '/login');
    cy.contains('Votre compte a été créé');

    cy.get('#email').type(email);
    cy.get('#password').type('wrong-password');
    cy.contains('button', 'Connexion').click();
    cy.contains('[role="alert"]', 'Email ou mot de passe incorrect.');

    cy.get('#password').clear().type(password);
    cy.contains('button', 'Connexion').click();
    cy.location('pathname').should('eq', '/');

    // The input is hidden: the page opens the OS file picker, which Cypress cannot drive
    cy.get('#file').selectFile('cypress/fixtures/sample.txt', { force: true });
    cy.contains('sample.txt');
    cy.contains('button', 'Téléverser').click();

    cy.contains('Félicitations');
    cy.contains('a', '/download/')
      .should('have.attr', 'href')
      .and('match', /\/download\/[0-9a-f-]{36}$/);
  });
});
