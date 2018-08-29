/* jshint asi: false */
var QUnit = require('steal-qunit');
var sub = require('can-key/sub/sub');
var CanMap = require('can-map');
var List = require('can-list');
var compute = require('can-compute');
var canReflect = require('can-reflect');

require('./can-map-define');

QUnit.module('can-map-define');

// remove, type, default
QUnit.test('basics set', function() {
	var Defined = CanMap.extend({
		define: {
			prop: {
				set: function(newVal) {
					return "foo" + newVal;
				}
			}
		}
	});

	var def = new Defined();
	def.attr("prop", "bar");

	equal(def.attr("prop"), "foobar", "setter works");

	Defined = CanMap.extend({
		define: {
			prop: {
				set: function(newVal, setter) {
					setter("foo" + newVal);
				}
			}
		}
	});

	def = new Defined();
	def.attr("prop", "bar");

	equal(def.attr("prop"), "foobar", "setter callback works");

});

QUnit.test("basics remove", function() {
	var ViewModel = CanMap.extend({
		define: {
			makeId: {
				remove: function() {
					this.removeAttr("models");
				}
			},
			models: {
				remove: function() {
					this.removeAttr("modelId");
				}
			},
			modelId: {
				remove: function() {
					this.removeAttr("years");
				}
			},
			years: {
				remove: function() {
					this.removeAttr("year");
				}
			}
		}
	});

	var mmy = new ViewModel({
		makes: [
			{
				id: 1
			}
		],
		makeId: 1,
		models: [
			{
				id: 2
			}
		],
		modelId: 2,
		years: [2010],
		year: 2010
	});

	var events = ["year", "years", "modelId", "models", "makeId"],
		eventCount = 0,
		batchNum;

	mmy.bind("change", function(ev, attr) {
		if (batchNum === undefined) {
			batchNum = ev.batchNum;
		}
		equal(attr, events[eventCount++], "got correct attribute");
		ok(ev.batchNum && ev.batchNum === batchNum, "batched");
	});

	mmy.removeAttr("makeId");

});

QUnit.test("basics get", function(assert) {
	var done = assert.async();

	var Person = CanMap.extend({
		define: {
			fullName: {
				get: function() {
					return this.attr("first") + " " + this.attr("last");
				}
			}
		}
	});

	var p = new Person({ first: "Justin", last: "Meyer" });
	assert.equal(p.attr("fullName"), "Justin Meyer", "sync getter works");

	var Adder = CanMap.extend({
		define: {
			more: {
				get: function(curVal, setVal) {
					var num = this.attr("num");
					setTimeout(function() {
						setVal(num + 1);
					}, 10);
				}
			}
		}
	});

	var callbackCount = 0;
	var a = new Adder({ num: 1 });
	var callbackVals = [
		{
			newVal: 2,
			oldVal: undefined,
			next: function next() {
				a.attr("num", 2);
			}
		},
		{
			newVal: 3,
			oldVal: 2,
			next: done
		}
	];

	a.bind("more", function(ev, newVal, oldVal) {
		var vals = callbackVals[callbackCount++];

		assert.equal(newVal, vals.newVal, "newVal is correct");
		assert.equal(a.attr("more"), vals.newVal, "attr value is correct");
		assert.equal(oldVal, vals.oldVal, "oldVal is correct");
		setTimeout(vals.next, 10);
	});
});

QUnit.test("basic type", function() {

	expect(6);

	var Typer = CanMap.extend({
		define: {
			arrayWithAddedItem: {
				type: function(value) {
					if (value && value.push) {
						value.push("item");
					}
					return value;
				}
			},
			listWithAddedItem: {
				type: function(value) {
					if (value && value.push) {
						value.push("item");
					}
					return value;
				},
				Type: List
			}
		}
	});


	var t = new Typer();
	deepEqual(CanMap.keys(t), ["arrayWithAddedItem", "listWithAddedItem"], "defined keys");

	var array = [];
	t.attr("arrayWithAddedItem", array);

	deepEqual(array, ["item"], "updated array");
	equal(t.attr("arrayWithAddedItem"), array, "leave value as array");

	t.attr("listWithAddedItem", []);

	ok(t.attr("listWithAddedItem") instanceof List, "convert to List");
	equal(t.attr("listWithAddedItem").attr(0), "item", "has item in it");

	t.bind("change", function(ev, attr) {
		equal(attr, "listWithAddedItem.1", "got a bubbling event");
	});

	t.attr("listWithAddedItem").push("another item");

});

QUnit.test("basic Type", function() {
	var Foo = function(name) {
		this.name = name;
	};
	Foo.prototype.getName = function() {
		return this.name;
	};

	var Typer = CanMap.extend({
		define: {
			foo: {
				Type: Foo
			}
		}
	});

	var t = new Typer({
		foo: "Justin"
	});
	equal(t.attr("foo").getName(), "Justin", "correctly created an instance");

	var brian = new Foo("brian");

	t.attr("foo", brian);

	equal(t.attr("foo"), brian, "same instances");

});

