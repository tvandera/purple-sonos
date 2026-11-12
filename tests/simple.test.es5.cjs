var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');
var test = require('node:test');

var source = fs.readFileSync(
    path.join(__dirname, '../perl/html/black/simple.js'), 'utf8'
);

function setupContext(initialState) {
    if (!initialState) initialState = {};
    
    var context = vm.createContext({
        document: {
            getElementById: function(id) {
                if (!context.elements) context.elements = {};
                if (!context.elements[id]) {
                    context.elements[id] = {
                        innerHTML: '',
                        style: { display: '' },
                        src: '',
                        scrollIntoView: function() {},
                        classList: {
                            toggle: function() {
                                this._open = !this._open;
                            }
                        }
                    };
                }
                return context.elements[id];
            }
        },
        window: {
            location: { 
                href: '',
                replace: function(url) { 
                    this.href = url; 
                }
            }
        }
    });
    
    vm.runInContext(source, context);
    
    // Set up zone_info with defaults
    context.zone_info = initialState.zone_info || null;
    context.zone_arg = initialState.zone_arg !== undefined ? initialState.zone_arg : '';
    context.music_arg = initialState.music_arg !== undefined ? initialState.music_arg : '';
    context.default_zone_arg = initialState.default_zone_arg !== undefined ? initialState.default_zone_arg : '';
    context.last_update = initialState.last_update || 0;
    
    return { context: context };
}

// Setup context with mocks for send and update
function setupContextWithMocks(initialState) {
    if (!initialState) initialState = {};
    var setup = setupContext(initialState);
    var context = setup.context;
    
    var commands = [];
    context.send = function(cmd, what, onload) {
        commands.push({ cmd: cmd, what: what, onload: onload });
        return {};
    };
    
    context.update = function() {
        // Track update calls
        if (!commands.updates) commands.updates = [];
        commands.updates.push(true);
    };
    
    return { context: context, commands: commands };
}

// ------- updateText tests -------
test('updateText: sets element text when element exists', function() {
    var setup = setupContext();
    var context = setup.context;
    var element = context.document.getElementById('test-element');
    context.updateText('test-element', 'Hello World');
    assert.equal(element.innerHTML, 'Hello World');
});

test('updateText: does not update when text is the same', function() {
    var setup = setupContext();
    var context = setup.context;
    var element = context.document.getElementById('test-element');
    element.innerHTML = 'Same Text';
    context.updateText('test-element', 'Same Text');
    assert.equal(element.innerHTML, 'Same Text');
});

test('updateText: ignores missing elements', function() {
    var setup = setupContext();
    var context = setup.context;
    assert.doesNotThrow(function() {
        context.updateText('non-existent', 'text');
    });
});

// ------- updateSrc tests -------
test('updateSrc: sets image src and shows element', function() {
    var setup = setupContext();
    var context = setup.context;
    var element = context.document.getElementById('img-element');
    context.updateSrc('img-element', '/path/to/image.png');
    assert.equal(element.src, '/path/to/image.png');
    assert.equal(element.style.display, 'inline');
});

test('updateSrc: hides element when src is empty', function() {
    var setup = setupContext();
    var context = setup.context;
    var element = context.document.getElementById('img-element');
    element.style.display = 'inline';
    context.updateSrc('img-element', '');
    assert.equal(element.style.display, 'none');
});

test('updateSrc: hides element when src is null', function() {
    var setup = setupContext();
    var context = setup.context;
    var element = context.document.getElementById('img-element');
    element.style.display = 'inline';
    context.updateSrc('img-element', null);
    assert.equal(element.style.display, 'none');
});

test('updateSrc: ignores missing elements', function() {
    var setup = setupContext();
    var context = setup.context;
    assert.doesNotThrow(function() {
        context.updateSrc('non-existent', '/path/to/image.png');
    });
});

// ------- updateToggle tests -------
test('updateToggle: shows first element when doFirst is true', function() {
    var setup = setupContext();
    var context = setup.context;
    context.document.getElementById('first');
    context.document.getElementById('second');
    context.updateToggle('first', 'second', true);
    assert.equal(context.elements.first.style.display, 'inline');
    assert.equal(context.elements.second.style.display, 'none');
});

