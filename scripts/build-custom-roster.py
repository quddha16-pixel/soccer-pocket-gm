"""Build the original game assessments from individually checked reference facts.

No randomness, club-strength ratings, squad balancing or membership inference.
The submission controls every name, ID and team. Re-run with --from-facts after
editing the committed facts; network retrieval is a separate research activity.
"""
import json,sys,math
from pathlib import Path
from datetime import date

ROOT=Path(__file__).resolve().parent.parent
DATE='2026-10-28';START=date(2026,8,1)
OUTFIELD=['acceleration','sprintSpeed','finishing','shotPower','longShots','positioning','shortPassing','longPassing','vision','crossing','dribbling','ballControl','agility','balance','composure','stamina','strength','aggression','interceptions','marking','standingTackle','slidingTackle','heading','jumping']

# Individually assessed, not FC 27 ratings. Source-backed skill priorities, with
# deliberately wide uncertainty for players with very little senior evidence.
PROVISIONAL={
 'custom-max-dowman':dict(birthDate='2009-12-31',nationality='England',positions=['CAM','RW'],foot='Left',overall=68,potential=88,valueGBP=8_000_000,wageGBP=5000,attributes=[78,74,61,59,55,64,70,60,71,61,78,75,80,71,69,57,48,40,33,29,31,26,35,50],rationale='Creative academy attacker with documented close control, ball carrying and composure. Technical strengths exceed his current senior consistency and physical readiness. High ceiling is uncertain, not a promised outcome.',sources=['https://www.uefa.com/uefachampionsleague/clubs/players/250195774--max-dowman/','https://www.skysports.com/football/story-telling/11095/13417302/max-dowman-inside-the-rise-of-arsenals-15-year-old-wonderkid-who-could-be-gunners-best-academy-product-yet','https://www.thescoutingapp.com/blog/scouting-report-max-dowman-447']),
 'custom-mahdi-nicoll-jazuli':dict(birthDate='2010-01-06',nationality='England',positions=['CM','CDM','CAM'],foot=None,overall=59,potential=82,valueGBP=750000,wageGBP=1500,attributes=[64,63,48,51,46,54,65,56,62,43,65,67,68,61,62,55,48,52,51,44,50,43,40,49],rationale='Youth midfielder with documented line-breaking carrying, composure and experience as a six, eight and ten. Senior evidence is limited; strength, defensive consistency and endurance remain development areas. No elite specialist trait asserted.',sources=['https://www.chelseafc.com/en/news/article/mahdi-nicoll-jazuli-on-going-back-to-the-beginning-for-his-debut','https://www.premierleague.com/en/players/636846/mahdi-nicoll-jazuli/career','https://strictlycfc.com/mahdi-nicoll-jazuli-tactical-technical-report/']),
 'custom-jayden-danns':dict(birthDate='2006-01-16',nationality='England',positions=['ST'],foot=None,overall=64,potential=79,valueGBP=1_100_000,wageGBP=6000,attributes=[66,70,67,65,43,65,51,38,44,30,57,61,57,53,60,51,65,45,22,20,25,18,66,64],rationale='Source-confirmed striker with senior FA Cup goals but injury-disrupted development and limited recent senior minutes. Aerial presence and penalty-area finishing are more developed than build-up passing. The FC 26 63/81 reference is historical, not verified FC 27 data.',sources=['https://www.liverpoolfc.com/team/mens/player/jayden-danns','https://www.uefa.com/uefachampionsleague/clubs/players/250165085--jayden-danns/','https://cmtracker.net/en/players/26071400/71227/jayden-danns'])
}