QUnit.test("type converters", function() {

	var Typer = CanMap.extend({
		define: {
			date: {
				type: 'date'
			},
			string: {
				type: 'string'
			},
			number: {
				type: 'number'
			},
			'boolean': {
				type: 'boolean'
			},
			htmlbool: {
				type: 'htmlbool'
			},
			leaveAlone: {
				type: '*'
			}
		}
	});
	var obj = {};

	var t = new Typer({
		date: 1395896701516,
		string: 5,
		number: '5',
		'boolean': 'false',
		htmlbool: "",
		leaveAlone: obj
	});

	ok(t.attr("date") instanceof Date, "converted to date");

	equal(t.attr("string"), '5', "converted to string");

	equal(t.attr("number"), 5, "converted to number");

	equal(t.attr("boolean"), false, "converted to boolean");

	equal(t.attr("htmlbool"), true, "converted to htmlbool");

	equal(t.attr("leaveAlone"), obj, "left as object");
	t.attr({
		'number': '15'
	});
	ok(t.attr("number") === 15, "converted to number");

});


QUnit.test("basics value", function() {
	var Typer = CanMap.extend({
		define: {
			prop: {
				value: 'foo'
			}
		}
	});

	equal(new Typer().attr('prop'), "foo", "value is used as default value");


	var Typer2 = CanMap.extend({
		define: {
			prop: {
				value: function() {
					return [];
				},
				type: "*"
			}
		}
	});

	var t1 = new Typer2(),
		t2 = new Typer2();
	ok(t1.attr("prop") !== t2.attr("prop"), "different array instances");
	ok(Array.isArray(t1.attr("prop")), "its an array");


});

QUnit.test("basics Value", function() {

	var Typer = CanMap.extend({
		define: {
			prop: {
				Value: Array,
				type: "*"
			}
		}
	});

	var t1 = new Typer(),
		t2 = new Typer();
	ok(t1.attr("prop") !== t2.attr("prop"), "different array instances");
	ok(Array.isArray(t1.attr("prop")), "its an array");


});


QUnit.test("setter with no arguments and returns undefined does the default behavior, the setter is for side effects only", function() {

	var Typer = CanMap.extend({
		define: {
			prop: {
				set: function() {
					this.attr("foo", "bar");
				}
			}
		}
	});

	var t = new Typer();

	t.attr("prop", false);

	deepEqual(t.attr(), {
		foo: "bar",
		prop: false
	});


});

QUnit.test("type happens before the set", function() {
	var MyMap = CanMap.extend({
		define: {
			prop: {
				type: "number",
				set: function(newValue) {
					equal(typeof newValue, "number", "got a number");
					return newValue + 1;
				}
			}
		}
	});

	var map = new MyMap();
	map.attr("prop", "5");

	equal(map.attr("prop"), 6, "number");
});

QUnit.test("getter and setter work", function() {
	expect(5);
	var Paginate = CanMap.extend({
		define: {
			page: {
				set: function(newVal) {
					this.attr('offset', (parseInt(newVal) - 1) * this.attr('limit'));
				},
				get: function() {
					return Math.floor(this.attr('offset') / this.attr('limit')) + 1;
				}
			}
		}
	});

	var p = new Paginate({
		limit: 10,
		offset: 20
	});

	equal(p.attr("page"), 3, "page get right");

	p.bind("page", function(ev, newValue, oldValue) {
		equal(newValue, 2, "got new value event");
		equal(oldValue, 3, "got old value event");
	});

	p.attr("page", 2);

	equal(p.attr("page"), 2, "page set right");

	equal(p.attr("offset"), 10, "page offset set");


});

QUnit.test("getter with initial value", function() {

	var comp = compute(1);

	var Grabber = CanMap.extend({
		define: {
			vals: {
				type: "*",
				Value: Array,
				get: function(current, setVal) {
					if (setVal) {
						current.push(comp());
					}
					return current;
				}
			}
		}
	});

	var g = new Grabber();

	// This assertion doesn't mean much.  It's mostly testing
	// that there were no errors.
	equal(g.attr("vals").length, 0, "zero items in array");

});


