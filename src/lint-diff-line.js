const util = require('util');
const execCB = require('child_process');
const path = require("path");
const ESLint = require("eslint").ESLint;
const getChangedLinesFromDiff = require('./lib/git');
const minimatch = require('minimatch')

const exec = util.promisify(execCB.exec);
const linter = new ESLint();

const getChangedFiles = async (range, ext) => {
  const file = await exec(
		`git diff --pretty=format: --name-only --diff-filter=ACM ${range} | sort | uniq`,
  );
  const files = (file.stdout || '').split('\n').filter(Boolean);
  return files.filter(x => ext.some(y => x.endsWith(y)));
};

const filterChangedFilesByGlob = (changedFiles, glob) =>
  changedFiles.filter(x => glob.some(g => minimatch(x, g)));

const getResolvedPaths = async filteredFiles => {
  const rootDir = (await exec('git rev-parse --show-toplevel')).stdout?.replace(
    '\n',
    '',
  );
  return filteredFiles.map(x => path.join(rootDir, x));
};

const getLineMapForFiles = async (commitRange, changedFiles) => {
  const errPaths = [];
  const changedFilesLineMap = [];
  for (let i = 0; i < changedFiles.length; i++) {
    const file = changedFiles[i];
    try {
      const diff = (await exec(`git diff ${commitRange} ${file}`)).stdout;
      const lines = getChangedLinesFromDiff(diff);
      if (lines.length) {
        changedFilesLineMap.push({ changedLines: lines, filePath: file });
      }
    } catch (err) {
      errPaths.push(file);
    }
  }

  if (errPaths.length) {
    console.log(
      `\x1b[33m\n\nChanges found that are not in current range.\npaths: ${errPaths.join(
        '\n',
      )} \ncommit range: ${commitRange}\n\n\x1b[0m`,
    );
  }
  return changedFilesLineMap;
};

const filterLinterMessages = (changedFileLineMap, linterOutput) =>
  changedFileLineMap
    .map(x => {
      const outputForFile = linterOutput.find(l => l.filePath === x.filePath);
      if (!outputForFile) {
        return undefined;
      }
			outputForFile.version = "lineOnly";
      outputForFile.messages = outputForFile.messages.filter(m =>
        x.changedLines.includes(m.line),
      );
      return outputForFile;
    })
    .filter(Boolean);


		const decorateLinterMessages = (changedFileLineMap, linterOutput) =>
  changedFileLineMap
    .map(x => {
      const outputForFile = linterOutput.find(l => l.filePath === x.filePath);
      if (!outputForFile) {
        return undefined;
      }
			outputForFile.version = "fullFile";
      outputForFile.messages = outputForFile.messages.map(m =>
        x.changedLines.includes(m.line) ? {...m, newLineError: true} : m,
      );
      return outputForFile;
    })
    .filter(Boolean);

const updateErrorAndWarningCounts = filteredLintResults =>
  filteredLintResults.map(x => ({
    ...x,
    warningCount: x.messages.filter(x => x.severity === 1).length,
    errorCount: x.messages.filter(x => x.severity === 2).length,
    fixableWarningCount: x.messages.filter(x => x.severity === 1 && !!x.fix)
      .length,
    fixableErrorCount: x.messages.filter(x => x.severity === 2 && !!x.fix)
      .length,
  }));

const applyLinter = async changedFiles =>
  await linter.lintFiles(changedFiles.map(x => x.filePath));

const reportResults = async (results) => {
  let formatter = await linter.loadFormatter('lint-diff-line-formatter');
  let formatted = formatter.format(results);
  if (!formatted) {
    formatted =
      '\x1b[32m 0 problems (0 errors, 0 warnings)\n 0 errors and 0 warnings potentially fixable with the `--fix` option. \x1b[0m';
  }
  console.log(formatted);
  if (
    results.reduce((acc, x) => {
      return (acc += x.errorCount);
    }, 0) === 0
  ) {
    process.exit(0);
  }
  process.exit(1);
};

const run = async (commitRange, ext, files, fullFiles) => {
	const changedFiles = await getChangedFiles(commitRange,ext);
  const filteredFiles = filterChangedFilesByGlob(changedFiles, files);
  const resolvedFiles = await getResolvedPaths(filteredFiles);
  const changedFilesLineMap = await getLineMapForFiles(
    commitRange,
    resolvedFiles,
  );
  const lintResults = await applyLinter(changedFilesLineMap);
  let results;
	if(fullFiles) {
		results = decorateLinterMessages(changedFilesLineMap, lintResults)
	} else {
		const filteredLintResults = filterLinterMessages(
			changedFilesLineMap,
			lintResults,
		);
		results = updateErrorAndWarningCounts(filteredLintResults);
	}
	await reportResults(results);
};

export { run };
