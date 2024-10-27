// src/initDatabase.js
const axios = require('axios');
const db = require('./database');

async function seedDatabase() {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const transactions = response.data;

    const insertTransaction = db.prepare(
      'INSERT INTO transactions (title, description, price, category, sold, dateOfSale) VALUES (?, ?, ?, ?, ?, ?)'
    );

    transactions.forEach((t) => {
      insertTransaction.run(t.title, t.description, t.price, t.category, t.sold, t.dateOfSale);
    });

    insertTransaction.finalize();
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

module.exports = seedDatabase;