QUnit.test("serialize basics", function() {
	var MyMap = CanMap.extend({
		define: {
			name: {
				serialize: function() {
					return;
				}
			},
			locations: {
				serialize: false
			},
			locationIds: {
				get: function() {
					var ids = [];
					this.attr('locations').forEach(function(location) {
						ids.push(location.id);
					});
					return ids;
				},
				serialize: function(locationIds) {
					return locationIds.join(',');
				}
			},
			bared: {
				get: function() {
					return this.attr("name") + "+bar";
				},
				serialize: true
			},
			ignored: {
				get: function() {
					return this.attr("name") + "+ignored";
				}
			}
		}
	});

	var map = new MyMap({
		name: "foo"
	});
	map.attr("locations", [{
		id: 1,
		name: "Chicago"
	}, {
		id: 2,
		name: "LA"
	}]);
	equal(map.attr("locationIds").length, 2, "get locationIds");
	equal(map.attr("locationIds")[0], 1, "get locationIds index 0");
	equal(map.attr("locations")[0].id, 1, "get locations index 0");

	var serialized = map.serialize();
	equal(serialized.locations, undefined, "locations doesn't serialize");
	equal(serialized.locationIds, "1,2", "locationIds serializes");
	equal(serialized.name, undefined, "name doesn't serialize");

	equal(serialized.bared, "foo+bar", "true adds computed props");
	equal(serialized.ignored, undefined, "computed props are not serialized by default");

});

QUnit.test("serialize context", function() {
	var context, serializeContext;
	var MyMap = CanMap.extend({
		define: {
			name: {
				serialize: function(obj) {
					context = this;
					return obj;
				}
			}
		},
		serialize: function() {
			serializeContext = this;
			CanMap.prototype.serialize.apply(this, arguments);

		}
	});

	var map = new MyMap();
	map.serialize();
	equal(context, map);
	equal(serializeContext, map);
});

QUnit.test("methods contexts", function() {
	var contexts = {};
	var MyMap = CanMap.extend({
		define: {
			name: {
				value: 'John Galt',

				get: function(obj) {
					contexts.get = this;
					return obj;
				},

				remove: function(obj) {
					contexts.remove = this;
					return obj;
				},

				set: function(obj) {
					contexts.set = this;
					return obj;
				},

				serialize: function(obj) {
					contexts.serialize = this;
					return obj;
				},

				type: function(val) {
					contexts.type = this;
					return val;
				}
			}

		}
	});

	var map = new MyMap();
	map.serialize();
	map.removeAttr('name');

	equal(contexts.get, map);
	equal(contexts.remove, map);
	equal(contexts.set, map);
	equal(contexts.serialize, map);
	equal(contexts.type, map);
});

QUnit.test("value generator is not called if default passed", function() {
	var TestMap = CanMap.extend({
		define: {
			foo: {
				value: function() {
					throw '"foo"\'s value method should not be called.';
				}
			}
		}
	});

	var tm = new TestMap({
		foo: 'baz'
	});

	equal(tm.attr('foo'), 'baz');
});

QUnit.test("Value generator can read other properties", function() {
	var Map = CanMap.extend({
		letters: 'ABC',
		numbers: [1, 2, 3],
		define: {
			definedLetters: {
				value: 'DEF'
			},
			definedNumbers: {
				value: [4, 5, 6]
			},
			generatedLetters: {
				value: function() {
					return 'GHI';
				}
			},
			generatedNumbers: {
				value: function() {
					return new List([7, 8, 9]);
				}
			},

			// Get prototype defaults
			firstLetter: {
				value: function() {
					return this.attr('letters').substr(0, 1);
				}
			},
			firstNumber: {
				value: function() {
					return this.attr('numbers.0');
				}
			},

			// Get defined simple `value` defaults
			middleLetter: {
				value: function() {
					return this.attr('definedLetters').substr(1, 1);
				}
			},
			middleNumber: {
				value: function() {
					return this.attr('definedNumbers.1');
				}
			},

			// Get defined `value` function defaults
			lastLetter: {
				value: function() {
					return this.attr('generatedLetters').substr(2, 1);
				}
			},
			lastNumber: {
				value: function() {
					return this.attr('generatedNumbers.2');
				}
			}
		}
	});

	var map = new Map();
	var prefix = 'Was able to read dependent value from ';

	equal(map.attr('firstLetter'), 'A',
		prefix + 'traditional CanMap style property definition');
	equal(map.attr('firstNumber'), 1,
		prefix + 'traditional CanMap style property definition');

	equal(map.attr('middleLetter'), 'E',
		prefix + 'define plugin style default property definition');
	equal(map.attr('middleNumber'), 5,
		prefix + 'define plugin style default property definition');

	equal(map.attr('lastLetter'), 'I',
		prefix + 'define plugin style generated default property definition');
	equal(map.attr('lastNumber'), 9,
		prefix + 'define plugin style generated default property definition');
});

QUnit.test('default behaviors with "*" work for attributes', function() {
	expect(9);
	var DefaultMap = CanMap.extend({
		define: {
			someNumber: {
				value: '5'
			},
			'*': {
				type: 'number',
				serialize: function(value) {
					return '' + value;
				},
				set: function(newVal) {
					ok(true, 'set called');
					return newVal;
				},
				remove: function(currentVal) {
					ok(true, 'remove called');
					return false;
				}
			}
		}
	});

	var map = new DefaultMap(),
		serializedMap;

	equal(map.attr('someNumber'), 5, 'value of someNumber should be converted to a number');
	map.attr('number', '10'); // Custom set should be called
	equal(map.attr('number'), 10, 'value of number should be converted to a number');
	map.removeAttr('number'); // Custom removed should be called
	equal(map.attr('number'), 10, 'number should not be removed');

	serializedMap = map.serialize();

	equal(serializedMap.number, '10', 'number serialized as string');
	equal(serializedMap.someNumber, '5', 'someNumber serialized as string');
	equal(serializedMap['*'], undefined, '"*" is not a value in serialized object');
});

