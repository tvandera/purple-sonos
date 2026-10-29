SONOS_IMAGE ?= purplesonosweb
SONOS_TAG ?= latest
# linux/arm64 for Pi 3/4/5 on 64-bit OS; use linux/arm/v7 for 32-bit Raspberry Pi OS
PI_PLATFORM ?= linux/arm64
SONOS_TAR ?= $(SONOS_IMAGE)-pi.tar
SONOS_REGISTRY_IMAGE ?= ghcr.io/tvandera/purplesonosweb

.DEFAULT_GOAL := build
.PHONY: start-sonos-web build build-pi save-pi run-pi push

# Builds for the local machine's architecture.
build:
	docker build --file Dockerfile --tag $(SONOS_IMAGE):$(SONOS_TAG) ../perl

# Needs docker buildx (and qemu binfmt emulation when not building on arm).
build-pi:
	docker buildx build --platform $(PI_PLATFORM) --file Dockerfile \
		--tag $(SONOS_IMAGE):$(SONOS_TAG) --load ../perl

# Requires `docker login ghcr.io` with a token that has write:packages.
push:
	docker buildx build --platform $(PI_PLATFORM) --file Dockerfile \
		--tag $(SONOS_REGISTRY_IMAGE):$(SONOS_TAG) --push ../perl

save-pi: build-pi
	docker save --output $(SONOS_TAR) $(SONOS_IMAGE):$(SONOS_TAG)

# Run on the Pi itself; host networking is required for Sonos discovery.
run-pi:
	docker run --rm --network host \
		--mount type=volume,source=purplesonosweb-cache,target=/home/sonos/.cache/purplesonosweb \
		$(SONOS_IMAGE):$(SONOS_TAG)

start-sonos-web:
	docker-compose up --build --detach

		-vnc $(VNC)