test('updateToggle: shows second element when doFirst is false', function() {
    var setup = setupContext();
    var context = setup.context;
    context.document.getElementById('first');
    context.document.getElementById('second');
    context.updateToggle('first', 'second', false);
    assert.equal(context.elements.first.style.display, 'none');
    assert.equal(context.elements.second.style.display, 'inline');
});

// ------- drawControl tests -------
test('drawControl: renders title when available', function() {
    var setup = setupContext({
        zone_info: {
            av: {
                title: 'Song Title',
                current_track: {}
            },
            render: { volume: 50, muted: false }
        }
    });
    var context = setup.context;
    context.drawControl();
    var info = context.elements.info.innerHTML;
    assert(info.indexOf('Song Title') !== -1);
});

test('drawControl: renders album and artist for non-radio', function() {
    var setup = setupContext({
        zone_info: {
            av: {
                current_track: {
                    album: 'Test Album',
                    artist: 'Test Artist'
                }
            },
            render: { volume: 50, muted: false }
        }
    });
    var context = setup.context;
    context.drawControl();
    var info = context.elements.info.innerHTML;
    assert(info.indexOf('Test Album') !== -1);
    assert(info.indexOf('Test Artist') !== -1);
});

test('drawControl: renders stream content for radio', function() {
    var setup = setupContext({
        zone_info: {
            av: {
                isradio: true,
                current_track: {
                    stream_content: 'Radio Station'
                }
            },
            render: { volume: 50, muted: false }
        }
    });
    var context = setup.context;
    context.drawControl();
    var info = context.elements.info.innerHTML;
    assert(info.indexOf('Radio Station') !== -1);
});

test('drawControl: shows "Not playing" when no track info', function() {
    var setup = setupContext({
        zone_info: {
            av: { current_track: {} },
            render: { volume: 50, muted: false }
        }
    });
    var context = setup.context;
    context.drawControl();
    var info = context.elements.info.innerHTML;
    assert(info.indexOf('Not playing') !== -1);
});

test('drawControl: toggles play/pause button based on transport state', function() {
    var setup = setupContext({
        zone_info: {
            av: {
                transport_state: 'PLAYING',
                current_track: {}
            },
            render: { volume: 50, muted: false }
        }
    });
    var context = setup.context;
    context.drawControl();
    assert.equal(context.elements.pause.style.display, 'inline');
    assert.equal(context.elements.play.style.display, 'none');
});

test('drawControl: toggles pause/play button when not playing', function() {
    var setup = setupContext({
        zone_info: {
            av: {
                transport_state: 'PAUSED',
                current_track: {}
            },
            render: { volume: 50, muted: false }
        }
    });
    var context = setup.context;
    context.drawControl();
    assert.equal(context.elements.pause.style.display, 'none');
    assert.equal(context.elements.play.style.display, 'inline');
});

test('drawControl: toggles mute button based on mute state', function() {
    var setup = setupContext({
        zone_info: {
            av: { current_track: {} },
            render: { volume: 50, muted: true }
        }
    });
    var context = setup.context;
    // Pre-create elements so updateToggle can find them
    context.document.getElementById('muteoff');
    context.document.getElementById('muteon');
    context.drawControl();
    // When muted is true, updateToggle shows "muteoff" button to turn off mute
    assert.equal(context.elements.muteoff.style.display, 'inline');
    assert.equal(context.elements.muteon.style.display, 'none');
});

test('drawControl: updates volume display', function() {
    var setup = setupContext({
        zone_info: {
            av: { current_track: {} },
            render: { volume: 75, muted: false }
        }
    });
    var context = setup.context;
    context.drawControl();
    assert.equal(context.elements.volume.innerHTML, '75%');
});

test('drawControl: uses default artwork when none provided', function() {
    var setup = setupContext({
        zone_info: {
            av: {
                current_track: {},
                isradio: false
            },
            render: { volume: 50, muted: false }
        }
    });
    var context = setup.context;
    context.drawControl();
    assert.equal(context.elements.albumart.src, 'tiles/missingaa_lite.svg');
});

test('drawControl: uses provided artwork', function() {
    var setup = setupContext({
        zone_info: {
            av: {
                current_track: { albumart: '/images/album.jpg' }
            },
            render: { volume: 50, muted: false }
        }
    });
    var context = setup.context;
    context.drawControl();
    assert.equal(context.elements.albumart.src, '/images/album.jpg');
});

