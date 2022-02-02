#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');
const os = require('os');
const process = require('process');
const program = require('commander');

const options = program.opts();
const glob = require('glob');
const markdownlint = require('markdownlint');
const rc = require('run-con');
const minimatch = require('minimatch');
const pkg = require('./package.json');

function jsoncParse(text) {
  return JSON.parse(require('jsonc-parser').stripComments(text));
}

function jsYamlSafeLoad(text) {
  return require('js-yaml').load(text);
}

const exitCodes = {
  lintFindings: 1,
  failedToWriteOutputFile: 2,
  failedToLoadCustomRules: 3,
  unexpectedError: 4
};

const projectConfigFiles = ['.markdownlint.json', '.markdownlint.yaml', '.markdownlint.yml'];
const configFileParsers = [jsoncParse, jsYamlSafeLoad];
const fsOptions = {encoding: 'utf8'};
const processCwd = process.cwd();

function readConfiguration(userConfigFile) {
  const jsConfigFile = /\.js$/i.test(userConfigFile);

  // Load from well-known config files
  let config = rc('markdownlint', {});
  for (const projectConfigFile of projectConfigFiles) {
    try {
      fs.accessSync(projectConfigFile, fs.R_OK);
      const projectConfig = markdownlint.readConfigSync(projectConfigFile, configFileParsers);
      config = {...config, ...projectConfig};
      break;
    } catch {
      // Ignore failure
    }
  }

  // Normally parsing this file is not needed, because it is already parsed by rc package.
  // However I have to do it to overwrite configuration from .markdownlint.{json,yaml,yml}.
  if (userConfigFile) {
    try {
      const userConfig = jsConfigFile ? require(path.resolve(processCwd, userConfigFile)) : markdownlint.readConfigSync(userConfigFile, configFileParsers);
      config = require('deep-extend')(config, userConfig);
    } catch (error) {
      console.error(`Cannot read or parse config file '${userConfigFile}': ${error.message}`);
      process.exitCode = exitCodes.unexpectedError;
    }
  }

  return config;
}

function prepareFileList(files, fileExtensions, previousResults) {
  const globOptions = {
    dot: Boolean(options.dot),
    nodir: true
  };
  let extensionGlobPart = '*.';
  if (fileExtensions.length === 1) {
    // Glob seems not to match patterns like 'foo.{js}'
    extensionGlobPart += fileExtensions[0];
  } else {
    extensionGlobPart += '{' + fileExtensions.join(',') + '}';
  }

  files = files.map(file => {
    try {
      if (fs.lstatSync(file).isDirectory()) {
        // Directory (file falls through to below)
        if (previousResults) {
          const matcher = new minimatch.Minimatch(path.resolve(processCwd, path.join(file, '**', extensionGlobPart)), globOptions);
          return previousResults.filter(fileInfo => matcher.match(fileInfo.absolute)).map(fileInfo => fileInfo.original);
        }

        return glob.sync(path.join(file, '**', extensionGlobPart), globOptions);
      }
    } catch {
      // Not a directory, not a file, may be a glob
      if (previousResults) {
        const matcher = new minimatch.Minimatch(path.resolve(processCwd, file), globOptions);
        return previousResults.filter(fileInfo => matcher.match(fileInfo.absolute)).map(fileInfo => fileInfo.original);
      }

      return glob.sync(file, globOptions);
    }

    // File
    return file;
  });
  return files.flat().map(file => ({
    original: file,
    relative: path.relative(processCwd, file),
    absolute: path.resolve(file)
  }));
}

