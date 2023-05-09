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

const getLineMapForFiles = async (commitRange, changedFiles) => {
  const changedFilesLineMap = [];
  for (let i = 0; i < changedFiles.length; i++) {
    const file = changedFiles[i];
    const diff = execSync(`git diff ${commitRange} ${file}`).toString();
    const lines = getChangedLinesFromDiff(diff);
    if(lines.length) {
			changedFilesLineMap.push({ changedLines: lines, filePath: file });
		}
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

const applyLinter = async changedFiles => await linter.lintFiles(changedFiles.map(x=>x.filePath));

const reportResults = async results => {
  const formatter = await linter.loadFormatter('stylish');
  const formatted = formatter.format(results);
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
