module.exports = {
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
  host: process.env.DEBUGGING ? process.env.DB_HOST_CLEAN : process.env.DB_HOST_LIVE,
  port: process.env.DB_PORT
}
