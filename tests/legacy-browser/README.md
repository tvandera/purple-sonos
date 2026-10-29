# Legacy Browser Testing

This directory contains the Android 4.4 QEMU VM setup and the containerised legacy browser used to test the Sonos web UI.

## Setup

Run `nix develop` (or use direnv) in this directory. The development shell provides Docker, Docker Compose, GNU Make, and QEMU.

## Android 4.4 VM

`make install` downloads the Android x86 4.4 ISO, creates a disk image, and boots the installer under QEMU. `make run` boots the installed VM. The default VNC display is `:1`.

## Containerised Browser

Start the browser with `make start-legacy-browser`, then connect with a VNC client at `localhost:5901`. Set `LEGACY_BROWSER_URL` to the UI URL to open; the default is `http://192.168.2.13:9999`. Stop it with `make stop-legacy-browser`.

The VNC password defaults to `sonos` and can be changed with `LEGACY_BROWSER_VNC_PASSWORD`. `ANDROID_44_USER_AGENT` configures the browser's mobile user agent.