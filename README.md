# Workout App — Phase 0 iPhone Google Sheets Test

This is a standalone static PWA for validating Google OAuth and Sheets API calls on iPhone Safari and in an installed Home Screen app. It is not the full workout tracker.

## 1. Create a GitHub repository and deploy

1. Create a new **public** repository, for example `workout-app`, with default branch `main`.
2. Upload the files in this folder, **including `.github/workflows/deploy.yml`** (GitHub's browser file upload may omit hidden directories; use Git or GitHub Desktop if necessary).
3. In the repository, open **Settings → Pages** and select **GitHub Actions** as the build/deployment source.
4. In **Actions**, wait for the `Deploy to GitHub Pages` workflow to finish. Your URL will resemble `https://YOUR-USERNAME.github.io/workout-app/`.
5. Open the deployed page and note the **Current origin** shown on screen. It will resemble `https://YOUR-USERNAME.github.io` (without `/workout-app/`).

## 2. Configure Google Cloud

1. In Google Cloud Console, create a project, e.g. `Personal Workout App`.
2. Under **APIs & Services → Library**, enable **Google Sheets API**.
3. Under **Google Auth Platform / OAuth consent screen**, configure the application name and audience. For a personal Gmail account, choose **External**, and leave the app in **Testing** for this experiment.
4. Add your own Google email address as a **test user**.
5. Under **Data Access / Scopes**, add `https://www.googleapis.com/auth/spreadsheets` if the interface requests it. This permission permits reading and writing spreadsheets accessible to the account, so only use this test app with an account you trust. Later versions can use narrower permissions where practical.
6. Create an OAuth client ID with **Application type: Web application**.
7. Add your GitHub Pages **origin**, e.g. `https://YOUR-USERNAME.github.io`, to **Authorized JavaScript origins**. Do not add the `/workout-app/` path. HTTPS is required.
8. Copy the **Client ID** (ending in `.apps.googleusercontent.com`). **Do not create or use a client secret in the app.**

Google Cloud console names may vary slightly over time.

## 3. Test Safari and Home Screen

1. Open the GitHub Pages URL in iPhone Safari.
2. Paste the OAuth client ID into the app and tap **Save client ID on this device**.
3. Tap **Connect Google**, sign in as the test user, and grant the Sheets permission.
4. Leave Spreadsheet ID blank, then tap **Write test workout and read it back**. The app creates a test spreadsheet, appends a uniquely identified row, and reads it back to confirm.
5. Tap **Open test spreadsheet** to verify it in Google Sheets.
6. In Safari, use **Share → Add to Home Screen** and choose to open as a web app if prompted.
7. Launch the Home Screen app. You may need to enter the OAuth client ID again if iOS gives it a separate storage context. Connect and repeat the test. Reuse the Spreadsheet ID if desired, or create another.
8. Record whether sign-in opens successfully, whether the Home Screen app returns to itself, and whether the write/read-back succeeds. Use **Copy diagnostics** to share errors (diagnostics intentionally exclude tokens).

## Expected caveats

- Google's authorization popup may fail or behave differently in iOS Home Screen standalone mode. That is the core risk being tested; a Safari success does **not** imply PWA success.
- The Google access token is kept in memory only and expires; reconnect if needed. There is no refresh-token or backend service in this experiment.
- The app shell can load offline after initial installation, but Google authorization and Sheets API operations require internet.
- A Google OAuth consent screen in Testing mode can require repeated authorization and has test-user restrictions. Do not publish broadly during Phase 0.
- A public GitHub Pages repository exposes the code, which is safe here because it contains no private credentials or workout data.
- This phase uses the `spreadsheets` scope to make creation of a test spreadsheet straightforward. For the full app, we should revisit least-privilege scope design.

## Success criteria

| Test | Expected |
|---|---|
| Safari Google connect | Connected |
| Safari Sheets append/read | SUCCESS |
| Home Screen Google connect | Connected |
| Home Screen Sheets append/read | SUCCESS |
| Reload Home Screen app | Loads normally; authorization may need repeating |

If Home Screen OAuth fails, save the diagnostics and report the exact behavior before we choose an alternate authorization approach.
