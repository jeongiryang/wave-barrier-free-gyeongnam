/**
 * Backward-compatible provider facade.
 *
 * Call sites can migrate feature-by-feature while request clients, response normalization and
 * provider state remain independently testable modules.
 */
export * from "./provider-types";
export * from "./provider-attempt";
export * from "./provider-normalizers";
export * from "./tourism-provider";
export * from "./public-transport-provider";
