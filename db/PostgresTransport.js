// PostgresTransport.js
const Transport = require('winston-transport');
const { Pool } = require('pg');
const config = require('../config');  // veritabanı bağlantı ayarlarınızın bulunduğu dosya

class PostgresTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.pool = new Pool(config.db);
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const { level, message, username } = info; // İsteğe bağlı olarak username ekleyebilirsiniz.
    const query = 'INSERT INTO logs (log_date, level, message, username) VALUES (NOW(), $1, $2, $3)';
    
    this.pool.query(query, [level, message, username || null])
      .then(() => callback())
      .catch(err => {
        console.error('PostgreSQL log kaydı eklenemedi:', err);
        callback(err);
      });
  }
}

module.exports = PostgresTransport;
