import QUnit from 'steal-qunit';
import plugin from './can-map-define';

QUnit.module('can-map-define');

QUnit.test('Initialized the plugin', function(){
  QUnit.equal(typeof plugin, 'function');
  QUnit.equal(plugin(), 'This is the can-map-define plugin');
});
