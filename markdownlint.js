#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');
const program = require('commander');
const getStdin = require('get-stdin');
const jsYaml = require('js-yaml');
const differenceWith = require('lodash.differencewith');
const flatten = require('lodash.flatten');
const extend = require('deep-extend');
const markdownlint = require('markdownlint');
const rc = require('rc');
const glob = require('glob');
const minimatch = require('minimatch');
const pkg = require('./package');

const projectConfigFiles = [
  '.markdownlint.json',
  '.markdownlint.yaml',
  '.markdownlint.yml'
];
const configFileParsers = [JSON.parse, jsYaml.safeLoad];

function readConfiguration(args) {
  let config = rc('markdownlint', {});
  const userConfigFile = args.config;
  for (const projectConfigFile of projectConfigFiles) {
    try {
      fs.accessSync(projectConfigFile, fs.R_OK);
      const projectConfig = markdownlint.readConfigSync(projectConfigFile, configFileParsers);
      config = extend(config, projectConfig);
      break;
    } catch (error) {
      // Ignore failure
    }
  }
  // Normally parsing this file is not needed,
  // because it is already parsed by rc package.
  // However I have to do it to overwrite configuration
  // from .markdownlint.{json,yaml,yml}.

  if (userConfigFile) {
    try {
      const userConfig = markdownlint.readConfigSync(userConfigFile, configFileParsers);
      config = extend(config, userConfig);
    } catch (error) {
      console.warn('Cannot read or parse config file', args.config);
    }
  }

  return config;
}

function prepareFileList(files, fileExtensions, previousResults) {
  const globOptions = {
    nodir: true
  };
  let extensionGlobPart = '*.';
  if (fileExtensions.length === 1) {
    // Glob seems not to match patterns like 'foo.{js}'
    extensionGlobPart += fileExtensions[0];
  } else {
    extensionGlobPart += '{' + fileExtensions.join(',') + '}';
  }

  files = files.map(function (file) {
    try {
      if (fs.lstatSync(file).isDirectory()) {
        // Directory (file falls through to below)
        if (previousResults) {
          const matcher = new minimatch.Minimatch(
            path.resolve(process.cwd(), path.join(file, '**', extensionGlobPart)), globOptions);
          return previousResults.filter(function (fileInfo) {
            return matcher.match(fileInfo.absolute);
          }).map(function (fileInfo) {
            return fileInfo.original;
          });
        }

        return glob.sync(path.join(file, '**', extensionGlobPart), globOptions);
      }
    } catch (error) {
      // Not a directory, not a file, may be a glob
      if (previousResults) {
        const matcher = new minimatch.Minimatch(path.resolve(process.cwd(), file), globOptions);
        return previousResults.filter(function (fileInfo) {
          return matcher.match(fileInfo.absolute);
        }).map(function (fileInfo) {
          return fileInfo.original;
        });
      }

      return glob.sync(file, globOptions);
    }

    // File
    return file;
  });
  return flatten(files).map(function (file) {
    return {
      original: file,
      absolute: path.resolve(file)
    };
  });
}

function printResult(lintResult) {
  const results = flatten(Object.keys(lintResult).map(function (file) {
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
  let lintResultString = '';
  if (results.length > 0) {
    results.sort(function (a, b) {
      return a.file.localeCompare(b.file) || a.lineNumber - b.lineNumber ||
        a.names.localeCompare(b.names) || a.description.localeCompare(b.description);
    });
    lintResultString = results.map(function (result) {
      return result.file + ': ' + result.lineNumber + ': ' + result.names + ' ' + result.description;
    }).join('\n');
    // Note: process.exit(1) will end abruptly, interrupting asynchronous IO
    // streams (e.g., when the output is being piped). Just set the exit code
    // and let the program terminate normally.
    // @see {@link https://nodejs.org/dist/latest-v8.x/docs/api/process.html#process_process_exit_code}
    // @see {@link https://github.com/igorshubovych/markdownlint-cli/pull/29#issuecomment-343535291}
    process.exitCode = 1;
  }

  if (program.output) {
    try {
      fs.writeFileSync(program.output, lintResultString);
    } catch (error) {
      console.warn('Cannot write to output file ' + program.output + ': ' + error.message);
      process.exitCode = 2;
    }
  } else if (lintResultString) {
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
  .option('-s, --stdin', 'read from STDIN (no files)')
  .option('-o, --output [outputFile]', 'write issues to file (no console)')
  .option('-c, --config [configFile]', 'configuration file (JSON or YAML)')
  .option('-i, --ignore [file|directory|glob]', 'files to ignore/exclude', concatArray, [])
  .option('-r, --rules  [file|directory|glob|package]', 'custom rule files', concatArray, []);

program.parse(process.argv);

function tryResolvePath(filepath) {
  try {
    if (path.basename(filepath) === filepath && path.extname(filepath) === '') {
      // Looks like a package name, resolve it relative to cwd
      // Get list of directories, where requested module can be.
      let paths = Module._nodeModulePaths(process.cwd());
      paths = paths.concat(Module.globalPaths);
      if (require.resolve.paths) {
        // Node >= 8.9.0
        return require.resolve(filepath, {paths: paths});
      }

      return Module._resolveFilename(filepath, {paths: paths});
    }

    // Maybe it is a path to package installed locally
    return require.resolve(path.join(process.cwd(), filepath));
  } catch (error) {
    return filepath;
  }
}

function loadCustomRules(rules) {
  return flatten(rules.map(function (rule) {
    try {
      const resolvedPath = [tryResolvePath(rule)];
      const fileList = flatten(prepareFileList(resolvedPath, ['js']).map(function (filepath) {
        return require(filepath.absolute);
      }));
      if (fileList.length === 0) {
        throw new Error('No such rule');
      }

      return fileList;
    } catch (error) {
      console.error('Cannot load custom rule ' + rule + ': ' + error.message);
      process.exit(3);
    }
  }));
}

const files = prepareFileList(program.args, ['md', 'markdown']);
const ignores = prepareFileList(program.ignore, ['md', 'markdown'], files);
const customRules = loadCustomRules(program.rules);
const diff = differenceWith(files, ignores, function (a, b) {
  return a.absolute === b.absolute;
}).map(function (paths) {
  return paths.original;
});

function lintAndPrint(stdin, files) {
  const config = readConfiguration(program);
  const lintOptions = {
    config: config,
    customRules: customRules,
    files: files || []
  };
  if (stdin) {
    lintOptions.strings = {
      stdin: stdin
    };
  }

  const lintResult = markdownlint.sync(lintOptions);
  printResult(lintResult);
}

if ((files.length > 0) && !program.stdin) {
  lintAndPrint(null, diff);
} else if ((files.length === 0) && program.stdin) {
  getStdin().then(lintAndPrint);
} else {
  program.help();
}
