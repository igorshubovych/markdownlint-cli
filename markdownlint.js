#!/usr/bin/env node

'use strict';

var pkg = require('./package');
var program = require('commander');
var values = require('lodash.values');
var flatten = require('lodash.flatten');
var rc = require('rc');
var extend = require('deep-extend');
var fs = require('fs');
var markdownlint = require('markdownlint');
var path = require('path');
var glob = require('glob');

function readConfiguration(args) {
  var config = rc('markdownlint', {});
  if (args.config) {
    try {
      var userConfig = JSON.parse(fs.readFileSync(args.config));
      config = extend(config, userConfig);
    } catch (e) {
      console.warn('Cannot read or parse config file', args.config);
    }
  }
  return config;
}

function prepareFileList(files) {
  files = files.map(function (file) {
    var isDir = fs.lstatSync(file).isDirectory();
    if (isDir) {
      var markdownFiles = path.join(file, '**', '*.md');
      return glob.sync(markdownFiles);
    }
    return file;
  });
  return flatten(files);
}

function lint(lintFiles, config) {
  var lintOptions = {
    files: lintFiles,
    config: config
  };
  return markdownlint.sync(lintOptions);
}

function printResult(lintResult, hasErrors) {
  if (hasErrors) {
    console.error(lintResult.toString());
  } else {
    console.log(lintResult.toString());
  }
}

function hasResultErrors(lintResult) {
  function notEmptyObject(item) {
    return Object.keys(item).length > 0;
  }
  return values(lintResult)
    .some(notEmptyObject);
}

program
  .version(pkg.version)
  .description(pkg.description)
  .usage('[options] <files>')
  .option('-c, --config [configFile]', 'Configuration file');

program.parse(process.argv);

var files = prepareFileList(program.args);

if (files && files.length > 0) {
  var config = readConfiguration(program);
  var lintResult = lint(files, config);
  var hasErrors = hasResultErrors(lintResult);
  printResult(lintResult, hasErrors);
} else {
  program.help();
}
