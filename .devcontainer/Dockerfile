# Use the official Perl image
FROM perl:latest

# Install cpm, Carton, and build tools
ARG CPM_VERSION=1.1.6
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential curl libgd-dev locales && \
    curl -fsSL "https://github.com/skaji/cpm/releases/download/v${CPM_VERSION}/cpm" \
        -o /usr/local/bin/cpm && \
    chmod +x /usr/local/bin/cpm && \
    cpm install --global Carton && \
    echo en_US.UTF-8 >>/etc/locale.gen && \
    locale-gen

# Set working directory
WORKDIR /app

# Copy cpanfile and install dependencies
COPY cpanfile /app/
RUN carton install

# Copy the rest of your application
COPY . /app/

ARG USERNAME=vanderaa
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Create the user + add to sudo
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME --shell /bin/bash \
    && apt-get update \
    && apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME


# Optional: use carton for running your app
# ENTRYPOINT ["carton", "exec", "--"]
# CMD ["perl", "your-script.pl"]

# Or just run perl directly (useful if your code doesn't depend heavily on Carton)
# CMD ["perl", "your-script.pl"]

