"""Offline, deterministic appearance import. Never fetches or republishes reference photos."""
import json
import pathlib
import re
import sys
import csv
import io

ROOT = pathlib.Path(__file__).resolve().parents[1]
read = lambda path: json.loads((ROOT / path).read_text())
observations = read('docs/research/appearance-observations.json')
facts = {p['draftId']: p for p in read('docs/research/fc27-facts.json')}
measurements = read('docs/research/appearance-measurements.json')
players = {}
aliases = {}
for filename in ['custom-roster.json', 'free-agents.json', 'championship-players.json']:
    for p in read('src/data/' + filename)['players']:
        players.setdefault(p['canonicalIdentityId'], p)
        aliases[p['draftId']] = p['canonicalIdentityId']
records = {}
for key, p in players.items():
    record = dict(name=p['displayName'], birthDate=p['dateOfBirth'], sources=[], buildStatus='unverified')
    secondary = facts.get(p['draftId'], {}).get('secondary') or {}
    height = re.match(r'(\d+)cm', secondary.get('height', ''))
    if height:
        record['heightCm'] = int(height[1])
        record['sources'].append(dict(url=secondary['url'], checked='2026-10-28', fields=['heightCm'], kind='retained supporting reference'))
    measured = measurements.get(p['draftId'])
    if measured:
        record.update({k: v for k, v in measured.items() if k != 'sources'})
        record['sources'].extend(measured['sources'])
    visual = observations.get(key)
    if visual:
        assert visual['birthDate'] == p['dateOfBirth'], f'Identity mismatch: {key}'
        record['visual'] = {k: v for k, v in visual.items() if k not in ['birthDate', 'sources', 'name']}
        record['sources'].extend(visual['sources'])
    records[key] = record
output = json.dumps(dict(checked='2026-10-28', aliases=aliases, players=records), ensure_ascii=False, indent=2) + '\n'
target = ROOT / 'src/data/player-appearances.json'
if '--check' in sys.argv:
    assert target.read_text() == output, 'Appearance catalogue is out of date. Run python3 scripts/build-appearances.py.'
else:
    target.write_text(output)
custom = read('src/data/custom-roster.json')['players']
summary = dict(total=len(records), custom=len(custom), customHeight=sum('heightCm' in records[p['canonicalIdentityId']] for p in custom), customVisual=sum('visual' in records[p['canonicalIdentityId']] for p in custom), customWeight=sum('weightKg' in records[p['canonicalIdentityId']] for p in custom))
csvfile = io.StringIO(newline='')
writer = csv.writer(csvfile, lineterminator='\n')
writer.writerow(['draftId', 'name', 'customClub', 'heightCm', 'weightKg', 'appearance', 'build'])
for p in custom:
    r = records[p['canonicalIdentityId']]
    writer.writerow([p['draftId'], p['displayName'], p['assignedClubId'], r.get('heightCm', 'unverified'), r.get('weightKg', 'unverified'), 'photo-observed illustration' if r.get('visual') else 'neutral placeholder', r['buildStatus']])
report = ROOT / 'docs/research/avatar-reconciliation.csv'
if '--check' in sys.argv:
    assert report.read_text() == csvfile.getvalue(), 'Avatar reconciliation is out of date.'
else:
    report.write_text(csvfile.getvalue())
print(json.dumps(summary))
