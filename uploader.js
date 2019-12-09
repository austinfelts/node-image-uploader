/* eslint-disable semi */
'use strict'
require('dotenv').config()

var fs = require('fs');
var path = require('path');
var async = require('async');

var limit = 10; // limit processes per path
var period = 600; // seconds between checks
var pgConfig = require('./config/postgres-config.js');
var imagerConfig = require('./config/imager-config.js');

var preset = '';
global.targets = [];
var basePaths = [];
var watchedPaths = [];
global.uploadingFiles = [];
global.wsServer = require('./libs/websocket')

const utils = require('./libs/utils')
const { removeTempFile, printDebug } = utils

// function to display usage help
var printUsage = function printUsage () {
  console.log(`
    Usage:\n
    node uploader [options] <path(s)>
    -h, --help               Display usage help (this screen)
    -l, --limit  <limit>     Limit number of processes per path
    -p, --preset <preset>    Specify a defined preset to run
    -t, --target <target>    Specify a defined target storage
    -s, --source <source>    Specify a starting source path
  `);
};

// parse command line arguments
for (var i = 2; i < process.argv.length; i++) {
  switch (process.argv[i]) {
    case '-h':
    case '--help':
      printUsage();
      process.exit(0);
    case '-l':
    case '--limit':
      limit = parseInt(process.argv[++i], 10) || limit;
      break;
    case '-p':
    case '--preset':
      preset = process.argv[++i];
      break;
    case '-t':
    case '--target':
      global.targets.push(process.argv[++i]);
      break;
    case '-s':
    case '--source':
      basePaths.push(process.argv[++i]);
      break;
    default: // default to adding path
      basePaths.push(process.argv[i]);
      break;
  }
}

try {
  if (!preset) throw new Error('Preset is required.');
  if (!global.targets.length) throw new Error('Target is required.');
  if (!basePaths.length) throw new Error('Starting path is required.');
} catch (err) {
  console.log('\n' + err);
  printUsage();
  process.exit(1);
}

const initPostgresClient = (config) => {
  // Needs error checking
  const createClient = config => {
    const { Pool } = require('pg')
    const pool = new Pool(config)

    return pool
  }

  return createClient(config)
}
global.pg = initPostgresClient(pgConfig)

if (process.env.DEBUGGING) {
  (async () => {
    var pg = global.pg
    const cols = ['current_database()', 'inet_client_addr()', 'inet_server_addr()', 'session_user', 'user', 'version()']

    var debugInfo = await pg.query(`select ${cols.join(', ')}`)

    printDebug((debugInfo).rows[0], 'DB Connection Information')
  })()
}

// function to upload files to storage
const uploader = async (filePath, callback) => {
  const { getFileInfo, extractProductId } = utils

  var fileName = path.basename(filePath);
  var mimeType = (await getFileInfo(filePath)).toLowerCase()

  if (global.uploadingFiles.indexOf(filePath) !== -1) return

  console.log('Processing file ' + fileName + ' ...\n')

  // our Product IDs start at 5 in length up to and ending at 7 (For now. -386,827 products to go as of 11/11/2019)
  var productId = extractProductId(fileName)

  // Invalid File name
  if (!productId || !fileName || isNaN(productId)) {
    removeTempFile(filePath, global.uploadingFiles)

    callback(Error(`Filename \`${fileName}\` is invalid. Must contain a Product ID`))
  }

  const safeTypes = ['jpg', 'png']

  // Invalid Image type
  if (!mimeType || typeof (mimeType) === 'undefined') {
    throw new Error('Unable to determine File Type. Are you sure this is a Image?\n', fileName)
  } else if (safeTypes.indexOf(mimeType) !== 0) {
    console.log(removeTempFile(filePath))

    callback(Error(`Invalid File Type: \`${mimeType}\``))
  }

  // Add this filepath to the queue
  global.uploadingFiles.push(filePath)

  // Pass info to Imager to begin processing, may not need timeout.
  setTimeout(
    () => passToImager({
      filePath,
      mimeType,
      productId,
      preset
    }, global.targets),
    250
  )
}

const passToImager = (imageInfo, targets) => {
  const Imager = require('./libs/imager')
  const imager = new Imager(imagerConfig, targets)

  var { filePath, mimeType, productId, preset } = imageInfo

  imager.upload(filePath, async function (err, uri, files) {
    if (err) throw new Error(err)

    var pg = global.pg

    if (preset === 'products') {
      var imageName = `${productId}.${mimeType}`

      // update database with file names
      pg.query({
        name: 'imager_picture_update',
        text: 'UPDATE t_product SET picture = $1, thumbnail = $1, small = $1 WHERE productid = $2',
        values: [imageName, productId]
      }, async (err, res) => {
        if (err) console.error('[PG]\t' + err)

        setTimeout(async () => {
          var updatedRes = await pg.query('SELECT picture, thumbnail, small, productid from t_product where productid = ' + productId)
          printDebug(updatedRes.rows[0], 'Updated Results')
        }, 150)

        removeTempFile(filePath, global.uploadingFiles)
      })
    }

    console.log('Finished!')
  }, preset)
}

// function to start monitoring directories
const watcher = function (watchPath) {
  if (watchedPaths.indexOf(watchPath) !== -1) return

  console.log('Watching path ' + watchPath)
  watchedPaths.push(watchPath)

  fs.watch(watchPath, function process (event, file) {
    if (file) {
      fs.stat(path.join(watchPath, file), function (err, stat) {
        if (err || !stat || stat.isDirectory()) return;
        if (event !== 'change' || !stat.size) return; // ignore event
        if (global.uploadingFiles.length > limit) { // defer if over limit
          return setTimeout(process.bind(this, event, file), 1000);
        }

        uploader(path.join(watchPath, file), function (err) {
          if (err) console.error(err);
        });
      });
    }
  });
};

// function to traverse directory trees and find files
const explorer = function explorer (files, dir, callback) {
  if (arguments.length === 2) {
    callback = dir;
    dir = undefined;
  }

  if (!Array.isArray(files)) files = [files];

  async.eachLimit(files, limit, function (file, next) {
    var filePath = path.resolve(path.join(dir || '', file));

    if (fs.existsSync(filePath) === false) {
      console.log('Attempting to create directory: ', filePath)
      fs.mkdirSync(filePath, { recursive: true })
    }

    var fileStat = fs.statSync(filePath);

    if (fileStat && fileStat.isDirectory()) {
      watcher(filePath);
      explorer(fs.readdirSync(filePath), filePath, next);
    } else if (fileStat && fileStat.isFile()) {
      uploader(filePath, next);
    } else {
      next('Invalid file or directory: ' + filePath);
    }
  }, callback);
};

const initReplServer = (addons) => {
  const repl = require('./libs/repl')

  return repl.startServer({
    addons: addons,
    useGlobal: process.env.DEBUGGING
  })
}

const replAddons = {
  events: [
    {
      name: 'exit',
      func: () => {
        console.log('Terminating script!')

        console.log('Closing PG connection...')
        global.pg.end()

        console.log('\nGoodbye!')
        process.exit(0)
      }
    }
  ]
}

initReplServer(replAddons)
  .setupHistory(path.resolve(os.homedir(), '.node_repl_history'),
    (err, repl) => {
      if (err) console.log(err)

      return repl
    })

// main loop periodically scans base paths
explorer(basePaths, function finish (err) {
  if (err) console.error(err);
  setTimeout(explorer.bind(this, basePaths, finish), period * 1000);
});
