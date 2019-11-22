'use strict'

const repl = require('repl')
const { printDebug } = require('./utils')

const loadAddons = (repl, addons) => {
  const { commands, events } = addons

  if (!repl) throw new Error('`repl` module missing!')

  if (commands) {
    commands.forEach(c => repl.defineCommand(c.name, c.func))
    printDebug('Commands:\n', commands.map(x => `.${x.name}`).join(', '), '\n')
  }

  if (events) {
    events.forEach(e => repl.on(e.name, e.func))
    printDebug('Hooked:\n', events.map(x => `${x.name}`).join(', '), '\n')
  }

  if (!commands && !events) return

  printDebug('Loaded repl Addons!\n')
}

const startServer = (options) => {
  const defaultOptions = {
    prompt: '> ',
    useColors: true
  }

  if (options.default) {
    // Merge passed in options with default options
    Object.assign(options, defaultOptions)
  }

  const r = repl.start(options || defaultOptions)

  var addons
  try {
    // always try to load in the default addons, if provided.
    addons = require('./repl_addons')
  } catch (error) {
    printDebug('missing default addons')
    addons = [{ commands: [], events: [] }]
  }

  // load any extra addons passed along
  if (options.addons) {
    var { commands, events } = options.addons

    if (commands) {
      options.addons.commands.forEach(c => addons.commands.push(c))
    }

    if (events) {
      options.addons.events.forEach(e => addons.events.push(e))
    }
  }

  if (addons) {
    loadAddons(r, addons)
  }

  return r
}

module.exports = { startServer }
