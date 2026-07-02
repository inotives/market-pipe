# Phase 6 - Production Scheduling

## Purpose

Make production execution boring: scripts and systemd timers call the same CLI commands humans and agents use.

Scheduling should not introduce a second execution path.

## Scope

- `scripts/run-hourly.sh`.
- `scripts/run-daily.sh`.
- systemd service and timer units.
- Deployment notes.
- Log inspection runbook.
- Environment variable documentation for production runs.

## Out Of Scope

- Queue workers.
- Alerting service.
- Web dashboard.
- Custom scheduler inside the application.
- n8n-specific workflow definitions.

## Acceptance Signals

- `systemctl status` shows timer state.
- `journalctl -u <service>` shows job logs.
- Manual CLI runs and timer runs use the same commands.
- Deployment notes are enough for a fresh production install.

## Open Decisions

- Which commands belong in hourly versus daily scripts?
- Should production use compiled JavaScript or `tsx`?
- What is the minimum log format needed before adding alerting?

