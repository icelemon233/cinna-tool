use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::LazyLock,
    time::Duration,
};
use tauri::{
    webview::PageLoadEvent, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};
use uuid::Uuid;

const STORE_FILE: &str = "store.json";
const CLIPBOARD_WINDOW_LABEL: &str = "clipboard-floating";
const TRANSLATION_WINDOW_LABEL: &str = "translation-quick";
const AI_NEWS_LIMIT: usize = 20;
const NEWS_PER_SOURCE_LIMIT: usize = 5;
const QUICK_ACTION_SHORTCUTS: [&str; 5] = [
    "CommandOrControl+1",
    "CommandOrControl+2",
    "CommandOrControl+3",
    "CommandOrControl+9",
    "CommandOrControl+0",
];

const AI_NEWS_KEYWORDS: [&str; 24] = [
    "ai",
    "agi",
    "aigc",
    "agent",
    "claude",
    "deepseek",
    "gemini",
    "gpt",
    "llm",
    "nvidia",
    "openai",
    "人工智能",
    "大模型",
    "多模态",
    "生成式",
    "智能体",
    "算力",
    "ai芯片",
    "机器学习",
    "机器人",
    "具身智能",
    "推理",
    "训练",
    "anthropic",
];

const NON_CORE_AI_NEWS_KEYWORDS: [&str; 30] = [
    "fifa",
    "世界杯",
    "足球",
    "篮球",
    "体育",
    "赛事",
    "联赛",
    "氪星晚报",
    "早报",
    "赛车",
    "买车",
    "购车",
    "卖车",
    "新车",
    "车型",
    "车展",
    "车市",
    "汽车",
    "电动车",
    "车企",
    "智驾",
    "自动驾驶",
    "高考",
    "志愿",
    "鼠标",
    "键盘",
    "耳机",
    "外设",
    "显示器",
    "游戏本",
];

const COMMERCE_PROMOTION_KEYWORDS: [&str; 36] = [
    "618",
    "双11",
    "双十一",
    "双12",
    "双十二",
    "大促",
    "促销",
    "折扣",
    "优惠",
    "优惠券",
    "领券",
    "券后",
    "红包",
    "满减",
    "秒杀",
    "直降",
    "补贴",
    "百亿补贴",
    "到手价",
    "好价",
    "低至",
    "低价",
    "历史低价",
    "价格新低",
    "售价",
    "预售",
    "开卖",
    "开抢",
    "现货",
    "包邮",
    "下单",
    "入手",
    "购买",
    "带货",
    "直播间",
    "购物",
];

#[derive(Clone, Copy)]
struct NewsFeedSource {
    name: &'static str,
    url: &'static str,
}

