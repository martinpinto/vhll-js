var acquire = require('acquire'),
	HyperLogLog = require('hyperloglog'),
	mmh3 = require('murmurhash3'),
	RegisterSet = acquire('registers');

var mAlpha = [
	0,
	0.44567926005415,
	1.2480639342271,
	2.8391255240079,
	6.0165231584811,
	12.369319965552,
	25.073991603109,
	50.482891762521,
	101.30047482549,
	202.93553337953,
	406.20559693552,
	812.74569741657,
	1625.8258887309,
	3251.9862249084,
	6504.3071471860,
	13008.949929672,
	26018.222470181,
	52036.684135280,
	104073.41696276,
	208139.24771523,
	416265.57100022,
	832478.53851627,
	1669443.2499579,
	3356902.8702907,
	6863377.8429508,
	11978069.823687,
	31333767.455026,
	52114301.457757,
	72080129.928986,
	68945006.880409,
	31538957.552704,
	3299942.4347441
]

var ALPHA_4_SINGLE_COUNTER = 0.44567926005415

function log2m(rsd) {
	return Math.log((1.106/rsd)*(1.106/rsd)) / Math.log(2);
}

function getVirtualEstimatorSize(physicalLog2m) {
	return physicalLog2m - 8;
}

function getAlphaMM(log2m) {
	var m = Math.pow(2, log2m);

	var alphaMM;

	// See the paper.
	switch (log2m) {
		case 4:
			alphaMM = 0.673 * Math.pow(2, m);
			break;
		case 5:
			alphaMM = 0.697 * Math.pow(2, m);
			break;
		case 6:
			alphaMM = 0.709 * Math.pow(2, m);
			break;
		default:
			alphaMM = (0.7213 / (1 + 1.079 / m)) * Math.pow(2, m);
	}

	return alphaMM;
}

function round(f) {
	return f + 0.5;
}

// Calculate the position of the leftmost 1-bit.
function getLeadingZeros(val, max) {
	var r = 1
	for (; val&0x8000000000000000 == 0 && r <= max; r++) {
		val <<= 1;
	}
	return r;
}

/**
* VirtualHyperLogLog a Highly Compact Virtual Maximum Likelihood Sketche
*/
var VirtualHyperLogLog = module.exports = function () {
	this.registers;               // *registerSet
	this.physicalLog2m;           // uint
	this.physicalM;               // uint
	this.physicalAlphaMM;         // float64
	this.virtualLog2m;            // uint
	this.virtualM;                // uint
	this.virtualAlphaMM;          // float64
	this.virtualCa;               // float64
	this.totalCardinalityCounter; // *hllpp.HLLPP
	this.totalCardinality;        // int64
	this.noiseCorrector;          // float64
}

/**
* NewForRsd creates a new VirtualHyperLogLog.
* It takes rsd - the relative standard deviation for the counter.
* smaller values create counters that require more space.
*/
function NewForRsd(rsd) {
	return NewForLog2m(log2m(rsd));
}

/**
* NewForLog2m creates a new VirtualHyperLogLog with a given log2m, which needs to be dividable by 8
*/
function NewForLog2m(log2m) {
	var rs = new RegisterSet(Math.pow(2, log2m));
	return newLog(log2m, rs);
}

/**
* New ...
*/
function newLog(physicalLog2m, registers) {
	var vhll =  new VirtualHyperLogLog();
	vhll.registers = registers;
	vhll.physicalLog2m = physicalLog2m;
	vhll.physicalAlphaMM = getAlphaMM(physicalLog2m);
	vhll.physicalM = Math.pow(2, physicalLog2m);

	//if (physicalLog2m < 7) {
	//	throw new Error("physicalLog2m needs to be >= 7");
	//}

	vhll.virtualLog2m = getVirtualEstimatorSize(physicalLog2m);
	vhll.virtualAlphaMM = getAlphaMM(vhll.virtualLog2m);

	vhll.virtualM = Math.pow(2, vhll.virtualLog2m);
	vhll.virtualCa = mAlpha[vhll.virtualLog2m];
	vhll.totalCardinality = -1;
	vhll.noiseCorrector = 1;
	vhll.totalCardinalityCounter = new HyperLogLog(0);
	return vhll;
}

/**
* Reset clears all data from the struct
*/
VirtualHyperLogLog.prototype.reset = function () {
	var self = this;
	self.totalCardinalityCounter = new HyperLogLog(0);
	self.totalCardinality = -1;
	self.noiseCorrector = 1;
	self.registers.reset();
}

