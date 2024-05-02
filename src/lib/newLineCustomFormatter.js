'use strict';

const formatter = require('./customFormatter')

module.exports = function (results) {
	return formatter(results,false)
};
