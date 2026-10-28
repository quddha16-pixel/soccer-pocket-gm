"""Compile selected real free agents without network access or random ratings.

Identity and reported availability have dated sources. Numerical assessments
remain provisional unless an explicit source verifies the field.
"""
import json,importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('custom',ROOT/'scripts/build-custom-roster.py');b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
facts=json.loads((ROOT/'docs/research/free-agent-facts.json').read_text());profiles=[]
for f in facts:
    row={'draftId':f['id'],'name':f['name'],'clubId':'','eaId':f.get('eaId'),'official':{'url':f['identitySource'],'overall':f['overall'],'positions':f['positions'],'nationality':f['nationality'],'foot':f['foot'],'attributes':f['attributes'],'styles':f.get('styles',[])},'secondary':None,'identityOverride':{'birthDate':f['birthDate'],'url':f['identitySource']},'potentialEstimate':f['potential']}
    p=b.compile_profile(row)
    p.update(origin='free-agent',canonicalIdentityId=f.get('canonicalIdentityId',f['id']),ratingStatus='official' if f.get('ratingVerified') else 'provisional',contractYearsEstimate=0,ratingRationale=f['rationale'],traits=f['traits'],traitRationale=f['traitRationale'],startingValue=f['valueGBP'],weeklyWageEstimate=f['wageGBP'],sources=f['sources'])
    p['estimatedFields']=list(dict.fromkeys(p['estimatedFields']+([] if f.get('ratingVerified') else ['overall','attributes'])+['potential','startingAvailabilityDate']+f.get('additionalEstimates',[])))
    profiles.append(p)
assert len(profiles)==50 and len({p['canonicalIdentityId'] for p in profiles})==50
existing=sum([json.loads((ROOT/'src/data'/fn).read_text())['players'] for fn in ['custom-roster.json','championship-players.json']],[])
for p in profiles:
    assert not any(p['canonicalIdentityId']==x['canonicalIdentityId'] or p['dateOfBirth']==x['dateOfBirth'] and p['displayName']==x['displayName'] for x in existing),p['displayName']
(ROOT/'src/data/free-agents.json').write_text(json.dumps({'checked':'2026-10-28','players':profiles},ensure_ascii=False,separators=(',',':'))+'\n')
print('Imported',len(profiles),'free agents;',sum(p['ratingStatus']=='official' for p in profiles),'sourced overall;',sum(p['ratingStatus']=='provisional' for p in profiles),'provisional assessments.')
