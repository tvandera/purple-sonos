# Production image; build with perl/ as the context.
FROM perl:5.40 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential curl libgd-dev libxml2-dev && \
    rm -rf /var/lib/apt/lists/*

ARG CPM_VERSION=1.1.6
RUN curl -fsSL "https://github.com/skaji/cpm/releases/download/v${CPM_VERSION}/cpm" \
        -o /usr/local/bin/cpm && \
    chmod +x /usr/local/bin/cpm

WORKDIR /src
COPY cpanfile ./
RUN --mount=type=cache,target=/root/.cache/cpm \
    cpm install --home=/root/.cache/cpm --local-lib-contained=/opt/sonos \
        https://github.com/tvandera/perlupnp/archive/refs/tags/v0.5.tar.gz && \
    cpm install --home=/root/.cache/cpm --local-lib-contained=/opt/sonos

COPY . .
RUN PERL5LIB=/opt/sonos/lib/perl5 perl Makefile.PL INSTALL_BASE=/opt/sonos && \
    make install

FROM perl:5.40-slim

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