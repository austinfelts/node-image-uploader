/* eslint-disable semi */
'use strict';

var fs = require('fs');
var path = require('path');
var async = require('async');

var limit = 10; // limit processes per path
var period = 600; // seconds between checks
var pgConfig = require('./postgres-config.js');
var imagerConfig = require('./imager-config.js');

var preset = '';
var targets = [];
var basePaths = [];
var watchedPaths = [];
var uploadingFiles = [];

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
      break;
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
      targets.push(process.argv[++i]);
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
  if (!targets.length) throw new Error('Target is required.');
  if (!basePaths.length) throw new Error('Starting path is required.');
} catch (err) {
  console.log('\n' + err);
  printUsage();
  process.exit(1);
}

var pg = require('pg');
var Imager = require('imager');
var imager = new Imager(imagerConfig, targets);

// function to upload files to storage
var uploader = function uploader (filePath, callback) {
  filePath = path.resolve(filePath);
  if (uploadingFiles.indexOf(filePath) !== -1) return;

  console.log('Processing file ' + filePath);
  var fileName = path.basename(filePath);
  var productId = parseInt(fileName.split('.').shift(),10);
  if (!productId || !fileName || isNaN(productId)) return callback('File name is invalid.');
  uploadingFiles.push(filePath);

  imager.upload(filePath, function (err, uri, files) {
    if (err) return callback(err);

    if (preset === 'products') {
      // update database with file names
      pg.connect(pgConfig, function (err, client, done) {
        client.query({
          name: 'imager_picture_update',
          text: 'UPDATE t_product SET picture = $1, thumbnail = $1, small = $1 WHERE productid = $2',
          values: [fileName, productId]
        }, function (err, results) {
          done();
          if (err) {
            callback(err);
          } else fs.unlink(filePath, function (err) {
            uploadingFiles.splice(uploadingFiles.indexOf(filePath), 1);
            callback(err);
          });
        });
      });
    } else fs.unlink(filePath, function (err) {
      uploadingFiles.splice(uploadingFiles.indexOf(filePath), 1);
      callback(err);
    });
  }, preset);
};

// function to start monitoring directories
var watcher = function watcher (watchPath) {
  if (watchedPaths.indexOf(watchPath) !== -1) return;

  console.log('Watching path ' + watchPath);
  watchedPaths.push(watchPath);

  fs.watch(watchPath, function process (event, file) {
    if (file) {
      fs.stat(path.join(watchPath, file), function (err, stat) {
        if (err || !stat || stat.isDirectory()) return;
        if (event !== 'change' || !stat.size) return; // ignore event
        if (uploadingFiles.length > limit) { // defer if over limit
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
var explorer = function explorer (files, dir, callback) {
  if (arguments.length === 2) {
    callback = dir;
    dir = undefined;
  }

  if (!Array.isArray(files)) files = [files];

  async.eachLimit(files, limit, function (file, next) {
    // console.log(dir);
    // console.log(file);
    var filePath = path.join(dir || '', file);
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

// main loop periodically scans base paths
explorer(basePaths, function finish (err) {
  if (err) console.error(err);
  setTimeout(explorer.bind(this, basePaths, finish), period * 1000);
});
