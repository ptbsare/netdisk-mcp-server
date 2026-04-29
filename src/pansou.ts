import axios from 'axios';

export interface SearchResult {
  url: string;
  password?: string;
  note: string;
  datetime: string;
  source: string;
}

export interface SearchResponse {
  total: number;
  merged_by_type: Record<string, SearchResult[]>;
  results?: any[];
}

export class PansouClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    if (!baseUrl) throw new Error('PANSOU_URL is required');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async health(): Promise<any> {
    const { data } = await axios.get(`${this.baseUrl}/api/health`);
    return data;
  }

  async search(opts: {
    query: string;
    resultType?: string;
    source?: string;
    refresh?: boolean;
    cloudTypes?: string[];
    plugins?: string[];
    channels?: string[];
    concurrency?: number;
    include?: string[];
    exclude?: string[];
  }): Promise<SearchResponse> {
    const params: Record<string, string> = {
      kw: opts.query,
      res: opts.resultType || 'merge',
      src: opts.source || 'all',
    };
    if (opts.refresh) params.refresh = 'true';
    if (opts.cloudTypes?.length) params.cloud_types = opts.cloudTypes.join(',');
    if (opts.plugins?.length) params.plugins = opts.plugins.join(',');
    if (opts.channels?.length) params.channels = opts.channels.join(',');
    if (opts.concurrency) params.conc = String(opts.concurrency);
    if (opts.include?.length || opts.exclude?.length) {
      const filter: Record<string, string[]> = {};
      if (opts.include?.length) filter.include = opts.include;
      if (opts.exclude?.length) filter.exclude = opts.exclude;
      params.filter = JSON.stringify(filter);
    }

    const { data } = await axios.get(`${this.baseUrl}/api/search`, { params });
    if (data.error) throw new Error(data.error);
    return {
      total: data.data?.total ?? 0,
      merged_by_type: data.data?.merged_by_type ?? {},
      results: data.results,
    };
  }
}
