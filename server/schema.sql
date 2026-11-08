CREATE TABLE IF NOT EXISTS quotes (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 city TEXT NOT NULL,
 price_cents INTEGER NOT NULL CHECK(price_cents > 0),
 price_type TEXT NOT NULL CHECK(price_type IN ('paid','seen')),
 observed_at TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS quotes_lookup ON quotes(city,name,observed_at);
CREATE TABLE IF NOT EXISTS search_cache (
 cache_key TEXT PRIMARY KEY,
 result_json TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS analyses (
 id TEXT PRIMARY KEY,
 subject_json TEXT NOT NULL,
 result_json TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS analyses_time ON analyses(created_at);

CREATE TABLE IF NOT EXISTS media (
 id TEXT PRIMARY KEY,
 mime_type TEXT NOT NULL,
 bytes BLOB NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
 id TEXT PRIMARY KEY,
 quote_id TEXT NOT NULL UNIQUE REFERENCES quotes(id),
 media_id TEXT REFERENCES media(id),
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS replies (
 id TEXT PRIMARY KEY,
 post_id TEXT NOT NULL REFERENCES posts(id),
 quote_id TEXT REFERENCES quotes(id),
 note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS replies_post ON replies(post_id,created_at);

CREATE TABLE IF NOT EXISTS post_discovery (
 post_id TEXT PRIMARY KEY REFERENCES posts(id),
 city_visible INTEGER NOT NULL DEFAULT 0 CHECK(city_visible IN (0,1))
);
CREATE TABLE IF NOT EXISTS reactions (
 post_id TEXT NOT NULL REFERENCES posts(id),
 voter_hash TEXT NOT NULL,
 choice TEXT NOT NULL CHECK(choice IN ('normal','expensive','cheap')),
 updated_at TEXT NOT NULL,
 PRIMARY KEY(post_id,voter_hash)
);

CREATE TABLE IF NOT EXISTS quote_places (
 quote_id TEXT PRIMARY KEY REFERENCES quotes(id),
 place_name TEXT NOT NULL DEFAULT '',
 location_hint TEXT NOT NULL DEFAULT '',
 scene TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS api_usage (
 period TEXT NOT NULL,
 bucket TEXT NOT NULL,
 used INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(period,bucket)
);
