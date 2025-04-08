const winston = require('winston');
const PostgresTransport = require('./PostgresTransport');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    //new winston.transports.Console(),
    new PostgresTransport() // loglar veritabanına yazılacak
  ]
});

module.exports = logger;
