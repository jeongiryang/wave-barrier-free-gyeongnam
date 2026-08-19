import type { Env } from "../shared/env";
import { buildEnrichmentModel } from "./enrichment-model";
import { readEnrichmentQuery } from "./enrichment-query";
import { fetchEnrichmentSources } from "./enrichment-sources";

export { fetchCrowd, fetchHub, fetchRelated } from "./concentration";

export async function buildEnrichment(request: Request, env: Env) {
  const { region, theme, locale, eventStartDate, eventEndDate } = readEnrichmentQuery(request);
  const sources = await fetchEnrichmentSources(env, region, theme, locale, eventStartDate, eventEndDate);
  return buildEnrichmentModel(sources, Boolean(env.EXPRESSWAY_API_KEY?.trim()));
}
