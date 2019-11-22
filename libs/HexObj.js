/* polyfill */
function _instanceof (left, right) {
  if (
    right != null &&
    typeof Symbol !== 'undefined' &&
    right[Symbol.hasInstance]
  ) {
    return right[Symbol.hasInstance](left)
  } else {
    return left instanceof right
  }
}

function _defineProperty (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    })
  } else {
    obj[key] = value
  }
  return obj
}

function _classCallCheck (instance, Constructor) {
  if (!_instanceof(instance, Constructor)) {
    throw new TypeError('Cannot call a class as a function')
  }
}

function _defineProperties (target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i]
    descriptor.enumerable = descriptor.enumerable || false
    descriptor.configurable = true
    if ('value' in descriptor) descriptor.writable = true
    Object.defineProperty(target, descriptor.key, descriptor)
  }
}

function _createClass (Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps)
  if (staticProps) _defineProperties(Constructor, staticProps)
  return Constructor
}
/* end polyfill */

var HexObj =
  /* #__PURE__ */
  (function () {
    'use strict'

    function HexObj (data) {
      _classCallCheck(this, HexObj)

      this.data = data.substr(0, 16).split('')
    }

    _createClass(HexObj, [
      {
        key: 'makeObj',
        value: function makeObj (data) {
          return data.map(function (x) {
            var hex = Number(x.charCodeAt()).toString(16)
            hex = hex === 0 ? '00' : hex.toUpperCase()
            return _defineProperty({}, hex, x)
          })
        }
      },
      {
        key: 'hex',
        get: function get () {
          return this.makeObj(this.data)
            .map(function (x) {
              return Object.keys(x).shift()
            })
            .join(' ')
        }
      },
      {
        key: 'ascii',
        get: function get () {
          return this.makeObj(this.data)
            .map(function (x) {
              return Object.values(x).shift()
            })
            .join('')
        }
      }
    ])

    return HexObj
  })()

module.exports = HexObj
