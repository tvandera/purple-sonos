// DOM updates and playback display
// Set an element's text when its content changes.
function updateText(name, text) {
    var element = document.getElementById(name);
    if (element && (!element.innerHTML || element.innerHTML != text)) {
        element.innerHTML = text;
    }
}

// Show an image, or hide it when no source is available.
function updateSrc(name, src) {
    var element = document.getElementById(name);
    if (!element) return;
    if (!src) {
        element.style.display = "none"
    } else {
        element.src = src
        element.style.display = "inline"
    }
}

// Display one of two mutually exclusive controls.
function updateToggle(first, second, doFirst) {
    document.getElementById(first).style.display = (doFirst ? "inline" : "none");
    document.getElementById(second).style.display = (doFirst ? "none" : "inline");
}

// Render the current track, transport, volume, and artwork.
function drawControl() {
    var info = "";

    if (zone_info.av.title) {
        info += zone_info.av.title + '<br>';
    }

    if (zone_info.av.isradio) {
        info += zone_info.av.current_track.stream_content + '<br>';
    } else if (zone_info.av.current_track) {
        if (zone_info.av.current_track.album) {
            info += "&nbsp;<em>album:</em> ";
            info += zone_info.av.current_track.album + '<br>';
        }
        if (zone_info.av.current_track.artist) {
            info += "&nbsp;<em>artist:</em> " + zone_info.av.current_track.artist + '<br>';
        }
    }

    if (!info) {
        info = "<em>Not playing</em>";
    }

    updateText('info', info);

    updateToggle("pause", "play", zone_info.av.transport_state == "PLAYING");
    updateToggle("muteoff", "muteon", zone_info.render.muted);
    updateText("volume", "" + zone_info.render.volume + "%");
    var image = zone_info.av.current_track.albumart;
    if (!image) image = "tiles/missingaa_lite.svg";
    updateSrc('albumart', image);

    update();
}


// Navigation and view selection
// Navigate to a section or load a URL with additional query arguments.
function goto(base, extra) {
    if (typeof extra !== 'undefined') {
        window.location.href = 'index.html?' + zone_arg + music_arg + extra;
        return;
    }

    var section = document.getElementById(base);
    if (section) section.scrollIntoView();
}

// Expand or collapse the queue panel.
function toggleQueue() {
    var queue = document.getElementById("queue");
    if (queue) queue.classList.toggle("open");
}


// Open the music browser for the selected query.
function browse(music_arg) {
    window.location.href = "index.html?" + zone_arg + music_arg + "&action=Browse";
}
// Select a zone and preserve the current music query.
function zone(name) {
    window.location.href = "index.html?zone=" + name + "&" + music_arg;
}

// Startup and zone refresh
// Prepare the page for the selected zone and fetch its current state.
function initialize() {
    if (!zone_arg && default_zone_arg) {
        window.location.replace("index.html?" + default_zone_arg + music_arg);
        return;
    }

    var hasZone = Boolean(zone_arg);
    document.getElementById("no-zone").style.display = hasZone ? "none" : "block";
    var controls = ["current-track-info", "control", "mute", "volumes", "queueicon"];
    for (var i = 0; i < controls.length; i++) {
        document.getElementById(controls[i]).style.display = hasZone ? "" : "none";
    }

    update();
}

var zone_info = null;

// Fetch the latest zone state and redraw the controls.
function update() {
    if (!zone_arg) return;

    cmd = zone_info ? "Wait" : "None";
    r = send(
        cmd = cmd,
        what = "zone",
        onload = function () {
            zone_info = JSON.parse(this.responseText);
            last_update = zone_info.last_update;
            drawControl();
        }
    );
}

// Send an API request and optionally invoke a callback on completion.
function send(cmd, what, onload) {
    if (typeof what === "undefined") what = "none";
    if (typeof onload === "undefined") onload = null;
    var nowait = onload ? "0" : "1";

    var url = '/api?what=' + what + '&nowait=' + nowait + '&' + zone_arg + 'action=' + cmd + '&lastupdate=' + last_update;
    var r = new XMLHttpRequest();
    r.open("GET", url, true);
    if (onload) {
        r.onreadystatechange = function () {
            if (r.readyState === 4) onload.call(r);
        };
    }

    r.send();
    return r;
}

// Send a command, then navigate to the requested view.
function sendAndGo(cmd, next) {
    r = send(cmd, "none", function () { goto(next); });
}

// Playback and queue actions
// Navigate with a queue action and optional extra query arguments.
function queueAction(action, extra) {
    window.location.href = "index.html?" + zone_arg + "action=" + action + "&" + music_arg + (extra || "");
}
// Clear every item from the queue.
function removeall() { queueAction("RemoveAll"); }
// Seek to the supplied queue position or time.
function seek(to) { queueAction("Seek", to); }
// Start playback of the selected music query.
function play(music_arg) { sendAndGo("play&" + music_arg, "playing"); }
// Add the selected music query to the queue and open playback.
function add(music_arg) { sendAndGo("add&" + music_arg, "playing"); }

// Volume controls
// Lower volume by five points, clamped to the minimum.
function softer() {
    if (!zone_info || !zone_info.render) return;
    zone_info.render.volume -= 5;
    if (zone_info.render.volume < 0) zone_info.render.volume = 0;
    send('SetVolume&volume=' + zone_info.render.volume);
    updateText("volume", "" + zone_info.render.volume + "%");
}

// Raise volume by five points, clamped to the maximum.
function louder() {
    if (!zone_info || !zone_info.render) return;
    zone_info.render.volume = Number(zone_info.render.volume) + 5;
    if (zone_info.render.volume > 100) zone_info.render.volume = 100;
    send('SetVolume&volume=' + zone_info.render.volume);
    updateText("volume", "" + zone_info.render.volume + "%");
}


