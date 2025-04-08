const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { getDatabaseInfo,  getTables, getUsers, runQuery, getTableColumns } = require('./db/db_info');
const { loginUser, pool } = require("./db/db");
const db = require("./db/db_info");
const bcrypt = require("bcrypt");
const { Client } = require("ssh2");
const config = require("./config"); 
const { exec } = require('child_process');
const { getDiskUsage } = require('./db/disk'); // disk.js'in yolu
const logger = require("./db/logger");


let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 300,  // Küçük giriş ekranı
        height: 300,
        resizable: false, // Giriş ekranı değiştirilemez
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile('renderer/index.html');
});

// Kullanıcı Girişi (Login)
ipcMain.handle("login", async (event, username, password) => {
    try {
        const response = await loginUser(username, password);

        if (!response.success) {
            return response;
        }

        mainWindow.setResizable(true);
        mainWindow.setSize(1280, 720);
        mainWindow.center();
        mainWindow.loadFile("renderer/home.html");

        return { success: true, user: response.user };
    } catch (error) {
        return { success: false, error: "Sunucu hatası: " + error.message };
    }
});

ipcMain.handle("getTableColumns", async (_, tableName) => {
    return await getTableColumns(tableName);
});

ipcMain.handle('getTablesWithDiskUsage', async (event) => {
  try {
    const tables = await db.getTablesWithDiskUsage();
    return tables; // front-end'e dönecek sonuç
  } catch (error) {
    console.error("getTablesWithDiskUsage hata:", error);
    throw error; // front-end tarafında yakalanabilir
  }
});

// RAM kullanımını getir
ipcMain.handle("getRamUsage", async () => {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        conn.on("ready", () => {

            // Linux sistemlerde RAM bilgisi almak için `free -m`
            conn.exec("free -m", (err, stream) => {
                if (err) reject(err);

                stream.on("data", (data) => {
                    const output = data.toString();
                    const lines = output.split("\n");
                    const memInfo = lines[1].split(/\s+/);

                    const totalMemory = parseInt(memInfo[1], 10); // Toplam RAM
                    const usedMemory = parseInt(memInfo[2], 10);  // Kullanılan RAM

                    resolve({ totalMemory, usedMemory });
                });

                stream.on("close", () => conn.end());
            });
        }).connect(config.ssh);
    });
});
//disk kullanımını getir
ipcMain.handle('getDiskUsage', async () => {
  try {
    const disks = await getDiskUsage();
    return disks;  // Bu artık bir dizi (array) döndürüyor
  } catch (error) {
    return { error: error.message };
  }
});

// Çıkış işlemi (logout) sonrası ekranı küçült
ipcMain.on('logout', () => {
    mainWindow.setResizable(false); // Yeniden küçük hale getiriyoruz
    mainWindow.setSize(300, 300);
    mainWindow.center();
    mainWindow.loadFile('renderer/index.html'); // Tekrar giriş ekranına yönlendir
});

// Dashboard Sayfasına Git
ipcMain.on('go-to-dashboard', () => {
    mainWindow.loadFile('renderer/home.html');
});

// SQL Sayfasına Git
ipcMain.on('go-to-sql', () => {
    mainWindow.loadFile('renderer/sql.html');
});

// Veritabanındaki tabloları getir
ipcMain.handle('getTables', async () => {
    return await getTables();
});

// `users` tablosundaki kullanıcıları getir
ipcMain.handle('getUsers', async () => {
    return await getUsers();
});

// SQL Sorgusu Çalıştır
ipcMain.handle('runQuery', async (_, query) => {
    return await runQuery(query);
});

// Veritabanı bilgilerini getir
ipcMain.handle('getDatabaseInfo', async () => {
    return await getDatabaseInfo();
});

// Kullanıcı Sayfasına Git
ipcMain.on("go-to-users", () => {
    mainWindow.loadFile("renderer/users.html");
});


ipcMain.on("go-to-import", () => {
    mainWindow.loadFile("renderer/import.html");
  });
  
