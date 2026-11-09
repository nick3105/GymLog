# Working together on GitHub

## One shared repository

One student creates an empty GitHub repository and invites the other three as collaborators in repository Settings. Everyone clones the same repository and follows the README setup locally. Never commit `.venv`, `node_modules`, `frontend/dist` or anything from `cloud/instance/`.

## One small task per branch

1. Create an issue with a clear goal and acceptance checklist; assign one owner and one reviewer.
2. Update local `main`, then create a branch such as `feature/form-cancel`.
3. Work only on the agreed task. Run the README checks and manually try your change in the browser.
4. Commit with a meaningful message such as `Add cancel button to workout form`.
5. Push the branch and open a pull request into `main`. Complete the supplied template.
6. A different student reviews it and tries the app. Fix review comments, then merge. Delete the merged feature branch and update everyone's local `main`.

With GitHub Desktop: Fetch origin → Pull origin → New branch → edit → review changed files → Commit → Push origin → Create pull request. Use the website for review and merging. Avoid editing the same lines at the same time; coordinate before editing the same file as someone else. If you encounter a conflict, resolve it together and rerun the app. Do not overwrite another student's changes or force-push shared branches.

Optional terminal equivalent (after cloning; replace the example URL):

```sh
git clone https://github.com/YOUR-TEAM/GymLog.git
cd GymLog
git switch main
git pull --ff-only
git switch -c feature/form-cancel
# Make and verify changes first
git add frontend/src/App.tsx
git commit -m "Add cancel button to workout form"
git push -u origin feature/form-cancel
```

Use GitHub's pull-request page to review and merge. Never commit credentials. If repository settings allow it, require one review before merging to main. Each student should implement, review and explain code; ownership is coordination, not a restriction on learning.
