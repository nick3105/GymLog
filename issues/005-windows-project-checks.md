# Issue 005 - Project checks fail on Windows

## What happens
The complete pytest run fails during collection because deploy_webhook imports Linux-only
fcntl. Prettier rejects CRLF line endings in unchanged files checked out on Windows.

## What should happen
Local checks run on Windows and Linux. Deployment still requires a real exclusive file lock;
never replace locking with a no-op. Prettier checks all formatting while accepting each
file's existing line endings. Do not reformat unrelated source files.

## How to reproduce
1. On Windows, run `cd backend` and `uv run pytest`.
2. Collection fails with `ModuleNotFoundError: No module named 'fcntl'`.
3. In frontend, run `npm run format:check` on a CRLF checkout.
4. Unchanged files are reported as formatting failures.

## Fix and verification
Use standard-library file locks on both operating systems (fcntl on Linux, msvcrt on
Windows). Release the lock even when deployment commands fail. Keep signed-delivery and
branch checks unchanged, and leave live PythonAnywhere untouched. Set Prettier's endOfLine
to auto. Run existing deployment tests, new lock/failure regressions and all project checks.
This is a local tooling fix; it changes no app screen or BRD behaviour.

The full Windows run also exposed an open SQLite connection in
`test_password_change_signs_out_other_devices`. Its assertion succeeds, but TemporaryDirectory
cleanup cannot delete the still-open database. The user approved correcting this test's
connection cleanup without changing assertions. Keep the transaction context for committing
the password change, and use `contextlib.closing` to close the connection before cleanup,
including when an exception occurs.
