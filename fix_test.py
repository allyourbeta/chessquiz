import re

with open('test_practice.py', 'r') as f:
    content = f.read()

# Fix the list endpoint response handling - lines that check len(r.json())
patterns_to_fix = [
    (r'len\(r\.json\(\)\) == 4', 
     'len((r.json()["games"] if "games" in r.json() else r.json())) == 4'),
    (r'len\(r\.json\(\)\) == 3', 
     'len((r.json()["games"] if "games" in r.json() else r.json())) == 3'),
    (r'len\(r\.json\(\)\) == 0', 
     'len((r.json()["games"] if "games" in r.json() else r.json())) == 0'),
]

for old, new in patterns_to_fix:
    content = re.sub(old, new, content)

# Also need to fix the test that creates games - line 289
# The create endpoint still returns the game directly, not wrapped
# So we don't need to change those

with open('test_practice_fixed.py', 'w') as f:
    f.write(content)

print("Fixed test file written to test_practice_fixed.py")