export interface PubMedStudy {
  id: string;
  title: string;
  journal: string;
  publishedAt: string;
  url: string;
}

export interface PubMedResearchFeed {
  studies: PubMedStudy[];
  live: boolean;
}

const FALLBACK_STUDIES: PubMedStudy[] = [
  {
    id: '41323837',
    title: 'Dietary Supplement Strategies During Conditioning Training in Athletes: A Network Meta-Analysis',
    journal: 'Food Science & Nutrition',
    publishedAt: '2025',
    url: 'https://pubmed.ncbi.nlm.nih.gov/41323837/',
  },
  {
    id: '40717998',
    title: 'Effects of different dietary supplements combined with conditioning training on athletic performance',
    journal: 'Systematic review and network meta-analysis',
    publishedAt: '2025',
    url: 'https://pubmed.ncbi.nlm.nih.gov/40717998/',
  },
  {
    id: '39074168',
    title: 'The Effect of Creatine Supplementation on Resistance Training-Based Changes to Body Composition',
    journal: 'Journal of Strength and Conditioning Research',
    publishedAt: '2024',
    url: 'https://pubmed.ncbi.nlm.nih.gov/39074168/',
  },
];

type PubMedSearchResponse = { esearchresult?: { idlist?: string[] } };
type PubMedSummaryResponse = {
  result?: Record<string, unknown> & { uids?: string[] };
};

/**
 * One cached search + one batched summary request per day. NCBI permits up to three requests per
 * second without a key; this stays far below that limit and fails to reviewed static links after
 * 3.5 seconds so an external research service can never hold the blog hostage.
 */
export async function getLatestSportsNutritionResearch(): Promise<PubMedResearchFeed> {
  try {
    const common = new URLSearchParams({
      db: 'pubmed',
      retmode: 'json',
      tool: 'protein_tn_blog',
      email: 'contact@protein.tn',
    });
    const search = new URLSearchParams(common);
    search.set(
      'term',
      '(sports nutrition[Title/Abstract] OR creatine[Title/Abstract] OR protein supplementation[Title/Abstract]) AND (systematic review[Publication Type] OR meta-analysis[Publication Type])'
    );
    search.set('retmax', '3');
    search.set('sort', 'pub date');

    const searchResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${search.toString()}`,
      {
        next: { revalidate: 86400, tags: ['pubmed-sports-nutrition'] },
        signal: AbortSignal.timeout(3500),
      }
    );
    if (!searchResponse.ok) throw new Error(`PubMed search ${searchResponse.status}`);
    const searchJson = (await searchResponse.json()) as PubMedSearchResponse;
    const ids = searchJson.esearchresult?.idlist?.filter(Boolean) || [];
    if (ids.length === 0) throw new Error('PubMed returned no studies');

    const summary = new URLSearchParams(common);
    summary.set('id', ids.join(','));
    const summaryResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${summary.toString()}`,
      {
        next: { revalidate: 86400, tags: ['pubmed-sports-nutrition'] },
        signal: AbortSignal.timeout(3500),
      }
    );
    if (!summaryResponse.ok) throw new Error(`PubMed summary ${summaryResponse.status}`);
    const summaryJson = (await summaryResponse.json()) as PubMedSummaryResponse;
    const result = summaryJson.result || {};
    const uids = Array.isArray(result.uids) ? result.uids : ids;
    const studies = uids
      .map((id) => {
        const item = result[id] as
          | { title?: string; fulljournalname?: string; source?: string; pubdate?: string }
          | undefined;
        if (!item?.title) return null;
        return {
          id,
          title: item.title.replace(/\.$/, ''),
          journal: item.fulljournalname || item.source || 'PubMed',
          publishedAt: item.pubdate || '',
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        } satisfies PubMedStudy;
      })
      .filter((study): study is PubMedStudy => study !== null);

    return studies.length > 0 ? { studies, live: true } : { studies: FALLBACK_STUDIES, live: false };
  } catch {
    return { studies: FALLBACK_STUDIES, live: false };
  }
}
