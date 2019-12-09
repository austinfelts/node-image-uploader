module.exports = {
  commands: [
    {
      name: 'testcopy',
      func: () => {
        // '.testcopy' command: used to pull a specified (or default) img down
        // and place into incoming folder for testing
        const request = require('request')
        const fs = require('fs')
        const cdnStr =
          'https://52f4e29a8321344e30ae-0f55c9129972ac85d6b1f4e703468e6b.ssl.cf2.rackcdn.com/'

        var url = global.copyUrl || `${cdnStr}products/pictures/1599071.jpg`
        let filename
        if (url.match(/\//g)) {
          var chunks = url.split(/\//g)
          chunks.splice(0, chunks.length - 1)

          filename = chunks.join('')
        } else {
          filename = url
        }

        request(url)
          .on('error', err => {
            console.error('Request Failed!\n', err)
          })
          .on('response', res => {
            console.warn('Fetched file ' + filename)
            global.res = res
          })
          .pipe(fs.createWriteStream('./images/incoming/' + filename))
      }
    },
    ...['stop', 'quit', 'close', 'exit'].map(x => {
      // spread operator coming in clutch here
      return {
        name: x,
        func: () => process.safeExit()
      }
    })
  ]
}
