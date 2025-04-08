

// Sayfa yüklendiğinde sadece loadTables() çalışsın:
document.addEventListener("DOMContentLoaded", async () => {
  await loadTables(); // Şemalara göre tablo listesini üretir
});

// SQL sorgusunu çalıştıran fonksiyon
async function runQuery() {
  const query = document.getElementById("sqlQuery").value.trim();
  const resultsTable = document.getElementById("resultsTable");
  const thead = resultsTable.querySelector("thead");
  const tbody = resultsTable.querySelector("tbody");

  // Eski verileri sıfırla
  thead.innerHTML = '<tr id="tableHeader"></tr>';
  tbody.innerHTML = '';

  if (!query) {
    tbody.innerHTML = `<tr><td colspan="100%" style="color:red">Lütfen sorgu girin!</td></tr>`;
    return;
  }

  // Sorguyu loglamak için ekleme:
  // Kullanıcı adını localStorage'dan alıyoruz (yoksa "Bilinmiyor" yazıyor)
  const username = localStorage.getItem('username') || "Bilinmiyor";
  await window.electron.logSQL(query, username);

  try {
    const response = await window.electron.runQuery(query);
    if (response.success) {
      // Eğer satır yoksa bilgilendirme yap
      if (!response.data || response.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="100%" style="color: green;">Sonuç yok (INSERT/UPDATE/DELETE veya boş tablo).</td></tr>`;
        return;
      }
      // Tablo başlıklarını ekle
      const columns = Object.keys(response.data[0]);
      const headerRow = document.getElementById("tableHeader");
      columns.forEach(col => {
        const th = document.createElement("th");
        th.textContent = col;
        headerRow.appendChild(th);
      });
      // Verileri satır satır ekle
      response.data.forEach(row => {
        const tr = document.createElement("tr");
        columns.forEach(col => {
          const td = document.createElement("td");
          td.textContent = row[col];
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    } else {
      // Postgres sorgu hatası
      tbody.innerHTML = `<tr><td colspan="100%" style="color:red">Hata: ${response.error}</td></tr>`;
    }
  } catch (err) {
    // Sunucu veya bağlantı hatası
    tbody.innerHTML = `<tr><td colspan="100%" style="color:red">Sunucu hatası: ${err.message}</td></tr>`;
  }
}



// Şemalara göre tablo isimlerini yükleyen fonksiyon
async function loadTables() {
  const tables = await window.electron.getTables(); 
  // Örn: [{schema: "public", table_name: "users"}, {schema: "public", table_name: "posts"}, ...]
  
  const groupedTables = {};
  // Şemaya göre grupluyoruz
  tables.forEach(table => {
    if (!groupedTables[table.schema]) {
      groupedTables[table.schema] = [];
    }
    groupedTables[table.schema].push(table.table_name);
  });

  let html = '';
  for (const schema in groupedTables) {
    html += `
      <li>
        <div class="schema-header" onclick="toggleSchema('${schema}')">
          <span class="arrow-icon">
            <i class="fa-solid fa-caret-right open"></i>
          </span>
          ${schema}
        </div>
        <ul class="schema-tables" id="${schema}-tables" style="display: block;">
    `;
    // Şema altındaki tabloları listele
    groupedTables[schema].forEach(tableName => {
      html += `
        <li onclick="selectTable('${schema}', '${tableName}')">${tableName}</li>
      `;
    });
    html += `</ul></li>`;
  }

  document.getElementById('tablesList').innerHTML = html;
}

// Şema başlığının açılıp kapanmasını sağlayan fonksiyon
function toggleSchema(schema) {
  const subList = document.getElementById(`${schema}-tables`);
  const arrowIcon = subList.closest('li').querySelector('.arrow-icon i');
  
  if (subList.style.display === 'block') {
    subList.style.display = 'none';
    arrowIcon.classList.remove('open');
  } else {
    subList.style.display = 'block';
    arrowIcon.classList.add('open');
  }
}

// Bir tabloya tıklayınca otomatik SELECT * sorgusu yazıp sonucu getiren fonksiyon
async function selectTable(schema, tableName) {
  const fullTableName = `${schema}.${tableName}`;
  document.getElementById("sqlQuery").value = `SELECT * FROM ${fullTableName} LIMIT 1000;`;
  await runQuery();
}




// Sayfa yönlendirme butonları
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