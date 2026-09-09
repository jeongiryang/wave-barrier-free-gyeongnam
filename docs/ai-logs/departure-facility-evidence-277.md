# Departure facility evidence — #277 / #280-R06

- Owner-authorized functional continuation, stacked locally on the separately prepared route-coverage repair. Baseline 2ee3c53: all3 new cases fail because score/knownFields/time confirms a place even when requested facility records are unknown, negative or absent.
- Use current recommendation criteria and unique structured facility records, with source/retrieval metadata. Count confirmed/unknown/negative separately. Negative records require recheck; mixed unknown or missing places remain partial; legacy scores and changed criteria cannot confirm current requirements. Preserve original source labels, current trip storage, providers and manual search behavior. Missing values never become negative records; conflicting duplicate keys remain unknown.
- Initial full quality: lint13 existing warnings, typecheck and739 unit/contract PASS. Build succeeds but unchanged270KiB initial Planner budget fails at270.16KiB. Must resolve before any PR/merge.
- Initial28 browser cases:26PASS; two English tests used the wrong translated button label. Corrected the locator to the actual rendered label, preserving the criteria-change/no-auto-query/reload assertions. Final browser/visual checks pending.
- Source freshness policy and actual live provider accessibility remain separate and unverified. No full #277 closure or Production claim.
