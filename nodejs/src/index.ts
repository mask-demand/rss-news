import {Context, Node} from "./flatend";
import Parser from "rss-parser";
import schedule from "node-schedule";
let parser = new Parser();
import feedlist from "./feeds.json";
import feedlistZh from "./feeds-zh.json";
let feedStream:any[] = [];
let feedStreamZh:any[] = [];
let lastUpdated:Date = new Date();

const crawl = async () => {
  var rssres = await Promise.all(
    feedlist.map((feed:any) => parser.parseURL(feed.url))
  );

  var matcher = (entry: any) => {
    var keywords:any[] = ['coronavirus', 'covid', 'pandemic', 'quarantine', 'lockdown', 'mask', 'n95', 'hospital'];
    var regex = new RegExp('\\b' + keywords.join('\|\\b') + '\\b')
    var text = entry.title + ' ' + entry.content;
    return regex.test(text);
  }

  var res:any[] = rssres.reduce((acc:any[], rss:any, idx:any) => {
    acc = acc.concat(rss.items.filter((entry:any) => matcher(entry)).map((entry:any) => Object.assign(entry, {
      source: feedlist[idx].name,
      published: new Date(entry.pubDate)
    })));
    return acc;
  }, []);

  feedStream = res
  lastUpdated = new Date()
}

const crawlZh = async () => {
  var rssres = await Promise.all(
    feedlistZh.map((feed:any) => parser.parseURL(feed.url))
  );
  var res:any[] = rssres.reduce((acc:any[], rss:any, idx:any) => {
    acc = acc.concat(rss.items.map((entry:any) => Object.assign(entry, {
      source: feedlistZh[idx].name,
      published: new Date(entry.pubDate)
    })));
    return acc;
  }, []);

  feedStreamZh = res;
}

const index = (ctx: Context) => {
  ctx.send(`Available endpoints: /en /zh. RSS updates every 5 minutes. Last update: ${lastUpdated}.`)
}

const feed = (ctx: Context) => {
  ctx.header("Access-Control-Allow-Origin", "https://wars-mask.surge.sh");
  ctx.json({
    feed: feedStream,
    timestamp: lastUpdated
  });
}

const feedZh = (ctx: Context) => {
  ctx.header("Access-Control-Allow-Origin", "https://wars-mask.surge.sh");
  ctx.json({
    feed: feedStreamZh,
    timestamp: null
  });
}

async function main() {
  crawl();
  crawlZh();
  console.log('RSS crawl ran at ' + new Date());
  schedule.scheduleJob('*/5 * * * *', () => {
    crawl();
    crawlZh();
    console.log('RSS crawl ran at ' + new Date());
  });
  const node = new Node();
  node.register("index", index);
  node.register("feed", feed);
  node.register("feed-zh", feedZh);
  node.register("sources", (ctx: Context) => ctx.json(feedlist));
  await node.dial("0.0.0.0:9000");
}

main().catch(err => console.error(err));
