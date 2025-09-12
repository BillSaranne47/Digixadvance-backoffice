const fs = require('fs');
const path = require('path');

module.exports = (req, res, next) => {
  try {
    const menuPath = path.join(__dirname, '../data/menu.json');
    const menu = JSON.parse(fs.readFileSync(menuPath, 'utf-8'));
    
    // Make it available in all views
    res.locals.menu = menu;

    next();
  } catch (error) {
    console.error('Error loading menu:', error);
    next(error);
  }
};
