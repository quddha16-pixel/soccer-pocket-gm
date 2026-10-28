"""Build real promotion-pool squads from selected, dated team reference facts.

The original 546-player database is never edited. Overall/positions/identities
come from the referenced FC 27 team page. Detailed skills, potential, money and
contracts below are explicitly provisional game assessments, not EA substats.
No randomized ratings or club-strength templates are used.
"""
import json,importlib.util
from pathlib import Path
from datetime import datetime,date

ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('custom_builder',ROOT/'scripts/build-custom-roster.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)

def assessed_attributes(p):
    pace,shoot,pas,dri,defence,physical=[p['summary'][k] for k in ['pac','sho','pas','dri','def','phy']]
    pos=p['position'];forward=pos in ['ST','CF'];wide=pos in ['LM','RM','LW','RW'];back=pos in ['RB','LB','RWB','LWB','CB'];mid=pos in ['CDM','CM','CAM']
    born=datetime.strptime(p['birthdate'].split()[0],'%m/%d/%Y').date();age=2026-born.year-((8,1)<(born.month,born.day))
    styles={s['name'] for s in p['styles']}
    values=[pace+(2 if wide else -3 if pos=='CB' else 0),pace+(2 if forward or pos=='CB' else 0),shoot+(3 if forward else -7 if mid else -15 if back else 0),shoot+(4 if mid else 2 if forward else 0),shoot+(3 if mid else -7 if forward else -8 if back else 0),p['overall']+(2 if forward or wide else -20 if back else -5),pas+(3 if mid else 0),pas+(3 if pos=='CDM' else -6 if forward else 0),pas+(4 if pos=='CAM' else -14 if back else 0),pas+(3 if wide or pos in ['LB','RB','LWB','RWB'] else -15 if forward else -6),dri+(2 if 'Technical' in styles else 0),dri+(3 if mid or 'First Touch' in styles else 0),dri+(pace-physical)*.12,dri+(-12 if pos=='CB' else 2),p['overall']+(4 if age>=28 else -6 if age<21 else 0),physical+(7 if mid else -4 if forward else 0),physical+(6 if forward or pos=='CB' else -10 if wide else 0),physical+(4 if back or pos=='CDM' else -10),defence+(5 if pos=='CDM' else -12 if forward else 0),defence+(3 if pos=='CB' else -5 if forward else 0),defence+(3 if back else -8 if forward else 0),defence+(2 if pos in ['LB','RB','LWB','RWB'] else -15 if forward else 0),physical+(3 if forward or pos=='CB' else -15 if wide else -5),physical+(5 if forward or pos=='CB' else 0)]
    attrs=dict(zip(builder.OUTFIELD,[max(1,min(99,round(v))) for v in values]))
    if pos=='GK':
        # FC goalkeeper face categories are DIV/HAN/KIC/REF/SPD/POS, not the
        # outfield PAC/SHO/PAS/DRI/DEF/PHY categories used by the table headers.
        attrs=dict(zip(builder.OUTFIELD,[defence+2,defence-2,17,round(pas*.75),12,18,round(pas*.6+p['overall']*.15),round(pas*.7),round(pas*.65),13,18,35,defence+10,50,round(p['overall']*.75),35,round(physical*.85),40,20,17,16,12,19,round(physical*.85)]))
        attrs.update(diving=pace,handling=shoot,kicking=pas,reflexes=dri,gkPositioning=physical)
    return attrs,born.isoformat(),age

facts=json.loads((ROOT/'docs/research/championship-facts.json').read_text())
original=json.loads((ROOT/'src/data/custom-roster.json').read_text())['players'];existing={p['canonicalIdentityId'] for p in original}
profiles=[];seen=set(existing)
for club in facts:
    for p in club['players']:
        canonical='ea-'+p['eaId']
        assert canonical not in seen,('Duplicate identity',p['name']);seen.add(canonical)
        attrs,birth,age=assessed_attributes(p);ovr=p['overall']
        upside=max(0,round((8+(ovr-60)/4) if age<=19 else (6+(ovr-65)/6) if age<=21 else (3+(ovr-70)/10) if age<=24 else 0))
        row={'draftId':'efl-'+p['eaId'],'name':p['name'],'clubId':club['clubId'],'eaId':p['eaId'],'official':{'url':club['source'],'overall':ovr,'positions':[p['position']],'nationality':p['nationality'],'foot':{1:'Right',2:'Left'}.get(p['preferredFoot']),'attributes':attrs,'styles':p['styles']},'secondary':None,'identityOverride':{'birthDate':birth,'url':club['source']},'positionEvidence':{'positions':p['secondaryPositions'],'url':club['source'],'kind':'FC 27 team position reference'},'potentialEstimate':min(92,ovr+upside) if ovr<=92 else ovr}
        profile=builder.compile_profile(row);profile['origin']='championship'
        profile['estimatedFields']=list(dict.fromkeys(profile['estimatedFields']+['attributes','potential']))
        profile['ratingRationale']='Official FC 27 team-reference overall, identity, natural positions and summary skills. Detailed attributes, potential, development and financial terms are provisional Pocket Football GM estimates derived from those individual references; they are not claimed as verified FC 27 subattributes.'
        profile['sources']=[{'url':club['source'],'retrievedDate':club['checked'],'kind':'EA FC 27 team reference','fields':['identity','dateOfBirth','nationality','overall','primaryPosition','secondaryPositions','preferredFoot','summaryRatings','playStyles']}]
        profiles.append(profile)
    squad=[p for p in profiles if p['assignedClubId']==club['clubId']]
    assert len(squad)>=16 and sum(p['primaryPosition']=='GK' for p in squad)>=2,(club['clubId'],'Insufficient researched depth')
(ROOT/'src/data/championship-players.json').write_text(json.dumps({'referenceSeason':2026,'players':profiles},ensure_ascii=False,separators=(',',':'))+'\n')
print('Championship clubs:',len(facts),'Real pool players:',len(profiles),'Custom-player overlaps excluded before build.')
