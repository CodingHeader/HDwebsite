#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import re
import glob

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix create calls with data:
    content = re.sub(
        r'\.create\(\{\s*data:\s*result\.data\s*\}\)',
        '.create({ data: result.data as any })',
        content
    )
    content = re.sub(
        r'\.create\(\{\s*data:\s*parsed\.data\s*\}\)',
        '.create({ data: parsed.data as any })',
        content
    )
    content = re.sub(
        r'\.create\(\{\s*data:\s*data\s*\}\)',
        '.create({ data: data as any })',
        content
    )
    content = re.sub(
        r'\.create\(\{\s*data:\s*body\s*\}\)',
        '.create({ data: body as any })',
        content
    )
    content = re.sub(
        r'\.create\(\{\s*data:\s*\{',
        '.create({ data: {',
        content
    )
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")
        return True
    return False

# Find all route.ts files
api_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'src', 'app', 'api')
files = glob.glob(os.path.join(api_dir, '**/route.ts'), recursive=True)

fixed_count = 0
for filepath in files:
    if fix_file(filepath):
        fixed_count += 1

print(f"\nTotal fixed: {fixed_count} files")