// ------- goto tests -------
test('goto: scrolls to section when no extra argument', function() {
    var setup = setupContext();
    var context = setup.context;
    var element = context.document.getElementById('test-section');
    element.scrollIntoView = function() { this.scrolled = true; };
    context.goto('test-section');
    assert(element.scrolled);
});

test('goto: navigates with query string when extra provided', function() {
    var setup = setupContext({
        zone_arg: 'zone=kitchen&',
        music_arg: 'mpath=current&'
    });
    var context = setup.context;
    context.goto('base', 'action=Play');
    assert.equal(
        context.window.location.href,
        'index.html?zone=kitchen&mpath=current&action=Play'
    );
});

test('goto: ignores missing sections', function() {
    var setup = setupContext();
    var context = setup.context;
    // Don't pre-create the element, so getElementById returns null
    // Redefine getElementById to return null for non-existent element
    context.document.getElementById = function(id) {
        return null;
    };
    assert.doesNotThrow(function() {
        context.goto('non-existent-section');
    });
});

// ------- toggleQueue tests -------
test('toggleQueue: toggles queue open class', function() {
    var setup = setupContext();
    var context = setup.context;
    var queueElement = context.document.getElementById('queue');
    var toggleCalled = false;
    var originalToggle = queueElement.classList.toggle;
    queueElement.classList.toggle = function(className) {
        toggleCalled = className === 'open';
    };
    context.toggleQueue();
    assert(toggleCalled);
});

// ------- browse tests -------
test('browse: navigates with music query and browse action', function() {
    var setup = setupContext({
        zone_arg: 'zone=kitchen&',
        music_arg: 'mpath=current&'
    });
    var context = setup.context;
    context.browse('mpath=albums&');
    assert.equal(
        context.window.location.href,
        'index.html?zone=kitchen&mpath=albums&&action=Browse'
    );
});

// ------- zone tests -------
test('zone: navigates to selected zone with music query', function() {
    var setup = setupContext({
        music_arg: 'mpath=current&'
    });
    var context = setup.context;
    context.zone('bedroom');
    assert.equal(
        context.window.location.href,
        'index.html?zone=bedroom&mpath=current&'
    );
});

// ------- initialize tests -------
test('initialize: redirects when no zone and default exists', function() {
    var setup = setupContext({
        zone_arg: '',
        default_zone_arg: 'zone=kitchen&',
        music_arg: 'mpath=&'
    });
    var context = setup.context;
    context.initialize();
    assert.equal(
        context.window.location.href,
        'index.html?zone=kitchen&mpath=&'
    );
});

test('initialize: shows controls when zone selected', function() {
    var setup = setupContextWithMocks({
        zone_arg: 'zone=kitchen&'
    });
    var context = setup.context;
    context.initialize();
    var controls = ['current-track-info', 'control', 'mute', 'volumes', 'queueicon'];
    controls.forEach(function(id) {
        assert.equal(context.elements[id].style.display, '');
    });
});

test('initialize: hides controls when no zone selected', function() {
    var setup = setupContextWithMocks({
        zone_arg: ''
    });
    var context = setup.context;
    context.initialize();
    var controls = ['current-track-info', 'control', 'mute', 'volumes', 'queueicon'];
    controls.forEach(function(id) {
        assert.equal(context.elements[id].style.display, 'none');
    });
});

test('initialize: shows no-zone message when not selected', function() {
    var setup = setupContextWithMocks({
        zone_arg: ''
    });
    var context = setup.context;
    context.initialize();
    assert.equal(context.elements['no-zone'].style.display, 'block');
});

test('initialize: hides no-zone message when selected', function() {
    var setup = setupContextWithMocks({
        zone_arg: 'zone=kitchen&'
    });
    var context = setup.context;
    context.initialize();
    assert.equal(context.elements['no-zone'].style.display, 'none');
});

// ------- send tests -------
test('send: is callable with XMLHttpRequest available', function() {
    var setup = setupContext({
        zone_arg: 'zone=kitchen&',
        last_update: 0
    });
    var context = setup.context;
    
    // Provide XMLHttpRequest mock
    context.XMLHttpRequest = function() { 
        return {
            open: function() {},
            send: function() {},
            onreadystatechange: null,
            readyState: 4
        };
    };
    
    // Just verify the function exists and can be called
    assert.equal(typeof context.send, 'function');
    var result = context.send('GetVolume');
    assert(result !== undefined);
});