QUnit.test('models properly serialize with default behaviors', function() {
	var DefaultMap = CanMap.extend({
		define: {
			name: {
				value: 'Alex'
			},
			shirt: {
				value: 'blue',
				serialize: true
			},
			'*': {
				serialize: false
			}
		}
	});
	var map = new DefaultMap({
			age: 10,
			name: 'John'
		}),
		serializedMap = map.serialize();

	equal(serializedMap.age, undefined, 'age doesn\'t exist');
	equal(serializedMap.name, undefined, 'name doesn\'t exist');
	equal(serializedMap.shirt, 'blue', 'shirt exists');
});

QUnit.test("nested define", function() {
	var nailedIt = 'Nailed it';
	var Example = CanMap.extend({}, {
		define: {
			name: {
				value: nailedIt
			}
		}
	});

	var NestedMap = CanMap.extend({}, {
		define: {
			isEnabled: {
				value: true
			},
			test: {
				Value: Example
			},
			examples: {
				value: {
					define: {
						one: {
							Value: Example
						},
						two: {
							value: {
								define: {
									deep: {
										Value: Example
									}
								}
							}
						}
					}
				}
			}
		}
	});

	var nested = new NestedMap();

	// values are correct
	equal(nested.attr('test.name'), nailedIt);
	equal(nested.attr('examples.one.name'), nailedIt);
	equal(nested.attr('examples.two.deep.name'), nailedIt);

	// objects are correctly instanced
	ok(nested.attr('test') instanceof Example);
	ok(nested.attr('examples.one') instanceof Example);
	ok(nested.attr('examples.two.deep') instanceof Example);
});

QUnit.test('Can make an attr alias a compute (#1470)', 9, function() {
	var computeValue = compute(1);
	var GetMap = CanMap.extend({
		define: {
			value: {
				set: function(newValue, setVal, setErr, oldValue) {
					if (newValue.isComputed) {
						return newValue;
					}
					if (oldValue && oldValue.isComputed) {
						oldValue(newValue);
						return oldValue;
					}
					return newValue;
				},
				get: function(value) {
					return value && value.isComputed ? value() : value;
				}
			}
		}
	});

	var getMap = new GetMap();

	getMap.attr("value", computeValue);

	equal(getMap.attr("value"), 1);

	var bindCallbacks = 0;

	getMap.bind("value", function(ev, newVal, oldVal) {

		switch (bindCallbacks) {
			case 0:
				equal(newVal, 2, "0 - bind called with new val");
				equal(oldVal, 1, "0 - bind called with old val");
				break;
			case 1:
				equal(newVal, 3, "1 - bind called with new val");
				equal(oldVal, 2, "1 - bind called with old val");
				break;
			case 2:
				equal(newVal, 4, "2 - bind called with new val");
				equal(oldVal, 3, "2 - bind called with old val");
				break;
		}


		bindCallbacks++;
	});

	// Try updating the compute's value
	computeValue(2);

	// Try setting the value of the property
	getMap.attr("value", 3);

	equal(getMap.attr("value"), 3, "read value is 3");
	equal(computeValue(), 3, "the compute value is 3");

	// Try setting to a new comptue
	var newComputeValue = compute(4);

	getMap.attr("value", newComputeValue);

});

QUnit.test('setting a value of a property with type "compute" triggers change events', function() {

	var handler;
	var message = 'The change event passed the correct {prop} when set with {method}';

	var createChangeHandler = function(expectedOldVal, expectedNewVal, method) {
		return function(ev, newVal, oldVal) {
			var subs = {
				prop: 'newVal',
				method: method
			};
			equal(newVal, expectedNewVal, sub(message, subs));
			subs.prop = 'oldVal';
			equal(oldVal, expectedOldVal, sub(message, subs));
		};
	};

	var ComputableMap = CanMap.extend({
		define: {
			computed: {
				type: 'compute',
			}
		}
	});

	var computed = compute(0);

	var m1 = new ComputableMap({
		computed: computed
	});

	equal(m1.attr('computed'), 0, 'm1 is 1');

	handler = createChangeHandler(0, 1, ".attr('computed', newVal)");
	m1.bind('computed', handler);
	m1.attr('computed', 1);
	m1.unbind('computed', handler);

	handler = createChangeHandler(1, 2, "computed()");
	m1.bind('computed', handler);
	computed(2);
	m1.unbind('computed', handler);
});

