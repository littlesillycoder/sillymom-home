#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
在 GitHub repo 建立 Label、Milestone 和所有 issue。

需要：已安裝 GitHub CLI（gh），並已登入（gh auth login）。
用法：
    python3 issues/create_issues.py                       # 預設 repo：littlesillycoder/sillymom-home
    python3 issues/create_issues.py --repo 帳號/repo名稱
    python3 issues/create_issues.py --dry-run             # 只列出會做什麼，不真的建立

可以重跑：已經存在的 Label、Milestone、issue（用標題判斷）不會重複建立。
最後會把 issue 內容裡「要先完成」的標題換成 GitHub 的 #號碼。
"""
import argparse, json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))

def gh(args, input_text=None, check=True):
    r = subprocess.run(["gh"] + args, input=input_text, text=True, capture_output=True)
    if check and r.returncode != 0:
        sys.exit(f"gh {' '.join(args)}\n失敗：{r.stderr.strip()}")
    return r.stdout

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default="littlesillycoder/sillymom-home")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    data = json.load(open(os.path.join(HERE, "issues.json"), encoding="utf-8"))
    repo = a.repo

    gh(["auth", "status"])
    print(f"目標 repo：{repo}")

    # Labels
    for l in data["labels"]:
        print(f"Label：{l['name']}")
        if not a.dry_run:
            gh(["label", "create", l["name"], "--repo", repo, "--color", l["color"],
                "--description", l["description"], "--force"])

    # Milestones
    existing_ms = {m["title"]: m["number"] for m in json.loads(
        gh(["api", f"repos/{repo}/milestones?state=all&per_page=100"]))}
    for m in data["milestones"]:
        if m["title"] in existing_ms:
            print(f"Milestone 已存在：{m['title']}")
            continue
        print(f"建立 Milestone：{m['title']}")
        if not a.dry_run:
            gh(["api", f"repos/{repo}/milestones", "-f", f"title={m['title']}", "-f", f"description={m['description']}"])

    # Issues
    existing = {i["title"]: i["number"] for i in json.loads(
        gh(["issue", "list", "--repo", repo, "--state", "all", "--limit", "1000", "--json", "title,number"]))}
    numbers = dict(existing)
    for i in data["issues"]:
        if i["title"] in existing:
            print(f"已存在 #{existing[i['title']]}：{i['title']}")
            continue
        print(f"建立 issue：{i['title']}")
        if a.dry_run:
            continue
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
            f.write(i["body"]); path = f.name
        args = ["issue", "create", "--repo", repo, "--title", i["title"], "--body-file", path]
        for l in i["labels"]:
            args += ["--label", l]
        if i["milestone"]:
            args += ["--milestone", i["milestone"]]
        url = gh(args).strip()
        os.unlink(path)
        numbers[i["title"]] = int(url.rstrip("/").split("/")[-1])
        print(f"  → {url}")

    # 把「要先完成」換成 #號碼
    if a.dry_run:
        print("（dry-run：略過連結相依 issue）")
        return
    for i in data["issues"]:
        deps = re.findall(r"\{\{dep:(.+?)\}\}", i["body"])
        if not deps:
            continue
        body = i["body"]
        for d in deps:
            body = body.replace("{{dep:" + d + "}}", f"#{numbers[d]} {d}")
        num = numbers[i["title"]]
        current = json.loads(gh(["issue", "view", str(num), "--repo", repo, "--json", "body"]))["body"]
        if "{{dep:" not in current:
            continue
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
            f.write(body); path = f.name
        gh(["issue", "edit", str(num), "--repo", repo, "--body-file", path])
        os.unlink(path)
        print(f"已連結相依：#{num}")
    print(f"完成：共 {len(data['issues'])} 個 issue。")

if __name__ == "__main__":
    main()