//kullanucı ekleme
ipcMain.handle("addUser", async (event, userData) => {
    try {
        const hashedPassword = await bcrypt.hash(userData.password, 10); // Şifreyi hashle
        const query = "INSERT INTO users (username, password, role) VALUES ($1, $2, $3)";
        await pool.query(query, [userData.username, hashedPassword, userData.role]);

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});


// Kullanıcı silme fonksiyonu
ipcMain.handle("deleteUser", async (event, userId) => {
    try {
        await db.deleteUser(userId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});



  async function editUser(userId, newUserData) {
    try {
        let query;
        let values;
        // Şifre alanı dolu ise şifreyi hashleyip güncelleyin, boşsa sadece diğer alanları güncelleyin
        if (newUserData.password && newUserData.password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(newUserData.password, 10);
            query = "UPDATE users SET username = $1, password = $2, role = $3 WHERE id = $4";
            values = [newUserData.username, hashedPassword, newUserData.role, userId];
        } else {
            query = "UPDATE users SET username = $1, role = $2, WHERE id = $3";
            values = [newUserData.username, newUserData.role, userId];
        }
        await pool.query(query, values);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

ipcMain.handle("editUser", async (_, userId, newUserData) => {
    return await editUser(userId, newUserData);
});



ipcMain.handle('logSQL', async (event, query, username) => {
    // SQL sorgusunu loglayın
    logger.info(`${query}`, { username });
    return true;
  });


ipcMain.handle('getLogs', async (event) => {
  try {
    const result = await pool.query("SELECT log_date, level, message, username FROM logs ORDER BY log_date DESC");
    return { success: true, data: result.rows };
  } catch (error) {
    console.error("Loglar getirilirken hata:", error);
    return { success: false, error: error.message };
  }
});



ipcMain.handle('getDatabaseLogs', async (event) => {
  const sshConfig = {
    host: config.ssh.host,
    port: config.ssh.port,
    username: config.ssh.username,
    password: config.ssh.password
  };

  return new Promise((resolve) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec('tail -n 1000 /var/log/postgresql/postgresql-16-main.log', (err, stream) => {
        if (err) {
          conn.end();
          return resolve({ success: false, error: err.message });
        }
        let data = '';
        stream.on('close', () => {
          conn.end();
          resolve({ success: true, data });
        }).on('data', (chunk) => {
          data += chunk;
        }).stderr.on('data', (errChunk) => {
          console.error('SSH stderr:', errChunk.toString());
        });
      });
    }).on('error', (err) => {
      resolve({ success: false, error: err.message });
    }).connect(sshConfig);
  });
});




ipcMain.handle('openGpkgDialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Bir GeoPackage dosyası seçin",
      filters: [{ name: 'GeoPackage', extensions: ['gpkg'] }],
      properties: ['openFile']
    });
    if (canceled || filePaths.length === 0) {
      return null; // Kullanıcı iptal etti
    }
    return filePaths[0]; // Seçilen dosyanın tam yolu
  });
  

ipcMain.handle('inspectGpkgTables', async (_, filePath) => {
    const { execSync } = require('child_process');
    try {
      // encoding: 'utf8' => Buffer yerine string döner
      const output = execSync(`ogrinfo -so "${filePath}"`, { encoding: 'utf8' });
      console.log("ogrinfo çıktısı:", output);
      // Burada regex veya başka bir mantıkla katman isimlerini yakalayın
      const lines = output.split('\n');
      // ...
      return [];
    } catch (error) {
      console.error("ogrinfo hata:", error);
      // Hata durumunda da error.stderr vb. kontrol edebilirsiniz
      return [];
    }
  });
  
  

ipcMain.handle('ogrImportNewTable', async (_, { filePath, gpkgLayer, targetEPSG }) => {
  const { execSync } = require('child_process');
  try {
    const cmd = `ogr2ogr -f "PostgreSQL" PG:"host=${config.db.host} user=${config.db.user} dbname=${config.db.database} password=${config.db.password}" -nln ${gpkgLayer} -t_srs EPSG:${targetEPSG} ${filePath} "${gpkgLayer}" -overwrite`;
    execSync(cmd);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});







