const express = require('express');
const cors = require('cors'); // Import CORS
const { connectToDatabase } = require('./src/database');
const seedDatabase = require('./src/initDatabase');
const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); 
app.use(express.json());

connectToDatabase().then(async () => {
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

app.use('/api', routes);
