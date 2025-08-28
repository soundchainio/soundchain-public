describe('Marketplace Test', () => {
  it('Visits the marketplace page', () => {
    cy.visit('/marketplace');
    cy.contains('Marketplace').should('be.visible');
  });
});
