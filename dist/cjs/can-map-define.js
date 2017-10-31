/*can-map-define@3.1.1#can-map-define*/
var dev = require('can-util/js/dev/dev');
var extend = require('can-util/js/assign/assign');
var isPlainObject = require('can-util/js/is-plain-object/is-plain-object');
var canEvent = require('can-event');
var batch = require('can-event/batch/batch');
var mapHelpers = require('can-map/map-helpers');
var CanMap = require('can-map');
var compute = require('can-compute');
require('can-list');
var define = {};
var getPropDefineBehavior = function (behavior, attr, define) {
    var prop, defaultProp;
    if (define) {
        prop = define[attr];
        defaultProp = define['*'];
        if (prop && prop[behavior] !== undefined) {
            return prop[behavior];
        } else if (defaultProp && defaultProp[behavior] !== undefined) {
            return defaultProp[behavior];
        }
    }
};
mapHelpers.define = function (Map, baseDefine) {
    var definitions = Map.prototype.define;
    if (baseDefine) {
        var defines = {};
        mapHelpers.twoLevelDeepExtend(defines, baseDefine);
        mapHelpers.twoLevelDeepExtend(defines, definitions);
        extend(definitions, defines);
    }
    Map.defaultGenerators = {};
    for (var prop in definitions) {
        var type = definitions[prop].type;
        if (typeof type === 'string') {
            if (typeof define.types[type] === 'object') {
                delete definitions[prop].type;
                extend(definitions[prop], define.types[type]);
            }
        }
        if ('value' in definitions[prop]) {
            if (typeof definitions[prop].value === 'function') {
                Map.defaultGenerators[prop] = definitions[prop].value;
            } else {
                Map.defaults[prop] = definitions[prop].value;
            }
        }
        if (typeof definitions[prop].Value === 'function') {
            (function (Constructor) {
                Map.defaultGenerators[prop] = function () {
                    return new Constructor();
                };
            }(definitions[prop].Value));
        }
    }
};
var oldSetupDefaults = CanMap.prototype._setupDefaults;
CanMap.prototype._setupDefaults = function (obj) {
    var defaults = extend({}, oldSetupDefaults.call(this)), propsCommittedToAttr = {}, Map = this.constructor, originalGet = this._get;
    this._get = function (originalProp) {
        var prop = originalProp.indexOf('.') !== -1 ? originalProp.substr(0, originalProp.indexOf('.')) : originalProp;
        if (prop in defaults && !(prop in propsCommittedToAttr)) {
            this.attr(prop, defaults[prop]);
            propsCommittedToAttr[prop] = true;
        }
        return originalGet.apply(this, arguments);
    };
    for (var prop in Map.defaultGenerators) {
        if (!obj || !(prop in obj)) {
            defaults[prop] = Map.defaultGenerators[prop].call(this);
        }
    }
    delete this._get;
    return defaults;
};
var proto = CanMap.prototype, oldSet = proto.__set;
proto.__set = function (prop, value, current, success, error) {
    var self = this;
    var errorCallback = function (errors) {
            var stub = error && error.call(self, errors);
            if (stub !== false) {
                canEvent.trigger(self, 'error', [
                    prop,
                    errors
                ], true);
            }
            return false;
        }, setter = getPropDefineBehavior('set', prop, this.define), getter = getPropDefineBehavior('get', prop, this.define);
    if (setter) {
        batch.start();
        var setterCalled = false, setValue = setter.call(this, value, function (value) {
                if (getter) {
                    self[prop](value);
                } else {
                    oldSet.call(self, prop, value, current, success, errorCallback);
                }
                setterCalled = true;
            }, errorCallback, getter ? this._computedAttrs[prop].compute.computeInstance.lastSetValue.get() : current);
        if (getter) {
            if (setValue !== undefined && !setterCalled && setter.length >= 1) {
                this._computedAttrs[prop].compute(setValue);
            }
            batch.stop();
            return;
        } else if (setValue === undefined && !setterCalled && setter.length > 1) {
            batch.stop();
            return;
        } else {
            if (!setterCalled) {
                oldSet.call(self, prop, setter.length === 0 && setValue === undefined ? value : setValue, current, success, errorCallback);
            }
            batch.stop();
            return this;
        }
    } else {
        oldSet.call(self, prop, value, current, success, errorCallback);
    }
    return this;
};
define.types = {
    'date': function (str) {
        var type = typeof str;
        if (type === 'string') {
            str = Date.parse(str);
            return isNaN(str) ? null : new Date(str);
        } else if (type === 'number') {
            return new Date(str);
        } else {
            return str;
        }
    },
    'number': function (val) {
        if (val == null) {
            return val;
        }
        return +val;
    },
    'boolean': function (val) {
        if (val == null) {
            return val;
        }
        if (val === 'false' || val === '0' || !val) {
            return false;
        }
        return true;
    },
    'htmlbool': function (val) {
        return typeof val === 'string' || !!val;
    },
    '*': function (val) {
        return val;
    },
    'string': function (val) {
        if (val == null) {
            return val;
        }
        return '' + val;
    },
    'compute': {
        set: function (newValue, setVal, setErr, oldValue) {
            if (newValue && newValue.isComputed) {
                return newValue;
            }
            if (oldValue && oldValue.isComputed) {
                oldValue(newValue);
                return oldValue;
            }
            return newValue;
        },
        get: function (value) {
            return value && value.isComputed ? value() : value;
        }
    }
};
var oldType = proto.__type;
proto.__type = function (value, prop) {
    var type = getPropDefineBehavior('type', prop, this.define), Type = getPropDefineBehavior('Type', prop, this.define), newValue = value;
    if (typeof type === 'string') {
        type = define.types[type];
    }
    if (type || Type) {
        if (type) {
            newValue = type.call(this, newValue, prop);
        }
        if (Type && newValue != null && !(newValue instanceof Type)) {
            newValue = new Type(newValue);
        }
        return newValue;
    } else if (isPlainObject(newValue) && newValue.define) {
        newValue = CanMap.extend(newValue);
        newValue = new newValue();
    }
    return oldType.call(this, newValue, prop);
};
var oldRemove = proto.__remove;
proto.__remove = function (prop, current) {
    var remove = getPropDefineBehavior('remove', prop, this.define), res;
    if (remove) {
        batch.start();
        res = remove.call(this, current);
        if (res === false) {
            batch.stop();
            return;
        } else {
            res = oldRemove.call(this, prop, current);
            batch.stop();
            return res;
        }
    }
    return oldRemove.call(this, prop, current);
};
var oldSetupComputes = proto._setupComputedProperties;
proto._setupComputedProperties = function () {
    oldSetupComputes.apply(this, arguments);
    for (var attr in this.define) {
        var def = this.define[attr], get = def.get;
        if (get) {
            mapHelpers.addComputedAttr(this, attr, compute.async(undefined, get, this));
        }
    }
};
var oldSingleSerialize = proto.___serialize;
var serializeProp = function (map, attr, val) {
    var serializer = attr === '*' ? false : getPropDefineBehavior('serialize', attr, map.define);
    if (serializer === undefined) {
        return oldSingleSerialize.call(map, attr, val);
    } else if (serializer !== false) {
        return typeof serializer === 'function' ? serializer.call(map, val, attr) : oldSingleSerialize.call(map, attr, val);
    }
};
proto.___serialize = function (name, val) {
    return serializeProp(this, name, val);
};
var oldSerialize = proto.serialize;
proto.serialize = function (property) {
    var serialized = oldSerialize.apply(this, arguments);
    if (property) {
        return serialized;
    }
    var serializer, val;
    for (var attr in this.define) {
        if (!(attr in serialized)) {
            serializer = this.define && (this.define[attr] && this.define[attr].serialize || this.define['*'] && this.define['*'].serialize);
            if (serializer) {
                val = serializeProp(this, attr, this.attr(attr));
                if (val !== undefined) {
                    serialized[attr] = val;
                }
            }
        }
    }
    return serialized;
};
module.exports = define;