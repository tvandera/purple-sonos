# Docker

Production container for the Sonos web app (`perl/scripts/sonod`, port 9999).

## Setup

Use Docker Compose and GNU Make to build and run the production container.

Building for a Raspberry Pi from a non-ARM machine needs `docker buildx` with QEMU/binfmt emulation.

## Files

- `Dockerfile`: multi-stage production image, built with `../perl/` as its context.
- `Dockerfile.dockerignore`: keeps build output and tests out of the image context.
- `docker-compose.yml`: builds and runs the image with host networking.

## Make targets

| Target | Description |
| --- | --- |
| `make build` | Build `purplesonosweb:latest` for the local machine's architecture |
| `make build-pi` | Build `purplesonosweb:latest` for `PI_PLATFORM` and load it locally |
| `make save-pi` | Build, then write `purplesonosweb-pi.tar` for `docker load` on the Pi |
| `make run-pi` | Run the image with host networking and a persistent cache volume |
| `make push` | Build and push to `ghcr.io/tvandera/purplesonosweb` |

Variables:

- `PI_PLATFORM`: `linux/arm64` by default (Pi 3/4/5 on a 64-bit OS). Use `linux/arm/v7` for 32-bit Raspberry Pi OS.
- `SONOS_TAG`: image tag, `latest` by default.
- `SONOS_REGISTRY_IMAGE`: registry image name used by `push`.

## Running

Sonos discovery uses SSDP multicast, so the container must use host networking. The web UI is then at `http://<host>:9999`.

```sh
docker compose up -d      # build and run from source
make run-pi               # run a built image
```

On the Pi, pull the pushed image instead of building:

```sh
docker run -d --network host --restart unless-stopped \
	--mount type=volume,source=purplesonosweb-cache,target=/home/sonos/.cache/purplesonosweb \
	ghcr.io/tvandera/purplesonosweb:latest
```

Compose, `make run-pi`, and the command above share the named Docker volume
`purplesonosweb-cache`. It stores the content and location JSON caches, the
album-art JSON index, and the album-art image files under
`/home/sonos/.cache/purplesonosweb` (`XDG_CACHE_HOME=/home/sonos/.cache`).
The volume survives container removal, recreation, and image rebuilds, including
`docker compose down`. Do not use `docker compose down -v` or remove the volume
unless you intend to clear these caches.

Existing caches in an old container are not migrated automatically. Before
removing that container, copy `/home/sonos/.cache/purplesonosweb` out with
`docker cp` if you need to preserve them, then restore them into the volume
with ownership matching the image's `sonos` user.

## Pushing to GitHub Container Registry

Log in with the GitHub CLI instead of a personal access token:

```sh
gh auth login --scopes write:packages    # or: gh auth refresh -s write:packages
gh auth token | docker login ghcr.io -u tvandera --password-stdin
make push
```
Run the Make targets from this directory. Running `make` builds `purplesonosweb:latest`.
The production image uses `../perl/` as its build context.