QUnit.test('replacing the compute on a property with type "compute"', function() {
	var compute1 = compute(0);
	var compute2 = compute(1);

	var ComputableMap = CanMap.extend({
		define: {
			computable: {
				type: 'compute'
			}
		}
	});

	var m = new ComputableMap();

	m.attr('computable', compute1);


	equal(m.attr('computable'), 0, 'compute1 readable via .attr()');

	m.attr('computable', compute2);


	equal(m.attr('computable'), 1, 'compute2 readable via .attr()');
});

// The old attributes plugin interferes severly with this test.
// TODO remove this condition when taking the plugins out of the main repository
QUnit.test('value and get (#1521)', function() {
	var MyMap = CanMap.extend({
		define: {
			data: {
				value: function() {
					return new List(['test']);
				}
			},
			size: {
				value: 1,
				get: function(val) {
					var list = this.attr('data');
					var length = list.attr('length');
					return val + length;
				}
			}
		}
	});

	var map = new MyMap({});
	equal(map.attr('size'), 2);
});


QUnit.test("One event on getters (#1585)", function() {

	var AppState = CanMap.extend({
		define: {
			person: {
				get: function(lastSetValue, setAttrValue) {
					if (lastSetValue) {
						return lastSetValue;
					} else if (this.attr("personId")) {
						setAttrValue(new CanMap({
							name: "Jose",
							id: 5
						}));
					} else {
						return null;
					}
				}
			}
		}
	});

	var appState = new AppState();
	var personEvents = 0;
	appState.bind("person", function(ev, person) {
		personEvents++;
	});

	appState.attr("personId", 5);


	appState.attr("person", new CanMap({
		name: "Julia"
	}));


	equal(personEvents, 2);
});

QUnit.test('Can read a defined property with a set/get method (#1648)', function() {
	// Problem: "get" is not passed the correct "lastSetVal"
	// Problem: Cannot read the value of "foo"

	var Map = CanMap.extend({
		define: {
			foo: {
				value: '',
				set: function(setVal) {
					return setVal;
				},
				get: function(lastSetVal) {
					return lastSetVal;
				}
			}
		}
	});

	var map = new Map();

	equal(map.attr('foo'), '', 'Calling .attr(\'foo\') returned the correct value');

	map.attr('foo', 'baz');

	equal(map.attr('foo'), 'baz', 'Calling .attr(\'foo\') returned the correct value');
});

QUnit.test('Can bind to a defined property with a set/get method (#1648)', 3, function() {
	// Problem: "get" is not called before and after the "set"
	// Problem: Function bound to "foo" is not called
	// Problem: Cannot read the value of "foo"

	var Map = CanMap.extend({
		define: {
			foo: {
				value: '',
				set: function(setVal) {
					return setVal;
				},
				get: function(lastSetVal) {
					return lastSetVal;
				}
			}
		}
	});

	var map = new Map();

	map.bind('foo', function() {
		ok(true, 'Bound function is called');
	});

	equal(map.attr('foo'), '', 'Calling .attr(\'foo\') returned the correct value');

	map.attr('foo', 'baz');

	equal(map.attr('foo'), 'baz', 'Calling .attr(\'foo\') returned the correct value');
});


QUnit.test("type converters handle null and undefined in expected ways (1693)", function() {

	var Typer = CanMap.extend({
		define: {
			date: {
				type: 'date',
				value: 'Mon Jul 30 2018 11:57:14 GMT-0500 (Central Daylight Time)'
			},
			string: {
				type: 'string',
				value: 'mudd'
			},
			number: {
				type: 'number',
				value: 42
			},
			'boolean': {
				type: 'boolean',
				value: false
			},
			htmlbool: {
				type: 'htmlbool',
				value: true
			},
			leaveAlone: {
				type: '*'
			}
		}
	});

	var t = new Typer().attr({
		date: undefined,
		string: undefined,
		number: undefined,
		'boolean': undefined,
		htmlbool: undefined,
		leaveAlone: undefined
	});

	equal(t.attr("date"), undefined, "converted to date");

	equal(t.attr("string"), undefined, "converted to string");

	equal(t.attr("number"), undefined, "converted to number");

	equal(t.attr("boolean"), undefined, "converted to boolean");

	equal(t.attr("htmlbool"), false, "converted to htmlbool");

	equal(t.attr("leaveAlone"), undefined, "left as object");

	t = new Typer().attr({
		date: null,
		string: null,
		number: null,
		'boolean': null,
		htmlbool: null,
		leaveAlone: null
	});

	equal(t.attr("date"), null, "converted to date");

	equal(t.attr("string"), null, "converted to string");

	equal(t.attr("number"), null, "converted to number");

	equal(t.attr("boolean"), null, "converted to boolean");

	equal(t.attr("htmlbool"), false, "converted to htmlbool");

	equal(t.attr("leaveAlone"), null, "left as object");

});

