import { execSync } from 'child_process';
import path from 'path';
import { ESLint } from 'eslint';

import { getChangedLinesFromDiff } from './lib/git';
import minimatch from 'minimatch';

const linter = new ESLint();

const getChangedFiles = async ext => {
  const file = execSync(
    `git log -g --no-merges --pretty=format: --name-only --diff-filter=ACM $(git branch --show-current)  | sort | uniq`,
  ).toString();
  const files = file.split('\n').filter(Boolean);
  return files.filter(x => ext.some(y => x.endsWith(y)));
};

const filterChangedFilesByGlob = (changedFiles, glob) =>
  changedFiles.filter(x => glob.some(g => minimatch(x, g)));

const getResolvedPaths = async filteredFiles => {
  const rootDir = execSync('git rev-parse --show-toplevel')
    .toString()
    .replace('\n', '');
  return filteredFiles.map(x => path.join(rootDir, x));
};

const getLineMapForFiles = (commitRange, changedFiles) => {
	const errPaths = [];
		const changedFilesLineMap = changedFiles.map(file => {
    try {
			const diff = execSync(`git diff ${commitRange} ${file}`).toString();
			const lines = getChangedLinesFromDiff(diff);
			if (lines.length) {
				return { changedLines: lines, filePath: file };
			}
		}catch(err) {
			errPaths.push(file);
		}
	}).filter(Boolean);
  
	if(errPaths.length) {
		console.log(`\n\nChanges found that are not in current range.\npaths: ${errPaths.join("\n")} \ncommit range: ${commitRange}\n\n`)
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
      outputForFile.messages = outputForFile.messages.filter(m =>
        x.changedLines.includes(m.line),
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

const reportResults = async results => {
  const formatter = await linter.loadFormatter('stylish');
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

const run = async (commitRange, ext, files) => {
  const changedFiles = await getChangedFiles(ext);
  const filteredFiles = filterChangedFilesByGlob(changedFiles, files);
  const resolvedFiles = await getResolvedPaths(filteredFiles);
  const changedFilesLineMap = await getLineMapForFiles(
    commitRange,
    resolvedFiles,
  );
  const lintResults = await applyLinter(changedFilesLineMap);
  const filteredLintResults = filterLinterMessages(
    changedFilesLineMap,
    lintResults,
  );
  const result = updateErrorAndWarningCounts(filteredLintResults);
  await reportResults(result);
};

export { run };
