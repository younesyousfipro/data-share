import { createAccount, uploadFile } from '../support/api';

describe('Delete a file from my files', () => {
  it('lists the uploaded file, then deletes it for good', () => {
    createAccount().then((token) => {
      uploadFile(token);
      cy.visit('/my-files', {
        // AuthService reads the token once, when the app starts
        onBeforeLoad: (win) => win.localStorage.setItem('token', token),
      });
    });

    cy.contains('.file-row', 'sample.txt');

    cy.on('window:confirm', (text) => {
      expect(text).to.eq('Supprimer définitivement « sample.txt » ?');
      return true;
    });
    cy.contains('button', 'Supprimer').click();

    cy.contains('[role="status"]', '« sample.txt » a été supprimé.');
    cy.contains("Vous n'avez encore envoyé aucun fichier.");

    // Not just removed from the page: the API no longer returns it
    cy.reload();
    cy.contains("Vous n'avez encore envoyé aucun fichier.");
  });
});
