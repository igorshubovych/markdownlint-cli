# markdownlint-cli [![Travis CI Build Status][travis-badge]][travis-url] [![AppVeyor CI Build Status][appveyor-badge]][appveyor-url]

> Command Line Interface for [MarkdownLint][markdownlint]

## Installation

```bash
npm install -g markdownlint-cli
```

## Usage

```bash
markdownlint --help

  Usage: markdownlint [options] <files|directories|globs>

  MarkdownLint Command Line Interface

  Options:

    -h, --help                                  output usage information
    -V, --version                               output the version number
    -f, --fix                                   fix basic errors (does not work with STDIN)
    -s, --stdin                                 read from STDIN (does not work with files)
    -o, --output [outputFile]                   write issues to file (no console)
    -c, --config [configFile]                   configuration file (JSON, JSONC, or YAML)
    -i, --ignore [file|directory|glob]          files to ignore/exclude
    -r, --rules  [file|directory|glob|package]  custom rule files
```

### Globbing

`markdownlint-cli` supports advanced globbing patterns like `**/*.md` ([more information][globprimer]).
With shells like Bash, it may be necessary to quote globs so they are not interpreted by the shell.
For example, `--ignore *.md` would be expanded by Bash to `--ignore a.md b.md ...` before invoking `markdownlint-cli`, causing it to ignore only the first file because `--ignore` takes a single parameter (though it can be used multiple times).
Quoting the glob like `--ignore '*.md'` passes it through unexpanded and ignores the set of files.

#### Globbing examples

To lint all Markdown files in a Node.js project (excluding dependencies), the following commands might be used:

Windows CMD: `markdownlint **/*.md --ignore node_modules`

Linux Bash: `markdownlint '**/*.md' --ignore node_modules`

### Ignoring files

If present in the current folder, a `.markdownlintignore` file will be used to ignore files and /or directories according to the rules for [gitignore][gitignore].

The order of operations is:

- Enumerate files/directories/globs on the command line
- Apply exclusions from `.markdownlintignore`
- Apply exclusions from `-i`/`--ignore` option(s)

### Fixing errors

When the `--fix` option is specified, `markdownlint-cli` tries to apply all fixes reported by the active rules and reports any errors that remain.
Because this option makes changes to the input files, it is good to make a backup first or work with files under source control so any unwanted changes can be undone.

> Because not all rules include fix information when reporting errors, fixes may overlap, and not all errors are fixable, `--fix` will not usually address all errors.

## Configuration

`markdownlint-cli` reuses [the rules][rules] from `markdownlint` package.

Configuration is stored in JSON, JSONC, YAML, or INI files in the same [config format][config].

The example of configuration file:

```json
{
  "default": true,
  "MD003": { "style": "atx_closed" },
  "MD007": { "indent": 4 },
  "no-hard-tabs": false,
  "whitespace": false
}
```

See [test configuration file][test-config] or [style folder][style-folder] for more examples.

CLI argument `--config` is not mandatory.
If it is not provided, `markdownlint-cli` looks for file `.markdownlint.json`/`.markdownlint.yaml`/`.markdownlint.yml` in current folder, or for file `.markdownlintrc` in current or all upper folders.
The algorithm is described in details on [rc package page][rc-standards].
If `--config` argument is provided, the file must be valid JSON, JSONC, or YAML.

## Related

- [markdownlint][markdownlint] - API for this module
- [glob][glob] - Pattern matching implementation
- [ignore][ignore] - `.markdownlintignore` implementation

## License

MIT © Igor Shubovych

[travis-badge]: https://img.shields.io/travis/igorshubovych/markdownlint-cli/master.svg?label=linux
[travis-url]: https://travis-ci.org/igorshubovych/markdownlint-cli

[appveyor-badge]: https://img.shields.io/appveyor/ci/igorshubovych/markdownlint-cli/master.svg?label=windows
[appveyor-url]: https://ci.appveyor.com/project/igorshubovych/markdownlint-cli

[markdownlint]: https://github.com/DavidAnson/markdownlint
[rules]: https://github.com/DavidAnson/markdownlint/blob/master/doc/Rules.md
[config]: https://github.com/DavidAnson/markdownlint#optionsconfig
[style-folder]: https://github.com/DavidAnson/markdownlint/tree/master/style
[test-config]: https://github.com/igorshubovych/markdownlint-cli/blob/master/test/test-config.json
[rc-standards]: https://www.npmjs.com/package/rc#standards
[glob]: https://github.com/isaacs/node-glob
[globprimer]: https://github.com/isaacs/node-glob/blob/master/README.md#glob-primer
[ignore]: https://github.com/kaelzhang/node-ignore
[gitignore]: https://git-scm.com/docs/gitignore
