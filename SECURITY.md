# Security Policy

## Supported Versions

| Version | Supported |
| :--- | :--- |
| `0.1.x` | :white_check_mark: |

## Security Architecture Notes

- **Command Execution**: Git commands are spawned via `std::process::Command::new("git").args(&args)` without invoking a shell interpreter (`sh` or `cmd.exe`), preventing shell command injection when handling branch names, file paths, or commit messages.
- **Credential Masking**: When Personal Access Tokens (PAT) are used via `http.extraHeader` during remote HTTPS operations, `execGit` automatically masks the `Authorization: Basic ***` header before recording entries in the in-app Git Command Log Console.

## Reporting a Vulnerability

Please **do not** report security vulnerabilities through public GitHub issues.

Instead, please use GitHub's **Private Vulnerability Reporting** ("Report a vulnerability" under the repository's **Security** tab) or contact the maintainer directly. You will receive an acknowledgment within 48 hours.
