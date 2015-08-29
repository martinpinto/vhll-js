# Virtual HyperLogLog

A virtual HyperLogLog is a highly compact virtual maximum likelihood Sketch for counting big network data.

This is the first ever created implementation in JavaScript.

<b>TL;DR:</b> Multiple HyperLogLogs in one HyperLogLog, by sharing bits amongst each other (down to 0.1 bits in theory per register)

<b>Long version:</b>
The datastructure takes from the paper (see below) which proposes a new method, called virtual maximum likelihood sketches, to reduce memory consumption by cardinality estimation on a large number of flows. It embodies two ideas. The first idea is called virtual sketches, which uses no more than two bits per sketch on average, while retaining the functional equivalence to an FM sketch. The second idea is called virtual sketch vectors, which combine the sketches of all flows into a mixed common pool. Together, these two ideas can drastically reduce the overall memory overhead. Based on virtual sketches and virtual vectors, we design a cardinality estimation solution with an online operation module and an offline estimation module.

For details about the algorithm and citations please use this paper for now

["Highly Compact Virtual Maximum Likelihood Sketches for Counting Big Network Data" by Zhen Mo, Yan Qiao, Shigang Chen and Tao Li](http://www.cise.ufl.edu/~yqiao/publications/allerton14)

##Note
This implementation uses a a static bucket size of register size of 1 byte instead of 6 bits. It's still under development, but the main concept is implemented, just needs optimizations.

##Example usage:
```javascript
var RegisterSet = acquire('registers'),
  VirtualHyperLogLog = acquire('virtualhyperloglog');

var v = VirtualHyperLogLog.newForLog2m(24);

var id = ["first flow"];
var data = ["some data"];
v.add(id, data);

var count = v.getCardinality(id);

count = v.getTotalCardinality();
```
