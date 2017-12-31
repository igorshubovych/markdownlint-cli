#!/usr/bin/env node

'use strict';

var fs = require('fs');
var path = require('path');
var program = require('commander');
var values = require('lodash.values');
var flatten = require('lodash.flatten');
var extend = require('deep-extend');
var markdownlint = require('markdownlint');
var rc = require('rc');
var glob = require('glob');

var pkg = require('./package');

function readConfiguration(args) {
  var config = rc('markdownlint', {});
  var projectConfigFile = '.markdownlint.json';
  var userConfigFile = args.config;
  try {
    fs.accessSync(projectConfigFile, fs.R_OK);
    var projectConfig = markdownlint.readConfigSync(projectConfigFile);
    config = extend(config, projectConfig);
  } catch (err) {
  }
  // Normally parsing this file is not needed,
  // because it is already parsed by rc package.
  // However I have to do it to overwrite configuration
  // from .markdownlint.json.
  if (userConfigFile) {
    try {
      var userConfig = markdownlint.readConfigSync(userConfigFile);
      config = extend(config, userConfig);
    } catch (err) {
      console.warn('Cannot read or parse config file', args.config);
    }
  }
  return config;
}

function prepareFileList(files) {
  files = files.map(function (file) {
    try {
      if (fs.lstatSync(file).isDirectory()) {
        return glob.sync(path.join(file, '**', '*.{md,markdown}'));
      }
    } catch (err) {
      // Not a directory, not a file, may be a glob
      return glob.sync(file);
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
    // Note: process.exit(1) will end abruptly, interrupting asynchronous IO
    // streams (e.g., when the output is being piped). Just set the exit code
    // and let the program terminate normally.
    // @see {@link https://nodejs.org/dist/latest-v8.x/docs/api/process.html#process_process_exit_code}
    // @see {@link https://github.com/igorshubovych/markdownlint-cli/pull/29#issuecomment-343535291}
    process.exitCode = 1;
    return;
  }

  var result = lintResult.toString();
  if (result) {
    console.log(result);
  }
}

function notEmptyObject(item) {
  return Object.keys(item).length > 0;
}

function hasResultErrors(lintResult) {
  return values(lintResult).some(notEmptyObject);
}

program
  .version(pkg.version)
  .description(pkg.description)
  .usage('[options] <files|directories|globs>')
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
