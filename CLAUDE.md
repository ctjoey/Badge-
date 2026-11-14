# Working on Nuke30

- **Always ship to TestFlight after a change.** Once a change is committed and pushed, run the
  `iOS` workflow (`.github/workflows/ios.yml`) with `testflight: true` on the working branch.
  Don't ask first; the owner wants every change sent. Then check the run until it finishes and
  report the result.
- Explain steps for the owner click-by-click, in plain language.
- Don't push again while a TestFlight run is in progress: a push to the same branch cancels it.
