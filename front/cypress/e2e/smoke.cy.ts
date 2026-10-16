describe('Smoke test', () => {
  it('redirects a visitor without account to the login page', () => {
    cy.visit('/');

    cy.location('pathname').should('eq', '/login');
    cy.title().should('eq', 'Connexion - DataShare');
  });
});
