# Build stage - Install dependencies
FROM perl:5.40-slim as builder

ARG CPM_VERSION=1.1.6
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      curl \
      libgd-dev \
      locales && \
    curl -fsSL "https://github.com/skaji/cpm/releases/download/v${CPM_VERSION}/cpm" \
      -o /usr/local/bin/cpm && \
    chmod +x /usr/local/bin/cpm && \
    cpm install --global Carton && \
    echo en_US.UTF-8 >>/etc/locale.gen && \
    locale-gen && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY perl/cpanfile /app/
RUN carton install --deployment

# Runtime stage - Minimal production image
FROM perl:5.40-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libgd3 \
      curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Carton vendor directory and cpanfile from builder
COPY --from=builder /app/local /app/local
COPY --from=builder /app/cpanfile.lock /app/cpanfile.lock
COPY perl/ /app/

# Set PERL5LIB to use local modules
ENV PERL5LIB="/app/local/lib/perl5"

# Health check (optional)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD perl -e 'use Sonos; print "OK"' || exit 1

CMD ["perl"]
