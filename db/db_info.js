const { Client } = require('pg');
const config = require('../config');
const { pool } = require('./db');  // PostgreSQL bağlantısını içe aktar
const bcrypt = require("bcryptjs"); //bcryptjs 


async function connectDB() {
    const client = new Client(config.db);
    await client.connect();
    return client;
}


async function getTables() {
    const query = `
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        AND table_name <> 'logs' and table_name <> 'spatial_ref_sys' and table_name <> 'geometry_columns' 
        and table_name <> 'geography_columns' and table_name <> 'layer_styles' 
        ORDER BY table_schema, table_name;
    `;
    const result = await pool.query(query);
    // Sonuçları { schema, table_name } şeklinde döndürelim
    return result.rows.map(row => ({
        schema: row.table_schema,
        table_name: row.table_name
    }));
}


async function getTablesWithDiskUsage() {
    const query = `
      SELECT 
        table_schema, 
        table_name,
        pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name)) AS size_bytes,
        pg_size_pretty(pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name))) AS disk_usage
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        AND table_name <> 'logs' and table_name <> 'spatial_ref_sys' and table_name <> 'geometry_columns' 
        and table_name <> 'geography_columns' and table_name <> 'layer_styles' 
      ORDER BY size_bytes DESC
    `;
    const result = await pool.query(query);
    return result.rows.map(row => ({
      schema: row.table_schema,
      table_name: row.table_name,
      size_bytes: parseInt(row.size_bytes, 10),
      disk_usage: row.disk_usage
    }));
  }
  

// 📌 `users` tablosundaki kullanıcıları getir
async function getUsers() {
    const client = await connectDB();
    try {
        const res = await client.query("SELECT username, role FROM users");
        return res.rows;
    } catch (err) {
        return { error: err.message };
    } finally {
        await client.end();
    }
}


// 📌 Dashboard için veritabanı bilgilerini getir
async function getDatabaseInfo() {
    const client = await connectDB();
    try {
        const activeConnectionsResult = await client.query("SELECT count(*) FROM pg_stat_activity");
        const dbVersionResult = await client.query("SELECT version()");

        return {
            activeConnections: activeConnectionsResult.rows[0].count,
            dbVersion: dbVersionResult.rows[0].version
        };
    } catch (err) {
        return { error: err.message };
    } finally {
        await client.end();
    }
}



async function runQuery(query) {
    const client = await connectDB();
    try {
        const res = await client.query(query);
        return { success: true, data: res.rows };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}


// Kolon bilgilerini çekme fonksiyonu

async function getTableColumns(fulltableName) {
    const query = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1;
    `;

    try {
        const result = await pool.query(query, [fulltableName.toLowerCase()]);

        return result.rows.map(col => ({
            column_name: col.column_name,
            data_type: col.data_type === 'USER-DEFINED' ? 'geometry' : col.data_type
        }));

    } catch (error) {
        return [];
    }
}


// 📌 Kullanıcıları Getir
async function getUsers() {
    try {
        const res = await pool.query("SELECT id, username, password, role FROM users;");
        return res.rows;
    } catch (error) {
        console.error("🚨 Kullanıcıları getirirken hata:", error);
        return [];
    }
}



// 📌 Yeni Kullanıcı Ekleme Fonksiyonu
async function addUser(userData) {
    const { username, password, role } = userData;

    try {
        // Şifreyi bcrypt ile hashle
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Kullanıcıyı veritabanına ekle
        const query = `
            INSERT INTO users (username, password, role)
            VALUES ($1, $2, $3) RETURNING id
        `;
        const values = [username, hashedPassword, role];

        const result = await pool.query(query, values);
        return result.rows[0]; // Yeni eklenen kullanıcının ID'sini döndür
    } catch (error) {
        console.error("🚨 Kullanıcı ekleme hatası:", error);
        throw error;
    }
}



// 📌 Kullanıcı Güncelle
async function editUser(userId, newUserData) {
    const { username, role } = newUserData;
    try {
        await pool.query(
            "UPDATE users SET username=$1,password=$2, role=$3, WHERE id=$4",
            [username, password, role, userId]
        );
        return { success: true };
    } catch (error) {
        console.error("🚨 Kullanıcı düzenleme hatası:", error);
        return { success: false, error: error.message };
    }
}

// 📌 Kullanıcı Sil
async function deleteUser(userId) {
    const query = "DELETE FROM users WHERE id = $1"; // ID'ye göre kullanıcıyı sil
    await pool.query(query, [userId]);
}



module.exports = { getDatabaseInfo, getTables, getTablesWithDiskUsage, getUsers, runQuery, getTableColumns, addUser, editUser, deleteUser};

