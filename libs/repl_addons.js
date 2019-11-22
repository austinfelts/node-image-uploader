module.exports = {
  commands: [
    {
      name: 'copy',
      func: (fileName, outDir = './images/incoming') => {
        var fs = require('fs')
        fileName = './images/samples/1487019.jpg' // default image

        console.log(`copying ${outDir}...\n`)
        return fs.copyFileSync(fileName, `${outDir}/1487019.jpg`)
      }
    },
    ...['stop', 'quit', 'close', 'exit'].map(x => { // spread operator coming in clutch here
      return {
        name: x,
        func: () => process.exit(0)
      }
    })
  ],
  events: []
}
