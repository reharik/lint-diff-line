import exec from 'execa';
import path from 'path';
import { ESLint } from 'eslint';

import { getChangedLinesFromDiff } from './lib/git';

const linter = new ESLint();

const getChangedFiles = async (ext, commitRange) => {
  const diff = await exec('git', [
    'diff',
    commitRange,
    '--name-only',
    '--diff-filter=ACM',
  ]);
  const diffs = diff.stdout.split('\n');
  const rootDirProcess = await exec('git', ['rev-parse', '--show-toplevel']);
  const rootDir = rootDirProcess.stdout;
  const paths = diffs.filter(x => ext.some(y => x.endsWith(y)));
  return paths.map(x => path.join(rootDir, x));
};

const getLineMapForFiles = async (commitRange, changedFiles) => {
  const changedFilesLineMap = [];
  for (let i = 0; i < changedFiles.length; i++) {
    const file = changedFiles[i];
    const diff = await exec('git', ['diff', commitRange, file]);
    const lines = getChangedLinesFromDiff(diff.stdout);
    changedFilesLineMap.push({ changedLines: lines, filePath: file });
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

const applyLinter = async changedFiles => await linter.lintFiles(changedFiles);

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
  process.exit(results, 1);
};

const run = async (commitRange = 'HEAD', ext) => {
  const changedFiles = await getChangedFiles(ext, commitRange);
  const changedFilesLineMap = await getLineMapForFiles(
    commitRange,
    changedFiles,
  );
  const lintResults = await applyLinter(changedFiles);
  const filteredLintResults = filterLinterMessages(
    changedFilesLineMap,
    lintResults,
  );
  const result = updateErrorAndWarningCounts(filteredLintResults);
  await reportResults(result);
};

export { run };
