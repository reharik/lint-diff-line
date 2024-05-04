const ramda = require('ramda');
const {
  addIndex,
  complement,
  curry,
  defaultTo,
  filter,
  insert,
  isEmpty,
  map,
  pipe,
  reduce,
  slice,
  startsWith,
} = ramda

const mapIndexed = addIndex(map)

const reduceIndexed = addIndex(reduce)

const firstItemStartsWith = curry((prefix, list) =>
  startsWith(prefix, list[0]))

const doesNotStartWith = complement(startsWith)

const splitEveryTime = curry((predicate, list) => {
  const splitIndexes = pipe(
    reduceIndexed((acc, item, index) => {
      if (predicate(item)) {
        return [...acc, index]
      }

      return acc
    }, []),
    insert(list.length - 1, list.length)
  )(list)

  const split = mapIndexed((splitIndex, i, splitIndexList) => {
    const previousIndex = defaultTo(0, splitIndexList[i - 1])
    const currentIndex = splitIndexList[i]

    return slice(previousIndex, currentIndex, list)
  })

  return pipe(
    split,
    filter(complement(isEmpty))
  )(splitIndexes)
})

module.exports = {
	mapIndexed,
	reduceIndexed,
	firstItemStartsWith,
	doesNotStartWith,
	splitEveryTime,
}