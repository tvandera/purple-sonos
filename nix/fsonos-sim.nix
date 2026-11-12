{ pkgs, lib ? pkgs.lib, source ? ../../frankensonos }:

let
  src = source;
  rustOverlaySrc = pkgs.fetchFromGitHub {
    owner = "oxalica";
    repo = "rust-overlay";
    rev = "6b29b8e8d3cc8ebda9342fbbcc7ac06eff58e2fb";
    hash = "sha256-5V08BokWHSUU962Kcr/uSTWyy+1NqB7pjuyqjqXTqQU=";
  };
  rustPkgs = pkgs.extend (import rustOverlaySrc);
  toolchain = rustPkgs.rust-bin.nightly."2026-08-31".minimal;
  rustPlatform = rustPkgs.makeRustPlatform {
    rustc = toolchain;
    cargo = toolchain;
  };
in
rustPlatform.buildRustPackage {
  pname = "fsonos";
  version = "0.1.0";
  inherit src;

  cargoLock = {
    lockFile = "${src}/Cargo.lock";
    outputHashes = {
      "fastapi-core-0.4.4" = "sha256-elyc1WtUmwl7ma8ZIp8200rJJLZLqpgES6tuGzbdh1E=";
      "fastapi-macros-0.4.4" = "sha256-elyc1WtUmwl7ma8ZIp8200rJJLZLqpgES6tuGzbdh1E=";
      "fastapi-openapi-0.4.4" = "sha256-elyc1WtUmwl7ma8ZIp8200rJJLZLqpgES6tuGzbdh1E=";
      "fastapi-router-0.4.4" = "sha256-elyc1WtUmwl7ma8ZIp8200rJJLZLqpgES6tuGzbdh1E=";
      "fastapi-rust-0.4.4" = "sha256-elyc1WtUmwl7ma8ZIp8200rJJLZLqpgES6tuGzbdh1E=";
      "fastapi-types-0.4.4" = "sha256-elyc1WtUmwl7ma8ZIp8200rJJLZLqpgES6tuGzbdh1E=";
      "fastmcp-client-0.10.0" = "sha256-T0JryzvUW8AMiNbwB+piXz99clPk9wdKBUEElIrKnJQ=";
      "fastmcp-console-0.10.0" = "sha256-T0JryzvUW8AMiNbwB+piXz99clPk9wdKBUEElIrKnJQ=";
      "fastmcp-core-0.10.0" = "sha256-T0JryzvUW8AMiNbwB+piXz99clPk9wdKBUEElIrKnJQ=";
      "fastmcp-derive-0.10.0" = "sha256-T0JryzvUW8AMiNbwB+piXz99clPk9wdKBUEElIrKnJQ=";
      "fastmcp-rust-0.10.0" = "sha256-T0JryzvUW8AMiNbwB+piXz99clPk9wdKBUEElIrKnJQ=";
    };
  };

  cargoBuildFlags = [ "--package" "fsonos-cli" "--bin" "fsonos" "--features" "sim" ];
  cargoBuildJobs = 1;
  nativeBuildInputs = [ pkgs.makeWrapper ];
  CARGO_PROFILE_RELEASE_OPT_LEVEL = "1";
  CARGO_PROFILE_RELEASE_LTO = "false";
  CARGO_PROFILE_RELEASE_CODEGEN_UNITS = "16";
  CARGO_BUILD_JOBS = "1";
  doCheck = false;

  installPhase = ''
    runHook preInstall
    cargo install --offline --locked --path crates/fsonos-cli --root "$out" --bin fsonos --features sim
    makeWrapper "$out/bin/fsonos" "$out/bin/fsonos-sim" --add-flags sim
    runHook postInstall
  '';

  meta = {
    description = "FrankenSonos CLI with its virtual Sonos simulator";
    homepage = "https://github.com/Dicklesworthstone/frankensonos";
    license = lib.licenses.mit;
    mainProgram = "fsonos";
    platforms = lib.platforms.unix;
  };
}