/*
* @param:  id []byte
* @param: virtual uint
*/
VirtualHyperLogLog.prototype.getPhysicalRegisterFromVirtualRegister = function (id, virtual) {
	var self = this;
	var idx = mmh3.murmur128(id, function (err, hashValue) {
		if (err) throw err;
	});
	var n = (idx + 13) * 104729 + virtual;
	var h1 = mmh3.murmur128(n, function (err, hashValue) {
		if (err) throw err;
	});
	return (h1 & 0xFFFFFFFFFFFF) % self.physicalM;
}

/**
* Add pushes data to the vritual hyperloglog of a flow 'id'
* @param: id []byte
* @param: data []byte
*/
VirtualHyperLogLog.prototype.add = function (id, data) {
	var self = this;
	self.totalCardinality = -1;
	var data; // = append(data, id...);
	var h1 = mmh3.murmur128(id, function (err, hashValue) {
		if (err) throw err;
	});
	self.totalCardinalityCounter.Add(data);
	var virtualRegister = h1 >> (64 - self.virtualLog2m);
	var r = getLeadingZeros(((h1 << self.virtualLog2m)|(1 << (self.virtualLog2m - 1)) + 1) + 1, 32);
	var physicalRegister = self.getPhysicalRegisterFromVirtualRegister(id, virtualRegister);
	return self.registers.updateIfGreater(physicalRegister, r);
}

/**
* GetTotalCardinality returns cardinality across flows
*/
VirtualHyperLogLog.prototype.GetTotalCardinalityfunction = function () {
	var self = this;
	return self.totalCardinalityCounter.Count() * 2;
}

VirtualHyperLogLog.prototype.getTotalCardinality = function () {
	var self = this;
	if (self.totalCardinality >= 0) {
		return uint64(self.totalCardinality);
	}
	self.totalCardinality = self.totalCardinalityCounter.Count();

	var registerSum = 0;
	var count = self.registers.Count;
	var zeros = 0.0;

	var totalCardinalityFromPhySpace = 0;
	for (var j = 0; j < count; j++) {
		var val = self.registers.get(j);
		registerSum += 1.0 / (1 << val);
		if (val == 0) {
			zeros++;
		}
	}

	var estimate = self.physicalAlphaMM * (1 / registerSum);
	if (estimate <= (5.0 / 2.0) * count) {
		totalCardinalityFromPhySpace = round(count * Math.log(count / zeros));
	} else {
		totalCardinalityFromPhySpace = round(estimate);
	}

	self.noiseCorrector = 1.0 * self.totalCardinality / totalCardinalityFromPhySpace;
	self.totalCardinality = round(totalCardinalityFromPhySpace);
	return self.totalCardinality;
}

VirtualHyperLogLog.prototype.getNoiseMean = function() {
	var self = this;
	var nhat = self.getTotalCardinality();
	var m = self.physicalM;
	var s = self.virtualM;
	return nhat * (s / m);
}

/**
* GetCardinality return the cardinality of a flow 'id'
* @param: id []byte
*/
VirtualHyperLogLog.prototype.GetCardinality = function (id) {
	var self = this;
	var physicalCardinality = self.getTotalCardinality();
	var registerSum = 0;
	var zeros = 0;
	for (var j = 0; j < self.virtualM; j++) {
		var phyReg = self.getPhysicalRegisterFromVirtualRegister(id, j);
		var val = self.registers.get(phyReg);
		registerSum += 1.0 / (1 << val);
		if (val == 0) {
			zeros++;
		}
	}
	var estimate = self.virtualAlphaMM * (1 / registerSum);

	var virtualCardinality = round(estimate);

	var vp = float64(1.0 * self.physicalM * self.virtualM / (self.physicalM - self.virtualM))
	var result = 0;
	var noiseMean = self.getNoiseMean();

	if (self.virtualLog2m >= self.physicalLog2m - 6) {
		result = round(vp * (virtualCardinality / self.virtualM - physicalCardinality / self.physicalM));
	} else {
		result = round(vp * (virtualCardinality / self.virtualM - physicalCardinality / self.noiseCorrector / self.physicalM));
		if (result - (1.2 * noiseMean) > 0) {
			result = round(vp * (virtualCardinality / self.virtualM - physicalCardinality / self.physicalM));
		}
	}
	return result;
}

function main() {
	// test vhll.js
	NewForRsd(15);
}
main();
