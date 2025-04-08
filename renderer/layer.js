// Tablo listesi yüklenir
window.addEventListener("DOMContentLoaded", loadTables);

async function loadTables() {
  const result = await window.electron.getTables();
  const tableList = document.getElementById("tableList");
  tableList.innerHTML = "";

  // Şemalara göre grupla
  const grouped = {};
  result.forEach(table => {
    if (!grouped[table.schema]) grouped[table.schema] = [];
    grouped[table.schema].push(table.table_name);
  });

  for (const schema in grouped) {
    const label = document.createElement("div");
    label.textContent = schema;
    label.style.fontWeight = "bold";
    label.style.marginTop = "10px";
    tableList.appendChild(label);

    grouped[schema].forEach(tableName => {
      const btn = document.createElement("button");
      btn.textContent = tableName;
      btn.onclick = () => selectTable(tableName);
      tableList.appendChild(btn);
    });
  }
}

async function selectTable(fullName) {
  document.getElementById("selectedTableTitle").textContent = fullName;
  const container = document.getElementById("columnsContainer");
  container.innerHTML = "Yükleniyor...";

  try {
    const columns = await window.electron.getTableColumns(fullName);
    container.innerHTML = "";

    if (!columns || columns.length === 0) {
      container.innerHTML = "<p style='color: gray;'>Sütun bulunamadı.</p>";
      return;
    }

    const username = localStorage.getItem("username") || "Bilinmiyor";

    columns.forEach(col => {
      const row = document.createElement("div");
      row.className = "column-item";

      const nameInput = document.createElement("input");
      nameInput.className = "form-control";
      nameInput.value = col.column_name;

      const typeSelect = document.createElement("select");
      typeSelect.className = "form-select";
      ["integer", "text", "boolean", "date", "bigint", "numeric", "real", "double precision", "varchar", "char", "timestamp", "uuid", "jsonb", "geometry"].forEach(type => {
        const opt = document.createElement("option");
        opt.value = type;
        opt.textContent = type;
        if (col.data_type === type) opt.selected = true;
        typeSelect.appendChild(opt);
      });

      const updateBtn = document.createElement("button");
      updateBtn.className = "btn btn-warning btn-sm";
      updateBtn.textContent = "Güncelle";
      updateBtn.onclick = async () => {
        const newName = nameInput.value.trim();
        const newType = typeSelect.value;
        if (!newName) return;

        if (newName !== col.column_name) {
          const renameQuery = `ALTER TABLE ${fullName} RENAME COLUMN ${col.column_name} TO ${newName};`;
          await window.electron.runQuery(renameQuery);
          await window.electron.logSQL(`${fullName} tablosunun '${col.column_name}' sütunu '${newName}' olarak yeniden adlandırıldı.`, username);
        }

        if (newType !== col.data_type) {
          const typeQuery = `ALTER TABLE ${fullName} ALTER COLUMN ${newName} TYPE ${newType};`;
          await window.electron.runQuery(typeQuery);
          await window.electron.logSQL(`${fullName} tablosunun '${newName}' sütunu ${col.data_type} → ${newType} olarak güncellendi.`, username);
        }

        alert("Sütun bilgileri güncellendi");
        selectTable(fullName);
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-danger btn-sm";
      deleteBtn.innerHTML = "<i class='fa fa-trash'></i>";
      deleteBtn.onclick = async () => {
        if (!confirm(`Sütun '${col.column_name}' silinsin mi?`)) return;
        await window.electron.runQuery(`ALTER TABLE ${fullName} DROP COLUMN ${col.column_name};`);
        await window.electron.logSQL(`${fullName} tablosunda '${col.column_name}' sütunu silindi.`, username);
        alert("Sütun silindi");
        selectTable(fullName);
      };

      row.appendChild(nameInput);
      row.appendChild(typeSelect);
      row.appendChild(updateBtn);
      row.appendChild(deleteBtn);
      container.appendChild(row);
    });

    const deleteTableBtn = document.createElement("button");
    deleteTableBtn.className = "btn btn-danger mt-4";
    deleteTableBtn.textContent = "Bu tabloyu sil";
    deleteTableBtn.onclick = async () => {
      if (!confirm(`${fullName} tablosunu silmek istediğinden emin misin?`)) return;
      await window.electron.runQuery(`DROP TABLE ${fullName};`);
      await window.electron.logSQL(`${fullName} tablosu silindi.`, username);
      alert("Tablo silindi");
      loadTables();
      document.getElementById("selectedTableTitle").textContent = "Bir tablo seçin...";
      container.innerHTML = "";
    };
    container.appendChild(deleteTableBtn);

    // Yeni Sütun Ekleme Formu
    const addWrapper = document.createElement("div");
    addWrapper.className = "mt-4";
    addWrapper.innerHTML = `
      <h5>Yeni Sütun Ekle</h5>
      <div class="d-flex gap-2 mb-3">
        <input id="newColumnName" class="form-control" placeholder="Sütun Adı">
        <select id="newColumnType" class="form-select">
          <option value="integer">Integer</option>
          <option value="text">Text</option>
          <option value="boolean">Boolean</option>
          <option value="date">Date</option>
          <option value="bigint">BigInt</option>
          <option value="numeric">Numeric</option>
          <option value="real">Real</option>
          <option value="double precision">Double Precision</option>
          <option value="varchar">Varchar</option>
          <option value="char">Char</option>
          <option value="timestamp">Timestamp</option>
          <option value="uuid">UUID</option>
          <option value="jsonb">JSONB</option>
          <option value="geometry">Geometry</option>
        </select>
        <button class="btn btn-success" onclick="addColumnToTable()">Ekle</button>
      </div>
    `;
    container.appendChild(addWrapper);

  } catch (err) {
    console.error("Sütunlar yüklenemedi:", err);
    container.innerHTML = "<p style='color: red;'>Sütunlar yüklenirken hata oluştu.</p>";
  }
}

function openCreateTableModal() {
  document.activeElement.blur(); // ✅ Aktif focus'u kaldır
  const modal = new bootstrap.Modal(document.getElementById("createTableModal"));
  document.getElementById("newTableName").value = "";
  document.getElementById("newTableColumns").innerHTML = "";
  document.getElementById("addGeometry").checked = false;
  addNewTableColumn();
  modal.show();
}


function addNewTableColumn() {
  const container = document.getElementById("newTableColumns");
  const div = document.createElement("div");
  div.className = "column-item";
  div.innerHTML = `
    <input type="text" class="form-control col-name" placeholder="Sütun Adı">
    <select class="form-select col-type">
      <option value="integer">Integer</option>
      <option value="text">Text</option>
      <option value="boolean">Boolean</option>
      <option value="date">Date</option>
      <option value="bigint">BigInt</option>
      <option value="numeric">Numeric</option>
      <option value="real">Real</option>
      <option value="double precision">Double Precision</option>
      <option value="varchar">Varchar</option>
      <option value="char">Char</option>
      <option value="timestamp">Timestamp</option>
      <option value="uuid">UUID</option>
      <option value="jsonb">JSONB</option>
      <option value="geometry">Geometry</option>
    </select>
    <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">
      <i class="fa fa-trash"></i>
    </button>`;
  container.appendChild(div);
}

async function createTable() {
  const name = document.getElementById("newTableName").value.trim();
  const geometry = document.getElementById("addGeometry").checked;
  const colNames = document.querySelectorAll(".col-name");
  const colTypes = document.querySelectorAll(".col-type");
  const username = localStorage.getItem("username") || "Bilinmiyor";

  if (!name) return alert("Tablo adı giriniz.");

  const cols = ["id SERIAL PRIMARY KEY"];
  for (let i = 0; i < colNames.length; i++) {
    const colName = colNames[i].value.trim();
    const colType = colTypes[i].value;
    if (!colName) return alert("Sütun adları boş bırakılamaz.");
    cols.push(`${colName} ${colType}`);
  }
  if (geometry) {
    cols.push("the_geom geometry(Geometry,5254)");
  }
  const query = `CREATE TABLE ${name} (${cols.join(", ")});`;
  const result = await window.electron.runQuery(query);
  if (result.success) {
    await window.electron.logSQL(`${name} tablosu oluşturuldu.`, username);
    bootstrap.Modal.getInstance(document.getElementById("createTableModal")).hide();
    loadTables();
  } else {
    alert("Hata: " + result.error);
  }
}


async function addColumnToTable() {
  const colName = document.getElementById("newColumnName").value.trim();
  const colType = document.getElementById("newColumnType").value;
  const fullName = document.getElementById("selectedTableTitle").textContent;
  const username = localStorage.getItem("username") || "Bilinmiyor";

  if (!colName) return alert("Sütun adı giriniz.");

  const query = `ALTER TABLE ${fullName} ADD COLUMN ${colName} ${colType};`;
  const result = await window.electron.runQuery(query);

  if (result.success) {
    await window.electron.logSQL(`${fullName} tablosuna yeni sütun eklendi: ${colName} ${colType}`, username);
    alert("Sütun eklendi.");
    selectTable(fullName); // tabloyu yeniden yükle
  } else {
    alert("Hata: " + result.error);
  }
}


function goToDashboard() { window.electron.goToDashboard(); }
function goToUsers() { window.electron.goToUsers(); }
function goToSQL() { window.electron.goToSQL(); }
function goToImport() { window.electron.goToImport(); }
function goToLogs() { window.location.href = "logs.html"; }
function logout() { window.electron.logout(); }