QUnit.test('Initial value does not call getter', function() {
	expect(0);

	var Map = CanMap.extend({
		define: {
			count: {
				get: function(lastVal) {
					ok(false, 'Should not be called');
					return lastVal;
				}
			}
		}
	});

	new Map({
		count: 100
	});
});

QUnit.test("getters produce change events", function() {
	var Map = CanMap.extend({
		define: {
			count: {
				get: function(lastVal) {
					return lastVal;
				}
			}
		}
	});

	var map = new Map();

	map.bind("change", function() {
		ok(true, "change called");
	});

	map.attr("count", 22);
});

QUnit.test("Asynchronous virtual properties cause extra recomputes (#1915)", function() {

	stop();

	var ran = false;
	var VM = CanMap.extend({
		define: {
			foo: {
				get: function(lastVal, setVal) {
					setTimeout(function() {
						if (setVal) {
							setVal(5);
						}
					}, 10);
				}
			},
			bar: {
				get: function() {
					var foo = this.attr('foo');
					if (foo) {
						if (ran) {
							ok(false, 'Getter ran twice');
						}
						ran = true;
						return foo * 2;
					}
				}
			}
		}
	});

	var vm = new VM();
	vm.bind('bar', function() {});

	setTimeout(function() {
		equal(vm.attr('bar'), 10);
		start();
	}, 200);

});


QUnit.test("double get in a compute (#2230)", function() {
	var VM = CanMap.extend({
		define: {
			names: {
				get: function(val, setVal) {
					ok(setVal, "setVal passed");
					return 'Hi!';
				}
			}
		}
	});

	var vm = new VM();

	var c = compute(function() {
		return vm.attr("names");
	});

	c.bind("change", function() {});

});

QUnit.test("nullish values are not converted for Type", function(assert) {

	var VM = CanMap.extend({
		define: {
			map: {
				Type: CanMap
			},
			notype: {},
		}
	});

	var vm = new VM({
		num: 1,
		bool: true,
		htmlbool: "foo",
		str: "foo",
		date: Date.now(),
		map: {},
		notype: {}
	});

	// Sanity check
	assert.ok(vm.attr("map") instanceof CanMap, "map is a Map");
	assert.ok(vm.attr("notype") instanceof CanMap, "notype is a Map");

	vm.attr({
		map: null,
		notype: null
	});

	assert.equal(vm.attr("map"), null, "map is null");
	assert.equal(vm.attr("map"), null, "notype is null");
});

QUnit.test("Wildcard serialize doesn't apply to getter properties (#4)", function() {
	var VM = CanMap.extend({
		define: {
			explicitlySerialized: {
				get: function () {
					return true;
				},
				serialize: true
			},
			implicitlySerialized: {
				get: function () {
					return true;
				}
			},
			'*': {
				serialize: true
			}
		}
	});

	var vm = new VM();
	vm.bind('change', function() {});

	deepEqual(vm.serialize(), {
		explicitlySerialized: true,
		implicitlySerialized: true
	});
});

QUnit.test("compute props can be set to null or undefined (#2372)", function(assert) {
	var VM = CanMap.extend({ define: {
	    foo: { type: 'compute' }
	}});

	var vmNull = new VM({foo: null});
	assert.equal(vmNull.foo, null, "foo is null, no error thrown");
	var vmUndef = new VM({foo: undefined});
	assert.equal(vmUndef.foo, undefined, "foo is null, no error thrown");
});

QUnit.test("can inherit computes from another map (#2)", 4, function(){
	var string1 = 'a string';
	var string2 = 'another string';

	var MapA = CanMap.extend({
		define: {
			propA: {
				get: function() {
					return string1;
				}
			},
			propB: {
				get: function() {
					return string1;
				},
				set: function(newVal) {
					equal(newVal, string1, 'set was called');
				}
			}
		}
	});
	var MapB = MapA.extend({
		define: {
			propC: {
				get: function() {
					return string2;
				}
			},
			propB: {
				get: function() {
					return string2;
				}
			}
		}
	});

	var map = new MapB();

	equal(map.attr('propC'), string2, 'props only in the child have the correct values');
	equal(map.attr('propB'), string2, 'props in both have the child values');
	equal(map.attr('propA'), string1, 'props only in the parent have the correct values');
	map.attr('propB', string1);

});

QUnit.test("can inherit primitive values from another map (#2)", function(){
	var string1 = 'a';
	var string2 = 'b';

	var MapA = CanMap.extend({
		define: {
			propA: {
				value: string1
			},
			propB: {
				value: string1
			}
		}
	});
	var MapB = MapA.extend({
		define: {
			propC: {
				value: string2
			},
			propB: {
				value: string2
			}
		}
	});

	var map = new MapB();

	equal(map.propC, string2, 'props only in the child have the correct values');
	equal(map.propB, string2, 'props in both have the child values');
	equal(map.propA, string1, 'props only in the parent have the correct values');

});

