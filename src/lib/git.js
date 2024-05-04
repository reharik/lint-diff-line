const ramda = require('ramda');
const functional = require('./functional');
const {
  doesNotStartWith,
  firstItemStartsWith,
  splitEveryTime,
} = functional;

const {
  filter,
  flatten,
  map,
  pipe,
  split,
  startsWith,
  uniq,
} = ramda;

const getChangedLinesFromHunk = (hunk) => {
  let lineNumber = 0

  return hunk.reduce((changedLines, line) => {
    if (startsWith('@@', line)) {
      lineNumber = Number(line.match(/\+([0-9]+)/)[1]) - 1
      return changedLines
    }

    if (doesNotStartWith('-', line)) {
      lineNumber += 1

      if (startsWith('+', line)) {
        return [...changedLines, lineNumber]
      }
    }

    return changedLines
  }, [])
}

const getHunksFromDiff = pipe(
  split('\n'),
  splitEveryTime(startsWith('@@')),
  filter(firstItemStartsWith('@@'))
)

module.exports = getChangedLinesFromDiff = pipe(
  getHunksFromDiff,
  map(getChangedLinesFromHunk),
  flatten,
  uniq
)
