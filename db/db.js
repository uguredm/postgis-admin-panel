const { Client } = require('pg');
const bcrypt = require('bcrypt');
const config = require('../config');
const { Pool } = require("pg");
const logger = require('./logger');
const pool = new Pool(config.db);


async function connectDB() {
    try {
        const client = new Client(config.db);
        await client.connect();
        return client;
    } catch (error) {
        throw new Error("Veritabanına bağlanılamadı.");
    }
}


// Kullanıcı giriş işlemi
async function loginUser(username, password) {
    try {
      const res = await pool.query(
        "SELECT id, username, password, role FROM users WHERE username ILIKE $1",
        [username]
      );
  
      if (res.rows.length === 0) {
        logger.error(`Giriş başarısız: Kullanıcı bulunamadı.`, { username });
        return { success: false, error: "Kullanıcı bulunamadı" };
      }
  
      const user = res.rows[0];
  
      const passwordMatch = await bcrypt.compare(password, user.password);
  
      if (!passwordMatch) {
        logger.error(`Giriş başarısız: Yanlış şifre.`, { username });
        return { success: false, error: "Yanlış şifre!" };
      }
  
      if (user.role !== "admin") {
        logger.error(`Giriş başarısız: Yetkisiz erişim.`, { username });
        return { success: false, error: "Yetkisiz giriş!" };
      }
  
      // Başarılı giriş durumunda logla
      logger.info(`Kullanıcı giriş yaptı.`, { username });
      return { success: true, user };
  
    } catch (err) {
      logger.error(`Giriş sırasında sunucu hatası: ${err.message}`, { username });
      return { success: false, error: "Sunucu hatası: " + err.message };
    }
  }



// **Tüm fonksiyonları tek bir module.exports içinde tanımlayalım**
module.exports = { loginUser, pool };
