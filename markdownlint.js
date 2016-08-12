#!/usr/bin/env node

'use strict';

var fs = require('fs');
var path = require('path');
var values = require('lodash.values');
var flatten = require('lodash.flatten');
var rc = require('rc');
var extend = require('deep-extend');
var markdownlint = require('markdownlint');
var program = require('commander');
var glob = require('glob');
var pkg = require('./package');

function readJSONFrom(file) {
  return JSON.parse(fs.readFileSync(file));
}

function readConfiguration(args) {
  var config = rc('markdownlint', {});
  var projectConfigFile = '.markdownlint.json';
  var userConfigFile = args.config;
  try {
    fs.accessSync(projectConfigFile, fs.R_OK);
    var projectConfig = readJSONFrom(projectConfigFile);
    config = extend(config, projectConfig);
  } catch (err) {
  }
  // Normally parsing this file is not needed,
  // because it is already parsed by rc package.
  // However I have to do it to overwrite configuration
  // from .markdownlint.json.
  if (userConfigFile) {
    try {
      var userConfig = readJSONFrom(userConfigFile);
      config = extend(config, userConfig);
    } catch (err) {
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
    process.exit(1);
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