function printResult(lintResult) {
  const results = Object.keys(lintResult).flatMap(file =>
    lintResult[file].map(result => {
      if (options.json) {
        return {
          fileName: file,
          ...result
        };
      }

      return {
        file: file,
        lineNumber: result.lineNumber,
        column: (result.errorRange && result.errorRange[0]) || 0,
        names: result.ruleNames.join('/'),
        description: result.ruleDescription + (result.errorDetail ? ' [' + result.errorDetail + ']' : '') + (result.errorContext ? ' [Context: "' + result.errorContext + '"]' : '')
      };
    })
  );

  let lintResultString = '';
  if (results.length > 0) {
    if (options.json) {
      results.sort((a, b) => a.fileName.localeCompare(b.fileName) || a.lineNumber - b.lineNumber || a.ruleDescription.localeCompare(b.ruleDescription));
      lintResultString = JSON.stringify(results, null, 2);
    } else {
      results.sort((a, b) => a.file.localeCompare(b.file) || a.lineNumber - b.lineNumber || a.names.localeCompare(b.names) || a.description.localeCompare(b.description));

      lintResultString = results
        .map(result => {
          const {file, lineNumber, column, names, description} = result;
          const columnText = column ? `:${column}` : '';
          return `${file}:${lineNumber}${columnText} ${names} ${description}`;
        })
        .join('\n');
    }

    // Note: process.exit(1) will end abruptly, interrupting asynchronous IO
    // streams (e.g., when the output is being piped). Just set the exit code
    // and let the program terminate normally.
    // @see {@link https://nodejs.org/dist/latest-v8.x/docs/api/process.html#process_process_exit_code}
    // @see {@link https://github.com/igorshubovych/markdownlint-cli/pull/29#issuecomment-343535291}
    process.exitCode = exitCodes.lintFindings;
  }

  if (options.output) {
    lintResultString = lintResultString.length > 0 ? lintResultString + os.EOL : lintResultString;
    try {
      fs.writeFileSync(options.output, lintResultString);
    } catch (error) {
      console.warn('Cannot write to output file ' + options.output + ': ' + error.message);
      process.exitCode = exitCodes.failedToWriteOutputFile;
    }
  } else if (lintResultString && !options.quiet) {
    console.error(lintResultString);
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
  .option('-c, --config [configFile]', 'configuration file (JSON, JSONC, JS, or YAML)')
  .option('-d, --dot', 'include files/folders with a dot (for example `.github`)')
  .option('-f, --fix', 'fix basic errors (does not work with STDIN)')
  .option('-i, --ignore [file|directory|glob]', 'file(s) to ignore/exclude', concatArray, [])
  .option('-j, --json', 'write issues in json format')
  .option('-o, --output [outputFile]', 'write issues to file (no console)')
  .option('-p, --ignore-path [file]', 'path to file with ignore pattern(s)')
  .option('-q, --quiet', 'do not write issues to STDOUT')
  .option('-r, --rules  [file|directory|glob|package]', 'include custom rule files', concatArray, [])
  .option('-s, --stdin', 'read from STDIN (does not work with files)')
  .option('--enable [rules...]', 'Enable certain rules, e.g. --enable MD013 MD041')
  .option('--disable [rules...]', 'Disable certain rules, e.g. --disable MD013 MD041');

program.parse(process.argv);

function tryResolvePath(filepath) {
  try {
    if (path.basename(filepath) === filepath && path.extname(filepath) === '') {
      // Looks like a package name, resolve it relative to cwd
      // Get list of directories, where requested module can be.
      let paths = Module._nodeModulePaths(processCwd);
      // eslint-disable-next-line unicorn/prefer-spread
      paths = paths.concat(Module.globalPaths);
      if (require.resolve.paths) {
        // Node >= 8.9.0
        return require.resolve(filepath, {paths: paths});
      }

      return Module._resolveFilename(filepath, {paths: paths});
    }

    // Maybe it is a path to package installed locally
    return require.resolve(path.join(processCwd, filepath));
  } catch {
    return filepath;
  }
}

function loadCustomRules(rules) {
  return rules.flatMap(rule => {
    try {
      const resolvedPath = [tryResolvePath(rule)];
      const fileList = prepareFileList(resolvedPath, ['js']).flatMap(filepath => require(filepath.absolute));
      if (fileList.length === 0) {
        throw new Error('No such rule');
      }

      return fileList;
    } catch (error) {
      console.error('Cannot load custom rule ' + rule + ': ' + error.message);
      return process.exit(exitCodes.failedToLoadCustomRules);
    }
  });
}

let ignorePath = '.markdownlintignore';
let {existsSync} = fs;
if (options.ignorePath) {
  ignorePath = options.ignorePath;
  existsSync = () => true;
}

let ignoreFilter = () => true;
if (existsSync(ignorePath)) {
  const ignoreText = fs.readFileSync(ignorePath, fsOptions);
  const ignore = require('ignore');
  const ignoreInstance = ignore().add(ignoreText);
  ignoreFilter = fileInfo => !ignoreInstance.ignores(fileInfo.relative);
}

const files = prepareFileList(program.args, ['md', 'markdown']).filter(value => ignoreFilter(value));
const ignores = prepareFileList(options.ignore, ['md', 'markdown'], files);
const customRules = loadCustomRules(options.rules);
const diff = files.filter(file => !ignores.some(ignore => ignore.absolute === file.absolute)).map(paths => paths.original);

function lintAndPrint(stdin, files) {
  files = files || [];
  const config = readConfiguration(options.config);

  for (const rule of options.enable || []) {
    // Leave default values in place if rule is an object
    if (!config[rule]) {
      config[rule] = true;
    }
  }

  for (const rule of options.disable || []) {
    config[rule] = false;
  }

  const lintOptions = {
    config,
    customRules,
    files
  };
  if (stdin) {
    lintOptions.strings = {
      stdin
    };
  }

  if (options.json) {
    lintOptions.resultVersion = 3;
  }

  if (options.fix) {
    const fixOptions = {
      ...lintOptions,
      resultVersion: 3
    };
    const markdownlintRuleHelpers = require('markdownlint-rule-helpers');
    for (const file of files) {
      fixOptions.files = [file];
      const fixResult = markdownlint.sync(fixOptions);
      const fixes = fixResult[file].filter(error => error.fixInfo);
      if (fixes.length > 0) {
        const originalText = fs.readFileSync(file, fsOptions);
        const fixedText = markdownlintRuleHelpers.applyFixes(originalText, fixes);
        if (originalText !== fixedText) {
          fs.writeFileSync(file, fixedText, fsOptions);
        }
      }
    }
  }

  const lintResult = markdownlint.sync(lintOptions);
  printResult(lintResult);
}

try {
  if (files.length > 0 && !options.stdin) {
    lintAndPrint(null, diff);
  } else if (files.length === 0 && options.stdin && !options.fix) {
    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    import('get-stdin')
      .then(module => module.default())
      .then(lintAndPrint);
  } else {
    program.help();
  }
} catch (error) {
  console.error(error);
  process.exit(exitCodes.unexpectedError);
}
