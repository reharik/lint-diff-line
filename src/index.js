import meow from 'meow'
import {run} from './lint-diff-line'

const cli = meow(`
  Usage
    $ lint-diff [<diff-input>]

	Options
	  --ext -e
  Examples
    $ lint-diff
    $ lint-diff HEAD~1..HEAD
    $ lint-diff master..my-branch
    $ lint-diff master..my-branch --ext js/ts
`, {
	flags: {

		ext: {
			type: 'string',
			alias: 'e'
		},}})
run(cli.input[0], cli.flags.ext?cli.flags.ext.split(','):undefined)