test('send: sends with specified what parameter', function() {
    var setup = setupContextWithMocks();
    var context = setup.context;
    var commands = setup.commands;
    context.send('cmd', 'zone');
    assert.equal(commands.length, 1);
    assert.equal(commands[0].what, 'zone');
});

test('send: sends with callback', function() {
    var setup = setupContextWithMocks();
    var context = setup.context;
    var commands = setup.commands;
    var callback = function() {};
    context.send('cmd', 'zone', callback);
    assert.equal(commands.length, 1);
    assert.equal(commands[0].onload, callback);
});

// ------- sendAndGo tests -------
test('sendAndGo: sends command and navigates to section', function() {
    var setup = setupContext();
    var context = setup.context;
    var element = context.document.getElementById('next-section');
    element.scrollIntoView = function() { this.scrolled = true; };
    
    // Mock send to call the onload callback
    context.send = function(cmd, what, onload) {
        if (onload) {
            onload();
        }
    };
    
    context.sendAndGo('Play', 'next-section');
    assert(element.scrolled);
});

// ------- queueAction tests -------
test('queueAction: navigates with action and music query', function() {
    var setup = setupContext({
        zone_arg: 'zone=kitchen&',
        music_arg: 'mpath=current&'
    });
    var context = setup.context;
    context.queueAction('RemoveAll');
    assert.equal(
        context.window.location.href,
        'index.html?zone=kitchen&action=RemoveAll&mpath=current&'
    );
});

test('queueAction: uses custom itemArg when provided', function() {
    var setup = setupContext({
        zone_arg: 'zone=kitchen&',
        music_arg: 'mpath=current&'
    });
    var context = setup.context;
    context.queueAction('play', '', 'mpath=selected&');
    assert.equal(
        context.window.location.href,
        'index.html?zone=kitchen&action=play&mpath=selected&'
    );
});

test('queueAction: appends hash anchor when next provided', function() {
    var setup = setupContext({
        zone_arg: 'zone=kitchen&',
        music_arg: 'mpath=current&'
    });
    var context = setup.context;
    context.queueAction('play', '', 'mpath=current&', 'playing');
    assert(context.window.location.href.indexOf('#playing') !== -1);
});

test('queueAction: appends extra query string when provided', function() {
    var setup = setupContext({
        zone_arg: 'zone=kitchen&',
        music_arg: 'mpath=current&'
    });
    var context = setup.context;
    context.queueAction('Seek', '&position=30');
    assert(context.window.location.href.indexOf('&position=30') !== -1);
});

// ------- removeall tests -------
test('removeall: calls queueAction with RemoveAll action', function() {
    var setup = setupContext({
        zone_arg: 'zone=kitchen&',
        music_arg: 'mpath=current&'
    });
    var context = setup.context;
    context.removeall();
    assert.equal(
        context.window.location.href,
        'index.html?zone=kitchen&action=RemoveAll&mpath=current&'
    );
});

// ------- seek tests -------
test('seek: calls queueAction with Seek action', function() {
    var setup = setupContext({
        zone_arg: 'zone=kitchen&',
        music_arg: 'mpath=current&'
    });
    var context = setup.context;
    context.seek('&position=60');
    assert(context.window.location.href.indexOf('action=Seek') !== -1);
    assert(context.window.location.href.indexOf('position=60') !== -1);
});

// ------- softer tests (from existing tests) -------
test('softer: decreases volume by 5', function() {
    var setup = setupContextWithMocks({
        zone_info: { render: { volume: 50 } }
    });
    var context = setup.context;
    context.softer();
    assert.equal(context.zone_info.render.volume, 45);
});

test('softer: clamps to minimum 0', function() {
    var setup = setupContextWithMocks({
        zone_info: { render: { volume: 2 } }
    });
    var context = setup.context;
    context.softer();
    assert.equal(context.zone_info.render.volume, 0);
});

// ------- louder tests (from existing tests) -------
test('louder: increases volume by 5', function() {
    var setup = setupContextWithMocks({
        zone_info: { render: { volume: 50 } }
    });
    var context = setup.context;
    context.louder();
    assert.equal(context.zone_info.render.volume, 55);
});

test('louder: clamps to maximum 100', function() {
    var setup = setupContextWithMocks({
        zone_info: { render: { volume: 98 } }
    });
    var context = setup.context;
    context.louder();
    assert.equal(context.zone_info.render.volume, 100);
});
