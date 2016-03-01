#!/usr/bin/env node

'use strict';

var pkg = require('./package');
var program = require('commander');
var values = require('lodash.values');
var rc = require('rc');
var extend = require('deep-extend');
var fs = require('fs');
var markdownlint = require('markdownlint');

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

function lint(lintFiles, config) {
  var lintOptions = {
    files: lintFiles,
    config: config
  };
  return markdownlint.sync(lintOptions);
}

function printResult(lintResult) {
  console.log(lintResult.toString());
}

function isResultCorrect(lintResult) {
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

var files = program.args;

if (files && files.length > 0) {
  var config = readConfiguration(program);
  var lintResult = lint(files, config);
  printResult(lintResult);
  if (isResultCorrect(lintResult)) {
    process.exit(1);
  }
} else {
  program.help();
}
