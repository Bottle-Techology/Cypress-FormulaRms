/**
 * Page Object Models – barrel export
 *
 * Usage in spec files:
 *   const { LoginPage, ProfilePage, OrdersPage, DashboardPage } = require('../support/pages');
 */

module.exports = {
  LoginPage:     require('./LoginPage'),
  ProfilePage:   require('./ProfilePage'),
  OrdersPage:    require('./OrdersPage'),
  DashboardPage: require('./DashboardPage'),
};
