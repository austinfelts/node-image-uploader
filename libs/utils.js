module.exports = {
  // Extract Product ID using regexp
  extractProductId: str => {
    return str
      .split(/\W/)
      .map(str => {
        var matches = str.match(/\d{5,7}/g)
        return matches ? matches.join('') : null
      })
      .filter(x => x)
      .join('')
  },

  // This utilizes the "HexObj" class to read the header of a specified File. Returns the corresponding MIME type if found.
  getFileInfo: async (filepath) => {
    const fs = require('fs')
    const path = require('path')
    const HexObj = require(path.resolve('./libs/HexObj'))

    // because we *technically* only really need the first ~12 bytes
    const readFileHeader = async (filepath) => {
      return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(path.resolve(filepath), {
          start: 0, end: 16
        })
        stream.on('data', data => {
          return resolve(data)
        })
        stream.on('error', () => reject(Error('failed to open read stream')))
        stream.on('end', () => stream.destroy())
      })
    }

    const getFileTypeFromHeader = (hexStr) => {
      // baked in for now
      const fileHeaderIds = {
        JPG: '4A 46 49 46', // JFIF
        GIF: '47 49 46', // first three bytes: GIF
        PNG: '50 4E 47' // PNG
      }
      return Object
        .entries(fileHeaderIds)
        .map(x => {
          var [ascii, hex] = x
          return hexStr.match(hex) ? ascii : false
        })
        .filter(x => x)
        .join()
    }

    const imageData = await readFileHeader(filepath)
    const fileDataObj = new HexObj(imageData.asciiSlice())

    return getFileTypeFromHeader(fileDataObj.hex)
  },

  // Useful for printing out objects KV pairs, strings, etc and can be grouped
  printDebug: (data, group) => {
    if (group) {
      if (typeof group === 'string') {
        group = { name: group }
      }

      group.collapsed
        ? console.groupCollapsed(group.name || `<${typeof data}>`)
        : console.group(group.name || `<${typeof data}>`)
    }

    if (typeof (data) === 'string') {
      console.log(data)
    } else {
    // stringify object's key/values
      Object.entries(data)
        .map(e => [e[0], e[1]].join(': '))
        .forEach(str => console.log(str))
    }

    if (group) console.groupEnd()
  },
  // Removes a temporary file and also pulls said filepath from an optional array
  removeTempFile: (filepath, filesArray) => {
    const fs = require('fs')
    if (filepath) {
      setTimeout(() => {
        return fs.unlink(filepath, function (err) {
          if (err) throw new Error(err)
          // Remove file from array 'buffer/history'
          if (filesArray) {
            filesArray.splice(filesArray.indexOf(filepath), 1)

            return true
          }
        })
      }, 1000)
    } else {
      throw new Error('Missing filepath')
    }
  }
}