# Birth dates are stable identity facts, checked against the accompanying sources.
IDENTITY_OVERRIDES={
 'custom-martin-degaard':('1998-12-17','https://www.uefa.com/european-qualifiers/teams/players/250081341--martin-odegaard/'),
 'custom-luke-chambers':('2004-06-24','https://en.wikipedia.org/wiki/Luke_Chambers_(footballer,_born_2004)'),
 'custom-michael-svoboda':('1998-10-15','https://en.wikipedia.org/wiki/Michael_Svoboda'),
 'custom-noah-okafor':('2000-05-24','https://en.wikipedia.org/wiki/Noah_Okafor'),
 'custom-matt-targett':('1995-09-18','https://en.wikipedia.org/wiki/Matt_Targett'),
 'custom-calvin-bassey':('1999-12-31','https://en.wikipedia.org/wiki/Calvin_Bassey'),
 'custom-kenny-tete':('1995-10-09','https://en.wikipedia.org/wiki/Kenny_Tete'),
 'custom-takehiro-tomiyasu':('1998-11-05','https://www.uefa.com/uefaeuropaleague/clubs/players/250177964--takehiro-tomiyasu/'),
 'custom-frank-onyeka':('1998-01-01','https://en.wikipedia.org/wiki/Frank_Onyeka'),
 'custom-aji-alese':('2001-01-17','https://en.wikipedia.org/wiki/Aji_Alese'),
 'custom-abdoullah-ba':('2003-07-31','https://en.wikipedia.org/wiki/Abdoullah_Ba'),
 'custom-djordje-petrovic':('1999-10-08','https://www.uefa.com/european-qualifiers/teams/players/250102133--dorde-petrovic/')
}
POTENTIAL_ESTIMATES={'custom-martin-degaard':87,'custom-luke-chambers':78,'custom-michael-svoboda':72,'custom-noah-okafor':79,'custom-matt-targett':72,'custom-calvin-bassey':81,'custom-kenny-tete':78,'custom-takehiro-tomiyasu':78,'custom-frank-onyeka':75,'custom-aji-alese':71,'custom-abdoullah-ba':75}

def money(text):
    if not text:return None
    import re
    m=re.search(r'([\d.]+)([MK]?)',text)
    return float(m[1])*({'M':1e6,'K':1e3,'':1}[m[2]]) if m else None

def make_facts():
    rows=json.loads(Path('/tmp/normalized-research.json').read_text())
    for row in rows:
        row['assessmentDate']=DATE
        if row['draftId'] in PROVISIONAL:row['assessment']=PROVISIONAL[row['draftId']]
        if row['draftId'] in IDENTITY_OVERRIDES:
            dob,url=IDENTITY_OVERRIDES[row['draftId']];row['identityOverride']={'birthDate':dob,'url':url}
        if row['draftId'] in POTENTIAL_ESTIMATES:row['potentialEstimate']=POTENTIAL_ESTIMATES[row['draftId']]
    path=ROOT/'docs/research/fc27-facts.json';path.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
    return rows

