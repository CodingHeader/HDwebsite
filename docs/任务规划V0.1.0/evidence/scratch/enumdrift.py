import re,json
R='/workspace/work/hd/repo/'
exec(open('drift.py').read().split('rows=[]')[0])
def field_opts(fpart):
    out={}
    # split on '{ key: "' occurrences at field level
    for m in re.finditer(r'key: "(\w+)"(.*?)(?=\{\s*key: "|\n    \],)',fpart,re.S):
        vals=re.findall(r'value: "([\w-]+)"',m.group(2))
        if vals: out[m.group(1)]=vals
    return out
for k,b in sp.items():
    if 'fields:' not in b: continue
    fo=field_opts(b.split('fields:')[1])
    sm=re.search(r'createSchema: (\w+)',rs.get(k,''))
    if not sm or sm.group(1) not in schemas: continue
    body=schemas[sm.group(1)][1]
    for key,vals in fo.items():
        em=re.search(r'^  '+key+r':.*?z\.enum\(\[([^\]]*)\]',body,re.M)
        if em:
            cv=re.findall(r'"([\w-]+)"',em.group(1))
            if set(cv)!=set(vals): print(f"DRIFT {k}.{key}: form={vals} contract={cv}")
            else: print(f"ok {k}.{key}")
        else:
            em2=re.search(r'^  '+key+r':\s*(\w+)',body,re.M)
            print(f"?  {k}.{key}: form={vals} contract-ref={em2.group(1) if em2 else None}")
