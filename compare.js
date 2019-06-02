const fs = require('fs');
const {promisify} = require('util');
const diff = require('diff');
const {red, green, bgRed, bgGreen} = require('chalk');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const path = require('path');

const replaceDirname = (content) => {
  const cwdParent = process.cwd().split(path.sep).slice(0, -1).join(path.sep)
  return content.replace(new RegExp(cwdParent, 'g'), '/path/to');
};

const appendDiffs = ({chunks, removed, added}) => {
  if (removed) {
    chunks.push({
      removed: justValue(removed),
    });
  } else if (added) {
    chunks.push({
      added: justValue(added),
    });
  }
  return {chunks};
};

const collectDiffInfo = (info, lineDiff) => {
  const {chunks} = info;
  if (lineDiff.removed) {
    info.removed = lineDiff.value;
  } else if (lineDiff.added) {
    info.added = lineDiff.value;
  } else {
    appendDiffs(info);
    chunks.push({
      equal: justValue(lineDiff.value),
    });
    return {chunks};
  }
  if (info.removed && info.added) {
    const charDiff = diff.diffChars(info.removed, info.added);
    chunks.push({
      added: charDiff.filter(({removed}) => !removed),
      removed: charDiff.filter(({added}) => !added),
    });
    return {chunks};
  }
  return info;
};

const justValue = (value) => [{value}];

const formatCharDiff = (charDiff, color, strong, prefix) => {
  const last = charDiff.pop();
  last.value = last.value.replace(/(\r\n|\r|\n)$/g, '');
  charDiff.push(last);
  return color(prefix) + ' ' + charDiff.reduce((line, chunk) => {
    const value = chunk.value.split(/\r\n|\r|\n/g).join('\n' + prefix + ' ');
    if (chunk.removed || chunk.added) {
      return line + strong(value);
    }
    return line + color(value);
  }, '') + '\n';
};

const formatLineDiff = (chunk) => {
  let line = '';
  if (chunk.removed) {
    line += formatCharDiff(chunk.removed, red, bgRed.white, '-');
  }
  if (chunk.added) {
    line += formatCharDiff(chunk.added, green, bgGreen.white, '+');
  }
  if (chunk.equal) {
    line += formatCharDiff(chunk.equal, (x) => x, (x) => x, ' ');
  }
  return line;
};

const buildDiff = (actualContent, expectedContent) => () => {
  const differences = diff.diffLines(actualContent, expectedContent);
  const formattedDiff = appendDiffs(differences.reduce(collectDiffInfo, {
    chunks: [],
  })).chunks.reduce((line, lineDiff) => line + formatLineDiff(lineDiff), '');

  return actualContent !== expectedContent
    ? formattedDiff
    : '';
};

const formatFiles = (actualFile, expectedFile) => {
  return red(`- ${actualFile}`) + '  ' + green(`+ ${expectedFile}`) + '\n\n';
};

const compare = (actualFile, expectedFile, cwd) => {
  const encoding = 'utf8';
  const actualFilePath = path.resolve(cwd, actualFile);
  const expectedFilePath = path.resolve(cwd, expectedFile);
  return Promise.all([
    readFile(actualFilePath, encoding),
    readFile(expectedFilePath, encoding)
  ])
    .then(([actual, expected]) => {
      const actualContent = replaceDirname(actual);
      return writeFile(actualFilePath, actualContent, encoding)
        .then(buildDiff(actualContent, expected));
    })
    .then((diff) => diff ? {
      message: formatFiles(actualFile, expectedFile) + diff,
    } : null)
    .catch((err) => ({
      message: err,
    }));
};

module.exports = (cwd) => {
  return Promise.all([
    compare('stdout.txt', 'expected-stdout.txt', cwd),
    compare('stderr.txt', 'expected-stderr.txt', cwd),
  ])
    .then((results) => {
      const errors = results.filter((result) => result);
      errors.forEach((error) => {
        process.stdout.write(error.message); // eslint-disable-line no-console
      });
      process.exit(errors.length > 0 ? 1 : 0);
    })
}
