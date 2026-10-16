import re,json
R='/workspace/work/hd/repo/'
specs=open(R+'src/components/manager/crud-specs.tsx').read()
res=open(R+'src/lib/crud-resources.ts').read()
con=open(R+'src/contracts/resources.ts').read()+open(R+'src/contracts/blocks.ts').read()
def blocks(text, start_pat):
    # top-level entries of an object literal at 2-space indent
    out={}
    ms=list(re.finditer(r'^  ["\x27]?([a-z-]+)["\x27]?: \{',text,re.M))
    for i,m in enumerate(ms):
        end=ms[i+1].start() if i+1<len(ms) else len(text)
        out[m.group(1)]=text[m.start():end]
    return out
sp=blocks(specs,None); rs=blocks(res,None)
# contract schemas
schemas={}
for m in re.finditer(r'export const (\w+Schema) = z\s*\.object\(\{(.*?)\n\}\)',con,re.S):
    body=m.group(2)
    keys=re.findall(r'^  (\w+):',body,re.M)
    sp2=re.findall(r'^  \.\.\.(\w+)',body,re.M)
    schemas[m.group(1)]=(keys,body)
rows=[]
for k,b in sp.items():
    if 'fields:' not in b and 'columns:' not in b: continue
    fpart=b.split('fields:')[1] if 'fields:' in b else ''
    fkeys=re.findall(r'key: "(\w+)"',fpart)
    cpart=b.split('columns:')[1].split('fields:')[0] if 'columns:' in b else ''
    ckeys=re.findall(r'key: "(\w+)"',cpart)
    rb=rs.get(k,'')
    sm=re.search(r'createSchema: (\w+)',rb)
    sname=sm.group(1) if sm else None
    ckeys2=schemas.get(sname,([],''))[0] if sname else []
    search=re.findall(r'"(\w+)"',(re.search(r'searchFields: \[([^\]]*)\]',rb) or re.search('x','x')).group(1) if re.search(r'searchFields: \[([^\]]*)\]',rb) else '')
    filt=re.findall(r'(\w+): "(?:string|number|boolean)"',(re.search(r'filters: \{([^}]*)\}',rb).group(1) if re.search(r'filters: \{([^}]*)\}',rb) else ''))
    rows.append(dict(res=k,schema=sname,spec_fields=fkeys,spec_cols=ckeys,contract_keys=ckeys2,search=search,filters=filt,
      only_contract=sorted(set(ckeys2)-set(fkeys)),only_form=sorted(set(fkeys)-set(ckeys2)),overlap=len(set(fkeys)&set(ckeys2))))
json.dump(rows,open('/workspace/work/hd/audit/scratch/drift.json','w'),ensure_ascii=False,indent=1)
for r in rows:
    print(f"{r['res']:22} schema={r['schema']} form={len(r['spec_fields'])} contract={len(r['contract_keys'])} overlap={r['overlap']} onlyContract={r['only_contract']} onlyForm={r['only_form']}")
