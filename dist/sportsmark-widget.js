(function () {
    function escapeHTML(str) {
        if (str == null) {
            return "";
        }
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    function sanitizeColor(color) {
        if (color == null) {
            return "";
        }
        return String(color).replace(/[^a-zA-Z0-9#(),. \/\-]/g, "");
    }
    function sanitizeCssLength(value, fallback) {
        if (value == null) {
            return fallback;
        }

        if (typeof value === "number") {
            if (!Number.isFinite(value) || value < 0) {
                return fallback;
            }
            return value + "px";
        }

        var normalized = String(value).trim().toLowerCase();
        if (/^0(?:\.0+)?$/.test(normalized)) {
            return "0";
        }
        if (/^(?:\d+\.\d+|\d+|\.\d+)(px|rem|em|%)$/.test(normalized)) {
            return normalized;
        }

        return fallback;
    }
    function debugLog(enabled, message, details) {
        if (!enabled || typeof console === "undefined" || typeof console.log !== "function") {
            return;
        }
        if (typeof details === "undefined") {
            console.log("[SportsMarkWidget] " + message);
            return;
        }
        console.log("[SportsMarkWidget] " + message, details);
    }
    function pad(number) {
        return number < 10 ? "0" + number : String(number);
    }

    function localDayKey(date) {
        return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
    }

    function formatScoreStreamDateTime(date) {
        return date.getFullYear() + "-" +
            pad(date.getMonth() + 1) + "-" +
            pad(date.getDate()) + " " +
            pad(date.getHours()) + ":" +
            pad(date.getMinutes()) + ":" +
            pad(date.getSeconds());
    }

    function daysAgo(days) {
        var date = new Date();
        date.setDate(date.getDate() - days);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    function endOfToday() {
        var date = new Date();
        date.setHours(23, 59, 59, 999);
        return date;
    }

    function parseGameDate(game) {
        var dateValue = game.dateTime || game.startDateTime || game.scheduledStart || game.gameDate || game.date;

        if (dateValue == null) {
            return null;
        }

        if (typeof dateValue === "number") {
            var fromNumber = new Date(dateValue);
            return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
        }

        var fromString = new Date(dateValue);
        if (!Number.isNaN(fromString.getTime())) {
            return fromString;
        }

        return null;
    }

    function compareBySportThenTimeAscending(a, b) {
        var aSportRaw = extractSportValue(a);
        var bSportRaw = extractSportValue(b);
        var aSport = aSportRaw == null ? "" : String(aSportRaw).toLowerCase();
        var bSport = bSportRaw == null ? "" : String(bSportRaw).toLowerCase();

        if (aSport < bSport) {
            return -1;
        }
        if (aSport > bSport) {
            return 1;
        }

        var aDate = parseGameDate(a);
        var bDate = parseGameDate(b);
        var aTime = aDate ? aDate.getTime() : Number.MAX_SAFE_INTEGER;
        var bTime = bDate ? bDate.getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
    }

    function defaultMockFeed() {
        var now = new Date();
        var yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        return Promise.resolve([
            {
                id: "g-1",
                status: "Final",
                sport: "Football",
                homeTeam: "Moon Pie Meteors",
                awayTeam: "Laser Llamas",
                homeScore: 42,
                awayScore: 41,
                dateTime: yesterday.toISOString(),
                updatedAt: "Updated 4m ago"
            },
            {
                id: "g-2",
                status: "Q3 06:12",
                sport: "Basketball",
                homeTeam: "Turbo Turtles",
                awayTeam: "Pancake Ninjas",
                homeScore: 88,
                awayScore: 87,
                dateTime: now.toISOString(),
                updatedAt: "Updated now"
            },
            {
                id: "g-3",
                status: "Scheduled 7:00 PM",
                sport: "Soccer",
                homeTeam: "Disco Cacti",
                awayTeam: "Waffle Pirates",
                homeScore: 0,
                awayScore: 0,
                dateTime: now.toISOString(),
                updatedAt: "Starts tonight"
            }
        ]);
    }

    function createApiFeed(config) {
        var endpoint = config.endpoint;
        var apiKey = config.apiKey;
        var requestBody = config.requestBody;
        var scoreStream = config.scoreStream;
        var debug = Boolean(config.debug);

        if (!endpoint && !scoreStream && !requestBody) {
            return defaultMockFeed;
        }

        function buildScoreStreamRequest() {
            if (!scoreStream) {
                return requestBody || {};
            }

            var method = scoreStream.method || "recommended.broadcast.games.search";
            var params = {
                apiKey: scoreStream.apiKey || apiKey || ""
            };

            if (scoreStream.location) {
                params.location = scoreStream.location;
            }

            if (Array.isArray(scoreStream.userWidgetIds) && scoreStream.userWidgetIds.length) {
                params.userWidgetIds = scoreStream.userWidgetIds;
            } else if (!scoreStream.location) {
                params.userWidgetIds = [68921];
            }

            if (scoreStream.afterDateTime) {
                params.afterDateTime = scoreStream.afterDateTime;
            } else {
                params.afterDateTime = formatScoreStreamDateTime(daysAgo(90));
            }

            if (scoreStream.beforeDateTime) {
                params.beforeDateTime = scoreStream.beforeDateTime;
            } else {
                params.beforeDateTime = formatScoreStreamDateTime(endOfToday());
            }

            if (scoreStream.count != null) {
                params.count = scoreStream.count;
            } else {
                params.count = 30;
            }

            if (scoreStream.offset != null) {
                params.offset = scoreStream.offset;
            }

            return {
                method: method,
                params: params
            };
        }

        function collectionToArray(collection) {
            if (Array.isArray(collection)) {
                return collection;
            }

            if (!collection || typeof collection !== "object") {
                return [];
            }

            if (Array.isArray(collection.list)) {
                return collection.list;
            }

            if (collection.list && typeof collection.list === "object") {
                return Object.keys(collection.list).map(function (key) {
                    return collection.list[key];
                });
            }

            return Object.keys(collection).map(function (key) {
                return collection[key];
            });
        }

        function getResultCollections(result) {
            if (!result || typeof result !== "object") {
                return null;
            }

            if (result.collections && typeof result.collections === "object") {
                return result.collections;
            }

            return null;
        }

        function toMapById(collection, idKeys) {
            var map = {};

            collectionToArray(collection).forEach(function (item) {
                if (!item || typeof item !== "object") {
                    return;
                }

                var id = null;
                idKeys.some(function (idKey) {
                    if (item[idKey] != null) {
                        id = String(item[idKey]);
                        return true;
                    }
                    return false;
                });

                if (id != null) {
                    map[id] = item;
                }
            });

            return map;
        }

        function enrichGames(games, result) {
            var collections = getResultCollections(result);
            var teamCollection = (result && result.teamCollection) || (collections && collections.teamCollection);
            var teamMap = toMapById(teamCollection, ["teamId", "id", "tId"]);

            return collectionToArray(games).map(function (game) {
                if (!game || typeof game !== "object") {
                    return game;
                }

                var homeTeam = null;
                var awayTeam = null;

                if (game.homeTeamId != null) {
                    homeTeam = teamMap[String(game.homeTeamId)] || null;
                }
                if (game.awayTeamId != null) {
                    awayTeam = teamMap[String(game.awayTeamId)] || null;
                }

                if (game.homeTeam != null && game.awayTeam != null) {
                    return game;
                }

                return Object.assign({}, game, {
                    homeTeam: game.homeTeam || game.homeTeamName || (homeTeam && (homeTeam.teamName || homeTeam.minTeamName || homeTeam.display || homeTeam.name)) || game.home || null,
                    awayTeam: game.awayTeam || game.awayTeamName || (awayTeam && (awayTeam.teamName || awayTeam.minTeamName || awayTeam.display || awayTeam.name)) || game.away || null
                });
            });
        }

        function parseApiPayload(payload) {
            if (Array.isArray(payload)) {
                return payload;
            }
            if (Array.isArray(payload.games)) {
                return payload.games;
            }
            if (payload.result && Array.isArray(payload.result.games)) {
                return enrichGames(payload.result.games, payload.result);
            }
            if (payload.result && payload.result.gameCollection) {
                return enrichGames(payload.result.gameCollection, payload.result);
            }

            var collections = getResultCollections(payload && payload.result);
            if (collections && collections.gameCollection) {
                return enrichGames(collections.gameCollection, payload.result);
            }

            return [];
        }

        return function () {
            var builtRequest = buildScoreStreamRequest();
            var useGet = config.httpMethod === "GET" || scoreStream;
            var headers = {
                "Content-Type": "application/json"
            };

            if (apiKey && !scoreStream) {
                headers.Authorization = "Bearer " + apiKey;
            }

            var resolvedEndpoint = endpoint || "https://scorestream.com/api";
            var fetchOptions = useGet ? { method: "GET", headers: headers } : {
                method: "POST",
                headers: headers,
                body: JSON.stringify(builtRequest)
            };

            var requestUrl = useGet
                ? resolvedEndpoint + "?request=" + encodeURIComponent(JSON.stringify(builtRequest))
                : resolvedEndpoint;

            debugLog(debug, "Loading scores feed", {
                url: resolvedEndpoint,
                httpMethod: useGet ? "GET" : "POST",
                requestMethod: builtRequest.method || null,
                userWidgetIds: builtRequest.params && builtRequest.params.userWidgetIds ? builtRequest.params.userWidgetIds : null,
                afterDateTime: builtRequest.params && builtRequest.params.afterDateTime ? builtRequest.params.afterDateTime : null,
                beforeDateTime: builtRequest.params && builtRequest.params.beforeDateTime ? builtRequest.params.beforeDateTime : null,
                count: builtRequest.params && builtRequest.params.count ? builtRequest.params.count : null,
                hasApiKey: Boolean(builtRequest.params && builtRequest.params.apiKey)
            });

            return fetch(requestUrl, fetchOptions).then(function (response) {
                debugLog(debug, "Feed response received", {
                    ok: response.ok,
                    status: response.status
                });
                if (!response.ok) {
                    throw new Error("Request failed: " + response.status);
                }
                return response.json();
            }).then(function (payload) {
                var games = parseApiPayload(payload);
                debugLog(debug, "Feed payload parsed", {
                    payloadKeys: payload && typeof payload === "object" ? Object.keys(payload) : null,
                    gamesCount: Array.isArray(games) ? games.length : 0
                });
                return games;
            }).catch(function (error) {
                debugLog(debug, "Feed request failed", {
                    message: error && error.message ? error.message : String(error)
                });
                throw error;
            });
        };
    }

    function injectStyles(container, options) {
        if (!document.getElementById("sportsmark-widget-base-styles")) {
            var baseStyle = document.createElement("style");
            baseStyle.id = "sportsmark-widget-base-styles";
            baseStyle.textContent = ""
                + ".sportsmark-widget{font-family:'Open Sans',Arial,sans-serif;color:#fff;border:1px solid #64748b;border-radius:0.25rem;overflow:hidden;width:100%;height:100%;min-height:100%;display:flex;flex-direction:column;box-sizing:border-box;}"
                + ".sportsmark-widget__header{color:#fff;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;}"
                + ".sportsmark-widget__brand{font-family:'Gibson','Open Sans',Arial,sans-serif;font-weight:700;letter-spacing:.3px;}"
                + ".sportsmark-widget__brand-logo{display:block;max-width:100%;max-height:128px;}"
                + ".sportsmark-widget__sub{font-family:'Gibson','Open Sans',Arial,sans-serif;font-size:12px;opacity:.8;}"
                + ".sportsmark-widget__header--centered{justify-content:center;text-align:center;}"
                + ".sportsmark-widget__nav{display:grid;grid-template-columns:auto 1fr auto;grid-template-rows:auto auto;column-gap:8px;row-gap:6px;align-items:center;color:#fff;padding:8px 12px;}"
                + ".sportsmark-widget__nav-btn{font-family:'Open Sans',Arial,sans-serif;border:0;border-radius:0.25rem;font-weight:700;font-size:20px;cursor:pointer;width:32px;height:32px;line-height:1;align-self:stretch;display:flex;align-items:center;justify-content:center;}"
                + ".sportsmark-widget__nav-btn[data-nav='prev']{grid-column:1;grid-row:1 / 3;}"
                + ".sportsmark-widget__nav-btn[data-nav='next']{grid-column:3;grid-row:1 / 3;}"
                + ".sportsmark-widget__nav-btn[disabled]{opacity:.4;cursor:not-allowed;}"
                + ".sportsmark-widget__nav-date{grid-column:2;grid-row:1;font-family:'Open Sans',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:.2px;text-align:center;white-space:nowrap;line-height:1;display:flex;align-items:center;justify-content:center;}"
                + ".sportsmark-widget__nav-filters{grid-column:2;grid-row:2;display:flex;align-items:center;gap:2px;flex-wrap:nowrap;justify-content:center;}"
                + ".sportsmark-widget__filter-btn{font-family:'Open Sans',Arial,sans-serif;border:0;font-weight:700;cursor:pointer;padding:0 2px;line-height:1;background:transparent;color:#fff;display:inline-flex;align-items:center;gap:2px;opacity:.45;transition:opacity .15s ease;}"
                + ".sportsmark-widget__filter-btn--active{background:transparent;color:#fff;opacity:1;}"
                + ".sportsmark-widget__filter-icon{font-size:14px;line-height:1;}"
                + ".sportsmark-widget__body{padding:8px;overflow-y:auto;overflow-x:hidden;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),350px));grid-auto-rows:max-content;justify-content:center;align-content:start;gap:8px;color:#111;flex:1;min-height:0;}"
                + ".sportsmark-widget__sport-divider{grid-column:1/-1;margin:4px;}"
                + ".sportsmark-widget__game{position:relative;overflow:hidden;border:1px solid #64748b;border-radius:0.25rem;padding:8px;}"
                + ".sportsmark-widget__game-content{position:relative;z-index:1;}"
                + ".sportsmark-widget__game-icon{position:absolute;right:8px;bottom:2px;font-size:72px;line-height:1;opacity:.2;pointer-events:none;user-select:none;}"
                + ".sportsmark-widget__meta{font-size:12px;color:#4f5d6b;display:flex;justify-content:space-between;margin-bottom:6px;}"
                + ".sportsmark-widget__teams{display:grid;grid-template-columns:1fr auto;row-gap:4px;column-gap:8px;align-items:center;}"
                + ".sportsmark-widget__team{font-family:'Open Sans',Arial,sans-serif;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}"
                + ".sportsmark-widget__score{font-family:'Open Sans',Arial,sans-serif;font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;text-align:right;min-width:2ch;}"
                + ".sportsmark-widget__state{font-family:'Open Sans',Arial,sans-serif;padding:12px;font-size:13px;color:#2c3a47;text-align:center;}";
            document.head.appendChild(baseStyle);
        }

        var theme = options.theme || {};
        var widgetBg = sanitizeColor(options.widgetBg || theme.widgetBg || "#e2e8f0");
        var colors = {
            widgetBg: widgetBg,
            headerBg: sanitizeColor(options.headerBg || theme.headerBg || "#334155"),
            navBg: sanitizeColor(options.navBg || theme.navBg || "#334155"),
            navBtnBg: sanitizeColor(options.navBtnBg || theme.navBtnBg || "#fff"),
            navBtnColor: sanitizeColor(options.navBtnColor || theme.navBtnColor || "#0f172a"),
            bodyBg: sanitizeColor(options.bodyBg || theme.bodyBg || widgetBg),
            gameBg: sanitizeColor(options.gameBg || theme.gameBg || "#f8fafc"),
            widgetBorderColor: sanitizeColor(options.widgetBorderColor || theme.widgetBorderColor || "#64748b"),
            gameBorderColor: sanitizeColor(options.gameBorderColor || theme.gameBorderColor || "#64748b")
        };
        var borders = {
            widgetBorderWidth: sanitizeCssLength(options.widgetBorderWidth || theme.widgetBorderWidth, "1px"),
            gameBorderWidth: sanitizeCssLength(options.gameBorderWidth || theme.gameBorderWidth, "1px"),
            widgetBorderRadius: sanitizeCssLength(options.widgetBorderRadius || theme.widgetBorderRadius, "0.25rem"),
            gameBorderRadius: sanitizeCssLength(options.gameBorderRadius || theme.gameBorderRadius, "0.25rem")
        };

        var instanceId = "sm-" + Math.floor(Math.random() * 1000000);
        container.classList.add(instanceId);
        var scope = "." + instanceId;

        var colorStyle = document.createElement("style");
        colorStyle.textContent = ""
            + scope + " .sportsmark-widget{background:" + colors.widgetBg + ";border-color:" + colors.widgetBorderColor + ";border-width:" + borders.widgetBorderWidth + ";border-radius:" + borders.widgetBorderRadius + ";}"
            + scope + " .sportsmark-widget__header{background:" + colors.headerBg + ";}"
            + scope + " .sportsmark-widget__nav{background:" + colors.navBg + ";}"
            + scope + " .sportsmark-widget__nav-btn{background:" + colors.navBtnBg + ";color:" + colors.navBtnColor + ";}"
            + scope + " .sportsmark-widget__body{background:" + colors.bodyBg + ";}"
            + scope + " .sportsmark-widget__sport-divider{border-top-color:" + colors.gameBorderColor + ";}"
            + scope + " .sportsmark-widget__game{background:" + colors.gameBg + ";border-color:" + colors.gameBorderColor + ";border-width:" + borders.gameBorderWidth + ";border-radius:" + borders.gameBorderRadius + ";}";
        document.head.appendChild(colorStyle);
    }

    function buildTimeline(games) {
        var grouped = {};
        var knownDays = [];

        games.forEach(function (game) {
            var date = parseGameDate(game);
            if (!date) {
                return;
            }
            var dayKey = localDayKey(date);
            if (!grouped[dayKey]) {
                grouped[dayKey] = [];
                knownDays.push(dayKey);
            }
            grouped[dayKey].push(game);
        });

        knownDays.sort(function (a, b) {
            if (a === b) {
                return 0;
            }
            return a < b ? -1 : 1;
        });

        knownDays.forEach(function (dayKey) {
            grouped[dayKey].sort(compareBySportThenTimeAscending);
        });

        return {
            grouped: grouped,
            knownDays: knownDays
        };
    }

    function pickDefaultDay(knownDays) {
        if (!knownDays.length) {
            return null;
        }

        var todayKey = localDayKey(new Date());
        if (knownDays.indexOf(todayKey) !== -1) {
            return todayKey;
        }

        var fallback = null;
        knownDays.forEach(function (dayKey) {
            if (dayKey <= todayKey) {
                fallback = dayKey;
            }
        });

        return fallback;
    }

    function formatDayLabel(dayKey) {
        if (!dayKey) {
            return "No games";
        }

        var parts = dayKey.split("-");
        if (parts.length !== 3) {
            return dayKey;
        }

        var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (Number.isNaN(date.getTime())) {
            return dayKey;
        }

        return date.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric"
        });
    }

    function firstDefined(source, keys) {
        if (!source || typeof source !== "object") {
            return null;
        }

        for (var i = 0; i < keys.length; i += 1) {
            var value = source[keys[i]];
            if (value != null && value !== "") {
                return value;
            }
        }

        return null;
    }

    function extractSportValue(game) {
        var directSport = firstDefined(game, [
            "sport",
            "sportName",
            "sportType",
            "sportTypeName",
            "activity",
            "activityName"
        ]);

        if (typeof directSport === "string") {
            return directSport;
        }

        if (directSport && typeof directSport === "object") {
            var nestedSport = firstDefined(directSport, ["sportName", "name", "display", "label", "value"]);
            if (nestedSport != null) {
                return nestedSport;
            }
        }

        var metadataSport = firstDefined(game, ["sportLabel", "sportDisplay", "gameSport", "gameSportName"]);
        return metadataSport == null ? null : metadataSport;
    }

    function normalizeStatus(game) {
        var lastScore = game && game.lastScore && typeof game.lastScore === "object" ? game.lastScore : null;
        var lastSegmentId = lastScore ? firstDefined(lastScore, ["gameSegmentId", "segmentId"]) : null;
        if (Number(lastSegmentId) === 19999) {
            return "Final";
        }

        var rawStatus = firstDefined(game, [
            "status",
            "statusDisplay",
            "displayStatus",
            "gameStatus",
            "gameStatusDisplay",
            "gameStatusLabel",
            "state",
            "gameState"
        ]);
        var text = rawStatus != null ? String(rawStatus) : "";
        var lower = text.toLowerCase();
        var isFinal = Boolean(game.isFinal || game.final || game.completed || game.isComplete || game.isCompleted);

        if (isFinal || lower === "final" || lower === "finished" || lower === "complete" || lower === "completed") {
            return "Final";
        }

        if (text) {
            return text;
        }

        var startDateTime = firstDefined(game, ["startDateTime", "startTime", "dateTime", "gameDate", "gameDateTime"]);
        var startDate = startDateTime != null ? new Date(startDateTime) : null;
        if (startDate && !Number.isNaN(startDate.getTime()) && startDate.getTime() > Date.now()) {
            return "Scheduled";
        }

        var hasStarted = Boolean(game.started || game.hasStarted || game.inProgress || game.isInProgress);
        return hasStarted ? "In progress" : "Scheduled";
    }

    function normalizeScore(game, side) {
        var lastScore = game && game.lastScore && typeof game.lastScore === "object" ? game.lastScore : null;
        if (lastScore) {
            var lastFromNested = firstDefined(lastScore, [
                side.toLowerCase() + "TeamScore",
                side.toLowerCase() + "Score",
                side + "TeamScore",
                side + "Score",
                side.charAt(0).toUpperCase() + side.slice(1).toLowerCase() + "TeamScore",
                side.charAt(0).toUpperCase() + side.slice(1).toLowerCase() + "Score"
            ]);
            if (lastFromNested != null) {
                return lastFromNested;
            }
        }

        var sideLower = side.toLowerCase();
        var sideUpper = side.charAt(0).toUpperCase() + side.slice(1).toLowerCase();
        var direct = firstDefined(game, [
            sideLower + "Score",
            sideLower + "TeamScore",
            sideLower + "Points",
            sideLower + "Goals",
            sideLower + "Runs",
            sideLower + "Total",
            sideLower + "Value",
            sideLower + "LastScore",
            side + "Score",
            side + "TeamScore",
            side + "Points",
            side + "Goals",
            side + "Runs",
            side + "Total",
            side + "Value",
            side + "LastScore",
            sideUpper + "Score",
            sideUpper + "TeamScore",
            sideUpper + "Points",
            sideUpper + "Goals",
            sideUpper + "Runs",
            sideUpper + "Total",
            sideUpper + "Value",
            sideUpper + "LastScore"
        ]);

        if (direct != null) {
            return direct;
        }

        var teamObj = firstDefined(game, [
            sideLower + "Team",
            side + "Team",
            sideUpper + "Team"
        ]);

        if (teamObj && typeof teamObj === "object") {
            var nested = firstDefined(teamObj, ["score", "teamScore", "points", "goals", "runs", "total", "value", "lastScore"]);
            if (nested != null) {
                return nested;
            }
        }

        return "-";
    }

    function normalizeTeamName(game, side, fallback) {
        var sideLower = side.toLowerCase();
        var sideUpper = side.charAt(0).toUpperCase() + side.slice(1).toLowerCase();
        var direct = firstDefined(game, [
            sideLower + "Team",
            sideLower + "TeamName",
            sideLower,
            side + "Team",
            side + "TeamName",
            sideUpper + "Team",
            sideUpper + "TeamName"
        ]);

        if (typeof direct === "string") {
            return direct;
        }

        if (direct && typeof direct === "object") {
            var nested = firstDefined(direct, ["teamName", "minTeamName", "display", "name"]);
            if (nested != null) {
                return nested;
            }
        }

        return fallback;
    }

    function renderDayNav(root, model, onMove) {
        var nav = root.querySelector(".sportsmark-widget__nav");
        if (!nav) {
            return;
        }

        var prevButton = nav.querySelector("[data-nav='prev']");
        var nextButton = nav.querySelector("[data-nav='next']");
        var dayLabel = nav.querySelector(".sportsmark-widget__nav-date");
        var filters = nav.querySelector(".sportsmark-widget__nav-filters");
        var dayIndex = model.selectedDay ? model.knownDays.indexOf(model.selectedDay) : -1;
        var todayKey = localDayKey(new Date());
        var selectedIsToday = model.selectedDay === todayKey;

        dayLabel.textContent = formatDayLabel(model.selectedDay);

        prevButton.disabled = dayIndex <= 0;
        nextButton.disabled = dayIndex === -1 || dayIndex >= model.knownDays.length - 1 || selectedIsToday;

        prevButton.onclick = function () {
            onMove(-1);
        };
        nextButton.onclick = function () {
            onMove(1);
        };

        if (filters) {
            var selectedSport = model.selectedSport || null;
            var sports = Array.isArray(model.sports) ? model.sports : [];
            var allButtonClass = "sportsmark-widget__filter-btn" + (selectedSport == null ? " sportsmark-widget__filter-btn--active" : "");
            var allMarkup = '<button class="' + allButtonClass + '" data-filter-sport="" type="button">All</button>';
            var sportMarkup = sports.map(function (sport) {
                var sportIcon = sportBackgroundIcon(sport.key || "");
                var label = sport.label || sport.key || "Sport";
                var isActive = selectedSport != null && selectedSport === sport.key;
                var buttonClass = "sportsmark-widget__filter-btn" + (isActive ? " sportsmark-widget__filter-btn--active" : "");
                var iconMarkup = sportIcon
                    ? '<span class="sportsmark-widget__filter-icon" aria-hidden="true">' + escapeHTML(sportIcon) + '</span>'
                    : '';
                return '<button class="' + buttonClass + '" data-filter-sport="' + escapeHTML(sport.key) + '" type="button" aria-label="Show only ' + escapeHTML(label) + '">' + iconMarkup + '</button>';
            }).join("");

            filters.innerHTML = allMarkup + sportMarkup;
            Array.prototype.forEach.call(filters.querySelectorAll("[data-filter-sport]"), function (button) {
                button.onclick = function () {
                    var nextSport = button.getAttribute("data-filter-sport");
                    model.onFilterChange(nextSport ? nextSport : null);
                };
            });
        }
    }

    function normalizeSportKey(value) {
        if (value == null) {
            return "";
        }
        return String(value).trim().toLowerCase();
    }

    var DEFAULT_FILTER_SPORTS = [
        { key: "football", label: "Football" },
        { key: "basketball", label: "Basketball" },
        { key: "baseball", label: "Baseball" },
        { key: "softball", label: "Softball" },
        { key: "soccer", label: "Soccer" },
        { key: "volleyball", label: "Volleyball" },
        { key: "lacrosse", label: "Lacrosse" }
    ];

    function gameSportKey(game) {
        return normalizeSportKey(extractSportValue(game));
    }

    function collectSports(games) {
        var map = {};
        var sports = [];

        DEFAULT_FILTER_SPORTS.forEach(function (sport) {
            var sportKey = normalizeSportKey(sport.key);
            if (!sportKey || map[sportKey]) {
                return;
            }

            map[sportKey] = true;
            sports.push({
                key: sportKey,
                label: sport.label
            });
        });

        games.forEach(function (game) {
            var sportValue = extractSportValue(game);
            var sportKey = normalizeSportKey(sportValue);
            if (!sportKey || map[sportKey]) {
                return;
            }

            map[sportKey] = true;
            sports.push({
                key: sportKey,
                label: String(sportValue)
            });
        });

        sports.sort(function (a, b) {
            if (a.label === b.label) {
                return 0;
            }
            return a.label < b.label ? -1 : 1;
        });

        return sports;
    }

    function filteredGamesForSelectedDay(state) {
        var games = state.grouped[state.selectedDay] || [];
        if (!state.selectedSport) {
            return games;
        }

        return games.filter(function (game) {
            return gameSportKey(game) === state.selectedSport;
        });
    }

    function normalizeGame(game, index) {
        var sportValue = extractSportValue(game);
        return {
            id: game.id || game.gameId || "game-" + index,
            sport: sportValue || "Game",
            status: normalizeStatus(game),
            homeTeam: normalizeTeamName(game, "home", "Home"),
            awayTeam: normalizeTeamName(game, "away", "Away"),
            homeScore: normalizeScore(game, "home"),
            awayScore: normalizeScore(game, "away"),
            updatedAt: game.updatedAt || game.lastUpdatedDisplay || ""
        };
    }

    function sportBackgroundIcon(sport) {
        var value = sport == null ? "" : String(sport).toLowerCase();

        if (value.indexOf("football") !== -1) {
            return "🏈";
        }
        if (value.indexOf("baseball") !== -1) {
            return "⚾";
        }
        if (value.indexOf("softball") !== -1) {
            return "🥎";
        }
        if (value.indexOf("soccer") !== -1) {
            return "⚽";
        }
        if (value.indexOf("lacrosse") !== -1) {
            return "🥍";
        }
        if (value.indexOf("volleyball") !== -1 || value.indexOf("vollyball") !== -1) {
            return "🏐";
        }
        if (value.indexOf("basketball") !== -1) {
            return "🏀";
        }

        return "";
    }

    function renderGames(root, games) {
        var body = root.querySelector(".sportsmark-widget__body");
        if (!games.length) {
            body.innerHTML = '<div class="sportsmark-widget__state">No games available.</div>';
            return;
        }

        var previousSportKey = null;
        body.innerHTML = games.map(function (rawGame, index) {
            var game = normalizeGame(rawGame, index);
            var gameIcon = sportBackgroundIcon(game.sport);
            var sportKey = game.sport == null ? "" : String(game.sport).toLowerCase();
            var dividerMarkup = previousSportKey !== null && previousSportKey !== sportKey
                ? '<div class="sportsmark-widget__sport-divider" aria-hidden="true"></div>'
                : '';
            previousSportKey = sportKey;
            var gameIconMarkup = gameIcon
                ? '<span class="sportsmark-widget__game-icon" aria-hidden="true">' + escapeHTML(gameIcon) + '</span>'
                : '';
            return dividerMarkup
                + '<article class="sportsmark-widget__game" data-game-id="' + escapeHTML(game.id) + '">'
                + gameIconMarkup
                + '<div class="sportsmark-widget__game-content">'
                + '<div class="sportsmark-widget__meta"><span>' + escapeHTML(String(game.sport).toUpperCase()) + '</span><span>' + escapeHTML(game.status) + '</span></div>'
                + '<div class="sportsmark-widget__teams">'
                + '<span class="sportsmark-widget__team">' + escapeHTML(game.awayTeam) + '</span><span class="sportsmark-widget__score">' + escapeHTML(game.awayScore) + '</span>'
                + '<span class="sportsmark-widget__team">' + escapeHTML(game.homeTeam) + '</span><span class="sportsmark-widget__score">' + escapeHTML(game.homeScore) + '</span>'
                + '</div>'
                + '<div class="sportsmark-widget__meta"><span>' + escapeHTML(game.updatedAt) + '</span><span></span></div>'
                + '</div>'
                + '</article>';
        }).join("");
    }

    function setState(root, message) {
        var body = root.querySelector(".sportsmark-widget__body");
        body.innerHTML = '<div class="sportsmark-widget__state">' + escapeHTML(message) + '</div>';
    }

    function applyIntegerBrandLogoScale(container) {
        var logo = container.querySelector(".sportsmark-widget__brand-logo");
        if (!logo) {
            return;
        }

        function scaleLogo() {
            var naturalWidth = logo.naturalWidth;
            var naturalHeight = logo.naturalHeight;
            if (!naturalWidth || !naturalHeight) {
                return;
            }

            var targetHeight = Math.min(128, Math.max(65, naturalHeight));
            var scale = targetHeight / naturalHeight;
            var scaledWidth = Math.max(1, Math.round(naturalWidth * scale));
            var scaledHeight = Math.max(1, Math.round(naturalHeight * scale));

            logo.style.width = scaledWidth + "px";
            logo.style.height = scaledHeight + "px";
        }

        logo.addEventListener("load", scaleLogo);
        if (logo.complete) {
            scaleLogo();
        }
    }


    function mountWidget(container, options) {
        var title = options.title == null ? "WSLS SportsMark" : String(options.title);
        var subtitle = options.subtitle == null ? "Live Local Scores" : String(options.subtitle);
        var subtitleText = subtitle.trim();
        var titleLogoUrl = options.titleLogoUrl == null ? "" : String(options.titleLogoUrl).trim();
        var brandMarkup = titleLogoUrl
            ? '<img class="sportsmark-widget__brand-logo" src="' + escapeHTML(titleLogoUrl) + '" alt="' + escapeHTML(title) + '">' 
            : escapeHTML(title);
        var subtitleMarkup = subtitleText
            ? '<div class="sportsmark-widget__sub">' + escapeHTML(subtitleText) + '</div>'
            : '';
        var showHeader = options.showHeader !== false;
        var headerMarkup = showHeader
            ? ''
            + '<header class="sportsmark-widget__header' + (subtitleMarkup ? '' : ' sportsmark-widget__header--centered') + '">'
            + '<div class="sportsmark-widget__brand">' + brandMarkup + '</div>'
            + subtitleMarkup
            + '</header>'
            : '';
        container.innerHTML = ''
            + '<section class="sportsmark-widget">'
            + headerMarkup
            + '<div class="sportsmark-widget__nav">'
            + '<button class="sportsmark-widget__nav-btn" data-nav="prev" type="button" aria-label="Previous day">❮</button>'
            + '<div class="sportsmark-widget__nav-date">Loading...</div>'
            + '<button class="sportsmark-widget__nav-btn" data-nav="next" type="button" aria-label="Next day">❯</button>'
            + '<div class="sportsmark-widget__nav-filters"></div>'
            + '</div>'
            + '<div class="sportsmark-widget__body"></div>'
            + '</section>';

        applyIntegerBrandLogoScale(container);
    }

    function createWidget(container, config) {
        var options = config || {};
        var feed = options.feed || createApiFeed(options);
        var refreshMs = options.refreshMs || 60000;
        var debug = Boolean(options.debug);
        var timer = null;
        var destroyed = false;
        var state = {
            grouped: {},
            knownDays: [],
            selectedDay: null,
            sports: [],
            selectedSport: null
        };

        container.style.display = "block";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.minHeight = "100%";
        container.style.minWidth = "0";

        injectStyles(container, options);
        mountWidget(container, options);
        setState(container, "Loading scores...");

        function moveDay(delta) {
            if (!state.selectedDay || !state.knownDays.length) {
                debugLog(debug, "Day navigation blocked", {
                    reason: "No selected day or no known days",
                    selectedDay: state.selectedDay,
                    knownDays: state.knownDays
                });
                return;
            }

            var currentIndex = state.knownDays.indexOf(state.selectedDay);
            if (currentIndex === -1) {
                debugLog(debug, "Day navigation blocked", {
                    reason: "Selected day missing from known days",
                    selectedDay: state.selectedDay,
                    knownDays: state.knownDays
                });
                return;
            }

            var nextIndex = currentIndex + delta;
            if (nextIndex < 0 || nextIndex >= state.knownDays.length) {
                debugLog(debug, "Day navigation blocked", {
                    reason: "Navigation out of bounds",
                    currentIndex: currentIndex,
                    attemptedIndex: nextIndex,
                    knownDaysCount: state.knownDays.length
                });
                return;
            }

            var nextDay = state.knownDays[nextIndex];
            var todayKey = localDayKey(new Date());
            if (nextDay > todayKey) {
                debugLog(debug, "Day navigation blocked", {
                    reason: "Attempted future day",
                    nextDay: nextDay,
                    todayKey: todayKey
                });
                return;
            }

            state.selectedDay = nextDay;
            debugLog(debug, "Day changed", {
                selectedDay: state.selectedDay,
                gamesOnDay: (state.grouped[state.selectedDay] || []).length
            });
            renderDayNav(container, state, moveDay);
            renderGames(container, filteredGamesForSelectedDay(state));
        }

        function changeSportFilter(sportKey) {
            state.selectedSport = sportKey;
            debugLog(debug, "Sport filter changed", {
                selectedSport: state.selectedSport
            });
            renderDayNav(container, state, moveDay);
            renderGames(container, filteredGamesForSelectedDay(state));
        }

        state.onFilterChange = changeSportFilter;

        function refresh() {
            return feed().then(function (games) {
                if (!destroyed) {
                    var collection = Array.isArray(games) ? games : [];
                    var timeline = buildTimeline(collection);
                    var defaultDay = pickDefaultDay(timeline.knownDays);

                    debugLog(debug, "Refresh complete", {
                        totalGames: collection.length,
                        knownDays: timeline.knownDays,
                        defaultDay: defaultDay
                    });

                    state.grouped = timeline.grouped;
                    state.knownDays = timeline.knownDays;
                    state.sports = collectSports(collection);

                    if (state.selectedSport && !state.sports.some(function (sport) {
                        return sport.key === state.selectedSport;
                    })) {
                        state.selectedSport = null;
                    }

                    if (!state.selectedDay || state.knownDays.indexOf(state.selectedDay) === -1) {
                        state.selectedDay = defaultDay;
                    }

                    if (state.selectedDay) {
                        debugLog(debug, "Rendering selected day", {
                            selectedDay: state.selectedDay,
                            gamesOnDay: (state.grouped[state.selectedDay] || []).length,
                            selectedSport: state.selectedSport
                        });
                        renderDayNav(container, state, moveDay);
                        renderGames(container, filteredGamesForSelectedDay(state));
                    } else {
                        debugLog(debug, "No day selected after refresh", {
                            knownDays: state.knownDays
                        });
                        renderDayNav(container, state, moveDay);
                        setState(container, "No games available.");
                    }
                }
            }).catch(function (error) {
                debugLog(debug, "Widget refresh failed", {
                    message: error && error.message ? error.message : String(error)
                });
                if (!destroyed) {
                    setState(container, "Unable to load scores right now.");
                }
            });
        }

        refresh();
        timer = window.setInterval(refresh, refreshMs);

        return {
            refresh: refresh,
            destroy: function () {
                destroyed = true;
                if (timer) {
                    window.clearInterval(timer);
                }
                container.innerHTML = "";
            }
        };
    }

    window.SportsMarkWidget = {
        create: createWidget,
        defaultMockFeed: defaultMockFeed
    };
}());