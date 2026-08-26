import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';

export const OPENSEARCH_CLIENT = 'OPENSEARCH_CLIENT';

const logger = new Logger('OpenSearchClientProvider');

/**
 * Constructs the OpenSearch client, or `null` when search is disabled/misconfigured.
 * `null` is the "search unavailable" signal SearchService checks before every call —
 * catalog browsing/search must silently fall back to Postgres, never throw, so this
 * factory itself must never throw either.
 *
 * Note: the opensearch-js client does not eagerly connect on construction (it's a
 * thin HTTP client wrapper), so `new Client(...)` succeeding here says nothing about
 * whether the node is actually reachable — that's discovered (and swallowed) on the
 * first real call inside SearchService.
 */
export const OpenSearchClientProvider: Provider = {
  provide: OPENSEARCH_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Client | null => {
    const enabled = config.get<boolean>('search.opensearch.enabled') === true;
    if (!enabled) {
      logger.log(
        'OPENSEARCH_ENABLED is not "true" — OpenSearch search is disabled; catalog search will use Postgres only',
      );
      return null;
    }

    const node = config.get<string>('search.opensearch.node') ?? 'http://opensearch:9200';
    try {
      return new Client({ node });
    } catch (error) {
      logger.error(
        `Failed to construct OpenSearch client (node="${node}") — falling back to Postgres search: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  },
};
