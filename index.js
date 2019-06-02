#!/usr/bin/env node

const {exec} = require('child_process');
const compare = require('./compare');
const path = require('path');

const lintScript = 'node_modules/.bin/pickle-lint';
const [, , lintPath] = process.argv;
const stdoutFile = path.join(lintPath, 'stdout.txt');
const stderrFile = path.join(lintPath, 'stderr.txt');
const configFile = path.join(lintPath, '.gherkin-lintrc');

exec(`${lintScript} -c ${configFile} ${lintPath} > ${stdoutFile} 2> ${stderrFile} || true`, (err, stdout) => {
    const absolutePath = path.resolve(lintPath);
    if (err) {
      console.error(err);
      process.exit(1);
    }
    compare(absolutePath);
});
