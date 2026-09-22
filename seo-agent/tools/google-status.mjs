/**
 * Google weather — is a ranking update rolling (or just finished)? Attribution mode switch.
 *
 *   node seo-agent/tools/google-status.mjs
 *
 * Reads Google's public Search Status Dashboard feed (https://status.search.google.com/incidents.json)
 * and prints ONE line for the top of today's log:
 *
 *   update_in_progress: yes|no|unknown · <name> · <begin> · <end|ongoing>
 *
 * "yes" (or an update that ended < 7 days ago) means ATTRIBUTION MODE for the run: credit or blame
 * no traffic delta on your own change, no revert or re-targeting because of a mid-rollout move, no
 * speculative architecture; verified-defect repairs, copy, FAQ and product entries continue, and
 * commit messages carry "[during <update>]". Fetch error → "unknown" (treated as "no").
 *
 * Also appends new Search Central blog items that touch structured data / product / review /
 * sitemap / robots / canonical / CWV / spam policy to seo-agent/data/rule-changes.md (deduped by
 * URL) and prints the NEW rows only, so rule changes get triaged the day they appear.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '..', 'data');
const RULES = path.join(dataDir, 'rule-changes.md');
const UA = 'Mozilla/5.0 (compatible; ProteinTnSeoBot/1.0; +https://protein.tn)';
const RANKING = /core update|product reviews|reviews update|helpful content|spam update|ranking/i;
const RULE_KEYWORDS = /structured data|merchant listing|product snippet|review snippet|sitemap|robots|canonical|core web vitals|spam polic|faq|e-commerce|ecommerce|shopping/i;

async function incidents() {
  try {
    const res = await fetch('https://status.search.google.com/incidents.json', { headers: { 'user-agent': UA } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function fmt(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}

async function main() {
  const list = await incidents();
  let line = 'update_in_progress: unknown · (status dashboard unreachable) · · ';
  if (Array.isArray(list)) {
    const ranking = list
      .filter((i) => RANKING.test(`${i.external_desc || ''} ${(i.affected_products || []).map((p) => p.title).join(' ')} ${i.service_name || ''}`))
      .map((i) => ({ name: (i.external_desc || i.service_name || 'update').split('\n')[0].slice(0, 90), begin: i.begin, end: i.end || null }))
      .sort((a, b) => new Date(b.begin) - new Date(a.begin));
    const now = Date.now();
    const active = ranking.find((r) => !r.end);
    const recent = ranking.find((r) => r.end && now - new Date(r.end).getTime() < 7 * 86400e3);
    if (active) line = `update_in_progress: yes · ${active.name} · ${fmt(active.begin)} · ongoing`;
    else if (recent) line = `update_in_progress: yes · ${recent.name} · ${fmt(recent.begin)} · ended ${fmt(recent.end)} (< 7 days — attribution mode)`;
    else if (ranking[0]) line = `update_in_progress: no · last: ${ranking[0].name} · ${fmt(ranking[0].begin)} · ended ${fmt(ranking[0].end)}`;
    else line = 'update_in_progress: no · (no ranking incidents listed) · · ';
  }
  console.log(line);

  // Rule changes: Search Central blog RSS.
  try {
    const res = await fetch('https://feeds.feedburner.com/blogspot/amDG', { headers: { 'user-agent': UA } });
    if (res.ok) {
      const xml = await res.text();
      const items = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>|<item>([\s\S]*?)<\/item>/g)].map((m) => m[1] || m[2]);
      mkdirSync(dataDir, { recursive: true });
      const existing = existsSync(RULES) ? readFileSync(RULES, 'utf8') : '# Search Central rule changes to triage (appended by google-status.mjs; tick when handled)\n\n';
      if (!existsSync(RULES)) writeFileSync(RULES, existing);
      const fresh = [];
      for (const it of items) {
        const title = (it.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1]?.trim() || '';
        const url = (it.match(/<link[^>]*href="([^"]+)"/) || it.match(/<link>([^<]+)<\/link>/) || [])[1]?.trim() || '';
        const date = fmt((it.match(/<(?:published|pubDate|updated)>([^<]+)</) || [])[1]);
        const kw = (title.match(RULE_KEYWORDS) || [])[0];
        if (!kw || !url || existing.includes(url)) continue;
        fresh.push(`- [ ] ${date} · ${title} · ${url} · ${kw.toLowerCase()}`);
      }
      if (fresh.length) {
        appendFileSync(RULES, fresh.join('\n') + '\n');
        console.log(`\nNEW rule-change rows appended to seo-agent/data/rule-changes.md:\n${fresh.join('\n')}`);
      }
    }
  } catch {
    /* feed unreachable — nothing appended */
  }
}

main();
