var assert = require("assert"),
  acquire = require('acquire'),
  RegisterSet = acquire('registers'),
  VirtualHyperLogLog = acquire('virtualhyperloglog');

describe('VirtualHyperLogLog', function() {
  describe('#getCardinality()', function () {
    it('should return no errors', function () {
      var vhll = new VirtualHyperLogLog().NewForLog2m(24);
    	for (var i = 0; i <= 2000000; i++) {
    		for (var j = 1; j <= 5; j++) {
    			if (i % j == 0) {
    				var id = j;
    				vhll.add(id, i);
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

    	var totalOffset = 100 * (vhll.getTotalCardinality() - 10000000) / 10000000;
    	if (totalOffset > 13 || totalOffset < -13) {
    		assert.throws(function () {
          throw new Error("Expected error < 13 percent, got " + totalOffset + vhll.getTotalCardinality());
    	  });
       }
    });
  });
});
