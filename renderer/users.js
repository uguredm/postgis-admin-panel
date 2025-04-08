document.addEventListener("DOMContentLoaded", async function () {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    await loadUsers();
});

// 📌 Kullanıcıları Yükleme Fonksiyonu
async function loadUsers() {
    try {
        const users = await window.electron.getUsers(); // PostgreSQL'den kullanıcıları al
        const userTableBody = document.getElementById("userTableBody");

        userTableBody.innerHTML = ""; // Önceki listeyi temizle

        users.forEach(user => {
            const tr = document.createElement("tr");

            // Satır oluşturulurken kullanıcı bilgilerini data attribute’larına ekleyin
            tr.id = `userRow-${user.id}`;
            tr.dataset.username = user.username;
            tr.dataset.role = user.role;

            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.password}</td>
                <td>${user.role}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editUser(${user.id})">Düzenle</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">Sil</button>
                </td>
            `;

            userTableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Kullanıcıları yüklerken hata oluştu:", error);
    }
}


function addUser() {
    // Bootstrap Modal'ı aç
    let addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
    addUserModal.show();
}

// Kullanıcı Kaydetme Fonksiyonu (Modal'dan Gelen Verileri Kullanır)
async function submitNewUser() {
    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;
    const role = document.getElementById("newRole").value;

    if (!username || !password) {
        alert("Kullanıcı adı ve şifre gereklidir!");
        return;
    }

    try {
        const response = await window.electron.addUser({ username, password, role });

        if (response.success) {
            alert("Kullanıcı başarıyla eklendi!");
            location.reload(); // Sayfayı yenileyerek tabloyu güncelle
        } else {
            alert("Kullanıcı eklenirken hata oluştu: " + response.error);
        }
    } catch (error) {
        alert("Sunucu hatası!");
    }
}

// 📌 Kullanıcı Düzenleme
// Kullanıcı Düzenleme: Seçilen kullanıcının bilgilerini modal’a aktarma
function editUser(userId) {
    // Tıklanan kullanıcının satırını seçin
    const row = document.querySelector(`#userRow-${userId}`);
    if (!row) return;

    // Data attribute’larından kullanıcı bilgilerini alın
    const username = row.dataset.username;
    const role = row.dataset.role;

    // Modal inputlarına mevcut bilgileri aktarın
    document.getElementById("editUserId").value = userId;
    document.getElementById("editUsername").value = username;
    document.getElementById("editPassword").value = ""; // Şifre alanı boş bırakılır, çünkü hash'lenmiş şifreyi gösteremeyiz
    document.getElementById("editRole").value = role;

    // Modalı açın
    let editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    editUserModal.show();
}


// Düzenlenmiş kullanıcı verilerini gönderme
async function submitEditUser() {
    const userId = document.getElementById("editUserId").value;
    const username = document.getElementById("editUsername").value;
    const password = document.getElementById("editPassword").value;
    const role = document.getElementById("editRole").value;

    if (!username) {
        alert("Kullanıcı adı boş olamaz!");
        return;
    }

    const newUserData = { username, password, role };

    try {
        const response = await window.electron.editUser(userId, newUserData);
        if (response.success) {
            alert("Kullanıcı başarıyla güncellendi!");
            location.reload(); // Listeyi güncellemek için sayfayı yenileyin
        } else {
            alert("Güncellenirken hata oluştu: " + response.error);
        }
    } catch (error) {
        alert("Sunucu hatası: " + error.message);
    }
}



// 📌 Kullanıcı Silme
async function deleteUser(userId) {
    const confirmDelete = confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?");
    if (!confirmDelete) return;

    try {
        await window.electron.deleteUser(userId); // Electron API üzerinden çağır
        loadUsers(); // Kullanıcı listesini güncelle
    } catch (error) {
        console.error("Kullanıcı silinirken hata oluştu:", error);
    }
}


// 📌 Sayfa Yönlendirmeleri
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