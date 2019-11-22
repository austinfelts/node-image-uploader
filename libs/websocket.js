const nodejsWebSocket = require('nodejs-websocket')

module.exports = {
  client: {
    connect: url => {
      nodejsWebSocket.connect(url, conn => {
        return conn
      })
    }
  },

  server: {
    createServer: options => {
      const defaultOptions = {
        secure: true,
        key: process.env.WEBSOCKET_KEY, 
        cert: process.env.WEBSOCKET_CERT
      }

      if (options.useDefault) {
        // Merge passed in options with default options
        Object.assign(options, defaultOptions)
      }

      return nodejsWebSocket
        .createServer(options, conn => {
          console.log('New connection')

          conn.on('error', error => {
            throw new Error(`An error has occured!\n${error}\n`)
          })
          conn.on('text', str => {
            console.log(`Received ${str}`)
          })
          conn.on('close', (code, reason) => {
            console.log(`Connection closed :: ${code}, ${reason}`)
          })
        })
        .listen(options.port || process.env.WEBSOCKET_PORT)
    }
  }
}
