// const mysql = require('mysql2/promise');
// const dotenv = require('dotenv');
// dotenv.config();

// const pool = mysql.createPool(process.env.DATABASE_URL, {
//   waitForConnections: true,
//   connectionLimit: parseInt(process.env.DB_POOL_MAX, 10) || 10,
//   queueLimit: 0
// });
// // Test de connexion à la base au démarrage
// (async () => {
//   try {
//     const connection = await pool.getConnection();
//     console.log('✅ MySQL connection established');
//     connection.release();
//   } catch (err) {
//     console.error('❌ MySQL connection error:', err);
//   }
// })();

// module.exports = {
//   query: (sql, params) => pool.execute(sql, params),
//   getConnection: () => pool.getConnection(),
// };
