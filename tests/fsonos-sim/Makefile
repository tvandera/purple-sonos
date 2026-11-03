.DEFAULT_GOAL := test
.PHONY: test down

test:
	@trap 'docker compose down --volumes --remove-orphans' EXIT INT TERM; \
		docker compose up --build --abort-on-container-exit --exit-code-from sonod-test

down:
	docker compose down --volumes --remove-orphans