const NEWS_FEED_SOURCES: [NewsFeedSource; 6] = [
    NewsFeedSource {
        name: "钛媒体",
        url: "https://www.tmtpost.com/rss.xml",
    },
    NewsFeedSource {
        name: "36氪",
        url: "https://www.36kr.com/feed",
    },
    NewsFeedSource {
        name: "智东西",
        url: "https://zhidx.com/rss.xml",
    },
    NewsFeedSource {
        name: "TechWeb",
        url: "https://www.techweb.com.cn/rss/allnews.xml",
    },
    NewsFeedSource {
        name: "量子位",
        url: "https://www.qbitai.com/feed",
    },
    NewsFeedSource {
        name: "IT之家",
        url: "https://www.ithome.com/rss/",
    },
];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelInfo {
    id: &'static str,
    name: &'static str,
    base_url: &'static str,
    model: &'static str,
    requires_url: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SaveGeneratedDocumentResult {
    file_name: String,
    path: String,
}

#[derive(Debug, Deserialize)]
struct SaveGeneratedDocumentRequest {
    content: String,
    #[serde(default, rename = "fileName")]
    file_name: Option<String>,
    #[serde(default)]
    extension: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WallpaperFileInfo {
    name: String,
    path: String,
    url: String,
    size: u64,
    mtime: f64,
    media_type: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ImageFileInfo {
    name: String,
    path: String,
    url: String,
    size: u64,
    mtime: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ImageFolderResult {
    folder_path: String,
    folder_name: String,
    images: Vec<ImageFileInfo>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HomeSummaryState {
    enabled: bool,
    available: bool,
    generated: bool,
    error: String,
    reason: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HomeDashboardData {
    news: Vec<Value>,
    trending: Vec<Value>,
    summary: String,
    summary_state: HomeSummaryState,
    fetched_at: i64,
}

#[derive(Debug, Deserialize)]
struct PlatformHttpRequest {
    url: String,
    #[serde(default)]
    method: Option<String>,
    #[serde(default)]
    headers: HashMap<String, String>,
    #[serde(default)]
    body: Option<String>,
}

#[derive(Debug, Serialize)]
struct PlatformHttpResponse {
    status: u16,
    ok: bool,
    body: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct HomeNewsItem {
    title: String,
    source: String,
    url: String,
    published_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct GithubTrendingItem {
    name: String,
    owner: String,
    repo: String,
    description: String,
    url: String,
    language: String,
    stars: String,
    period_stars: String,
}

fn quick_action_modifier() -> Modifiers {
    #[cfg(target_os = "macos")]
    {
        Modifiers::SUPER
    }

    #[cfg(not(target_os = "macos"))]
    {
        Modifiers::CONTROL
    }
}

fn quick_action_for_shortcut(shortcut: &Shortcut) -> Option<&'static str> {
    let modifier = quick_action_modifier();

    if shortcut.matches(modifier, Code::Digit1) {
        Some("create-todo")
    } else if shortcut.matches(modifier, Code::Digit2) {
        Some("create-schedule")
    } else if shortcut.matches(modifier, Code::Digit3) {
        Some("add-clipboard")
    } else if shortcut.matches(modifier, Code::Digit9) {
        Some("open-translation")
    } else if shortcut.matches(modifier, Code::Digit0) {
        Some("toggle-floating")
    } else {
        None
    }
}

fn emit_quick_action<R: tauri::Runtime>(app: &tauri::AppHandle<R>, action: &str) {
    if action != "toggle-floating" {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    }

    let _ = app.emit("app:quick-action", action);
}

fn register_quick_action_shortcuts<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    for shortcut in QUICK_ACTION_SHORTCUTS {
        if let Err(error) = app.global_shortcut().register(shortcut) {
            eprintln!("Failed to register global shortcut {shortcut}: {error}");
        }
    }
}

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join(STORE_FILE))
}

fn read_store(app: &tauri::AppHandle) -> Result<Map<String, Value>, String> {
    let path = store_path(app)?;
    if !path.exists() {
        return Ok(Map::new());
    }

    let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str::<Map<String, Value>>(&text).map_err(|error| error.to_string())
}

fn write_store(app: &tauri::AppHandle, store: &Map<String, Value>) -> Result<(), String> {
    let path = store_path(app)?;
    let text = serde_json::to_string_pretty(store).map_err(|error| error.to_string())?;
    fs::write(path, text).map_err(|error| error.to_string())
}

fn sanitize_file_name(input: &str, fallback: &str) -> String {
    let mut name = input
        .chars()
        .map(|character| match character {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            other => other,
        })
        .collect::<String>()
        .trim()
        .to_string();

    if name.is_empty() {
        name = fallback.to_string();
    }

    name
}

fn modified_ms(path: &Path) -> f64 {
    fs::metadata(path)
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|modified| modified.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as f64)
        .unwrap_or(0.0)
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string())
}

fn is_image(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| extension.to_ascii_lowercase())
            .as_deref(),
        Some("png" | "jpg" | "jpeg" | "webp" | "gif" | "bmp" | "avif" | "svg")
    )
}

fn wallpaper_media_type(path: &Path, kind: &str) -> String {
    if kind == "dynamic" {
        match path
            .extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| extension.to_ascii_lowercase())
            .as_deref()
        {
            Some("mp4" | "webm" | "mov") => return "video".into(),
            _ => {}
        }
    }

    "image".into()
}

fn image_info(path: &Path) -> Option<ImageFileInfo> {
    let metadata = fs::metadata(path).ok()?;
    Some(ImageFileInfo {
        name: file_name(path),
        path: path.to_string_lossy().to_string(),
        url: path.to_string_lossy().to_string(),
        size: metadata.len(),
        mtime: modified_ms(path),
    })
}

fn read_image_folder_inner(folder_path: PathBuf) -> Result<ImageFolderResult, String> {
    let mut images = Vec::new();
    for entry in fs::read_dir(&folder_path).map_err(|error| error.to_string())? {
        let path = entry.map_err(|error| error.to_string())?.path();
        if path.is_file() && is_image(&path) {
            if let Some(info) = image_info(&path) {
                images.push(info);
            }
        }
    }

    images.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(ImageFolderResult {
        folder_name: file_name(&folder_path),
        folder_path: folder_path.to_string_lossy().to_string(),
        images,
    })
}

