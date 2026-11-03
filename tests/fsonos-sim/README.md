# fsonos-sim Discovery Test

Run from this directory with Docker Engine and Docker Compose v2 or newer:

```sh
make test
```

The simulator image builds the adjacent `../frankensonos` checkout with its
locked dependencies and memory-limited release profile. The Perl image uses
the production Dockerfile. Compose starts an S2 virtual household, starts the
installed `sonod` unchanged, and checks that `/api?what=zones` reports both
`Living Room` and `Bedroom` with distinct Sonos device IDs.

The simulator binds its player and unicast SSDP sockets to loopback. The two
containers therefore share a private network namespace, and a test-only relay
forwards multicast SSDP searches to the simulator and translates its
advertised addresses to the player listeners. SOAP and GENA use the simulator
directly. The test supplies no device URLs or cached locations.

`make test` removes containers and networks on exit. The first run builds the
simulator from source and may take several minutes.