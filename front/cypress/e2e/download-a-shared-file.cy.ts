import { createAccount, uploadFile } from '../support/api';

describe('Download a shared file', () => {
  it('refuses a wrong password, then saves the file', () => {
    // The token stays in the test: the browser visits the link without any account
    createAccount()
      .then((token) => uploadFile(token, 'file-secret'))
      .then((id) => cy.visit(`/download/${id}`));

    cy.contains('sample.txt');
    cy.get('#password').type('wrong-secret');
    cy.contains('button', 'Télécharger').click();
    cy.contains('[role="alert"]', 'Mot de passe incorrect.');

    cy.get('#password').clear().type('file-secret');
    cy.contains('button', 'Télécharger').click();
    cy.contains('Fichier téléchargé.');

    cy.fixture('sample.txt').then((content: string) => {
      cy.readFile('cypress/downloads/sample.txt').should('eq', content);
    });
  });
});