QUnit.test("can inherit object values from another map (#2)", function(){
	var object1 = {a: 'a'};
	var object2 = {b: 'b'};

	var MapA = CanMap.extend({
		define: {
			propA: {
				get: function() {
					return object1;
				}
			},
			propB: {
				get: function() {
					return object1;
				}
			}
		}
	});
	var MapB = MapA.extend({
		define: {
			propB: {
				get: function() {
					return object2;
				}
			},
			propC: {
				get: function() {
					return object2;
				}
			}
		}
	});

	var map = new MapB();

	equal(map.attr('propC'), 	object2, 'props only in the child have the correct values');
	equal(map.attr('propB'), 	object2, 'props in both have the child values');
	equal(map.attr('propA'), 	object1, 'props only in the parent have the correct values');
});


QUnit.test("can set properties to undefined", function(){
	var MyMap = CanMap.extend({
		define: {
			foo: {
				set: function(newVal) {
					return newVal;
				}
			}
		}
	});

	var map = new MyMap();

	map.attr('foo', 'bar');
	equal(map.attr('foo'), 'bar', 'foo should be bar');

	map.attr('foo', undefined);
	equal(typeof map.attr('foo'), 'undefined', 'foo should be undefined');
});

QUnit.test("subclass defines do not affect superclass ones", function(assert) {
	var VM = CanMap.extend({
		define: {
			foo: {
				type: "string",
				value: "bar"
			}
		}
	});


	var VM2 =  VM.extend({
		define: {
			foo: {
				value: "baz"
			}
		}
	});
	var VM2a = VM.extend({});

	var VM2b = VM.extend({
		define: {
			foo: {
				get: function() {
					return "quux";
				}
			}
		}
	});

	var VM2c = VM.extend({
		define: {
			foo: {
				type: function(oldVal) {
					return oldVal + "thud";
				}
			}
		}
	});

	assert.equal(new VM().attr("foo"), "bar", "correct define on parent class object");
	assert.equal(new VM2().attr("foo"), "baz", "correct define on redefined child class object");
	assert.equal(new VM2a().attr("foo"), "bar", "correct define on non-redefined child class object");
	assert.equal(new VM2b().attr("foo"), "quux", "correct define on child class object with different define");
	assert.equal(new VM2c().attr("foo"), "barthud", "correct define on child class object with extending define");
});

QUnit.test("value function not set on constructor defaults", function(){
	var MyMap = CanMap.extend({
		define: {
			propA: {
				value: function(){
					return 1;
				}
			}
		}
	});

	var map = new MyMap();

	equal(MyMap.defaults.propA, undefined, 'Generator function does not result in property set on defaults');
	notEqual(MyMap.defaultGenerators.propA, undefined, 'Generator function set on defaultGenerators');
	equal(map.attr("propA"), 1, 'Instance value set properly'); //this is mainly so that CI doesn't complain about unused variable

});

QUnit.test("can.hasKey", function() {
	var Parent = CanMap.extend({
		define: {
			parentProp: {
				type: "*"
			},

			parentDerivedProp: {
				get: function() {
					if (this.parentProp) {
						return "parentDerived";
					}
				}
			}
		},

		parentFunction: function() {
			return "parentFunction return value";
		}
	});

	var VM = Parent.extend({
		define: {
			prop: {
				type: "*"
			},

			derivedProp: {
				get: function() {
					if (this.prop) {
						return "derived";
					}
				}
			}
		},

		aFunction: function() {
			return "aFunction return value";
		}
	});

	var vm = new VM();

	// hasKey
	equal(canReflect.hasKey(vm, "prop"), true, "vm.hasKey('prop') true");
	equal(canReflect.hasKey(vm, "derivedProp"), true, "vm.hasKey('derivedProp') true");

	equal(canReflect.hasKey(vm, "parentProp"), true, "vm.hasKey('parentProp') true");
	equal(canReflect.hasKey(vm, "parentDerivedProp"), true, "vm.hasKey('parentDerivedProp') true");

	equal(canReflect.hasKey(vm, "anotherProp"), false, "vm.hasKey('anotherProp') false");

	equal(canReflect.hasKey(vm, "aFunction"), true, "vm.hasKey('aFunction') true");
	equal(canReflect.hasKey(vm, "parentFunction"), true, "vm.hasKey('parentFunction') true");

	vm.attr('lateProp', 'something');
	equal(canReflect.hasKey(vm, "lateProp"), true, "vm.hasKey('lateProp') true");
});

