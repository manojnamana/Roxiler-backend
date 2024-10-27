const express = require('express');
const { Transaction } = require('./database'); // Import the Transaction model
const router = express.Router();


router.use((req, res, next) => {
  const token = req.headers['authorization'];
  if (token === `Bearer ${AUTH_TOKEN}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
})
function getMonthNumber(month) {
  return new Date(`${month} 1, 2000`).getMonth() + 1;
}

// Hello World route
router.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

// List transactions with pagination and search
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, perPage = 10, search = '', month } = req.query;
    const monthNumber = getMonthNumber(month);

    const filter = {
      dateOfSale: { $regex: `-${String(monthNumber).padStart(2, '0')}-` },
      ...(search && {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { price: { $regex: search, $options: 'i' } }
        ]
      })
    };

    const transactions = await Transaction.find(filter)
      .skip((page - 1) * perPage)
      .limit(Number(perPage));

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistics API
router.get('/statistics', async (req, res) => {
  try {
    const monthNumber = getMonthNumber(req.query.month);

    const stats = await Transaction.aggregate([
      { $match: { dateOfSale: { $regex: `-${String(monthNumber).padStart(2, '0')}-` } } },
      {
        $group: {
          _id: null,
          totalSale: { $sum: '$price' },
          soldItems: { $sum: { $cond: [{ $eq: ['$sold', true] }, 1, 0] } },
          unsoldItems: { $sum: { $cond: [{ $eq: ['$sold', false] }, 1, 0] } }
        }
      }
    ]);

    res.json(stats[0] || { totalSale: 0, soldItems: 0, unsoldItems: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bar chart API
router.get('/bar-chart', async (req, res) => {
  try {
    const monthNumber = getMonthNumber(req.query.month);
    const ranges = [
      { min: 0, max: 100 },
      { min: 101, max: 200 },
      { min: 201, max: 300 },
      { min: 301, max: 400 },
      { min: 401, max: 500 },
      { min: 501, max: 600 },
      { min: 601, max: 700 },
      { min: 701, max: 800 },
      { min: 801, max: 900 },
      { min: 901, max: Infinity }
    ];

    const results = await Promise.all(
      ranges.map(async ({ min, max }) => {
        const count = await Transaction.countDocuments({
          dateOfSale: { $regex: `-${String(monthNumber).padStart(2, '0')}-` },
          price: { $gte: min, ...(max !== Infinity ? { $lte: max } : {}) }
        });
        return { range: `${min}-${max}`, count };
      })
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pie chart API
router.get('/pie-chart', async (req, res) => {
  try {
    const monthNumber = getMonthNumber(req.query.month);

    const pieData = await Transaction.aggregate([
      {
        $match: { dateOfSale: { $regex: `-${String(monthNumber).padStart(2, '0')}-` } }
      },
      {
        $group: { _id: '$category', count: { $sum: 1 } }
      },
      {
        $project: { category: '$_id', count: 1, _id: 0 }
      }
    ]);

    res.json(pieData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Combined data API
router.get('/combined-data', async (req, res) => {
  try {
    const { page = 1, perPage = 10, search = '', month } = req.query;
    const monthNumber = getMonthNumber(month);

    const filter = {
      dateOfSale: { $regex: `-${String(monthNumber).padStart(2, '0')}-` },
      ...(search && {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { price: { $regex: search, $options: 'i' } }
        ]
      })
    };

    // Transactions
    const transactions = await Transaction.find(filter)
      .skip((page - 1) * perPage)
      .limit(Number(perPage));

    // Statistics
    const stats = await Transaction.aggregate([
      { $match: { dateOfSale: { $regex: `-${String(monthNumber).padStart(2, '0')}-` } } },
      {
        $group: {
          _id: null,
          totalSale: { $sum: '$price' },
          soldItems: { $sum: { $cond: [{ $eq: ['$sold', true] }, 1, 0] } },
          unsoldItems: { $sum: { $cond: [{ $eq: ['$sold', false] }, 1, 0] } }
        }
      }
    ]);

    // Bar chart data
    const ranges = [
      { min: 0, max: 100 },
      { min: 101, max: 200 },
      { min: 201, max: 300 },
      { min: 301, max: 400 },
      { min: 401, max: 500 },
      { min: 501, max: 600 },
      { min: 601, max: 700 },
      { min: 701, max: 800 },
      { min: 801, max: 900 },
      { min: 901, max: Infinity }
    ];

    const barChart = await Promise.all(
      ranges.map(async ({ min, max }) => {
        const count = await Transaction.countDocuments({
          dateOfSale: { $regex: `-${String(monthNumber).padStart(2, '0')}-` },
          price: { $gte: min, ...(max !== Infinity ? { $lte: max } : {}) }
        });
        return { range: `${min}-${max}`, count };
      })
    );

    // Pie chart data
    const pieChart = await Transaction.aggregate([
      {
        $match: { dateOfSale: { $regex: `-${String(monthNumber).padStart(2, '0')}-` } }
      },
      {
        $group: { _id: '$category', count: { $sum: 1 } }
      },
      {
        $project: { category: '$_id', count: 1, _id: 0 }
      }
    ]);

    res.json({
      transactions,
      statistics: stats[0] || { totalSale: 0, soldItems: 0, unsoldItems: 0 },
      barChart,
      pieChart
    });
  } catch (error) {
    res.status(500).json({ error: 'Error combining data' });
  }
});

module.exports = router;
