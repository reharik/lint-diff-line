import meow from 'meow';
import { run } from './lint-diff-line';

const cli = meow(
  `
  Usage
    $ lint-diff-line

	Options
	  --range -r
	  --ext -e
		--files -f
		--fulFiles -F
  Examples
    $ lint-diff-line
    $ lint-diff-line -f HEAD~1..HEAD
    $ lint-diff-line -f master..my-branch
    $ lint-diff-line -f master..my-branch --ext js/ts
		// Note the quotes around -f
    $ lint-diff-line -f master..my-branch --ext js/ts -f 'src/**'
`,
  {
    flags: {
			range: {
				type: 'string',
				alias: 'r',
				default: 'HEAD'
			},
      ext: {
        type: 'string',
        alias: 'e',
				default: '.js'
      },
			files: {
				type: 'string',
				alias: 'f',
				default: '**'
			},
			fullFiles: {
				type: 'boolean',
				alias: 'F',
				default: 'false'
			}
    },
  },
);
const globs = cli.flags.files.split(' ');
const extentions = cli.flags.ext.split(',');
run(cli.flags.range, extentions, globs, cli.flags.fullFiles);
