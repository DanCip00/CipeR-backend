const Pool = require("pg").Pool;

const pool = new Pool({
    user: "daniele",
    password: "",
    host: "192.168.1.107",
    port: 5432,
    database: "ciper"
});

module.exports= pool;
