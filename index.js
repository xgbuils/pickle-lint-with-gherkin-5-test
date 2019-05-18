#!/usr/bin/env node

const {exec} = require('child_process');
const compare = require('./compare');
const path = require('path');

const lintScript = 'node_modules/.bin/pickle-lint';
const [, , lintPath] = process.argv;

exec(`${lintScript} ${lintPath} > stdout.txt 2> stderr.txt || true`, (err, stdout) => {
	const absolutePath = path.resolve(lintPath);
    if (err) {
      console.error(err);
      process.exit(1);
    }
    compare(absolutePath);
});
