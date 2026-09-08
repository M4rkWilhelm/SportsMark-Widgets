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

<script src="https://cdn.jsdelivr.net/gh/M4rkWilhelm/SportsMark-Widgets@v1.0.0/dist/sportsmark-widget.js"></script>
<script>
    SportsMarkWidget.create(document.getElementById('sportsmark-widget'), {
        title: 'Northwest Ace Highschool Sports', // Replaced by the logo if logo exists
        logoUrl: 'https://cdn.jsdelivr.net/gh/M4rkWilhelm/SportsMark-Widgets@v1.0.0/assets/images/nwAceHSSR.png',
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

<script src="https://cdn.jsdelivr.net/gh/M4rkWilhelm/SportsMark-Widgets@v1.0.0/dist/sportsmark-widget.js"></script>
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