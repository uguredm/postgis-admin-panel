document.addEventListener("DOMContentLoaded", async () => {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    if (!username || !role) {
        window.location.href = 'index.html';
        return;
    }

    // Kullanıcı adını ve rolünü göster
    document.getElementById('username').innerText = username;
    document.getElementById('role').innerText = role;


    try {
        //Dashboard verilerini yükle
        const dbInfo = await window.electron.getDatabaseInfo();
        document.getElementById('tableCount').innerText = dbInfo.tableCount;
        document.getElementById('activeConnections').innerText = dbInfo.activeConnections;
        document.getElementById('dbVersion').innerText = dbInfo.dbVersion;

        //Veritabanındaki tablolar
        const tables = await window.electron.getTablesWithDiskUsage();
        document.getElementById('tablesList').innerHTML = tables
          .map(table => `<li>${table.table_name} - ${table.disk_usage}</li>`)
          .join('');
        
        

        // Kullanıcı tablosunu getir
        const users = await window.electron.getUsers();
        document.getElementById('usersList').innerHTML = users.map(user => `<tr><td>${user.username}</td><td>${user.role}</td></tr>`).join('');

    } catch (error) {
    }
});

// Sayfa Yüklendiğinde RAM Kullanımını Çek
document.addEventListener("DOMContentLoaded", () => {
    async function updateRamUsage() {
        try {
            const ramUsage = await window.electron.getRamUsage();
            document.getElementById("ramUsage").innerText = 
                `RAM Kullanımı: ${ramUsage.usedMemory} MB / ${ramUsage.totalMemory} MB`;
        } catch (error) {
            document.getElementById("ramUsage").innerText = "RAM Bilgisi Alınamadı!";
        }
    }

    // Sayfa ilk yüklendiğinde
    updateRamUsage();

    // Daha sonra düzenli olarak
    setInterval(() => {
        updateRamUsage();
    }, 30000); // 30 saniye
});



// Önce disk boyutlarını GB cinsinden parse eden yardımcı fonksiyon:
function parseSize(str) {
    str = str.trim();
    const unit = str.slice(-1).toUpperCase();
    const value = parseFloat(str);
    if (isNaN(value)) return 0;
    switch(unit) {
      case 'T': // TB'yi GB'ye çevir (1 TB = 1024 GB)
        return value * 1024;
      case 'G': // G zaten GB
        return value;
      case 'M': // MB'yi GB'ye çevir (1 GB = 1024 MB)
        return value / 1024;
      case 'K': // KB'yi GB'ye çevir
        return value / (1024 * 1024);
      default:
        return value; // Unit yoksa varsayalım GB
    }
  }
  
  async function updateTotalDiskUsage() {
    try {
      const disks = await window.electron.getDiskUsage();
      if (!Array.isArray(disks) || disks.length === 0) {
        document.getElementById("diskUsage").innerText = "Disk bilgisi alınamadı!";
        return;
      }
      
      // Toplamları GB cinsinden hesaplayalım
      let totalSize = 0;
      let totalUsed = 0;
      let totalAvail = 0;
      
      disks.forEach(disk => {
        totalSize += parseSize(disk.size);
        totalUsed += parseSize(disk.used);
        totalAvail += parseSize(disk.avail);
      });
      
      const usagePercent = totalSize > 0 ? Math.round((totalUsed / totalSize) * 100) : 0;
      
      // Sonuçları 2 ondalık basamakla gösterelim
      const totalSizeStr = totalSize.toFixed(2);
      const totalUsedStr = totalUsed.toFixed(2);
      
      document.getElementById("diskUsage").innerText = 
        `Disk: ${totalUsedStr} GB / ${totalSizeStr} GB (${usagePercent}%)`;
      document.getElementById("diskUsageBar").style.width = usagePercent + "%";
    } catch (error) {
      document.getElementById("diskUsage").innerText = "Disk bilgisi alınamadı!";
    }
  }
  
  updateTotalDiskUsage();
  setInterval(updateTotalDiskUsage, 30000);
  
  


document.addEventListener("DOMContentLoaded", () => {
    const usernameElement = document.getElementById("username");
    const storedUsername = localStorage.getItem("username");
    const storedRole = localStorage.getItem("role");
    if (storedUsername) {
        usernameElement.innerText = storedUsername;
    } else {
        usernameElement.innerText = "Bilinmeyen Kullanıcı";
    }
});


document.addEventListener("DOMContentLoaded", async () => {
  // Sayfa yüklendiğinde log istatistiklerini çiz
  await loadSQLLogStats();
  setInterval(loadSQLLogStats, 30000); // 30 saniyede bir güncelle
});

