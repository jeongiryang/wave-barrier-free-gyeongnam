const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) ? value : null;
export function regionRecords(trips, regions) {
  const source = Array.isArray(trips) ? trips : [];
  return (Array.isArray(regions) ? regions : []).filter(region => typeof region === 'string' && region).map(region => {
    const dates = source.filter(trip => trip?.region === region).map(trip => date(trip?.completedAt)).filter(Boolean).sort();
    return { region, visited: dates.length > 0, firstRecordedOn: dates[0] || null };
  });
}
