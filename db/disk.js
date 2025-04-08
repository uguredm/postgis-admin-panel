const { Client } = require('ssh2');
const config = require('../config');  // SSH konfigürasyon dosyan

async function getDiskUsage() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      // Tüm bölümleri listelemek için "df -h" komutunu kullanıyoruz:
      conn.exec('df -h', (err, stream) => {
        if (err) return reject(err);

        let output = "";
        stream.on('data', (data) => {
          output += data.toString();
        });

        stream.on('close', () => {
          // "df -h" örnek çıktısı:
          // Filesystem      Size  Used Avail Use% Mounted on
          // /dev/sda1       10G   9.8G  200M  98%  /
          // /dev/sda2       90G   50G   40G   55%  /home
          // tmpfs           2G    0    2G    0%   /run/user/1000
          // ...
          const lines = output.split("\n").filter(line => line.trim() !== "");
          
          // İlk satır başlık, en az 2 satır bekliyoruz:
          if (lines.length <= 1) {
            conn.end();
            return reject(new Error("Disk bilgisi alınamadı."));
          }

          const results = [];
          // 0. satır -> "Filesystem  Size  Used  Avail  Use%  Mounted on"
          // 1. satırdan itibaren disk bölümleri var
          for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(/\s+/);
            // Normalde 6 sütun: [0]=Filesystem, [1]=Size, [2]=Used, [3]=Avail, [4]=Use%, [5]=Mounted
            if (parts.length >= 6) {
              results.push({
                filesystem: parts[0],
                size: parts[1],
                used: parts[2],
                avail: parts[3],
                usePercent: parts[4],
                mountedOn: parts[5]
              });
            }
          }
          
          conn.end();
          resolve(results); // Tüm bölümleri dizi olarak döndürüyoruz
        });
      });
    })
    .on('error', err => reject(err))
    .connect(config.ssh);
  });
}

module.exports = { getDiskUsage };
