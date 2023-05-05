import exec from 'execa'
import path from 'path'
import { ESLint } from 'eslint'

import { getChangedLinesFromDiff } from './lib/git'

const linter = new ESLint()

const getChangedFiles = async (ext, commitRange) => {
	const diff = await exec('git', ['diff', commitRange, '--name-only', '--diff-filter=ACM']);
	const diffs = diff.stdout.split('\n')
	const rootDirProcess = await exec('git', ['rev-parse', '--show-toplevel']);;
	const rootDir = rootDirProcess.stdout;
	const paths = ext ? diffs.filter(x => ext.some(y => x.endsWith(y))):diffs
	return paths.map(x => path.join(rootDir,x))
}

const getLineMapForFile = async (commitRange, filePath) => {
	const diff = await exec('git', ['diff', commitRange, filePath])
  const lines = getChangedLinesFromDiff(diff.stdout);
	return {changedLines: lines, filePath: filePath};
} 

const filterMessagesByFile = (map,  output) => {
		const outputForFile = output.find(x => x.filePath === map.filePath)
	outputForFile.messages = outputForFile.messages.filter(m => map.changedLines.includes(m.line));
	return outputForFile
}

const filterLinterMessages =  (changedFileLineMap, linterOutput) => {
		const filteredLintResult = changedFileLineMap.map(x => 
			filterMessagesByFile(x, linterOutput));
		
			return filteredLintResult.map(x => { 
			 return {...x,
			 warningCount: x.messages.filter(x => x.severity ===1).length,
			 errorCount:x.messages.filter(x =>x.severity===2).length,
			 fixableWarningCount: x.messages.filter(x=>x.severity ===1 && !!x.fix).length,
			 fixableErrorCount: x.messages.filter(x=>x.severity ===2 && !!x.fix).length,}
			});
}

const applyLinter =  async (changedFileLineMap) => {
	const fileList = changedFileLineMap.map(x => x.filePath);
	const lintResults = await linter.lintFiles(fileList);
	return filterLinterMessages(changedFileLineMap, lintResults)
}

const reportResults = async (results) => {
	const formatter = await linter.loadFormatter('stylish')
	const formatted = formatter.format(results);
	console.log(formatted);
	if(results.reduce((acc,x) => { return acc += x.errorCount},0) ===0 ){
		process.exit(0);
	}
	process.exit(results, 1)
}
const run = async (commitRange = 'HEAD', ext) => {

	const changedFiles = await getChangedFiles(ext, commitRange);
	// [{changedLines: lines, filePath: filePath}]
	const changedFilesLineMap = []
	for (let i = 0; i < changedFiles.length; i++) {
		const file = changedFiles[i];
		changedFilesLineMap.push(await getLineMapForFile( commitRange, file,));
	}
	const result = await applyLinter(changedFilesLineMap);
	await reportResults(result);
}
export {run}
