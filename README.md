# SportsMark Widgets

SportsMark widget assets distributed via GitHub + jsDelivr.

## Live demos

- Vertical: https://m4rkwilhelm.github.io/SportsMark-Widgets/demos/vertical.html
- Horizontal: https://m4rkwilhelm.github.io/SportsMark-Widgets/demos/horizontal.html

## Published files

- `dist/sportsmark-widget.js`
- `assets/images/*` (sponsor logos)

## Example with logo header (vertical layout)

Use a tagged release for stable caching (recommended: `@v1.0.0`, `@v1.1.0`, etc.).



```html

<div id="sportsmark-widget" style="width:100%;height:100%;"></div>

<script src="https://cdn.jsdelivr.net/gh/M4rkWilhelm/SportsMark-Widgets@v1.1.0/dist/sportsmark-widget.js"></script>
<script>
    SportsMarkWidget.create(document.getElementById('sportsmark-widget'), {
        title: 'Northwest Ace Highschool Sports', // Replaced by the logo if logo exists
        logoUrl: 'https://cdn.jsdelivr.net/gh/M4rkWilhelm/SportsMark-Widgets@v1.1.0/assets/images/nwAceHSSR.png',
        titleUrl: 'https://example.com', // Optional: link URL for logo/title header (defaults to "#" if omitted)
        subtitle: '', // Ignored if blank
        widgetBg: '#e2e8f0',
        gameBg: '#f8fafc',
        headerBg: '#334155',
        navBg: '#334155',
        widgetBorderColor: '#64748b',
        gameBorderColor: '#64748b',
        widgetBorderWidth: '0px',
        gameBorderWidth: '1px',
        widgetBorderRadius: '0.25rem',
        gameBorderRadius: '0.25rem',
        refreshMs: 60000, // Refresh timer, 1 minute by default
        showLoginCta: true, // Enables bottom CTA row
        loginCta: {
            text: 'Log In / Sign Up',
            href: 'https://sportsmark.wsls.com/accounts/login/',
            loggedInText: 'Submit Scores',
            loggedInHref: 'https://sportsmark.wsls.com/',
            autoDetectLogin: true, // Uses localStorage ArcId.USER_PROFILE.uuid
            target: '_blank'
        },
        sportsMark: { // Primary data source; ScoreStream below is the fallback
            url: 'https://sportsmark.wsls.com/api/v1/games/', // Default; dev: https://sportsmark-dev.wsls.com/api/v1/games/
            timeoutMs: 8000 // Fall back to ScoreStream if SportsMark hasn't answered by then
        },
        scoreStream: {
            method: 'recommended.broadcast.games.search', // API method to use
            userWidgetIds: [YOUR_SCORESTREAM_WIDGET_ID], // Widget determines school list
            count: 30, // How many games to return
            apiKey: 'YOUR_SCORESTREAM_API_KEY'
        }
    });
</script>
```

## Example without logo header (horizontal layout)

```html

<div id="sportsmark-widget" style="width:100%;height:100%;"></div>

<script src="https://cdn.jsdelivr.net/gh/M4rkWilhelm/SportsMark-Widgets@v1.1.0/dist/sportsmark-widget.js"></script>
<script>
    SportsMarkWidget.create(document.getElementById('sportsmark-widget'), {
        showHeader: false, // Disables title, subtitle and logo
        widgetBg: '#e2e8f0',
        gameBg: '#f8fafc',
        headerBg: '#334155',
        navBg: '#334155',
        widgetBorderColor: '#64748b',
        gameBorderColor: '#64748b',
        widgetBorderWidth: '0px',
        gameBorderWidth: '1px',
        widgetBorderRadius: '0.25rem',
        gameBorderRadius: '0.25rem',
        refreshMs: 60000,
        scoreStream: {
            method: 'recommended.broadcast.games.search',
            userWidgetIds: [YOUR_SCORESTREAM_WIDGET_ID],
            count: 30,
            apiKey: 'YOUR_SCORESTREAM_API_KEY'
        }
    });
</script>
```

## Data sources

The widget loads games from SportsMark (`/api/v1/games/`) first. If that request fails for any reason
(network or CORS error, non-2xx status, unexpected payload, or no answer within `timeoutMs`), the same
refresh loads from ScoreStream using the `scoreStream` options instead. A successful SportsMark response
with no games is shown as-is (no fallback).

`sportsMark` options (all optional; SportsMark is used even when `sportsMark` is omitted):

| Option | Default | Notes |
| --- | --- | --- |
| `url` | `https://sportsmark.wsls.com/api/v1/games/` | Dev: `https://sportsmark-dev.wsls.com/api/v1/games/`, local: `http://127.0.0.1:8000/api/v1/games/` |
| `timeoutMs` | `8000` | Abort and fall back after this many milliseconds |
| `from`, `to` | server default (90 days back to 28 days ahead) | `YYYY-MM-DD`; at most 120 days apart |
| `sport` | all | `Football`, `Basketball`, `Baseball`, `Softball`, `Volleyball`, `Lacrosse`, `Soccer`, `Scholastic Bowl` |
| `gender` | all | `Boys`, `Girls`, or `Coed` (Scholastic Bowl only) |

SportsMark game cards follow the SportsMark site's labels: `Final` only when a game is marked final, `Scheduled` or
`In progress` for today and later, no label for an earlier game that has a score but isn't marked final, and
`No score reported` for an earlier game still at 0-0. When a game has an `article_url` (http or https only), its card
shows a **Read the story** link that opens in a new tab.

Set `sportsMark: false` to skip SportsMark and use ScoreStream only. Passing a custom `feed` function
bypasses both. With `debug: true`, the console shows which source answered and why a fallback happened.

The SportsMark origin must allow the embedding page in `CORS_ALLOWED_ORIGINS`; otherwise the browser
blocks the request and the widget falls back to ScoreStream.
