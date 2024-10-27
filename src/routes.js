// src/routes.js
const express = require('express');
const db = require('../database');
const router = express.Router();

function getMonthNumber(month) {
  return new Date(`${month} 1, 2000`).getMonth() + 1;
}

// List transactions with pagination and search
router.get('/transactions', (req, res) => {
  const { page = 1, perPage = 10, search = '', month } = req.query;
  const monthNumber = getMonthNumber(month);
  const offset = (page - 1) * perPage;

  let query = `SELECT * FROM transactions WHERE strftime('%m', dateOfSale) = ?`;
  const params = [String(monthNumber).padStart(2, '0')];

  if (search) {
    query += ` AND (title LIKE ? OR description LIKE ? OR price LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ` LIMIT ? OFFSET ?`;
  params.push(parseInt(perPage), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Statistics API
router.get('/statistics', (req, res) => {
  const monthNumber = getMonthNumber(req.query.month);

  db.get(
    `SELECT
      SUM(price) AS totalSale,
      COUNT(CASE WHEN sold = 1 THEN 1 END) AS soldItems,
      COUNT(CASE WHEN sold = 0 THEN 1 END) AS unsoldItems
    FROM transactions
    WHERE strftime('%m', dateOfSale) = ?`,
    [String(monthNumber).padStart(2, '0')],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(row);
    }
  );
});

// Bar chart API
router.get('/bar-chart', (req, res) => {
  const monthNumber = getMonthNumber(req.query.month);
  const ranges = [
    [0, 100], [101, 200], [201, 300], [301, 400], [401, 500],
    [501, 600], [601, 700], [701, 800], [801, 900], [901, Infinity]
  ];

  const promises = ranges.map(([min, max]) => new Promise((resolve) => {
    db.get(
      `SELECT COUNT(*) AS count FROM transactions WHERE price BETWEEN ? AND ? AND strftime('%m', dateOfSale) = ?`,
      [min, max === Infinity ? 999999 : max, String(monthNumber).padStart(2, '0')],
      (err, row) => {
        resolve({ range: `${min}-${max}`, count: row.count });
      }
    );
  }));

  Promise.all(promises).then((data) => res.json(data));
});

// Pie chart API
router.get('/pie-chart', (req, res) => {
  const monthNumber = getMonthNumber(req.query.month);

  db.all(
    `SELECT category, COUNT(*) AS count FROM transactions WHERE strftime('%m', dateOfSale) = ? GROUP BY category`,
    [String(monthNumber).padStart(2, '0')],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Combined data API
router.get('/combined-data', async (req, res) => {
  try {
    const [transactions, statistics, barChart, pieChart] = await Promise.all([
      axios.get(`http://localhost:5000/api/transactions`, { params: req.query }),
      axios.get(`http://localhost:5000/api/statistics`, { params: req.query }),
      axios.get(`http://localhost:5000/api/bar-chart`, { params: req.query }),
      axios.get(`http://localhost:5000/api/pie-chart`, { params: req.query }),
    ]);

    res.json({
      transactions: transactions.data,
      statistics: statistics.data,
      barChart: barChart.data,
      pieChart: pieChart.data
    });
  } catch (error) {
    res.status(500).json({ error: 'Error combining data' });
  }
});

module.exports = router;
