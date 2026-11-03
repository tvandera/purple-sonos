import json
from pathlib import Path
import signal
import socket
import subprocess
import tomllib


def main():
    ready_file = Path("/tmp/fsonos-ready")
    ready_file.unlink(missing_ok=True)
    simulator = subprocess.Popen(
        ["fsonos", "sim", "--scenario", "s2", "--json", "--seeds-out", "/tmp/seeds.toml"],
        stdout=subprocess.PIPE,
        text=True,
    )

    def stop(signum, frame):
        raise SystemExit(0)

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        report = json.loads(simulator.stdout.readline())
        if not report.get("ready"):
            raise RuntimeError("fsonos did not report readiness")
        print(json.dumps(report), flush=True)
        with open(report["routes"], "rb") as routes_file:
            routes = tomllib.load(routes_file)
        host, port = routes["ssdp"].rsplit(":", 1)
        replacements = {
            f"http://{player['ip']}:1400/".encode(): f"http://{player['addr']}/".encode()
            for player in report["players"]
        }

        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as multicast:
            multicast.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            multicast.bind(("", 1900))
            multicast.setsockopt(
                socket.IPPROTO_IP,
                socket.IP_ADD_MEMBERSHIP,
                socket.inet_aton("239.255.255.250") + socket.inet_aton("0.0.0.0"),
            )
            multicast.settimeout(1)
            ready_file.touch()
            while simulator.poll() is None:
                try:
                    request, client = multicast.recvfrom(65535)
                except TimeoutError:
                    continue
                if not request.startswith(b"M-SEARCH "):
                    continue
                with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as upstream:
                    upstream.bind(("127.0.0.1", 0))
                    upstream.settimeout(0.5)
                    upstream.sendto(request, (host, int(port)))
                    while True:
                        try:
                            response, _ = upstream.recvfrom(65535)
                        except TimeoutError:
                            break
                        for advertised, actual in replacements.items():
                            response = response.replace(advertised, actual)
                        multicast.sendto(response, client)
            raise RuntimeError(f"fsonos exited with status {simulator.returncode}")
    finally:
        ready_file.unlink(missing_ok=True)
        simulator.terminate()
        try:
            simulator.wait(timeout=5)
        except subprocess.TimeoutExpired:
            simulator.kill()
            simulator.wait()


if __name__ == "__main__":
    main()