fn http_client() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(8))
        .user_agent("CinnaTool/1.0 Tauri")
        .build()
        .map_err(|error| error.to_string())
}

fn fetch_text(client: &reqwest::blocking::Client, url: &str) -> Result<String, String> {
    client
        .get(url)
        .send()
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .text()
        .map_err(|error| error.to_string())
}

static CDATA_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"<!\[CDATA\[([\s\S]*?)\]\]>").expect("valid CDATA regex"));
static DECIMAL_ENTITY_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"&#(\d+);").expect("valid decimal entity regex"));
static HEX_ENTITY_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"&#x([0-9a-fA-F]+);").expect("valid hex entity regex"));
static HTML_TAG_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"<[^>]+>").expect("valid HTML tag regex"));
static FEED_LINK_HREF_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?is-u)<link[^>]+href="([^"]+)""#).expect("valid feed link regex")
});
static FEED_ITEM_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?is-u)<item\b[\s\S]*?</item>").expect("valid RSS item regex"));
static FEED_ENTRY_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?is-u)<entry\b[\s\S]*?</entry>").expect("valid Atom entry regex")
});
static FEED_TAG_REGEXES: LazyLock<HashMap<&'static str, Regex>> = LazyLock::new(|| {
    [
        "title",
        "link",
        "guid",
        "description",
        "content:encoded",
        "summary",
        "pubDate",
        "published",
        "updated",
        "dc:date",
    ]
    .into_iter()
    .map(|tag_name| {
        let pattern = format!(
            r"(?is-u)<{}(?:\s[^>]*)?>([\s\S]*?)</{}>",
            regex::escape(tag_name),
            regex::escape(tag_name)
        );
        (
            tag_name,
            Regex::new(&pattern).expect("valid feed tag regex"),
        )
    })
    .collect()
});

