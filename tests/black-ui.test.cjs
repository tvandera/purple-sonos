const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(
    path.join(__dirname, '../perl/html/black/simple.js'), 'utf8'
);

function controls(zoneInfo) {
    const context = vm.createContext({});
    vm.runInContext(source, context);
    const commands = [];
    const updates = [];
    context.zone_info = zoneInfo;
    context.send = command => commands.push(command);
    context.updateText = (name, text) => updates.push([name, text]);
    return { context, commands, updates };
}

for (const [handler, delta] of [
    ['softer', -5],
    ['louder', 5],
]) {
    test(`${handler} waits until zone data loads`, () => {
        const { context, commands, updates } = controls(null);
        assert.doesNotThrow(() => context[handler]());
        assert.deepEqual(commands, []);
        assert.deepEqual(updates, []);
    });

    test(`${handler} tolerates missing rendering data`, () => {
        const { context, commands, updates } = controls({});
        assert.doesNotThrow(() => context[handler]());
        assert.deepEqual(commands, []);
        assert.deepEqual(updates, []);
    });

    test(`${handler} updates loaded volume`, () => {
        const { context, commands, updates } = controls({ render: { volume: 50 } });
        context[handler]();
        assert.deepEqual(commands, [`SetVolume&volume=${50 + delta}`]);
        assert.equal(context.zone_info.render.volume, 50 + delta);
        assert.deepEqual(updates, [['volume', `${50 + delta}%`]]);
    });

    test(`${handler} handles string volumes numerically`, () => {
        const { context, commands } = controls({ render: { volume: '50' } });
        context[handler]();
        assert.equal(context.zone_info.render.volume, 50 + delta);
        assert.deepEqual(commands, [`SetVolume&volume=${50 + delta}`]);
    });

    test(`${handler} clamps volume to its limit`, () => {
        const limit = delta < 0 ? 0 : 100;
        const volume = delta < 0 ? 2 : 98;
        const { context, commands, updates } = controls({ render: { volume } });
        context[handler]();
        assert.deepEqual(commands, [`SetVolume&volume=${limit}`]);
        assert.equal(context.zone_info.render.volume, limit);
        assert.deepEqual(updates, [['volume', `${limit}%`]]);
    });
}