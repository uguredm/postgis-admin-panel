you need npm install after install


and create 
config.js

and write this

module.exports = {
    db: {
        user: 'youruser',
        host: 'yourip',  
        database: 'yourdb',
        password: 'yourpassword',
        port: 5432
    },

    ssh: {
        host: 'yourip',  
        port: 22,              
        username: 'youruser',      
        password: 'yourpassword' //daha sonra SSH anahtarı ile değiştirilecek
    }
};
