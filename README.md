# lint-diff-line

Run eslint only in the changed parts of the code

## Acknowledgment
This is almost entirely a port of [lint-diff](https://github.com/grvcoelho/lint-diff).

 That library, at the time of the creation of this library has not been updated in 5 years and is using eslit 4.x. The library does not seem to be accepting pull requests, so I decided to do it my self. 

The original is written entirely in rambda and quite nicely so.  Unfortunately, my rambda abilities are questionable at best. I was unable to thorouly understand the code nor make updates for the new api versions until I ported it into boring old js.

I also have not had time to update it into typescript. But I intend eventually to do that.

The logic and hard work has all been done by grvcoelho. 
Thank you
## Why

[ESLint](https://github.com/eslint/eslint) is a great tool to enforce code
style in your code, but it has some limitations: it can only lint entire files.
When working with legacy code, we often have to make changes to very large
files (which would be too troublesome to fix all lint errors)and thus it would
be good to lint only the lines changed and not the entire file.

[lint-diff-line](https://github.com/reharik/lint-diff-line) receives a commit range and
uses [ESLint](https://github.com/eslint/eslint)  to lint the changed files and
filter only the errors introduced in the commit range (and nothing more).

### State of the art

* [lint-staged](https://github.com/okonet/lint-staged) is a similar tool that lints only the staged changes. It's very helpful for adding a precommit hook, but it cannot be used to enforce the styleguide on a Continuous Integration service like Travis, because the changes are already commited.

## Usage

1. Install it:

  ```sh
  $ npm install lint-diff-line
  ```

2. Install `eslint` and add your eslint configuration file.

3. Use it:

  ```sh
  # This will lint the last commit
  $ lint-diff-line -r HEAD^..HEAD

  # This will lint the differences between your current commit and your origin
  $ lint-diff-line -r origin/$(git branch --show-current)..$(git branch --show-current)

  # The default is just `.js` This will lint the last commit but only typescript and json files (for an example)
  $ lint-diff-line -r HEAD^..HEAD --ext .ts,.json

  # This will lint .ts and .json files only in the src/fubar folder
  $ lint-diff-line -r HEAD^..HEAD --ext .ts,.json -f '/src/fubar/**'

  ```

## Examples

1. Lint the last 3 commits:

  ```sh
  $ lint-diff-line -r HEAD~3..HEAD
  ```

2. Lint local changes that are not yet commited (similar to what [lint-staged](https://github.com/okonet/lint-staged) do):

  ```sh
  $ lint-diff-line -r HEAD
  # or
  $ lint-diff-line
  ```

## Flags

The git commit range e.g. `-r HEAD~1..HEAD`, `-r master..my-branch` etc

	--range -r :default 'HEAD'
Restict file extenstions e.g. `-e .js,.ts,.jsx,.tsx`

	--ext -e :default '.js'

A glob pattern for which files to lint. Please NOTE the quotes around the pattern e.g. `-f '/frontendApp/src/** backendApp/src/*.ts'`. multiple values can be used space deliniated
	
	--files -f :default '**'

## helpful values
I use this range pattern to lint the files changed since the last time I pushed to the remote.  This works great unless you have not yet pushed to remote (i.e. there is no version 'origin/whatever'), in which case it throws. I don't know quite how to get around that. I welcome ideas.
`-r origin/$(git branch --show-current)..$(git branch --show-current)`