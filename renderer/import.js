async function openGpkgFileDialog() {
  // Kullanıcıdan dosya seçimi için dialog açılıyor
  const filePath = await window.electron.openGpkgDialog();
  if (!filePath) {
    console.log("Kullanıcı dosya seçimini iptal etti.");
    return;
  }
  console.log("Seçilen dosya yolu:", filePath);

  try {
    // GeoPackage dosyasındaki katmanları alıyoruz
    const layers = await window.electron.inspectGpkgTables(filePath);
    if (layers.length === 0) {
      console.log("GeoPackage içinde katman bulunamadı.");
      return;
    }
    console.log("Bulunan katmanlar:", layers);

    // HTML'de katmanları listelemek için bir alan varsa, dolduralım
    const layersDiv = document.getElementById('gpkgLayers');
    if (layersDiv) {
      layersDiv.innerHTML = ''; // Önceki listeyi temizle
      layers.forEach(layer => {
        const div = document.createElement('div');
        div.className = 'form-check';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = layer;
        input.className = 'form-check-input';

        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.innerText = layer;

        div.appendChild(input);
        div.appendChild(label);
        layersDiv.appendChild(div);
      });
    }
  } catch (err) {
    console.error("Katmanları yüklerken hata oluştu:", err.message);
  }
}




async function loadGpkgLayers() {
  const fileInput = document.getElementById('gpkgFile');
  const layersDiv = document.getElementById('gpkgLayers');
  const status = document.getElementById('statusMessage');

  layersDiv.innerHTML = '';
  status.innerHTML = '';
  document.getElementById('importBtn').disabled = true;

  const file = fileInput.files[0];
  if (!file) {
    status.innerText = "Lütfen GeoPackage dosyası seçiniz!";
    status.style.color = "red";
    return;
  }

  status.innerText = "Katmanlar yükleniyor...";
  status.style.color = "#0d6efd";

  try {
    const layers = await window.electron.inspectGpkgTables(file.path);

    if (layers.length === 0) {
      throw new Error("GeoPackage içinde katman bulunamadı.");
    }

    layers.forEach(layer => {
      const div = document.createElement('div');
      div.className = 'form-check';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = layer;
      input.className = 'form-check-input';

      const label = document.createElement('label');
      label.className = 'form-check-label';
      label.innerText = layer;

      div.appendChild(input);
      div.appendChild(label);
      layersDiv.appendChild(div);
    });

    document.getElementById('importBtn').disabled = false;
    status.innerText = "Katmanlar başarıyla listelendi.";
    status.style.color = "green";
  } catch (err) {
    status.innerText = "Hata: " + err.message;
    status.style.color = "red";
  }
}


async function importGpkg() {
  const fileInput = document.getElementById('gpkgFile');
  const selectedLayers = [...document.querySelectorAll('#gpkgLayers input:checked')];
  const status = document.getElementById('statusMessage');

  if (!fileInput.files[0] || selectedLayers.length === 0) {
    status.innerText = "Lütfen en az bir katman seçiniz!";
    status.style.color = "red";
    return;
  }

  status.innerText = "İçe aktarma işlemi başladı...";
  status.style.color = "#0d6efd";

  const results = [];

  for (let layerInput of selectedLayers) {
    const layerName = layerInput.value;
    const result = await window.electron.ogrImportNewTable({
      filePath: fileInput.files[0].path,
      gpkgLayer: layerName,
      targetEPSG: 5255
    });
    results.push({ layerName, result });
  }

  const errors = results.filter(r => !r.result.success);
  if (errors.length > 0) {
    status.innerHTML = errors.map(e => `Hata (${e.layerName}): ${e.result.error}`).join('<br>');
    status.style.color = "red";
  } else {
    status.innerText = "Tüm katmanlar başarıyla içe aktarıldı!";
    status.style.color = "green";
  }
}

function goToDashboard() { window.electron.goToDashboard(); }
function goToUsers() { window.electron.goToUsers(); }
function goToSQL() { window.electron.goToSQL(); }
function goToImport() { window.electron.goToImport(); }
function logout() { window.electron.logout(); }
function goToLogs() {window.location.href = "logs.html";}
function goToLayers() {window.location.href = "layer.html";}