fn decode_html(value: &str) -> String {
    let mut output = CDATA_REGEX.replace_all(value, "$1").to_string();

    output = DECIMAL_ENTITY_REGEX
        .replace_all(&output, |caps: &regex::Captures| {
            caps.get(1)
                .and_then(|value| value.as_str().parse::<u32>().ok())
                .and_then(char::from_u32)
                .map(|value| value.to_string())
                .unwrap_or_else(|| caps[0].to_string())
        })
        .to_string();

    output = HEX_ENTITY_REGEX
        .replace_all(&output, |caps: &regex::Captures| {
            u32::from_str_radix(caps.get(1).map(|value| value.as_str()).unwrap_or(""), 16)
                .ok()
                .and_then(char::from_u32)
                .map(|value| value.to_string())
                .unwrap_or_else(|| caps[0].to_string())
        })
        .to_string();

    output
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&nbsp;", " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn strip_tags(value: &str) -> String {
    decode_html(&HTML_TAG_REGEX.replace_all(value, " "))
}

fn has_keyword(text: &str, keyword: &str) -> bool {
    text.contains(&keyword.to_lowercase())
}

fn has_any_keyword<const N: usize>(text: &str, keywords: &[&str; N]) -> bool {
    keywords.iter().any(|keyword| has_keyword(text, keyword))
}

fn is_ai_news_candidate(item: &HomeNewsItem, description: &str) -> bool {
    let text = format!("{} {} {}", item.title, item.source, description).to_lowercase();
    if has_any_keyword(&text, &NON_CORE_AI_NEWS_KEYWORDS)
        || has_any_keyword(&text, &COMMERCE_PROMOTION_KEYWORDS)
    {
        return false;
    }
    has_any_keyword(&text, &AI_NEWS_KEYWORDS)
}

fn read_feed_tag(block: &str, tag_name: &str) -> String {
    FEED_TAG_REGEXES
        .get(tag_name)
        .and_then(|regex| regex.captures(block))
        .and_then(|captures| captures.get(1).map(|value| decode_html(value.as_str())))
        .unwrap_or_default()
}

fn read_feed_link(block: &str) -> String {
    let link = read_feed_tag(block, "link");
    if link.starts_with("http") {
        return link;
    }

    if let Some(href) = FEED_LINK_HREF_REGEX
        .captures(block)
        .and_then(|captures| captures.get(1).map(|value| decode_html(value.as_str())))
    {
        return href;
    }

    let guid = read_feed_tag(block, "guid");
    if guid.starts_with("http") {
        guid
    } else {
        String::new()
    }
}

fn read_feed_date(block: &str) -> String {
    ["pubDate", "published", "updated", "dc:date"]
        .iter()
        .map(|tag| read_feed_tag(block, tag))
        .find(|value| !value.is_empty())
        .unwrap_or_default()
}

fn parse_news_feed(xml: &str, source: NewsFeedSource) -> Vec<HomeNewsItem> {
    let blocks = Some(
        FEED_ITEM_REGEX
            .find_iter(xml)
            .map(|item| item.as_str().to_string())
            .collect::<Vec<_>>(),
    )
    .filter(|items| !items.is_empty())
    .or_else(|| {
        Some(
            FEED_ENTRY_REGEX
                .find_iter(xml)
                .map(|item| item.as_str().to_string())
                .collect(),
        )
    })
    .unwrap_or_default();

    blocks
        .into_iter()
        .filter_map(|block| {
            let title = read_feed_tag(&block, "title");
            let url = read_feed_link(&block);
            let description = strip_tags(
                &[
                    read_feed_tag(&block, "description"),
                    read_feed_tag(&block, "content:encoded"),
                    read_feed_tag(&block, "summary"),
                ]
                .into_iter()
                .find(|value| !value.is_empty())
                .unwrap_or_default(),
            );
            let item = HomeNewsItem {
                title,
                source: source.name.to_string(),
                url,
                published_at: read_feed_date(&block),
            };

            if item.title.is_empty()
                || item.url.is_empty()
                || !is_ai_news_candidate(&item, &description)
            {
                None
            } else {
                Some(item)
            }
        })
        .collect()
}

fn news_timestamp(item: &HomeNewsItem) -> i64 {
    chrono::DateTime::parse_from_rfc2822(&item.published_at)
        .or_else(|_| chrono::DateTime::parse_from_rfc3339(&item.published_at))
        .map(|value| value.timestamp_millis())
        .unwrap_or(0)
}

fn normalize_news_url(url: &str) -> String {
    tauri::Url::parse(url)
        .map(|parsed| {
            format!(
                "{}{}{}",
                parsed.host_str().unwrap_or_default(),
                parsed.path(),
                parsed
                    .query()
                    .map(|query| format!("?{query}"))
                    .unwrap_or_default()
            )
        })
        .unwrap_or_else(|_| url.to_string())
}

fn fetch_news(client: &reqwest::blocking::Client) -> Vec<HomeNewsItem> {
    let mut deduped: HashMap<String, HomeNewsItem> = HashMap::new();
    let mut buckets: Vec<Vec<HomeNewsItem>> = Vec::new();

    let source_items = std::thread::scope(|scope| {
        let handles = NEWS_FEED_SOURCES
            .into_iter()
            .map(|source| {
                let client = client.clone();
                scope.spawn(move || {
                    let xml = fetch_text(&client, source.url).ok()?;
                    Some(parse_news_feed(&xml, source))
                })
            })
            .collect::<Vec<_>>();

        handles
            .into_iter()
            .filter_map(|handle| handle.join().ok().flatten())
            .collect::<Vec<_>>()
    });

    for mut items in source_items {
        items.sort_by_key(|item| -news_timestamp(item));

        let mut bucket = Vec::new();
        for item in items {
            let key = {
                let normalized = normalize_news_url(&item.url);
                if normalized.is_empty() {
                    item.title.to_lowercase()
                } else {
                    normalized
                }
            };
            if deduped.contains_key(&key) {
                continue;
            }
            deduped.insert(key, item.clone());
            bucket.push(item);
            if bucket.len() >= NEWS_PER_SOURCE_LIMIT {
                break;
            }
        }
        buckets.push(bucket);
    }

    let mut items = Vec::new();
    for index in 0..NEWS_PER_SOURCE_LIMIT {
        let mut added = false;
        for bucket in &buckets {
            if let Some(item) = bucket.get(index) {
                items.push(item.clone());
                added = true;
            }
            if items.len() >= AI_NEWS_LIMIT {
                return items;
            }
        }
        if !added {
            break;
        }
    }
    items
}

fn parse_number(value: &str) -> i64 {
    value
        .chars()
        .filter(|value| value.is_ascii_digit())
        .collect::<String>()
        .parse::<i64>()
        .unwrap_or(0)
}

fn clean_trending_description(description: String, owner: &str, repo: &str) -> String {
    let prefix = format!("Star {owner}/{repo}");
    description
        .strip_prefix(&prefix)
        .unwrap_or(&description)
        .trim_start_matches("Star")
        .trim()
        .to_string()
}

fn capture(regex: &Regex, text: &str, index: usize) -> String {
    regex
        .captures(text)
        .and_then(|captures| captures.get(index).map(|value| strip_tags(value.as_str())))
        .unwrap_or_default()
}

fn parse_trending(html: &str) -> Vec<GithubTrendingItem> {
    let article_regex = Regex::new(r"(?is)<article[\s\S]*?</article>").ok();
    let repo_regex =
        Regex::new(r#"(?is)<h2[^>]*>[\s\S]*?<a[^>]*href="/([^"/]+)/([^"/]+)"[\s\S]*?</a>\s*</h2>"#)
            .ok();
    let fallback_repo_regex = Regex::new(r#"href="/([^"/]+)/([^"/]+)/stargazers""#).ok();
    let description_regex = Regex::new(r"(?is)<p[^>]*>([\s\S]*?)</p>").ok();
    let language_regex =
        Regex::new(r#"(?is)itemprop="programmingLanguage"[^>]*>([\s\S]*?)</span>"#).ok();
    let stars_regex = Regex::new(r#"(?is)href="/[^"]+/stargazers"[^>]*>\s*([\s\S]*?)\s*</a>"#).ok();
    let period_stars_regex =
        Regex::new(r"(?is)(\d[\d,]*)\s+stars?\s+[^<]*(today|this week|this month)").ok();

    let mut items = article_regex
        .map(|regex| {
            regex
                .find_iter(html)
                .filter_map(|article| {
                    let article = article.as_str();
                    let repo_captures = repo_regex
                        .as_ref()
                        .and_then(|regex| regex.captures(article))
                        .or_else(|| {
                            fallback_repo_regex
                                .as_ref()
                                .and_then(|regex| regex.captures(article))
                        })?;
                    let owner = decode_html(repo_captures.get(1)?.as_str());
                    let repo = decode_html(repo_captures.get(2)?.as_str());
                    let description = description_regex
                        .as_ref()
                        .map(|regex| {
                            clean_trending_description(capture(regex, article, 1), &owner, &repo)
                        })
                        .unwrap_or_default();
                    let language = language_regex
                        .as_ref()
                        .map(|regex| capture(regex, article, 1))
                        .unwrap_or_default();
                    let stars = stars_regex
                        .as_ref()
                        .map(|regex| capture(regex, article, 1))
                        .unwrap_or_default();
                    let period_stars = period_stars_regex
                        .as_ref()
                        .map(|regex| capture(regex, article, 1))
                        .unwrap_or_default();

                    Some(GithubTrendingItem {
                        name: format!("{owner}/{repo}"),
                        owner: owner.clone(),
                        repo: repo.clone(),
                        description,
                        url: format!("https://github.com/{owner}/{repo}"),
                        language,
                        stars,
                        period_stars,
                    })
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    items.sort_by(|a, b| {
        parse_number(&b.period_stars)
            .cmp(&parse_number(&a.period_stars))
            .then(parse_number(&b.stars).cmp(&parse_number(&a.stars)))
    });
    items.truncate(10);
    items
}

fn fetch_github_trending(
    client: &reqwest::blocking::Client,
    period: &str,
) -> Vec<GithubTrendingItem> {
    let since = if period == "yearly" {
        "monthly"
    } else {
        period
    };
    fetch_text(
        client,
        &format!("https://github.com/trending?since={since}"),
    )
    .map(|html| parse_trending(&html))
    .unwrap_or_default()
}

fn build_home_summary(
    locale: &str,
    news: &[HomeNewsItem],
    trending: &[GithubTrendingItem],
) -> String {
    let top_news = news
        .iter()
        .take(3)
        .map(|item| item.title.as_str())
        .collect::<Vec<_>>()
        .join(" / ");
    let top_repos = trending
        .iter()
        .take(3)
        .map(|item| item.name.as_str())
        .collect::<Vec<_>>()
        .join(" / ");

    if locale == "zh" {
        format!("热点：{}。趋势项目：{}。", top_news, top_repos)
    } else {
        format!(
            "Headlines: {}. Trending repositories: {}.",
            top_news, top_repos
        )
    }
}

fn to_values<T: Serialize>(items: Vec<T>) -> Vec<Value> {
    items
        .into_iter()
        .filter_map(|item| serde_json::to_value(item).ok())
        .collect()
}

#[tauri::command]
fn get_models() -> Vec<ModelInfo> {
    vec![
        ModelInfo {
            id: "gpt-4o",
            name: "ChatGPT (OpenAI)",
            base_url: "https://api.openai.com/v1",
            model: "gpt-4o",
            requires_url: false,
        },
        ModelInfo {
            id: "claude-3-5-sonnet",
            name: "Claude (Anthropic)",
            base_url: "https://api.anthropic.com/v1",
            model: "claude-3-5-sonnet-20241022",
            requires_url: false,
        },
        ModelInfo {
            id: "gemini-2-flash",
            name: "Gemini (Google)",
            base_url: "https://generativelanguage.googleapis.com/v1beta",
            model: "gemini-2.0-flash",
            requires_url: false,
        },
        ModelInfo {
            id: "glm-4-flash",
            name: "GLM (智谱AI)",
            base_url: "https://open.bigmodel.cn/api/paas/v4",
            model: "glm-4-flash",
            requires_url: false,
        },
        ModelInfo {
            id: "kimi-plus",
            name: "Kimi (Moonshot)",
            base_url: "https://api.moonshot.cn/v1",
            model: "moonshot-v1-8k",
            requires_url: false,
        },
        ModelInfo {
            id: "deepseek-v4-pro",
            name: "DeepSeek V4-Pro",
            base_url: "https://api.deepseek.com/v1",
            model: "deepseek-v4-pro",
            requires_url: false,
        },
        ModelInfo {
            id: "deepseek-v4-flash",
            name: "DeepSeek V4-Flash",
            base_url: "https://api.deepseek.com/v1",
            model: "deepseek-v4-flash",
            requires_url: false,
        },
        ModelInfo {
            id: "qwen-plus",
            name: "通义千问 (阿里云)",
            base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
            model: "qwen-plus",
            requires_url: false,
        },
        ModelInfo {
            id: "custom",
            name: "自定义 (OpenAI 兼容接口)",
            base_url: "",
            model: "",
            requires_url: true,
        },
    ]
}

#[tauri::command]
fn store_get(app: tauri::AppHandle, key: String) -> Result<Option<Value>, String> {
    Ok(read_store(&app)?.remove(&key))
}

#[tauri::command]
fn store_set(app: tauri::AppHandle, key: String, value: Value) -> Result<bool, String> {
    let mut store = read_store(&app)?;
    store.insert(key, value);
    write_store(&app, &store)?;
    Ok(true)
}

fn http_request_inner(request: PlatformHttpRequest) -> Result<PlatformHttpResponse, String> {
    let client = http_client()?;
    let method = request
        .method
        .unwrap_or_else(|| "GET".into())
        .to_uppercase();
    let mut builder = match method.as_str() {
        "POST" => client.post(&request.url),
        "GET" => client.get(&request.url),
        other => return Err(format!("unsupported HTTP method: {other}")),
    };

    for (key, value) in request.headers {
        builder = builder.header(key, value);
    }
    if let Some(body) = request.body {
        builder = builder.body(body);
    }

    let response = builder.send().map_err(|error| error.to_string())?;
    let status = response.status();
    let body = response.text().map_err(|error| error.to_string())?;
    Ok(PlatformHttpResponse {
        status: status.as_u16(),
        ok: status.is_success(),
        body,
    })
}

#[tauri::command]
async fn http_request(request: PlatformHttpRequest) -> Result<PlatformHttpResponse, String> {
    tauri::async_runtime::spawn_blocking(move || http_request_inner(request))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
fn notify_shell_ready(app: tauri::AppHandle) {
    if app.get_webview_window(CLIPBOARD_WINDOW_LABEL).is_some() {
        return;
    }

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
    }
}

#[tauri::command]
fn set_app_locale(app: tauri::AppHandle, locale: String) -> Result<bool, String> {
    if locale != "zh" && locale != "en" {
        return Err("unsupported locale".into());
    }
    let mut store = read_store(&app)?;
    store.insert("app-locale".into(), Value::String(locale));
    write_store(&app, &store)?;
    Ok(true)
}

fn reveal_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_skip_taskbar(false);
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn hide_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        let _ = window.set_skip_taskbar(true);
    }
}

fn show_main_clipboard_page(app: &tauri::AppHandle) {
    reveal_main_window(app);
    let _ = app.emit_to("main", "clipboard:show-main", ());
}

fn app_index_url_with_query(query: &str) -> WebviewUrl {
    WebviewUrl::App(PathBuf::from(format!("index.html?{query}")))
}

fn create_clipboard_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(CLIPBOARD_WINDOW_LABEL) {
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    let window = WebviewWindowBuilder::new(
        &app,
        CLIPBOARD_WINDOW_LABEL,
        app_index_url_with_query("window=clipboard-floating"),
    )
    .title("CinnaTool Quick Tools")
    .inner_size(400.0, 600.0)
    .min_inner_size(400.0, 600.0)
    .max_inner_size(400.0, 600.0)
    .resizable(false)
    .minimizable(false)
    .maximizable(false)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .focused(true)
    .build()
    .map_err(|error| error.to_string())?;

    let event_app = app.clone();
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::CloseRequested { .. }) {
            show_main_clipboard_page(&event_app);
        }
    });

    Ok(())
}

fn create_translation_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(TRANSLATION_WINDOW_LABEL) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        TRANSLATION_WINDOW_LABEL,
        app_index_url_with_query("window=translation-quick"),
    )
    .title("CinnaTool AI Translation")
    .inner_size(680.0, 620.0)
    .min_inner_size(520.0, 480.0)
    .always_on_top(true)
    .focused(true)
    .build()
    .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn open_translation_quick_window(app: tauri::AppHandle) -> Result<bool, String> {
    create_translation_window(app)?;
    Ok(true)
}

#[tauri::command]
fn open_clipboard_floating_window(app: tauri::AppHandle) -> Result<bool, String> {
    create_clipboard_window(app.clone())?;
    hide_main_window(&app);
    Ok(true)
}

#[tauri::command]
fn toggle_clipboard_floating_window(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window(CLIPBOARD_WINDOW_LABEL) {
        let _ = window.close();
        show_main_clipboard_page(&app);
        return Ok(true);
    }
    open_clipboard_floating_window(app)
}

#[tauri::command]
fn restore_clipboard_to_main_window(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window(CLIPBOARD_WINDOW_LABEL) {
        let _ = window.close();
    }
    show_main_clipboard_page(&app);
    Ok(true)
}

#[tauri::command]
fn open_ai_settings(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window(CLIPBOARD_WINDOW_LABEL) {
        let _ = window.close();
    }
    reveal_main_window(&app);
    let _ = app.emit_to("main", "settings:open-ai", ());
    Ok(true)
}

#[tauri::command]
fn open_url_window(
    app: tauri::AppHandle,
    url: String,
    title: Option<String>,
) -> Result<bool, String> {
    let parsed_url = tauri::Url::parse(&url).map_err(|error| error.to_string())?;
    if parsed_url.scheme() != "http" && parsed_url.scheme() != "https" {
        return Err("only http and https URLs can be opened in an app window".into());
    }

    let label = format!("home-browser-{}", Uuid::new_v4().simple());
    WebviewWindowBuilder::new(&app, label, WebviewUrl::External(parsed_url))
        .title(
            title
                .filter(|value| !value.trim().is_empty())
                .unwrap_or(url),
        )
        .inner_size(1100.0, 780.0)
        .min_inner_size(720.0, 520.0)
        .decorations(true)
        .resizable(true)
        .focused(true)
        .build()
        .map_err(|error| error.to_string())?;
    Ok(true)
}

fn home_dashboard_error(error: String) -> HomeDashboardData {
    HomeDashboardData {
        news: Vec::new(),
        trending: Vec::new(),
        summary: String::new(),
        summary_state: HomeSummaryState {
            enabled: false,
            available: false,
            generated: false,
            error,
            reason: "request".into(),
        },
        fetched_at: chrono::Utc::now().timestamp_millis(),
    }
}

fn fetch_home_dashboard_inner(locale: String, period: String) -> HomeDashboardData {
    let client = match http_client() {
        Ok(client) => client,
        Err(error) => return home_dashboard_error(error),
    };
    let (news, trending) = std::thread::scope(|scope| {
        let news_client = client.clone();
        let news_task = scope.spawn(move || fetch_news(&news_client));
        let trending_task = scope.spawn(|| fetch_github_trending(&client, &period));
        (
            news_task.join().unwrap_or_default(),
            trending_task.join().unwrap_or_default(),
        )
    });
    let summary = build_home_summary(&locale, &news, &trending);

    HomeDashboardData {
        news: to_values(news),
        trending: to_values(trending),
        summary,
        summary_state: HomeSummaryState {
            enabled: false,
            available: false,
            generated: false,
            error: String::new(),
            reason: "disabled".into(),
        },
        fetched_at: chrono::Utc::now().timestamp_millis(),
    }
}

#[tauri::command]
async fn fetch_home_dashboard(
    locale: String,
    period: String,
    _options: Option<Value>,
) -> HomeDashboardData {
    tauri::async_runtime::spawn_blocking(move || fetch_home_dashboard_inner(locale, period))
        .await
        .unwrap_or_else(|error| home_dashboard_error(error.to_string()))
}

#[tauri::command]
fn save_generated_document(
    request: SaveGeneratedDocumentRequest,
) -> Result<SaveGeneratedDocumentResult, String> {
    let extension = match request.extension.as_deref() {
        Some("txt") => "txt",
        _ => "md",
    };
    let requested_name = request.file_name.as_deref().unwrap_or("generated-document");
    let base_name = sanitize_file_name(
        requested_name.trim_end_matches(&format!(".{extension}")),
        "generated-document",
    );
    let file_name = format!("{base_name}.{extension}");
    let directory = dirs::download_dir()
        .or_else(dirs::document_dir)
        .or_else(dirs::home_dir)
        .ok_or("无法定位可写目录")?;
    let path = directory.join(&file_name);
    fs::write(&path, request.content).map_err(|error| error.to_string())?;
    Ok(SaveGeneratedDocumentResult {
        file_name,
        path: path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
fn resolve_wallpaper_file(path: String, kind: String) -> Result<Option<WallpaperFileInfo>, String> {
    let path = PathBuf::from(path);
    if !path.is_file() {
        return Ok(None);
    }

    let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
    Ok(Some(WallpaperFileInfo {
        name: file_name(&path),
        path: path.to_string_lossy().to_string(),
        url: path.to_string_lossy().to_string(),
        size: metadata.len(),
        mtime: modified_ms(&path),
        media_type: wallpaper_media_type(&path, &kind),
    }))
}

#[tauri::command]
fn read_image_folder(folder_path: String) -> Result<Option<ImageFolderResult>, String> {
    let path = PathBuf::from(folder_path);
    if !path.is_dir() {
        return Ok(None);
    }

    read_image_folder_inner(path).map(Some)
}

#[tauri::command]
fn read_image_file(file_path: String) -> Result<Option<ImageFolderResult>, String> {
    let path = PathBuf::from(file_path);
    if !path.is_file() || !is_image(&path) {
        return Ok(None);
    }

    let folder = path
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."));
    read_image_folder_inner(folder).map(Some)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state != ShortcutState::Pressed {
                        return;
                    }

                    if let Some(action) = quick_action_for_shortcut(shortcut) {
                        if action == "open-translation" {
                            if let Err(error) = create_translation_window(app.clone()) {
                                eprintln!("Failed to open translation window: {error}");
                            }
                        } else if action == "toggle-floating" {
                            if let Err(error) = toggle_clipboard_floating_window(app.clone()) {
                                eprintln!("Failed to toggle quick tools window: {error}");
                            }
                        } else {
                            emit_quick_action(app, action);
                        }
                    }
                })
                .build(),
        )
        .on_page_load(|webview, payload| {
            if webview.label() == "main" && payload.event() == PageLoadEvent::Finished {
                let _ = webview.window().show();
            }
        })
        .setup(|app| {
            register_quick_action_shortcuts(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_models,
            http_request,
            store_get,
            store_set,
            notify_shell_ready,
            set_app_locale,
            open_clipboard_floating_window,
            toggle_clipboard_floating_window,
            restore_clipboard_to_main_window,
            open_translation_quick_window,
            open_ai_settings,
            open_url_window,
            fetch_home_dashboard,
            save_generated_document,
            resolve_wallpaper_file,
            read_image_folder,
            read_image_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running CinnaTool Tauri application");
}
