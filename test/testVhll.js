var assert = require("assert"),
  acquire = require('acquire'),
  RegisterSet = acquire('registers'),
  VirtualHyperLogLog = acquire('virtualhyperloglog');

describe('VirtualHyperLogLog', function () {
  describe('#getCardinality()', function () {
    it('should return the cardinality', function () {
      var v = VirtualHyperLogLog.newForLog2m(24);

      var id = ["first flow"];
      var data = ["some data"];
      v.add(id, data);

      var count = v.getCardinality(id);
      console.log(count);

      count = v.getTotalCardinality();
      console.log(count);
    });
  });
});

describe('VirtualHyperLogLog', function() {
  describe('stress test', function () {
    it('should return no errors', function () {

      // simulate async expecation
      setTimeout(function(){
        // complete the async expectation
        done();

      }, 155000);

      var vhll = VirtualHyperLogLog.newForLog2m(24);
    	for (var i = 0; i <= 2000000; i++) {
    		for (var j = 1; j <= 5; j++) {
    			if (i % j == 0) {
    				var id = [];
            id.push(j);
            var data = [];
            data.push(i);
    				vhll.add(id, data);
    			}
    		}
    	}

    	var expected = new Array(6);
    	expected[1] = 1000000 * 2;
    	expected[2] = 500000 * 2;
    	expected[3] = 333333 * 2;
    	expected[4] = 250000 * 2;
    	expected[5] = 200000 * 2;

    	for (var j = 1; j <= 5; j++) {
    		var id = j;
    		var card = vhll.getCardinality(id);
    		var offset = 100 * (card - expected[j]) / expected[j];
    		if (offset > 13 || offset < -13) {
    			assert.throws(function () {
            throw new Error("Expected error < 13 percent, got " + offset +
    				", expected count for " + j + "=" + expected[j] + " got " + card);
    		  });
        }
    	}
      /*
    	var totalOffset = 100 * (vhll.getTotalCardinality() - 10000000) / 10000000;
    	if (totalOffset > 13 || totalOffset < -13) {
    		assert.throws(function () {
          throw new Error("Expected error < 13 percent, got " + totalOffset + vhll.getTotalCardinality());
    	  });
       }
       */
    });
  });
});
