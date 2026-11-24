# Build dependencies stage
FROM perl:5.40 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      curl \
      libgd-dev \
      libxml2-dev \
      libssl-dev \
      wget && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY perl/cpanfile ./

# Keep dependencies alongside the application so they are copied to production.
ENV PERL5LIB=/opt/sonos/lib/perl5
RUN cpm install -L /opt/sonos --show-build-log-on-failure

COPY perl/ .
RUN perl Makefile.PL INSTALL_BASE=/opt/sonos && \
    make install

# Production runtime - minimal image
FROM perl:5.40-slim AS production

LABEL org.opencontainers.image.source="https://github.com/tvandera/purple-sonos"

RUN apt-get update && \
    apt-get install -y --no-install-recommends libgd3 libxml2 locales shared-mime-info && \
    echo 'en_US.UTF-8 UTF-8' >>/etc/locale.gen && \
    locale-gen && \
    rm -rf /var/lib/apt/lists/* && \
    useradd --system --create-home --shell /usr/sbin/nologin sonos

ENV LANG=en_US.UTF-8 \
    XDG_CACHE_HOME=/home/sonos/.cache \
    PERL5LIB=/opt/sonos/lib/perl5 \
    PATH=/opt/sonos/bin:$PATH

WORKDIR /opt/sonos
COPY --from=builder /opt/sonos /opt/sonos

RUN mkdir -p /home/sonos/.cache/purplesonosweb && \
    chown -R sonos:sonos /opt/sonos /home/sonos/.cache
USER sonos

# Sonos discovery uses SSDP multicast, so run with --network host.
EXPOSE 9999

CMD ["perl", "/opt/sonos/bin/sonod"]

# Development environment - full tooling
FROM perl:latest AS development

ARG USERNAME=vanderaa
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      curl \
      libgd-dev \
      libxml2-dev \
      locales \
      sudo \
      nodejs \
      npm && \
    echo 'en_US.UTF-8 UTF-8' >>/etc/locale.gen && \
    locale-gen && \
    rm -rf /var/lib/apt/lists/*

# Create the user with sudo access
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME --shell /bin/bash \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

WORKDIR /workspace
ENV LANG=en_US.UTF-8

# Default to production, can be overridden in devcontainer config
FROM production
