const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('electron', {
    //Kullanıcı giriş işlemi
    login: (username, password) => ipcRenderer.invoke('login', username, password),
    
    // Veritabanı işlemleri
    getTables: () => ipcRenderer.invoke('getTables'),
    getTablesWithDiskUsage: () => ipcRenderer.invoke('getTablesWithDiskUsage'),
    getUsers: () => ipcRenderer.invoke('getUsers'),
    getDatabaseInfo: () => ipcRenderer.invoke('getDatabaseInfo'),
    getRamUsage: () => ipcRenderer.invoke("getRamUsage"),
    getDiskUsage: () => ipcRenderer.invoke('getDiskUsage'),
    runQuery: (query) => ipcRenderer.invoke('runQuery', query),
    getTableColumns: (tableName) => ipcRenderer.invoke("getTableColumns", tableName),
    logSQL: (query, username) => ipcRenderer.invoke('logSQL', query, username),
    getLogs: () => ipcRenderer.invoke('getLogs'),
    getDatabaseLogs: () => ipcRenderer.invoke('getDatabaseLogs'),
    
    //Kullanıcı işlemleri
    addUser: (userData) => ipcRenderer.invoke("addUser", userData),
    editUser: (userId, newUserData) => ipcRenderer.invoke("editUser", userId, newUserData),
    deleteUser: (userId) => ipcRenderer.invoke("deleteUser", userId),
    openGpkgDialog: () => ipcRenderer.invoke('openGpkgDialog'),
    inspectGpkgTables: (filePath) => ipcRenderer.invoke('inspectGpkgTables', filePath),
    ogrImportNewTable: (args) => ipcRenderer.invoke('ogrImportNewTable', args),
    


    // Sayfa yönlendirme işlemleri
    goToDashboard: () => ipcRenderer.send('go-to-dashboard'),
    goToUsers: () => ipcRenderer.send("go-to-users"),
    goToSQL: () => ipcRenderer.send('go-to-sql'),
    goToImport: () => ipcRenderer.send('go-to-import'),

    //Çıkış işlemi
    logout: () => ipcRenderer.send('logout'),
});
