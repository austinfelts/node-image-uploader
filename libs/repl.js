'use strict'

const repl = require('repl')
const { printDebug } = require('./utils')

const loadAddons = (repl, addons) => {
  const { commands, events } = addons

  if (!repl) throw new Error('`repl` module missing!')

  if (commands && commands.length) {
    commands.forEach(c => repl.defineCommand(c.name, c.func))
    printDebug(commands.map(x => `.${x.name}`).join(', ') + '\n', 'Commands:')
  }

  if (events && events.length) {
    events.forEach(e => repl.on(e.name, e.func))
    printDebug(events.map(x => x.name).join(', ') + '\n', 'Events:')
  }

  if (commands.length || events.length) return true
}

const startServer = (options) => {
  const defaultOptions = {
    prompt: '> ',
    useColors: true
  }

  // Merge passed in options with default options
  if (options.default) {
    Object.assign(options, defaultOptions)
  }

  const r = repl.start(options)

  let addons
  try {
    addons = require('./repl_addons')
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      console.warn(err)
    }

    addons = { commands: [], events: [] }
  }

  Object.assign(addons, options.addons)

  if (addons) {
    if (loadAddons(r, addons)) {
      printDebug('Loaded repl Addons!\n')
    }
  }

  return r
}

module.exports = { startServer }
