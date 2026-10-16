import subprocess,hashlib,os,json,glob
REPO="/workspace/work/hd/repo"; REV="fb82885"
def blob(b): return hashlib.sha1(b"blob %d\0"%len(b)+b).hexdigest()
def tree(prefix):
    out=subprocess.run(["git","-c","core.quotepath=false","ls-tree","-r","-z",REV,prefix],cwd=REPO,capture_output=True).stdout
    res=[]
    for e in out.split(b"\0"):
        if not e: continue
        meta,path=e.split(b"\t",1); res.append((path.decode(),meta.split()[2].decode()))
    return res
def planroot(root):
    best=None
    for dp,dn,fn in os.walk(root):
        if "tasks" in dn:
            if best is None or dp.count(os.sep)<best.count(os.sep): best=dp
    return best or root
def src(root):
    root=planroot(root)
    d={}
    for p in glob.glob(root+"/**/*",recursive=True):
        if os.path.isfile(p): d.setdefault(blob(open(p,'rb').read()),[]).append(os.path.relpath(p,root))
    return d
def demoj(s):
    try: return s.encode('gbk').decode('utf-8')
    except Exception: return None
OUT="/workspace/work/hd/out"
def run(prefix, sources):
    t=tree(prefix); srcs=[(n,src(r)) for n,r in sources]
    entries=[]; matched_src=set()
    for path,sha in t:
        rel=path[len(prefix)+1:]
        guess=demoj(rel)
        hit=None
        for n,d in srcs:
            if sha in d:
                cands=d[sha]
                pick=next((c for c in cands if c==guess),None) or next((c for c in cands if c==rel),None) or cands[0]
                hit=(n,pick,len(cands)); break
        bn=lambda p: p.rsplit("/",1)[-1]
        moj = (hit is not None and bn(hit[1])!=bn(rel)) or (hit is None and guess is not None and guess!=rel)
        reloc = hit is not None and bn(hit[1])==bn(rel) and hit[1]!=rel
        e={"mojibake":path,"correct":(prefix+"/"+hit[1]) if hit else (prefix+"/"+guess if guess else None),
           "sha":sha,"is_mojibake":moj,"matched_by":"content_sha" if hit else ("gbk_reverse_decode_only" if moj else "none"),
           "source":(hit[0]+"/"+hit[1]) if hit else None,"relocated":reloc}
        if hit and hit[2]>1: e["note"]="same content at %d source paths"%hit[2]
        if hit and guess and guess!=hit[1] and moj: e["name_decode_mismatch"]=guess
        entries.append(e)
    shas={s for _,s in t}
    return entries,shas,srcs
res={}
# V0.5
e5,s5,srcs5=run("docs/V0.5-20261015",[("out/v05",OUT+"/v05")])
d5=srcs5[0][1]
missing=[ {"path":"out/v05/"+p,"sha":sha} for sha,ps in d5.items() for p in ps if sha not in s5]
missing.sort(key=lambda x:x["path"])
res["V0.5-20261015"]={"repo_dir":"docs/V0.5-20261015","source_dir":"/workspace/work/hd/out/v05","repo_files":len(e5),"source_files":sum(len(v) for v in d5.values()),
  "mojibake_count":sum(1 for x in e5 if x["is_mojibake"]),"unmatched_in_repo":[x["mojibake"] for x in e5 if x["matched_by"]!="content_sha"],
  "missing_in_repo":missing,"map":e5}
for key,prefix,sources in [
 ("任务规划V0.1.0","docs/任务规划V0.1.0",[("out/HDwebsite-upgrade并行规划-20261013",OUT+"/HDwebsite-upgrade并行规划-20261013"),("zip:并行规划-20261013","/tmp/v06z/HDwebsite-upgrade并行规划-20261013"),("zip:V0.2","/tmp/v06z/HDwebsite-upgrade并行规划-V0.2-20261013")]),
 ("任务规划V0.2.0","docs/任务规划V0.2.0",[("zip:V0.2","/tmp/v06z/HDwebsite-upgrade并行规划-V0.2-20261013"),("zip:V0.3","/tmp/v06z/HDwebsite-upgrade统一规划-V0.3-20261014"),("zip:V0.4","/tmp/v06z/HDwebsite-upgrade统一规划-V0.4-20261014"),("out/HDwebsite-upgrade并行规划-20261013",OUT+"/HDwebsite-upgrade并行规划-20261013"),("zip:V0.5","/tmp/v06z/HDwebsite-upgrade统一规划-V0.5-20261015")])]:
    e,s,srcs=run(prefix,sources)
    primary=srcs[0][1]
    miss=[{"path":srcs[0][0]+"/"+p,"sha":sha} for sha,ps in primary.items() for p in ps if sha not in s]
    from collections import Counter
    res[key]={"repo_dir":prefix,"sources":[n for n,_ in sources],"repo_files":len(e),
      "mojibake_count":sum(1 for x in e if x["is_mojibake"]),"relocated_count":sum(1 for x in e if x["relocated"]),
      "matched_by_source":dict(Counter((x["source"] or "NONE").split("/")[0] for x in e)),
      "unmatched_in_repo":[{"path":x["mojibake"],"decoded_guess":x["correct"]} for x in e if x["matched_by"]!="content_sha"],
      "primary_source_files_missing_in_repo":sorted(miss,key=lambda x:x["path"]),"map":e}
json.dump(res,open("/workspace/work/hd/out/v06/evidence/v05-filename-map.json","w"),ensure_ascii=False,indent=1)
for k,v in res.items():
    print(k,{kk:(len(vv) if isinstance(vv,list) else vv) for kk,vv in v.items()})