// Chart.js örneği (grafiği güncelleyebilmek için global saklıyoruz)
let sqlLogsChartInstance = null;

/**
 * Logları çekip, günlük bazda sayıları line chart olarak çiziyor.
 * Ayrıca toplam log sayısını alt kısma yazıyor.
 */
async function loadSQLLogStats() {
  try {
    const response = await window.electron.getLogs();
    if (!response.success || !response.data) {
      document.getElementById('sqlLogCount').textContent = "Hata!";
      return;
    }

    const logs = response.data;
    const totalCount = logs.length;

    // Toplam log sayısı:
    document.getElementById('sqlLogCount').textContent = `Toplam Log Sayısı: ${totalCount}`;

    // 1) Logları tarih (gün) bazında gruplayalım
    //    Örn. '2025-04-08' => 3 adet
    const dailyCounts = {};
    logs.forEach(log => {
      const dateObj = new Date(log.log_date);
      // YYYY-MM-DD formatına çevirelim
      const dayStr = dateObj.toISOString().substring(0, 10); 
      dailyCounts[dayStr] = (dailyCounts[dayStr] || 0) + 1;
    });

    // 2) Tarihleri sıralayarak Chart.js verisi oluşturalım
    const labels = Object.keys(dailyCounts).sort();  // Örn. ["2025-04-07", "2025-04-08", ...]
    const data = labels.map(day => dailyCounts[day]);

    // 3) Çizgi grafiği oluştur
    const ctx = document.getElementById('sqlLogsChart').getContext('2d');

    if (!sqlLogsChartInstance) {
      // İlk kez oluşturma
      sqlLogsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Günlük Log Sayısı',
            data: data,
            backgroundColor: 'rgba(13,110,253,0.1)', // #0d6efd (hafif saydam)
            borderColor: '#0d6efd',
            borderWidth: 2,
            pointBackgroundColor: '#0d6efd',
            fill: true,         // Altını doldurmak isterseniz
            tension: 0.2        // Eğrisel çizgi
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            },
            x: {
              // Tarih formatı basit string, isterseniz time scale de kullanabilirsiniz
            }
          }
        }
      });
    } else {
      // Daha önce oluşturulmuşsa verileri güncelle
      sqlLogsChartInstance.data.labels = labels;
      sqlLogsChartInstance.data.datasets[0].data = data;
      sqlLogsChartInstance.update();
    }
  } catch (error) {
    console.error("loadSQLLogStats hata:", error);
    document.getElementById('sqlLogCount').textContent = "Hata oluştu!";
  }
}

/**
 * Dişli ikonuna tıklanınca modal açılır,
 * log detaylarını tablo şeklinde gösterir
 */
function openSqlLogsModal() {
  loadSQLLogsInModal();
  const modal = new bootstrap.Modal(document.getElementById('sqlLogsModal'));
  modal.show();
}

/**
 * Modal içindeki tabloya logları basar
 */
async function loadSQLLogsInModal() {
  try {
    const response = await window.electron.getLogs();
    const container = document.getElementById("sqlLogsContent");

    if (!response.success || !response.data) {
      container.innerHTML = `<p style="color:red;">Log kaydı bulunamadı veya hata oluştu!</p>`;
      return;
    }

    const logs = response.data;
    let html = `
      <table class="table table-dark table-striped">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Seviye</th>
            <th>Mesaj</th>
            <th>Kullanıcı</th>
          </tr>
        </thead>
        <tbody>
    `;
    logs.forEach(log => {
      html += `
        <tr>
          <td>${new Date(log.log_date).toLocaleString()}</td>
          <td>${log.level}</td>
          <td>${log.message}</td>
          <td>${log.username || 'Bilinmiyor'}</td>
        </tr>
      `;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (error) {
    console.error("loadSQLLogsInModal hata:", error);
    document.getElementById("sqlLogsContent").innerText = "Loglar yüklenirken hata oluştu!";
  }
}




function scaleContent() {
  const wrapper = document.querySelector('.wrapper');
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  wrapper.style.transform = `scale(${scale})`;
}

// İlk yükleme
window.addEventListener('load', scaleContent);
// Yeniden boyutlandırıldığında ölçekle
window.addEventListener('resize', scaleContent);



// Sayfa yönlendirme fonksiyonları
function goToDashboard() {
    window.electron.goToDashboard();
}

function goToUsers() {
    window.location.href = "users.html";
}

function goToSQL() {
    window.electron.goToSQL();
}

// Çıkış yapma fonksiyonu
function logout() {
    localStorage.clear();
    window.electron.logout();
}

function goToImport() {
    window.electron.goToImport(); 
  }
  
function goToLogs() {
    window.location.href = "logs.html";
}

function goToLayers() {
  window.location.href = "layer.html";
}