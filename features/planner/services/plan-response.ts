import type { PlanData } from "../types";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => Boolean(value && typeof value === "object" && !Array.isArray(value));
const text = (value: unknown) => typeof value === "string";
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value);
const list = (value: unknown, valid: (item: unknown) => boolean) => Array.isArray(value) && value.every(valid);
const optional = (value: unknown, valid: (item: unknown) => boolean) => value === undefined || valid(value);
const nullable = (value: unknown, valid: (item: unknown) => boolean) => value === null || valid(value);
const fields = (value: unknown, keys: string): value is RecordValue => record(value) && keys.split(" ").every(key => text(value[key]));

function place(value: unknown): boolean {
  return fields(value, "id contentTypeId city name address summary image mapX mapY source")
    && nullable(value.score, number) && list(value.features, text) && list(value.details, text)
    && ["confidence", "knownFields", "unknownFields", "negativeFields"].every(key => optional(value[key], number))
    && optional(value.checkedAt, text)
    && optional(value.accessibility, items => list(items, item => fields(item, "key label detail") && ["confirmed", "unknown", "negative"].includes(String(item.state))));
}

function status(value: unknown): boolean {
  return fields(value, "id name role note") && ["live", "empty", "error", "ready"].includes(String(value.state))
    && number(value.count) && optional(value.partial, item => typeof item === "boolean")
    && optional(value.failure, record) && optional(value.failures, items => list(items, record));
}

/** Validate before replacing usable results; never turn malformed data into an empty success. */
export function planResponse(value: unknown): PlanData {
  const valid = fields(value, "generatedAt baseYm") && ["live", "partial", "fallback"].includes(String(value.mode))
    && list(value.places, place) && optional(value.explorationPlaces, items => list(items, place))
    && list(value.statuses, status)
    && list(value.stops, item => fields(item, "title note source") && ["id", "contentTypeId", "mapX", "mapY"].every(key => optional(item[key], text)) && optional(item.visitMinutes, number))
    && nullable(value.course, item => fields(item, "name distance minutes level summary sigun"))
    && nullable(value.audio, item => fields(item, "title audioTitle audioUrl script playTime"))
    && optional(value.photo, item => nullable(item, photo => fields(photo, "id title image location photographer month")))
    && optional(value.crowd, item => nullable(item, crowd => fields(crowd, "baseYmd place") && number(crowd.rate)))
    && optional(value.criteria, item => record(item) && optional(item.facilityKeys, keys => list(keys, text)));
  if (!valid) throw new Error("Invalid plan response");
  return value as PlanData;
}
