SONOS_IMAGE ?= purple-sonos
SONOS_TAG ?= latest
SONOS_ARM64_TAG ?= $(SONOS_TAG)-arm64
SONOS_X86_64_TAG ?= $(SONOS_TAG)-x86_64
# linux/arm64 for Pi 3/4/5 on 64-bit OS; use linux/arm/v7 for 32-bit Raspberry Pi OS
PI_PLATFORM ?= linux/arm64
SONOS_TAR ?= $(SONOS_IMAGE)-pi.tar
SONOS_REGISTRY_IMAGE ?= ghcr.io/tvandera/purple-sonos

.DEFAULT_GOAL := build
.PHONY: start-sonos-web build build-arm64 build-x86_64 build-all build-pi save-pi \
	run-arm64 run-x86_64 run-all run-pi push push-arm64 push-x86_64 push-all

# Builds for the local machine's architecture.
build:
	docker build --file Dockerfile --tag $(SONOS_IMAGE):$(SONOS_TAG) ../perl

build-arm64:
	docker buildx build --platform linux/arm64 --file Dockerfile \
		--tag $(SONOS_IMAGE):$(SONOS_ARM64_TAG) --load ../perl

build-x86_64:
	docker buildx build --platform linux/amd64 --file Dockerfile \
		--tag $(SONOS_IMAGE):$(SONOS_X86_64_TAG) --load ../perl

build-all: build-arm64 build-x86_64

# Needs docker buildx (and qemu binfmt emulation when not building on arm).
build-pi:
	docker buildx build --platform $(PI_PLATFORM) --file Dockerfile \
		--tag $(SONOS_IMAGE):$(SONOS_TAG) --load ../perl

# Requires `docker login ghcr.io` with a token that has write:packages.
push:
	docker buildx build --platform $(PI_PLATFORM) --file Dockerfile \
		--tag $(SONOS_REGISTRY_IMAGE):$(SONOS_TAG) --push ../perl

push-arm64:
	docker buildx build --platform linux/arm64 --file Dockerfile \
		--tag $(SONOS_REGISTRY_IMAGE):$(SONOS_ARM64_TAG) --push ../perl

push-x86_64:
	docker buildx build --platform linux/amd64 --file Dockerfile \
		--tag $(SONOS_REGISTRY_IMAGE):$(SONOS_X86_64_TAG) --push ../perl

push-all:
	docker buildx build --platform linux/arm64,linux/amd64 --file Dockerfile \
		--tag $(SONOS_REGISTRY_IMAGE):$(SONOS_TAG) --push ../perl

save-pi: build-pi
	docker save --output $(SONOS_TAR) $(SONOS_IMAGE):$(SONOS_TAG)

# Foreign architectures require Docker emulation support on the host.
run-arm64:
	docker run --rm --platform linux/arm64 --network host \
		--mount type=volume,source=purplesonosweb-cache,target=/home/sonos/.cache/purplesonosweb \
		$(SONOS_IMAGE):$(SONOS_ARM64_TAG)

run-x86_64:
	docker run --rm --platform linux/amd64 --network host \
		--mount type=volume,source=purplesonosweb-cache,target=/home/sonos/.cache/purplesonosweb \
		$(SONOS_IMAGE):$(SONOS_X86_64_TAG)

run-all:
	docker run --pull=always --rm --network host \
		--mount type=volume,source=purplesonosweb-cache,target=/home/sonos/.cache/purplesonosweb \
		$(SONOS_REGISTRY_IMAGE):$(SONOS_TAG)

# Run on the Pi itself; host networking is required for Sonos discovery.
run-pi:
	docker run --rm --network host \
		--mount type=volume,source=purplesonosweb-cache,target=/home/sonos/.cache/purplesonosweb \
		$(SONOS_IMAGE):$(SONOS_TAG)

start-sonos-web:
	docker-compose up --build --detach

		-vnc $(VNC)