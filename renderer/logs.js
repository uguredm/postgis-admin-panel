document.addEventListener("DOMContentLoaded", async function () {
  await loadLogs();
});

async function loadLogs() {
try {
  const response = await window.electron.getLogs();
  const logsTableBody = document.getElementById("logsTableBody");
  const sqlLogsSection = document.getElementById("sqlLogsSection");
  const dbLogsSection = document.getElementById("dbLogsSection");
  
  // SQL logları bölümünü göster, veritabanı logları bölümünü gizle.
  sqlLogsSection.style.display = "block";
  dbLogsSection.style.display = "none";

  logsTableBody.innerHTML = "";
  
  if (response.success && response.data && response.data.length > 0) {
    response.data.forEach(log => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${new Date(log.log_date).toLocaleString()}</td>
        <td>${log.level}</td>
        <td>${log.message}</td>
        <td>${log.username || "Bilinmiyor"}</td>
      `;
      logsTableBody.appendChild(tr);
    });
  } else {
    logsTableBody.innerHTML = `<tr><td colspan="5" style="color:red;">Log kaydı bulunamadı veya hata oluştu: ${response.error || ''}</td></tr>`;
  }
} catch (err) {
  console.error("Loglar yüklenirken hata oluştu:", err);
}
}

async function loadDatabaseLogs() {
try {
  const response = await window.electron.getDatabaseLogs();
  const dbLogsContent = document.getElementById("dbLogsContent");
  const dbLogsSection = document.getElementById("dbLogsSection");
  const sqlLogsSection = document.getElementById("sqlLogsSection");

  // SQL logları bölümünü gizle, veritabanı logları bölümünü göster.
  sqlLogsSection.style.display = "none";
  dbLogsSection.style.display = "block";

  if (response.success && response.data) {
    dbLogsContent.textContent = response.data;
  } else {
    dbLogsContent.textContent = "Veritabanı logları alınamadı: " + (response.error || '');
  }
} catch (err) {
  console.error("Veritabanı logları yüklenirken hata oluştu:", err);
}
}




// Navigasyon fonksiyonları (sidebar'daki butonlar için)
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
