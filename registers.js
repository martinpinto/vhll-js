/**
* RegisterSet ...
*/
var RegisterSet = module.exports = function (count) {
  this.count = count;
  this.size = count / 8;
	this.reset();
};

/*
* Constructor
*/
RegisterSet.prototype.init = function (count, initialValues) {
  var self = this;
  self.count = count;
	self.m = initialValues;
	self.size = rs.m.length;
}

RegisterSet.prototype.reset = function () {
  var self = this;
	self.m = new Array(Math.round(self.size));
}

RegisterSet.prototype.set = function (pos, val) {
	var self = this;
  self.m[pos/8] = val;
}

RegisterSet.prototype.get = function (pos) {
  var self = this;
	return self.m[pos/8];
}

RegisterSet.prototype.updateIfGreater = function (pos, val) {
	var self = this;
  if (self.m[pos/8] < val) {
		self.m[pos/8] = val;
		return true;
	}
	return false;
}

RegisterSet.prototype.merge = function (ors) {
  var self = this;
	for (var i = 0; val < ors.m.length; i++) {
		if (val > self.m[i]) {
			self.m[i] = val;
		}
	}
}

function main() {
  // test registers.js
  var rs = new RegisterSet(5);
  rs.set(3, 2);
  console.log(rs.updateIfGreater(3, 2));
}
main();
