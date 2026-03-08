# Pizza Div - Project Rules

## Version Bumping (REQUIRED)

Before every commit/push/deploy, increment the version number in ALL of these locations:

1. `version.js` — `APP_VERSION`
2. `sw.js` — `CACHE_NAME` (e.g. `pizzadiv-v1.7.0`)
3. `index.html` — all `?v=X.Y.Z` cache-buster query strings on script/css tags

Use semver: patch for fixes, minor for features, major for breaking changes.

## Deployment (REQUIRED)

After making any changes to the game, ALWAYS:
1. Bump the version number (see above)
2. Run `cd /home/ami/dev/pizzadiv && bash deploy.sh` to deploy to production

This must happen every time code is changed so the user can test on their phone.