QUnit.test("can.getOwnEnumerableKeys", function() {
	var ParentMap = CanMap.extend({
		define: {
			parentNoEnum: {
				serialize: false,
				value: 'parent_no'
			},

			parentEnum: {
				serialize: true,
				value: 'parent_yes'
			},

			parentEnumByDefault: {
				value: 'maybe'
			},

			parentEnumGetter: {
				get: function () {
					return 'parent_get';
				}
			}
		}
	});

		var VM = ParentMap.extend({
		define: {
			notEnumerable: {
				serialize: false,
				value: 'no'
			},

			enumerableProp: {
				serialize: true,
				value: 'yes'
			},

			enumByDefault: {
				value: 'maybe'
			},

			enumGetter: {
				get: function () {
					return 'got';
				}
			}
		}
	});

	var vm = new VM();
	// getOwnEnumerableKeys for defined props, including copied from Parent
	deepEqual( canReflect.getOwnEnumerableKeys(vm), [ "enumerableProp", "enumByDefault", "parentEnum", "parentEnumByDefault" ], "vm.getOwnEnumerableKeys()");

	vm.attr('lateProp', true);
	deepEqual( canReflect.getOwnEnumerableKeys(vm), [ "enumerableProp", "enumByDefault", "parentEnum", "parentEnumByDefault", "lateProp" ], "vm.getOwnEnumerableKeys() with late prop");

});

QUnit.test("can.getOwnEnumerableKeys works without define (#81)", function() {
	var VM = CanMap.extend({});

	var vm = new VM({ foo: "bar" });
	deepEqual( canReflect.getOwnEnumerableKeys(vm), [ "foo" ], "without define");

	vm.attr("abc", "xyz");
	deepEqual( canReflect.getOwnEnumerableKeys(vm), [ "foo", "abc" ], "without define, with late prop");

	VM = CanMap.extend({
		define: {}
	});

	vm = new VM({ foo: "bar" });
	deepEqual( canReflect.getOwnEnumerableKeys(vm), [ "foo" ], "with empty define");

	vm.attr("abc", "xyz");
	deepEqual( canReflect.getOwnEnumerableKeys(vm), [ "foo", "abc" ], "with empty define, with late prop");
});

QUnit.test("can.getOwnEnumerableKeys works with null", function() {
	var VM = CanMap.extend({});

	var vm = new VM({ foo: null });
	deepEqual( canReflect.getOwnEnumerableKeys(vm), [ "foo" ], "getOwnEnumerableKeys works with null");
});

require("can-reflect-tests/observables/map-like/type/type")("CanMap / can-map-define", function(){
	return CanMap.extend({});
});

QUnit.test("can.getOwnEnumerableKeys with default behavior", function(assert) {
	var VM = CanMap.extend({
		define: {
			"*": {
				serialize: false
			},
			notEnumerable: {
				value: "no"
			},
			enumerableProp: {
				serialize: true,
				value: "yes"
			},
			notEnumerable2: {
				serialize: false,
				value: "maybe"
			},
			enumGetter: {
				get: function() {
					return "got";
				}
			}
		}
	});

	var vm = new VM();

	assert.deepEqual(
		canReflect.getOwnEnumerableKeys(vm), 
		["enumerableProp"],
		"vm.getOwnEnumerableKeys()"
	);
});

QUnit.test("can.getOwnEnumerableKeys with default behavior and late set properties", function(assert) {
	var VM = CanMap.extend({
		define: {
			"*": {
				serialize: false
			},
			notEnumerable: {
				value: "no"
			},
			enumerableProp: {
				serialize: true,
				value: "yes"
			}
		}
	});

	var vm = new VM();

	assert.deepEqual(
		canReflect.getOwnEnumerableKeys(vm),
		["enumerableProp"],
		"getOwnEnumerableKeys() should return explicitly serializable properties"
	);

	vm.attr("lateProperty", true);
	assert.deepEqual(
		canReflect.getOwnEnumerableKeys(vm),
		["enumerableProp"],
		"late set properties should inherit default behavior"
	);
});

QUnit.test("can.getOwnEnumerableKeys with default behavior, nested maps and late set props", function(assert) {
	var ParentMap = CanMap.extend({
		define: {
			parentNoEnum: {
				serialize: false,
				value: "parent_no"
			},
			parentEnum: {
				serialize: true,
				value: "parent_yes"
			},
			parentEnumByDefault: {
				value: "maybe"
			},
			parentEnumGetter: {
				get: function() {
					return "parent_get";
				}
			}
		}
	});

	var VM = ParentMap.extend({
		define: {
			"*": {
				serialize: false,
			},
			notEnumerable: {
				serialize: false,
				value: "no"
			},
			enumerableProp: {
				serialize: true,
				value: "yes"
			},
			alsoNotEnumerable: {
				value: "maybe"
			},
			enumGetter: {
				get: function() {
					return "got";
				}
			}
		}
	});

	var vm = new VM();
	assert.deepEqual(
		canReflect.getOwnEnumerableKeys(vm),
		["enumerableProp", "parentEnum"],
		"vm.getOwnEnumerableKeys()"
	);

	vm.attr("lateProperty", true);
	assert.deepEqual(
		canReflect.getOwnEnumerableKeys(vm),
		["enumerableProp", "parentEnum"],
		"late added properties should inherit default behavior"
	);
});
