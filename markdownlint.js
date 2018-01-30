#!/usr/bin/env node

'use strict';

var fs = require('fs');
var path = require('path');
var program = require('commander');
var difference = require('lodash.difference');
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
  var globOptions = {
    nodir: true
  };
  files = files.map(function (file) {
    try {
      if (fs.lstatSync(file).isDirectory()) {
        return glob.sync(path.join(file, '**', '*.{md,markdown}'), globOptions);
      }
    } catch (err) {
      // Not a directory, not a file, may be a glob
      return glob.sync(file, globOptions);
    }
    return file;
  });
  return flatten(files);
}

function lint(lintFiles, config) {
  var lintOptions = {
    resultVersion: 2,
    files: lintFiles,
    config: config
  };
  return markdownlint.sync(lintOptions);
}

function printResult(lintResult) {
  var results = flatten(Object.keys(lintResult).map(function (file) {
    return lintResult[file].map(function (result) {
      return {
        file: file,
        lineNumber: result.lineNumber,
        names: result.ruleNames.join('/'),
        description: result.ruleDescription +
          (result.errorDetail ? ' [' + result.errorDetail + ']' : '') +
          (result.errorContext ? ' [Context: "' + result.errorContext + '"]' : '')
      };
    });
  }));
  if (results.length > 0) {
    results.sort(function (a, b) {
      return a.file.localeCompare(b.file) || a.lineNumber - b.lineNumber ||
        a.names.localeCompare(b.names) || a.description.localeCompare(b.description);
    });
    var lintResultString = results.map(function (result) {
      return result.file + ': ' + result.lineNumber + ': ' + result.names + ' ' + result.description;
    }).join('\n');
    console.error(lintResultString);
    // Note: process.exit(1) will end abruptly, interrupting asynchronous IO
    // streams (e.g., when the output is being piped). Just set the exit code
    // and let the program terminate normally.
    // @see {@link https://nodejs.org/dist/latest-v8.x/docs/api/process.html#process_process_exit_code}
    // @see {@link https://github.com/igorshubovych/markdownlint-cli/pull/29#issuecomment-343535291}
    process.exitCode = 1;
  }
}

function concatArray(item, array) {
  array.push(item);
  return array;
}

program
  .version(pkg.version)
  .description(pkg.description)
  .usage('[options] <files|directories|globs>')
  .option('-c, --config [configFile]', 'configuration file')
  .option('-i, --ignore [file|directory|glob]', 'files to ignore/exclude', concatArray, []);

program.parse(process.argv);

var files = prepareFileList(program.args);
var ignores = prepareFileList(program.ignore);
var diff = difference(files, ignores);

if (files.length > 0) {
  var config = readConfiguration(program);
  var lintResult = lint(diff, config);
  printResult(lintResult);
} else {
  program.help();
}