def compile_profile(row):
    official=row['official'] or {};secondary=row['secondary'] or {};a={**secondary.get('attributes',{}),**official.get('attributes',{})}
    provisional=row.get('assessment');sources=[];estimated=['transferValue','weeklyWage','contractYears','developmentRate','developmentUncertainty','scoutingConfidence','homegrownTraining']
    def source(url,kind,fields):sources.append(dict(url=url,retrievedDate=DATE,kind=kind,fields=fields))
    if official:source(official['url'],'EA FC 27 launch', ['overall','primaryPosition','attributes','preferredFoot','nationality','playStyles'])
    if secondary:source(secondary['url'],'FC 27 Career Mode reference',['identity','birthDate','positions','potential','attributes','gameValue','gameWage','playStyles'])
    birth=secondary.get('birthDate');positions=secondary.get('positions',[])[:];primary=(official.get('positions') or positions or [''])[0]
    nation=official.get('nationality') or secondary.get('nationality');foot=official.get('foot') or secondary.get('foot')
    overall=official.get('overall') or secondary.get('overall');potential=secondary.get('potential')
    if override:=row.get('identityOverride'):
        birth=override['birthDate'];source(override['url'],'Football identity',['birthDate'])
    if potential is None:
        potential=row.get('potentialEstimate');estimated.append('potential')
    if provisional:
        birth=provisional['birthDate'];nation=provisional['nationality'];primary=provisional['positions'][0];positions=provisional['positions'];foot=provisional['foot'];overall=provisional['overall'];potential=provisional['potential'];a=dict(zip(OUTFIELD,provisional['attributes']));estimated+=['overall','attributes','potential']
        for url in provisional['sources']:source(url,'Football identity and assessment evidence',['identity','position','playingCharacteristics'])
    assert birth and nation and primary and overall and potential, row['name']
    assert all(k in a and 1<=a[k]<=99 for k in OUTFIELD), row['name']
    dob=date.fromisoformat(birth);age=START.year-dob.year-((START.month,START.day)<(dob.month,dob.day))
    potential=max(overall,potential)
    if secondary.get('potential',potential)<overall:estimated.append('potential')
    positions=list(dict.fromkeys([primary]+positions))
    if evidence:=row.get('positionEvidence'):
        positions=list(dict.fromkeys([primary]+positions+evidence['positions']))
        source(evidence['url'],evidence['kind'],['secondaryPositions'])
    traits={}
    def trait(key,level=1):traits[key]=max(traits.get(key,0),level)
    styles=official.get('styles') if official else secondary.get('styles',[])
    mapping={'Low Driven Shot':'clinical-finisher','Power Shot':'power-shooter','Chip Shot':'poacher','Precision Header':'aerial-threat','Acrobatic':'flair-player','Gamechanger':'flair-player','Enforcer':'ball-winner','Incisive Pass':'through-ball-specialist','Pinged Pass':'press-resistant-distributor','Long Ball Pass':'long-distribution' if primary=='GK' else 'long-pass-specialist','Tiki Taka':'playmaker','Whipped Pass':'precision-crosser','Inventive':'playmaker','Technical':'technical-dribbler','Rapid':'explosive-winger','Quick Step':'explosive-winger','First Touch':'press-resistant-distributor','Flair':'flair-player','Trickster':'flair-player','Press Proven':'press-resistant-distributor','Dead Ball':'set-piece-specialist','Aerial Fortress':'aerial-defender','Aerial':'aerial-defender','Anticipate':'strong-tackler','Intercept':'interceptor','Jockey':'recovery-defender','Block':'shot-blocker','Slide Tackle':'strong-tackler','Bruiser':'ball-winner','Far Throw':'long-distribution','Footwork':'reflex-specialist','Rush Out':'sweeper-keeper','Cross Claimer':'cross-collector','Far Reach':'reflex-specialist','Deflector':'reflex-specialist','Quick Reflexes':'reflex-specialist'}
    for style in styles:
        if style['name'] in mapping:trait(mapping[style['name']],2 if style['plus'] else 1)
    # Original specialist assessments from the individual's measured strengths.
    if primary!='GK':
        if a['longShots']>=84:trait('long-range-specialist')
        if a['positioning']>=88 and a['sprintSpeed']>=80:trait('intelligent-runner')
        if a['vision']>=85 and a['shortPassing']>=84:trait('playmaker')
    if row['draftId']=='custom-max-dowman':trait('technical-dribbler')
    if primary=='GK':
        assert all(k in a for k in ['diving','reflexes','handling','gkPositioning','kicking']),row['name']
        a['distribution']=round(a['kicking']*.7+a['longPassing']*.3)
        a['aerialAbility']=round(a['handling']*.55+a['jumping']*.25+a['strength']*.2)
        a['oneOnOne']=round(a['reflexes']*.55+a['gkPositioning']*.45)
        estimated+=['distribution','aerialAbility','oneOnOne']
    weak=sorted(OUTFIELD,key=lambda k:a[k])[:3];strong=sorted(OUTFIELD,key=lambda k:a[k],reverse=True)[:3]
    if primary=='GK':strong=sorted(['diving','reflexes','handling','gkPositioning','kicking'],key=lambda k:a[k],reverse=True)[:3]
    value=round((money(secondary.get('value')) or 0)*.86/10000)*10000
    if not value:value=round(max(100000,(overall-48)**3*700)*(1.2 if age<25 else .6 if age>30 else 1)*(1+(potential-overall)/40)/10000)*10000
    wage=round((money(secondary.get('wage')) or max(1200,(overall-45)**2*35))*.86/100)*100
    years=max(1,min(5,int(secondary.get('contract','2029'))-2026))
    if provisional:value=provisional['valueGBP'];wage=provisional['wageGBP'];years=3
    status='official' if official else 'secondary' if secondary else 'provisional'
    tendency='early' if age<=21 and overall>=80 else 'late' if 22<=age<=24 and potential-overall>=7 else 'volatile' if age<=20 and potential-overall>=14 else 'steady'
    rate=round(max(.55,min(1.3,.65+(potential-overall)/28+(a['composure']-60)/250)),2)
    uncertainty=min(28,max(4,(24-age)*1.3+8+(8 if provisional else 0))) if age<=24 else 4
    rationale=provisional['rationale'] if provisional else f"Individual FC 27 reference profile; strengths in {', '.join(strong)}, relative limitations in {', '.join(weak)}. Custom club membership has no influence on ability."
    profile=dict(draftId=row['draftId'],displayName=row['name'],assignedClubId=row['clubId'],canonicalIdentityId='ea-'+row['eaId'] if row['eaId'] else row['draftId'],matchedIdentity=secondary.get('expandedName') or row['name'],dateOfBirth=birth,nationality=nation,preferredFoot=foot.lower() if foot else None,primaryPosition=primary,secondaryPositions=positions[1:],overall=overall,potential=potential,attributes=a,traits=[dict(id=key,level=level) for key,level in traits.items()],traitRationale='Original internal mapping from referenced FC 27 PlayStyles and measured individual strengths.' if traits else 'No specialist trait supported by the retrieved reference; individual attributes still determine performance.',ratingStatus=status,identityConfidence='high',assessmentDate=DATE,sources=sources,estimatedFields=list(dict.fromkeys(estimated)),startingValue=value,weeklyWageEstimate=max(500,wage),contractYearsEstimate=years,startingAge=age,development=dict(rate=rate,tendency=tendency,uncertainty=round(uncertainty),confidence=40 if provisional else round(max(48,min(85,90-uncertainty*1.3)))),ratingRationale=rationale)
    if primary=='GK':profile['playingStyle']='keeper'
    else:profile['playingStyle']='creator' if a['vision']+a['shortPassing']>a['finishing']+a['sprintSpeed'] and primary not in ['CB','LB','RB'] else 'anchor' if primary in ['CB','CDM','LB','RB','LWB','RWB'] else 'finisher' if primary in ['ST','CF'] else 'runner'
    return profile

if __name__=='__main__':
    facts=json.loads((ROOT/'docs/research/fc27-facts.json').read_text()) if '--from-retrievals' not in sys.argv else make_facts()
    profiles=[compile_profile(row) for row in facts]
    roster=json.loads((ROOT/'src/data/custom-roster-draft.json').read_text())
    assert len(profiles)==546
    assert len({p['canonicalIdentityId'] for p in profiles})==546
    for club in roster['clubs']:
        assert [p['displayName'] for p in profiles if p['assignedClubId']==club['clubId']]==[p['displayName'] for p in club['players']]
    (ROOT/'src/data/custom-roster.json').write_text(json.dumps({'edition':'FC 27','season':2026,'assessmentDate':DATE,'players':profiles},ensure_ascii=False,indent=2)+'\n')
    from collections import Counter
    print('Imported',len(profiles),'Ratings',dict(Counter(p['ratingStatus'] for p in profiles)),'With traits',sum(bool(p['traits']) for p in profiles))
