use quick_xml::events::Event;
use quick_xml::Reader;

/// One entry of a feed, reduced to what a headline list needs.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct FeedItem {
    pub title: String,
    pub link: String,
    pub published: String,
}

#[derive(PartialEq)]
enum Field {
    None,
    Title,
    Link,
    Date,
}

/// Extracts the items of an RSS or Atom document.
///
/// Written against the tags rather than a schema: publishers mix RSS 2.0 and
/// Atom, and several serve subtly invalid XML. Anything unrecognised is skipped
/// instead of failing the whole poll — one malformed feed must not cost the
/// others.
pub fn parse_rss(xml: &str) -> Vec<FeedItem> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);
    reader.config_mut().check_end_names = false;

    let mut items = Vec::new();
    let mut current: Option<FeedItem> = None;
    let mut field = Field::None;
    let mut buffer = Vec::new();

    loop {
        match reader.read_event_into(&mut buffer) {
            Ok(Event::Start(tag)) => {
                let name = local_name(tag.name().as_ref());
                match name.as_str() {
                    "item" | "entry" => current = Some(FeedItem::default()),
                    "title" => field = Field::Title,
                    "link" => {
                        field = Field::Link;
                        // Atom carries the URL in an attribute, not the body.
                        if let Some(item) = current.as_mut() {
                            for attribute in tag.attributes().flatten() {
                                if attribute.key.as_ref() == b"href" {
                                    item.link =
                                        String::from_utf8_lossy(&attribute.value).into_owned();
                                }
                            }
                        }
                    }
                    "pubDate" | "published" | "updated" => field = Field::Date,
                    _ => field = Field::None,
                }
            }
            Ok(Event::Empty(tag)) => {
                if local_name(tag.name().as_ref()) == "link" {
                    if let Some(item) = current.as_mut() {
                        for attribute in tag.attributes().flatten() {
                            if attribute.key.as_ref() == b"href" {
                                item.link = String::from_utf8_lossy(&attribute.value).into_owned();
                            }
                        }
                    }
                }
            }
            // CDATA and plain text carry the same payload but arrive as
            // different types, so they are normalised to bytes here.
            Ok(Event::Text(text)) => {
                let Some(item) = current.as_mut() else {
                    continue;
                };
                let value = String::from_utf8_lossy(text.as_ref()).trim().to_string();
                if value.is_empty() {
                    continue;
                }
                assign(item, &field, value);
            }
            Ok(Event::CData(text)) => {
                let Some(item) = current.as_mut() else {
                    continue;
                };
                let value = String::from_utf8_lossy(text.as_ref()).trim().to_string();
                assign(item, &field, value);
            }
            Ok(Event::End(tag)) => {
                let name = local_name(tag.name().as_ref());
                if name == "item" || name == "entry" {
                    if let Some(item) = current.take() {
                        // A headline is the whole point; an item without one is
                        // noise.
                        if !item.title.is_empty() {
                            items.push(item);
                        }
                    }
                }
                field = Field::None;
            }
            Ok(Event::Eof) | Err(_) => break,
            _ => {}
        }
        buffer.clear();
    }

    items
}

fn assign(item: &mut FeedItem, field: &Field, value: String) {
    if value.is_empty() {
        return;
    }
    match field {
        Field::Title if item.title.is_empty() => item.title = value,
        Field::Link if item.link.is_empty() => item.link = value,
        Field::Date if item.published.is_empty() => item.published = value,
        _ => {}
    }
}

/// Drops any namespace prefix, so `atom:link` reads as `link`.
fn local_name(raw: &[u8]) -> String {
    let name = String::from_utf8_lossy(raw);
    match name.rsplit_once(':') {
        Some((_, local)) => local.to_string(),
        None => name.into_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_a_plain_rss_document() {
        let xml = r#"
            <rss><channel>
              <title>Ignored channel title</title>
              <item>
                <title>Fed holds rates steady</title>
                <link>https://example.com/a</link>
                <pubDate>Wed, 05 Aug 2026 18:00:00 GMT</pubDate>
              </item>
              <item>
                <title>Oil slips on demand fears</title>
                <link>https://example.com/b</link>
                <pubDate>Wed, 05 Aug 2026 17:30:00 GMT</pubDate>
              </item>
            </channel></rss>"#;

        let items = parse_rss(xml);
        assert_eq!(items.len(), 2, "the channel title must not become an item");
        assert_eq!(items[0].title, "Fed holds rates steady");
        assert_eq!(items[1].link, "https://example.com/b");
    }

    #[test]
    fn reads_atom_where_the_link_is_an_attribute() {
        let xml = r#"
            <feed xmlns="http://www.w3.org/2005/Atom">
              <entry>
                <title>ECB signals a pause</title>
                <link href="https://example.com/ecb"/>
                <published>2026-08-05T18:00:00Z</published>
              </entry>
            </feed>"#;

        let items = parse_rss(xml);
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].link, "https://example.com/ecb");
        assert_eq!(items[0].published, "2026-08-05T18:00:00Z");
    }

    #[test]
    fn unwraps_cdata_titles() {
        let xml = r#"<rss><channel><item>
            <title><![CDATA[Dollar rises & yields climb]]></title>
            <link>https://example.com/fx</link>
        </item></channel></rss>"#;

        let items = parse_rss(xml);
        assert_eq!(items[0].title, "Dollar rises & yields climb");
    }

    #[test]
    fn ignores_namespace_prefixes() {
        let xml = r#"<rss xmlns:atom="http://www.w3.org/2005/Atom"><channel><item>
            <title>Gold steadies</title>
            <atom:link>https://example.com/gold</atom:link>
        </item></channel></rss>"#;

        assert_eq!(parse_rss(xml)[0].title, "Gold steadies");
    }

    #[test]
    fn an_item_without_a_headline_is_discarded() {
        let xml = r#"<rss><channel>
            <item><link>https://example.com/x</link></item>
            <item><title>Real headline</title></item>
        </channel></rss>"#;

        let items = parse_rss(xml);
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].title, "Real headline");
    }

    #[test]
    fn malformed_input_yields_nothing_rather_than_panicking() {
        assert!(parse_rss("not xml at all").is_empty());
        assert!(parse_rss("<rss><channel><item><title>truncated").is_empty());
        assert!(parse_rss("").is_empty());
    }
}
